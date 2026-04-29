<template>
  <PageLayout>
    <section class="flex flex-col gap-6 px-5 py-6">
      <div class="rounded-lg border border-dashed border-white/20 p-12 text-center">
        <div class="mx-auto max-w-md space-y-4" ref="testref">
          <h2 class="text-2xl font-semibold">{{ t('home.welcome') }}</h2>
          <p class="text-white/70">
            This is a generic Vue 3 + TypeScript template with OAuth authentication and OpenAPI
            integration. Start building your app by modifying this home view.
          </p>
          <div class="flex justify-center gap-3 pt-4" ref="docref">
            <UButton
              icon="i-lucide-compass"
              variant="soft"
              aria-label="Start app guide"
              @click="openGuide"
            >
              Guide
            </UButton>
            <UButton
              icon="i-lucide-settings"
              variant="soft"
              aria-label="Open settings"
              @click="openSettings"
              ref="settingsref"
            >
              Settings
            </UButton>
          </div>
        </div>
      </div>

      <!-- Activity feed empty state -->
      <div
        class="rounded-lg border border-white/10 bg-white/5 p-8 text-center flex flex-col items-center gap-3"
      >
        <UIcon name="i-lucide-activity" class="size-8 text-white/40" />
        <p class="text-sm font-medium">No activity yet</p>
        <p class="text-xs text-white/60 max-w-sm">
          Follow friends or join a team to see their workouts and tournaments here.
        </p>
      </div>

      <!-- Workouts empty state -->
      <div
        class="rounded-lg border border-white/10 bg-white/5 p-8 text-center flex flex-col items-center gap-3"
      >
        <UIcon name="i-lucide-dumbbell" class="size-8 text-white/40" />
        <p class="text-sm font-medium">No workouts logged</p>
        <p class="text-xs text-white/60 max-w-sm">Log your first workout to get started.</p>
        <UButton
          size="sm"
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          @click="openWorkouts"
        >
          Go to workouts
        </UButton>
      </div>
    </section>
  </PageLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useShepherd } from 'vue-shepherd'

import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const tour = useShepherd({
  useModalOverlay: true,
})

useHead({
  title: t('home.home'),
  meta: [{ name: 'description', content: 'Welcome to your app' }],
})

const router = useRouter()
const { setHeader } = usePageHeader()

const openSettings = () => {
  router.push('/settings')
}
const openWorkouts = () => {
  router.push('/workouts')
}
const openGuide = () => {
  tour.start()
}

onMounted(() => {
  setHeader({
    title: 'Home',
  })

  tour.addStep({
    attachTo: { element: null, on: 'bottom' },
    buttons: [
      {
        action() {
          return tour.cancel()
        },
        secondary: true,
        text: 'Exit',
      },
      {
        action() {
          return tour.next()
        },
        text: 'Next',
      },
    ],
    text: 'Welcome to FitTime!',
  })
  tour.addStep({
    attachTo: { element: null, on: 'bottom' },
    buttons: [
      {
        action() {
          return tour.cancel()
        },
        secondary: true,
        text: 'Exit',
      },
      {
        action() {
          return tour.next()
        },
        text: 'Next',
      },
    ],
    text: 'On the left you can find buttons to go to Home (where you are now), Messenger (where you can message your friends and teammates), Workouts, Profile (for managing what others see), and Reports (for reporting bad stuff).',
  })
  tour.addStep({
    attachTo: { element: null, on: 'bottom' },
    buttons: [
      {
        action() {
          return tour.next()
        },
        text: 'Done',
      },
    ],
    text: 'At the very bottom left you can see the settings button.',
  })
})
</script>
