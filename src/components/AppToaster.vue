<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const TONE_CLASSES: Record<string, string> = {
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
}

const TONE_ICONS: Record<string, string> = {
  info: 'i-lucide-info',
  success: 'i-lucide-check-circle',
  warning: 'i-lucide-alert-triangle',
  error: 'i-lucide-x-circle',
}
</script>

<template>
  <Teleport to="body">
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      class="pointer-events-none fixed bottom-4 right-4 z-[1000] flex flex-col gap-2"
    >
      <div
        v-for="t in toast.toasts"
        :key="t.id"
        class="pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border p-3 shadow-lg backdrop-blur"
        :class="TONE_CLASSES[t.tone]"
      >
        <UIcon :name="TONE_ICONS[t.tone]" class="mt-0.5 text-lg shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm">{{ t.title }}</p>
          <p v-if="t.description" class="text-xs opacity-80 mt-0.5">{{ t.description }}</p>
        </div>
        <button
          class="shrink-0 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
          @click="toast.dismiss(t.id)"
        >
          <UIcon name="i-lucide-x" class="text-sm" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
