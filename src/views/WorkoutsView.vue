<script setup lang="ts">
import { onMounted } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const { setHeader } = usePageHeader()

onMounted(() => {
  setHeader({ title: t('workouts.workouts') })
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-1 items-center justify-center px-5 py-12">
      <div
        class="w-full max-w-md rounded-lg border border-dashed border-white/20 p-10 text-center flex flex-col items-center gap-4"
      >
        <UIcon name="i-lucide-dumbbell" class="size-10 text-white/40" />
        <div class="space-y-1">
          <p class="text-lg font-semibold">No workouts yet</p>
          <p class="text-sm text-white/60">Log your first workout to get started.</p>
        </div>
        <UButton color="primary" icon="i-lucide-plus" aria-label="Log a workout" disabled>
          Log workout
        </UButton>
        <p class="text-xs text-white/40">Workout logging is coming soon.</p>
      </div>
    </section>
  </PageLayout>
</template>
