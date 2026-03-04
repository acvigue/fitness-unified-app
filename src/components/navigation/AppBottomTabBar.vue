<script setup lang="ts">
import { useNavigationItems } from '@/composables/useNavigationItems'

const { items, isActive } = useNavigationItems()
</script>

<template>
  <nav
    class="flex items-center justify-around bg-[rgba(9,9,11,0.95)] backdrop-blur-xl border-t border-white/10 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-[env(safe-area-inset-left)]"
  >
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center justify-center gap-1 flex-1 py-1 no-underline transition-colors duration-150"
      :class="isActive(item.to) ? 'text-[var(--ui-color-primary-500)]' : 'text-white/50'"
    >
      <UIcon :name="item.icon" class="text-xl" />
      <span class="text-[0.625rem] font-medium leading-none">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
