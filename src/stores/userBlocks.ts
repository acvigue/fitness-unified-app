import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'

interface UserBlock {
  id: string
  blockerId: string
  blockedId: string
  createdAt: string
}

export const useUserBlockStore = defineStore('userBlocks', () => {
  const blocks = ref<UserBlock[]>([])
  const loading = ref(false)
  const initialized = ref(false)

  const blockedSet = computed(() => new Set(blocks.value.map((b) => b.blockedId)))

  function isBlocking(userId: string) {
    return blockedSet.value.has(userId)
  }

  async function load() {
    loading.value = true
    try {
      const { data } = await apiClient.GET('/v1/users/me/blocks')
      if (Array.isArray(data)) blocks.value = data as UserBlock[]
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function block(userId: string) {
    const { data } = await apiClient.POST('/v1/users/{userId}/block', {
      params: { path: { userId } },
    })
    if (data) {
      blocks.value.push(data as UserBlock)
    }
  }

  async function unblock(userId: string) {
    await apiClient.DELETE('/v1/users/{userId}/block', {
      params: { path: { userId } },
    })
    blocks.value = blocks.value.filter((b) => b.blockedId !== userId)
  }

  function $reset() {
    blocks.value = []
    initialized.value = false
  }

  return {
    blocks,
    loading,
    initialized,
    blockedSet,
    isBlocking,
    load,
    block,
    unblock,
    $reset,
  }
})
