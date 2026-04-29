<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNavigationItems } from '@/composables/useNavigationItems'

const { primaryItems, secondaryItems, isActive } = useNavigationItems()

const moreOpen = ref(false)
const moreActive = computed(() => secondaryItems.value.some((i) => isActive(i.to)))

function navTabClass(active: boolean) {
  return [
    'flex flex-col items-center justify-center gap-1 flex-1 py-1 no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-color-primary-500)] rounded-md',
    active ? 'text-[var(--ui-color-primary-500)]' : 'text-white/50 hover:text-white/80',
  ]
}
</script>

<template>
  <nav
    aria-label="Primary"
    class="flex items-center justify-around bg-[rgba(9,9,11,0.95)] backdrop-blur-xl border-t border-white/10 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-[env(safe-area-inset-left)]"
  >
    <RouterLink
      v-for="item in primaryItems"
      :key="item.to"
      :to="item.to"
      :aria-label="item.label"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      :class="navTabClass(isActive(item.to))"
    >
      <UIcon :name="item.icon" class="text-xl" aria-hidden="true" />
      <span class="text-[0.625rem] font-medium leading-none">{{ item.label }}</span>
    </RouterLink>

    <button
      type="button"
      aria-label="More"
      :aria-expanded="moreOpen"
      :class="navTabClass(moreActive)"
      @click="moreOpen = true"
    >
      <UIcon name="i-lucide-menu" class="text-xl" aria-hidden="true" />
      <span class="text-[0.625rem] font-medium leading-none">More</span>
    </button>
  </nav>

  <UModal v-model:open="moreOpen" title="More">
    <template #body>
      <div class="flex flex-col gap-1">
        <RouterLink
          v-for="item in secondaryItems"
          :key="item.to"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="flex items-center gap-3 px-3 py-3 rounded-md no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-color-primary-500)]"
          :class="
            isActive(item.to)
              ? 'bg-[var(--ui-color-primary-500)]/10 text-[var(--ui-color-primary-500)]'
              : 'text-white/80 hover:bg-white/5'
          "
          @click="moreOpen = false"
        >
          <UIcon :name="item.icon" class="text-lg shrink-0" aria-hidden="true" />
          <span class="text-sm font-medium">{{ item.label }}</span>
        </RouterLink>
      </div>
    </template>
  </UModal>
</template>
