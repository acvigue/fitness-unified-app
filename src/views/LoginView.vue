<template>
  <FullPageLayout class="relative text-white">
    <img
      :src="backgroundUrl"
      alt="background"
      class="absolute inset-0 h-full w-full object-cover opacity-40"
    />
    <div class="absolute inset-0 bg-zinc-900/80"></div>

    <div class="relative z-10 flex flex-col items-center justify-between h-full w-full px-6 py-12">
      <!-- Top spacer -->
      <div />

      <!-- Center: Logo + Branding -->
      <div class="flex flex-col items-center text-center space-y-6">
        <img
          :src="logoUrl"
          alt="FitTime"
          class="w-40 h-40 object-contain drop-shadow-xl"
        />
        <div class="space-y-2">
          <h1 class="text-4xl font-bold tracking-tight">FitTime</h1>
          <p class="text-lg text-white/80 font-medium">{{ t('login.tagline') }}</p>
          <p class="text-sm text-white/50 max-w-xs">{{ t('login.description') }}</p>
        </div>
      </div>

      <!-- Bottom: Get Started button -->
      <div class="w-full max-w-xs">
        <UButton
          size="xl"
          color="primary"
          block
          trailing-icon="i-fa6-solid-arrow-right"
          :loading="isAuthorizing"
          @click="startLogin"
        >
          {{ t('login.getstarted') }}
        </UButton>
      </div>
    </div>
  </FullPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import FullPageLayout from '@/layouts/FullPageLayout.vue'
import { useAuthStore } from '@/stores/auth/auth'
import { LOGIN_DEFAULT_REDIRECT, LOGIN_REDIRECT_STORAGE_KEY } from '@/stores/auth/constants'
import logoUrl from '@/assets/images/logo_dark.png'
const loginBgImage = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1080&q=80'

import { useI18n } from 'vue-i18n'
const { t } = useI18n()


useHead({
  title: 'Sign In',
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const backgroundUrl = loginBgImage

const isAuthorizing = ref(false)

const redirectTarget = computed(() => {
  const redirectParam = route.query.redirect
  if (typeof redirectParam === 'string' && redirectParam.length) {
    return redirectParam
  }
  return LOGIN_DEFAULT_REDIRECT
})

const persistRedirectTarget = () => {
  if (typeof window === 'undefined') {
    return
  }
  sessionStorage.setItem(LOGIN_REDIRECT_STORAGE_KEY, redirectTarget.value)
}

const startLogin = async (provider?: string) => {
  if (isAuthorizing.value) return
  isAuthorizing.value = true
  persistRedirectTarget()
  await authStore.beginAuthentication(provider)
  isAuthorizing.value = false
}

watch(
  () => authStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      router.replace(redirectTarget.value)
    }
  },
  { immediate: true },
)
</script>
