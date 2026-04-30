<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { usePushNotifications } from '@/composables/usePushNotifications'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type PreferenceItem = components['schemas']['PushPreferenceItemDto']
type DeviceItem = components['schemas']['PushDeviceResponseDto']

useHead({ title: 'Push notifications' })

const { setHeader } = usePageHeader()
const toast = useToastStore()
const push = usePushNotifications()

const preferences = ref<PreferenceItem[]>([])
const devices = ref<DeviceItem[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const hasDevice = computed(() => devices.value.length > 0)

const TYPE_LABELS: Record<string, string> = {
  TEAM_INVITE: 'Team invitations',
  TEAM_JOIN_REQUEST: 'Team join requests',
  TEAM_REQUEST_RESPONSE: 'Team request responses',
  CAPTAIN_ASSIGNED: 'Made captain',
  REMOVED_FROM_TEAM: 'Removed from team',
  TEAM_BROADCAST: 'Team broadcasts',
  TEAM_CHAT_MESSAGE: 'Team chat',
  ORGANIZATION_INVITE: 'Organization invitations',
  TOURNAMENT_INVITATION_RECEIVED: 'Tournament invitations',
  TOURNAMENT_REMINDER: 'Tournament reminders',
  TOURNAMENT_MATCH_RESULT_PENDING: 'Match result pending review',
  TOURNAMENT_MATCH_RESULT_DISPUTED: 'Match result disputed',
  MEETUP_PROPOSAL: 'Meetup invitations',
  MEETUP_ACCEPTED: 'Meetup accepted',
  GYM_STATUS_CHANGED: 'Watched gym status',
  ACHIEVEMENT_UNLOCKED: 'Achievement unlocked',
  ACCOUNT_SUSPENDED: 'Account suspended',
}

function labelFor(type: string): string {
  return TYPE_LABELS[type] ?? humanize(type)
}

function humanize(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

async function loadPreferences() {
  loading.value = true
  error.value = ''
  try {
    const [prefsRes, devicesRes] = await Promise.all([
      apiClient.GET('/v1/push/preferences'),
      apiClient.GET('/v1/push/devices'),
    ])
    if (prefsRes.error) {
      error.value = getErrorMessage(prefsRes.error, 'Failed to load preferences')
      return
    }
    preferences.value = prefsRes.data?.preferences ?? []
    devices.value = devicesRes.data ?? []
  } catch (e) {
    error.value = getErrorMessage(e, 'Failed to load preferences')
  } finally {
    loading.value = false
  }
}

async function enablePush() {
  const ok = await push.register()
  if (!ok) {
    if (push.permission.value === 'denied') {
      toast.error(
        'Notifications blocked',
        'Permission was denied. Re-enable notifications in your system settings.'
      )
    } else if (push.error.value) {
      toast.error('Could not enable notifications', push.error.value)
    }
    return
  }
  toast.success('Push notifications enabled on this device')
  await loadPreferences()
}

async function removeDevice(id: string) {
  try {
    const { error: err } = await apiClient.DELETE('/v1/push/devices/{id}', {
      params: { path: { id } },
    })
    if (err) throw new Error(getErrorMessage(err, 'Failed to remove device'))
    devices.value = devices.value.filter((d) => d.id !== id)
    toast.success('Device removed')
  } catch (e) {
    toast.error('Could not remove device', getErrorMessage(e, 'Please try again.'))
  }
}

function setEnabled(type: string, enabled: boolean) {
  preferences.value = preferences.value.map((p) => (p.type === type ? { ...p, enabled } : p))
}

async function savePreferences() {
  saving.value = true
  try {
    const { data, error: err } = await apiClient.PUT('/v1/push/preferences', {
      body: { preferences: preferences.value },
    })
    if (err) throw new Error(getErrorMessage(err, 'Failed to save preferences'))
    preferences.value = data?.preferences ?? preferences.value
    toast.success('Push preferences saved')
  } catch (e) {
    toast.error('Could not save preferences', getErrorMessage(e, 'Please try again.'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  setHeader({ title: 'Push notifications', backRoute: '/settings' })
  loadPreferences()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <UAlert
        v-if="!push.isSupported.value"
        color="info"
        icon="i-lucide-info"
        title="Push notifications not supported"
        description="This browser or device does not support push notifications."
      />

      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">This device</p>
            <p class="text-sm text-white/60">
              Enable push notifications to receive alerts even when the app is closed.
            </p>
          </div>

          <UButton
            v-if="push.isSupported.value && !hasDevice"
            color="primary"
            icon="i-lucide-bell"
            :loading="push.registering.value"
            @click="enablePush"
          >
            Enable on this device
          </UButton>

          <p
            v-else-if="push.permission.value === 'denied'"
            class="text-xs text-amber-300"
          >
            Notifications were blocked. Re-enable them in your system settings.
          </p>
        </div>
      </UCard>

      <UCard v-if="devices.length > 0" class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Registered devices</p>
            <p class="text-sm text-white/60">Devices that will receive push notifications.</p>
          </div>
          <ul class="flex flex-col gap-2">
            <li
              v-for="d in devices"
              :key="d.id"
              class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-medium">
                  {{ d.platform === 'IOS' ? 'iOS device' : 'Browser' }} ··· {{ d.tokenHint }}
                </span>
                <span class="text-xs text-white/50 truncate">{{ d.userAgent || '—' }}</span>
                <span class="text-xs text-white/40">
                  Added {{ new Date(d.createdAt).toLocaleDateString() }}
                </span>
              </div>
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                aria-label="Remove device"
                @click="removeDevice(d.id)"
              />
            </li>
          </ul>
        </div>
      </UCard>

      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Notification types</p>
            <p class="text-sm text-white/60">
              Pick which types of notifications send a push. In-app notifications still appear
              regardless.
            </p>
          </div>

          <div v-if="loading" class="flex justify-center p-4">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
          </div>

          <div v-else class="flex flex-col gap-2">
            <label
              v-for="p in preferences"
              :key="p.type"
              class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer hover:bg-white/10"
            >
              <span class="text-sm">{{ labelFor(p.type) }}</span>
              <USwitch
                :model-value="p.enabled"
                :aria-label="labelFor(p.type)"
                @update:model-value="(v: boolean) => setEnabled(p.type, v)"
              />
            </label>
          </div>

          <UButton color="primary" :loading="saving" :disabled="loading" @click="savePreferences">
            Save preferences
          </UButton>
        </div>
      </UCard>
    </section>
  </PageLayout>
</template>
