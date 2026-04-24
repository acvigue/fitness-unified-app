<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useGymSubscriptionStore } from '@/stores/gymSubscriptions'
import { useToastStore } from '@/stores/toast'

useHead({ title: 'Watched gyms' })

const { setHeader } = usePageHeader()
const store = useGymSubscriptionStore()
const toast = useToastStore()

async function unsubscribe(gymId: string) {
  try {
    await store.unsubscribe(gymId)
    toast.info('Unsubscribed from gym')
  } catch (e) {
    toast.error('Could not unsubscribe', (e as Error).message)
  }
}

onMounted(() => {
  setHeader({ title: 'Watched gyms', backRoute: '/settings' })
  store.load()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <p class="text-sm text-white/60">
        We'll notify you when a subscribed gym's availability changes.
      </p>

      <div v-if="store.loading" class="flex justify-center p-4">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
      </div>

      <div
        v-else-if="store.subscriptions.length === 0"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        You aren't subscribed to any gyms yet. Visit a gym's page to start watching it.
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="sub in store.subscriptions"
          :key="sub.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{{ sub.gymId }}</p>
            <p class="text-xs text-white/50">
              Watched since {{ new Date(sub.createdAt).toLocaleDateString() }}
            </p>
          </div>
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            icon="i-lucide-bell-off"
            @click="unsubscribe(sub.gymId)"
          >
            Unsubscribe
          </UButton>
        </li>
      </ul>
    </section>
  </PageLayout>
</template>
