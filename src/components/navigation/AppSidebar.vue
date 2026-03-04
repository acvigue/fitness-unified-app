<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNavigationItems } from '@/composables/useNavigationItems'
import logoUrl from '@/assets/images/logo_dark.png'

const route = useRoute()
const { sidebarItems } = useNavigationItems()

const footerItems = computed(() => [
  {
    label: 'Settings',
    icon: 'i-fa6-solid:gear',
    to: '/settings',
    active: route.path === '/settings',
  },
])
</script>

<template>
  <aside class="flex flex-col w-64 min-w-64 h-full bg-[rgba(9,9,11,0.95)] border-r border-white/10 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]">
    <div class="flex items-center gap-3 px-4 py-5 border-b border-white/5">
      <img
        :src="logoUrl"
        alt="FitTime"
        class="h-7"
      />
    </div>

    <nav class="flex-1 overflow-y-auto py-3 px-2 pb-12">
      <UNavigationMenu
        :items="sidebarItems"
        orientation="vertical"
        highlight
        color="primary"
      />
    </nav>

    <div class="border-t border-white/5 py-3 px-2 pb-[env(safe-area-inset-bottom)]">
      <UNavigationMenu
        :items="footerItems"
        orientation="vertical"
        highlight
        color="primary"
      />
    </div>
  </aside>
</template>
