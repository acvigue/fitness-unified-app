<script setup lang="ts">
defineProps<{
  id: string
  name: string
  avatar?: string | null
  lastMessage: string
  timestamp: string
  unread: number
  isGroup?: boolean
  active?: boolean
}>()
</script>

<template>
  <RouterLink
    :to="`/messenger/${id}`"
    class="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-white/5"
    :class="active ? 'bg-white/5' : ''"
  >
    <UAvatar
      :icon="isGroup ? 'i-lucide-users' : 'i-lucide-user'"
      :src="avatar ?? undefined"
      :alt="name"
      size="lg"
    />

    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium text-sm truncate">{{ name }}</span>
        <span class="text-xs text-white/40 shrink-0">{{ timestamp }}</span>
      </div>
      <div class="flex items-center justify-between gap-2 mt-0.5">
        <span class="text-xs text-white/50 truncate">{{ lastMessage }}</span>
        <span
          v-if="unread > 0"
          class="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ui-color-primary-500)] text-[0.625rem] font-bold text-white"
        >
          {{ unread }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>
