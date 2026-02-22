<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'

import AppLayout from './layouts/AppLayout.vue'
import { useAuthStore } from '@/stores/auth/auth'
import { useHead } from '@unhead/vue/dist'

const authStore = useAuthStore()

const hydrateAuth = async () => {
  if (!authStore.isLoggedIn) {
    await authStore.initialize()
  }
}

onMounted(async () => {
  await hydrateAuth()
})

useHead({
  titleTemplate: '%s | FitTime',
  meta: [
    { name: 'description', content: 'Manage your FitTime' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
})
</script>

<template>
  <AppLayout>
    <Suspense>
      <RouterView />
    </Suspense>
  </AppLayout>
</template>
