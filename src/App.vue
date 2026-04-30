<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, onMounted } from 'vue'

import AppLayout from './layouts/AppLayout.vue'
import AppToaster from '@/components/AppToaster.vue'
import GuideOverlay from '@/components/guide/GuideOverlay.vue'
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
  meta: [{ name: 'description', content: 'Manage your FitTime' }],
})
</script>

<template>
  <AppLayout>
    <Suspense>
      <RouterView />
      <template #fallback>
        <div
          class="flex-1 flex items-center justify-center"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <UIcon name="i-lucide-loader-2" class="text-2xl text-white/50 animate-spin" />
          <span class="sr-only">Loading</span>
        </div>
      </template>
    </Suspense>
  </AppLayout>
  <OrganizationSetupModal v-if="showOrgSetup" />
  <AppToaster />
  <GuideOverlay />
</template>
