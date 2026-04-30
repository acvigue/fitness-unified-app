import { ref, computed, onUnmounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import {
  PushNotifications,
  type Token,
  type PushNotificationSchema,
} from '@capacitor/push-notifications'
import { apiClient } from '@/lib/api/client'

const DEVICE_ID_KEY = 'push:deviceId'

export type PushPermission = 'granted' | 'denied' | 'prompt' | 'unsupported'

/**
 * Cross-platform push registration. Branches internally between Capacitor's
 * APNs registration on iOS and Web Push (VAPID) in browsers. Callers don't
 * need to know which transport is in use.
 *
 * The backend issues a `deviceId` on registration that we persist locally so
 * we can `DELETE` it on logout regardless of platform.
 */
export function usePushNotifications() {
  const isNative = Capacitor.isNativePlatform()
  const isWebSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  const isSupported = computed(() => isNative || isWebSupported)
  const permission = ref<PushPermission>(
    isNative
      ? 'prompt'
      : isWebSupported
        ? (Notification.permission as PushPermission)
        : 'unsupported'
  )
  const registering = ref(false)
  const error = ref<string | null>(null)

  const tokenListeners: { remove: () => void }[] = []

  async function register(): Promise<boolean> {
    if (!isSupported.value || registering.value) return false
    registering.value = true
    error.value = null

    try {
      if (isNative) {
        return await registerNative()
      }
      return await registerWeb()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      return false
    } finally {
      registering.value = false
    }
  }

  async function registerNative(): Promise<boolean> {
    const perm = await PushNotifications.requestPermissions()
    permission.value = perm.receive === 'granted' ? 'granted' : 'denied'
    if (perm.receive !== 'granted') return false

    const token = await new Promise<string>((resolve, reject) => {
      const handle = setTimeout(
        () => reject(new Error('APNs registration timed out')),
        15_000
      )
      PushNotifications.addListener('registration', (t: Token) => {
        clearTimeout(handle)
        resolve(t.value)
      }).then((l) => tokenListeners.push(l))
      PushNotifications.addListener('registrationError', (e) => {
        clearTimeout(handle)
        reject(new Error(typeof e === 'string' ? e : JSON.stringify(e)))
      }).then((l) => tokenListeners.push(l))
      PushNotifications.register().catch((e) => {
        clearTimeout(handle)
        reject(e)
      })
    })

    return await sendToBackend({
      platform: 'IOS',
      token,
      userAgent: navigator.userAgent,
    })
  }

  async function registerWeb(): Promise<boolean> {
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      permission.value = result as PushPermission
    } else {
      permission.value = Notification.permission as PushPermission
    }
    if (permission.value !== 'granted') return false

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const { data, error: keyErr } = await apiClient.GET('/v1/push/vapid-public-key')
    if (keyErr || !data?.publicKey) {
      throw new Error('Server has no VAPID public key configured')
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    })

    const json = subscription.toJSON() as {
      endpoint: string
      expirationTime: number | null
      keys: { p256dh: string; auth: string }
    }

    return await sendToBackend({
      platform: 'WEB',
      token: hashEndpoint(json.endpoint),
      userAgent: navigator.userAgent,
      subscription: {
        endpoint: json.endpoint,
        expirationTime: json.expirationTime ?? null,
        keys: json.keys,
      },
    })
  }

  async function sendToBackend(body: {
    platform: 'IOS' | 'WEB'
    token: string
    userAgent?: string
    subscription?: {
      endpoint: string
      expirationTime: number | null
      keys: { p256dh: string; auth: string }
    }
  }): Promise<boolean> {
    const { data, error: apiErr } = await apiClient.POST('/v1/push/devices', { body })
    if (apiErr || !data) {
      throw new Error('Failed to register device with server')
    }
    await Preferences.set({ key: DEVICE_ID_KEY, value: data.id })
    return true
  }

  /**
   * Unregister the device this client most recently registered. Called on
   * logout. Best-effort — silently swallows errors so logout always proceeds.
   */
  async function unregister(): Promise<void> {
    const { value: id } = await Preferences.get({ key: DEVICE_ID_KEY })
    await Preferences.remove({ key: DEVICE_ID_KEY })
    if (!id) return

    try {
      await apiClient.DELETE('/v1/push/devices/{id}', { params: { path: { id } } })
    } catch {
      // ignore
    }

    if (!isNative && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js').catch(() => null)
      const sub = await reg?.pushManager.getSubscription().catch(() => null)
      await sub?.unsubscribe().catch(() => undefined)
    }
  }

  onUnmounted(() => {
    for (const l of tokenListeners) l.remove()
    tokenListeners.length = 0
  })

  return {
    isSupported,
    permission,
    registering,
    error,
    register,
    unregister,
    isNative,
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Stable, short identifier derived from the push endpoint. We can't use the
 * full endpoint URL as the unique token (it can exceed our column length on
 * some browsers) — the endpoint is preserved in the `subscription` JSON.
 */
function hashEndpoint(endpoint: string): string {
  let h = 0
  for (let i = 0; i < endpoint.length; i++) {
    h = (h * 31 + endpoint.charCodeAt(i)) | 0
  }
  return `web_${(h >>> 0).toString(36)}_${endpoint.slice(-16)}`
}

export type PushNotificationPayload = PushNotificationSchema
