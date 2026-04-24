import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'

// Type is not emitted in OpenAPI output (service returns a plain object literal),
// so we mirror it locally.
interface GymSubscription {
  id: string
  gymId: string
  userId: string
  createdAt: string
}

export const useGymSubscriptionStore = defineStore('gymSubscriptions', () => {
  const subscriptions = ref<GymSubscription[]>([])
  const loading = ref(false)
  const initialized = ref(false)

  const subscribedGymIds = computed(() => new Set(subscriptions.value.map((s) => s.gymId)))

  function isSubscribed(gymId: string) {
    return subscribedGymIds.value.has(gymId)
  }

  async function load() {
    loading.value = true
    try {
      const { data } = await apiClient.GET('/v1/gyms/subscriptions')
      if (Array.isArray(data)) {
        subscriptions.value = data as GymSubscription[]
      }
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function subscribe(gymId: string) {
    const { data } = await apiClient.POST('/v1/gyms/{id}/subscribe', {
      params: { path: { id: gymId } },
    })
    if (data) {
      subscriptions.value.push(data as GymSubscription)
    }
  }

  async function unsubscribe(gymId: string) {
    await apiClient.DELETE('/v1/gyms/{id}/subscribe', {
      params: { path: { id: gymId } },
    })
    subscriptions.value = subscriptions.value.filter((s) => s.gymId !== gymId)
  }

  async function toggle(gymId: string) {
    if (isSubscribed(gymId)) {
      await unsubscribe(gymId)
    } else {
      await subscribe(gymId)
    }
  }

  function $reset() {
    subscriptions.value = []
    initialized.value = false
  }

  return {
    subscriptions,
    loading,
    initialized,
    subscribedGymIds,
    isSubscribed,
    load,
    subscribe,
    unsubscribe,
    toggle,
    $reset,
  }
})
