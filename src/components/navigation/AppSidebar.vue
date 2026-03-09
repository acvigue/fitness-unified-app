<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { useNavigationItems } from '@/composables/useNavigationItems'
import logoUrl from '@/assets/images/logo_dark.png'
import { useGuideRefsStore } from '@/stores/guide'

const route = useRoute()
const { sidebarItems } = useNavigationItems()

const footerItems = computed(() => [
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings',
    active: route.path === '/settings',
  },
])

const sidebarRef = useTemplateRef('sidebarref')

const store = useGuideRefsStore()

onMounted(() => {
  console.log('sidebarmounted')
  console.log(sidebarRef.value)
  console.log(sidebarRef.value.$el)
  store.setSidebar(sidebarRef.value.$el)
  console.log(store.getSidebar)
})
</script>

<template>
  <aside
    class="flex flex-col w-64 min-w-64 h-full bg-[rgba(9,9,11,0.95)] border-r border-white/10 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]"
  >
    <div class="flex items-center gap-3 px-4 py-5 border-b border-white/5">
      <img :src="logoUrl" alt="FitTime" class="h-7" />
    </div>

    <nav class="flex-1 overflow-y-auto py-3 px-2 pb-12">
      <UNavigationMenu
        :items="sidebarItems"
        orientation="vertical"
        highlight
        color="primary"
        ref="sidebarref"
      />
    </nav>

    <div class="border-t border-white/5 py-3 px-2 pb-[env(safe-area-inset-bottom)]">
      <UNavigationMenu :items="footerItems" orientation="vertical" highlight color="primary" />
    </div>
  </aside>
</template>
