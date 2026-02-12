<template>
  <PageLayout>
    <section class="flex flex-col gap-6 px-5 py-6">
      <div class="rounded-lg border border-dashed border-white/20 p-12 text-center">
        <div class="mx-auto max-w-md space-y-4">
          <h2 class="text-2xl font-semibold">Welcome to Your App</h2>
          <p class="text-white/70">
            This is a generic Vue 3 + TypeScript template with OAuth authentication and OpenAPI
            integration. Start building your app by modifying this home view.
          </p>
          <div class="flex justify-center gap-3 pt-4">
            <UButton icon="i-fa6-solid:book" variant="soft" @click="openDocs">
              Documentation
            </UButton>
            <UButton icon="i-fa6-solid:gear" variant="soft" @click="openSettings">
              Settings
            </UButton>
          </div>
        </div>
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

useHead({
  title: 'Home',
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
    actions: [{ icon: 'i-fa6-solid:gear', onClick: () => router.push('/settings') }],
  })
})
</script>
