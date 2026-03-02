<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, onMounted } from 'vue'

import AppLayout from './layouts/AppLayout.vue'
import OrganizationSetupModal from '@/components/organization/OrganizationSetupModal.vue'
import { useAuthStore } from '@/stores/auth/auth'
import { useOrganizationStore } from '@/stores/organization'
import { useHead } from '@unhead/vue'

const authStore = useAuthStore()
const orgStore = useOrganizationStore()

const showOrgSetup = computed(() => {
  return authStore.isLoggedIn && orgStore.initialized && !orgStore.hasMembership
})

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
  <OrganizationSetupModal v-if="showOrgSetup" />
</template>
