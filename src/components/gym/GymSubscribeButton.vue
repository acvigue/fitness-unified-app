<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useGymSubscriptionStore } from '@/stores/gymSubscriptions'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{ gymId: string }>()

const store = useGymSubscriptionStore()
const toast = useToastStore()

const subscribed = computed(() => store.isSubscribed(props.gymId))

async function toggle() {
  try {
    await store.toggle(props.gymId)
    toast.info(subscribed.value ? 'Subscribed to gym' : 'Unsubscribed from gym')
  } catch (e) {
    toast.error('Could not toggle subscription', (e as Error).message)
  }
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
    @click="toggle"
  >
    {{ subscribed ? 'Unsubscribe' : 'Watch this gym' }}
  </UButton>
</template>
