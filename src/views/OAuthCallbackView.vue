<template>
  <FullPageLayout>
    <div class="w-full max-w-md space-y-6 text-center">
      <!-- Loading -->
      <div v-if="processing" class="space-y-4">
        <UIcon name="i-lucide-loader-2" class="mx-auto h-12 w-12 animate-spin text-primary-400" />
        <p class="text-white/70">{{ t('login.authprocessing') }}</p>
      </div>

      <!-- Success -->
      <div v-else-if="success" class="space-y-4">
        <UIcon name="i-lucide-circle-check" class="mx-auto h-12 w-12 text-green-400" />
        <p class="font-medium text-green-400">{{ t('login.connectedsuccess') }}</p>
        <p class="text-sm text-white/50">{{ t('login.canclose') }}</p>
      </div>

      <!-- Error -->
      <div v-else-if="errorMessage" class="space-y-4">
        <UIcon name="i-lucide-circle-alert" class="mx-auto h-12 w-12 text-red-400" />
        <p class="font-medium text-red-400">{{ t('login.authfailed') }}</p>
        <p class="text-sm text-white/50">{{ errorMessage }}</p>
        <div class="flex justify-center pt-2">
          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-arrow-left"
            aria-label="Back to login"
            @click="backToLogin"
          >
            Back to login
          </UButton>
        </div>
      </div>
    </div>
  </FullPageLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import FullPageLayout from '@/layouts/FullPageLayout.vue'
import { decodeState, isStateExpired } from '@/utils/oauthState'

import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const route = useRoute()
const router = useRouter()

const processing = ref(true)
const success = ref(false)
const errorMessage = ref<string | null>(null)

const backToLogin = () => {
  if (!Capacitor.isNativePlatform() && window.opener) {
    window.close()
    return
  }
  router.replace('/login')
}

onMounted(async () => {
  // In dev, OAuth redirects to 127.0.0.1 but opener runs on localhost.
  // Redirect to localhost so postMessage works (same-origin requirement).
  if (!Capacitor.isNativePlatform() && window.location.hostname === '127.0.0.1') {
    const newUrl = window.location.href.replace('://127.0.0.1', '://localhost')
    window.location.replace(newUrl)
    return
  }

  const code = route.query.code as string | undefined
  const stateStr = route.query.state as string | undefined
  const error = route.query.error as string | undefined

  if (error) {
    console.error('[OAuth Callback] OAuth error from provider:', error)
    errorMessage.value = (route.query.error_description as string) || error
    processing.value = false
    return
  }

  if (!code || !stateStr) {
    console.error('[OAuth Callback] Missing required params - code:', !!code, 'state:', !!stateStr)
    errorMessage.value = 'Missing authorization code or state'
    processing.value = false
    return
  }

  const state = decodeState(stateStr)
  if (!state) {
    console.error('[OAuth Callback] Failed to decode state parameter')
    errorMessage.value = 'Invalid state parameter'
    processing.value = false
    return
  }

  if (isStateExpired(state)) {
    console.error('[OAuth Callback] State expired, timestamp:', state.timestamp, 'now:', Date.now())
    errorMessage.value = 'OAuth session expired. Please try again.'
    processing.value = false
    return
  }

  if (Capacitor.isNativePlatform()) {
    // Native: Validate nonce against stored value (required for security)
    const { value: storedNonce } = await Preferences.get({ key: 'oauth_pending_nonce' })
    if (storedNonce !== state.nonce) {
      console.error('[OAuth Callback] Nonce mismatch - security validation failed')
      errorMessage.value = 'Security validation failed. Please try again.'
      processing.value = false
      return
    }

    // Route based on mode
    if (state.mode === 'license') {
      router.replace({
        path: '/setup/crypto',
        query: { oauth_code: code, oauth_state: stateStr },
      })
    } else {
      const basePath = state.installationId
        ? `/matrx/${state.deviceId}/installations/${state.installationId}`
        : `/matrx/${state.deviceId}/apps/${state.appId}`

      router.replace({
        path: basePath,
        query: { oauth_code: code, oauth_field: state.fieldId, restore: 'true' },
      })
    }
  } else {
    // Web: Post message to opener and close
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'OAUTH_CALLBACK',
          code,
          state: stateStr,
        },
        window.location.origin,
      )

      success.value = true
      processing.value = false

      setTimeout(() => window.close(), 1500)
    } else {
      console.error('[OAuth Callback] No window.opener found - cannot post message')
      errorMessage.value = 'No parent window found. Please close this window and try again.'
      processing.value = false
    }
  }
})
</script>
