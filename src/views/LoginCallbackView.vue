<template>
  <FullPageLayout>
    <div class="w-full max-w-md space-y-6 text-center">
      <div class="space-y-2">
        <p class="text-xs uppercase tracking-[0.35em] text-white/60">KDID login</p>
        <h1 class="text-2xl font-semibold">{{ t('login.finish') }}</h1>
        <p class="text-sm text-white/70">
          {{ errorMessage ? t('login.error.notfinish') : t('login.error.wait') }}
        </p>
      </div>

      <div v-if="errorMessage" class="space-y-4">
        <UIcon name="i-lucide-circle-alert" class="mx-auto h-10 w-10 text-rose-400" />
        <p class="text-sm text-rose-300">{{ errorMessage }}</p>
        <div class="flex justify-center gap-3">
          <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" @click="backToLogin">
            {{ t('login.back') || 'Back to login' }}
          </UButton>
          <UButton color="primary" icon="i-lucide-log-in" @click="retry">
            {{ t('login.tryagain') }}
          </UButton>
        </div>
      </div>

      <div v-else class="flex flex-col items-center gap-3">
        <UIcon
          name="i-lucide-loader-2"
          class="h-10 w-10 animate-spin text-primary-400"
          aria-hidden="true"
        />
        <span class="sr-only">Signing in</span>
      </div>
    </div>
  </FullPageLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import FullPageLayout from '@/layouts/FullPageLayout.vue'
import { useAuthStore } from '@/stores/auth/auth'
import { LOGIN_DEFAULT_REDIRECT, LOGIN_REDIRECT_STORAGE_KEY } from '@/stores/auth/constants'

import { useI18n } from 'vue-i18n'
const { t } = useI18n()

useHead({
  title: 'Signing In... | Koios Digital',
  meta: [{ name: 'robots', content: 'noindex' }],
})

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const errorMessage = ref<string | null>(null)

const consumeRedirectTarget = () => {
  if (typeof window === 'undefined') {
    const fallback = route.query.redirect
    return typeof fallback === 'string' && fallback.length ? fallback : null
  }

  const stored = sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY)
  if (stored) {
    sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY)
    return stored
  }

  const fallback = route.query.redirect
  return typeof fallback === 'string' && fallback.length ? fallback : null
}

/**
 * Check if this callback is from a Keycloak account action (password change, profile update)
 */
const handleKeycloakAction = (): boolean => {
  const kcAction = route.query.kc_action as string | undefined
  const kcActionStatus = route.query.kc_action_status as string | undefined

  if (kcAction && kcActionStatus) {
    // Redirect to settings with action result
    router.replace({
      path: '/settings',
      query: {
        kc_action: kcAction,
        kc_action_status: kcActionStatus,
      },
    })
    return true
  }
  return false
}

const completeLogin = async () => {
  // Handle Keycloak account actions (password change, profile update)
  if (handleKeycloakAction()) {
    return
  }

  try {
    await authStore.completeAuthentication(
      typeof window !== 'undefined' ? window.location.href : undefined,
    )
    const target = consumeRedirectTarget() ?? LOGIN_DEFAULT_REDIRECT
    await router.replace(target)
  } catch (error) {
    console.error('OIDC callback failed', error)
    errorMessage.value =
      'Please relaunch the sign-in flow. If this keeps happening, contact Koios Digital support.'
  }
}

const retry = () => {
  errorMessage.value = null
  authStore.beginAuthentication()
}

const backToLogin = () => {
  router.replace('/login')
}

onMounted(() => {
  completeLogin()
})
</script>
