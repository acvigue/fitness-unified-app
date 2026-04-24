<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useGymSubscriptionStore } from '@/stores/gymSubscriptions'
import { useToastStore } from '@/stores/toast'
import { getErrorMessage } from '@/lib/api/errors'

useHead({ title: 'Watched gyms' })

const { setHeader } = usePageHeader()
const store = useGymSubscriptionStore()
const toast = useToastStore()

const confirmOpen = ref(false)
const confirmLoading = ref(false)
const pendingGymId = ref<string | null>(null)

function askUnsubscribe(gymId: string) {
  pendingGymId.value = gymId
  confirmOpen.value = true
}

async function confirmUnsubscribe() {
  if (!pendingGymId.value) return
  confirmLoading.value = true
  try {
    await store.unsubscribe(pendingGymId.value)
    toast.info('Unsubscribed from gym')
    confirmOpen.value = false
    pendingGymId.value = null
  } catch (e) {
    toast.error('Could not unsubscribe', getErrorMessage(e, 'Failed to unsubscribe'))
  } finally {
    confirmLoading.value = false
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

      <div v-if="store.loading && store.subscriptions.length === 0" class="flex flex-col gap-2">
        <div
          v-for="n in 3"
          :key="n"
          class="h-14 rounded-lg border border-white/10 bg-white/5 animate-pulse"
        />
      </div>

      <div
        v-else-if="store.subscriptions.length === 0"
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-8 text-center"
      >
        <UIcon name="i-lucide-bell-off" class="size-8 text-white/40" />
        <p class="text-sm font-medium text-white/70">No subscriptions yet</p>
        <p class="text-xs text-white/50">Find a gym near you to start watching.</p>
        <UButton
          class="mt-2"
          size="sm"
          icon="i-lucide-dumbbell"
          variant="outline"
          color="neutral"
          to="/gyms"
        >
          Browse gyms
        </UButton>
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="sub in store.subscriptions"
          :key="sub.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
        >
          <div class="min-w-0">
            <RouterLink
              :to="`/gyms?gymId=${sub.gymId}`"
              class="text-sm font-medium truncate hover:text-primary transition-colors block"
            >
              Gym · {{ sub.gymId.slice(0, 8) }}
            </RouterLink>
            <p class="text-xs text-white/50">
              Watched since {{ new Date(sub.createdAt).toLocaleDateString() }}
            </p>
          </div>
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            icon="i-lucide-bell-off"
            aria-label="Unsubscribe from gym"
            @click="askUnsubscribe(sub.gymId)"
          >
            Unsubscribe
          </UButton>
        </li>
      </ul>
    </section>

    <UModal v-model:open="confirmOpen" :dismissible="!confirmLoading">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <div class="rounded-full bg-error/10 p-2 shrink-0">
              <UIcon name="i-lucide-bell-off" class="size-5 text-error" />
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <h2 class="text-lg font-semibold">Unsubscribe from gym?</h2>
              <p class="text-sm text-white/60">
                You'll stop receiving updates when this gym's availability changes.
              </p>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="confirmLoading"
              @click="confirmOpen = false"
            >
              Cancel
            </UButton>
            <UButton color="error" :loading="confirmLoading" @click="confirmUnsubscribe">
              Unsubscribe
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
