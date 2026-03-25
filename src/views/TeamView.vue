<template>
  <PageLayout>
    <section class="flex flex-col gap-6 px-5 py-6">
      <div class="rounded-lg border border-white/10 bg-white/5 p-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold">Team</h1>
            <p class="mt-1 text-white/70">
              Create and manage your team here.
            </p>
          </div>

          <UButton icon="i-lucide-plus">
            Create Team
          </UButton>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 class="text-lg font-semibold">My Team</h2>
          <p class="mt-2 text-sm text-white/70">
            Team information will appear here once connected to backend.
          </p>
        </div>

        <div class="rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 class="text-lg font-semibold">Invitations</h2>
          <p class="mt-2 text-sm text-white/70">
            Pending team invitations will appear here.
          </p>
        </div>
      </div>

      <div class="rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 class="text-lg font-semibold">Team Settings</h2>
        <p class="mt-2 text-sm text-white/70">
          Team settings and management actions will go here later.
        </p>
      </div>
    </section>
  </PageLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'

useHead({
  title: 'Team',
  meta: [{ name: 'description', content: 'Create and manage your team' }],
})

const { setHeader } = usePageHeader()

onMounted(() => {
  setHeader({
    title: 'Team',
  })
})
</script>