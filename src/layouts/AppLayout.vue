<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth/auth'
import AppSidebar from '@/components/navigation/AppSidebar.vue'
import AppBottomTabBar from '@/components/navigation/AppBottomTabBar.vue'

const route = useRoute()
const authStore = useAuthStore()

const PUBLIC_PATHS = new Set(['/login', '/login/callback', '/oauth/callback'])

const showNavigation = computed(() => {
  return authStore.isLoggedIn && !PUBLIC_PATHS.has(route.path)
})
</script>

<template>
  <UApp>
    <div class="h-full flex flex-row">
      <!-- Desktop sidebar (lg+) -->
      <AppSidebar v-if="showNavigation" class="hidden lg:flex" />

      <!-- Main content area -->
      <div class="flex-1 min-w-0 flex flex-col h-full">
        <div class="flex-1 min-h-0 flex flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)]" :class="showNavigation ? 'lg:pl-0 pl-[env(safe-area-inset-left)]' : 'pl-[env(safe-area-inset-left)]'">
          <slot />
        </div>

        <!-- Mobile bottom tab bar (below lg) -->
        <AppBottomTabBar v-if="showNavigation" class="shrink-0 lg:hidden" />
      </div>
    </div>
  </UApp>
</template>
