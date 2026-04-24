<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useGymSubscriptionStore } from '@/stores/gymSubscriptions'
import { useToastStore } from '@/stores/toast'
import { getErrorMessage } from '@/lib/api/errors'

const props = defineProps<{ gymId: string }>()

const store = useGymSubscriptionStore()
const toast = useToastStore()

const subscribed = computed(() => store.isSubscribed(props.gymId))
const loading = ref(false)
const confirmOpen = ref(false)

async function runToggle() {
  loading.value = true
  const wasSubscribed = subscribed.value
  try {
    await store.toggle(props.gymId)
    toast.info(wasSubscribed ? 'Unsubscribed from gym' : 'Subscribed to gym')
    confirmOpen.value = false
  } catch (e) {
    toast.error('Could not update subscription', getErrorMessage(e, 'Failed to update'))
  } finally {
    loading.value = false
  }
}

function onClick() {
  if (subscribed.value) {
    confirmOpen.value = true
    return
  }
  runToggle()
}

onMounted(() => {
  if (!store.initialized) store.load()
})
</script>

<template>
  <UButton
    :icon="subscribed ? 'i-lucide-bell-off' : 'i-lucide-bell'"
    :color="subscribed ? 'neutral' : 'primary'"
    :variant="subscribed ? 'outline' : 'solid'"
    size="sm"
    :loading="loading"
    :aria-label="subscribed ? 'Unsubscribe from gym' : 'Subscribe to gym'"
    @click="onClick"
  >
    {{ subscribed ? 'Unsubscribe' : 'Watch this gym' }}
  </UButton>

  <UModal v-model:open="confirmOpen" :dismissible="!loading">
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
          <UButton variant="ghost" color="neutral" :disabled="loading" @click="confirmOpen = false">
            Cancel
          </UButton>
          <UButton color="error" :loading="loading" @click="runToggle"> Unsubscribe </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
