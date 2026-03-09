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
            <UButton icon="i-lucide-book-open" variant="soft" @click="openDocs">
              Documentation
            </UButton>
            <UButton
              icon="i-lucide-settings"
              variant="soft"
              @click="openSettings"
              ref="settingsref"
            >
              Settings
            </UButton>
          </div>
        </div>
      </div>
    </section>
  </PageLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, useTemplateRef, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useShepherd } from 'vue-shepherd'
import { useGuideRefsStore } from '@/stores/guide'

import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const refStore = useGuideRefsStore()

const docRef = useTemplateRef('docref')
const settingsRef = useTemplateRef('settingsref')

const tour = useShepherd({
  useModalOverlay: true,
})

useHead({
  title: t('home.home'),
  meta: [{ name: 'description', content: 'Welcome to your app' }],
})

const router = useRouter()
const { setHeader } = usePageHeader()

const openDocs = () => {
  // Replace with your documentation URL
  window.open('https://github.com/yourusername/yourproject', '_blank')
}

const openSettings = () => {
  router.push('/settings')
}

onMounted(() => {
  setHeader({
    title: 'Home',
  })
  console.log('ref value:')
  console.log(refStore.getSidebar)

  tour.addStep({
    attachTo: { element: refStore.getSidebar, on: 'bottom' },
    buttons: [
      {
        action() {
          return tour.cancel()
        },
        secondary: true,
        text: 'Exit',
      },
    ],
    text: 'Test step',
  })

  tour.start()
})
</script>
