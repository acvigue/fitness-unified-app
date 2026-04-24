import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Broadcast = components['schemas']['BroadcastResponseDto']
type BroadcastStats = components['schemas']['BroadcastStatsResponseDto']

export const useBroadcastStore = defineStore('broadcasts', () => {
  const byTeam = ref<Map<string, Broadcast[]>>(new Map())
  const stats = ref<Map<string, BroadcastStats>>(new Map())
  const loading = ref(false)

  async function loadForTeam(teamId: string) {
    loading.value = true
    try {
      const { data, error } = await apiClient.GET('/v1/teams/{teamId}/broadcasts', {
        params: { path: { teamId } },
      })
      if (error) throw new Error(getErrorMessage(error, 'Failed to load broadcasts'))
      byTeam.value.set(teamId, data ?? [])
    } finally {
      loading.value = false
    }
  }

  async function send(teamId: string, content: string): Promise<Broadcast> {
    const { data, error } = await apiClient.POST('/v1/teams/{teamId}/broadcasts', {
      params: { path: { teamId } },
      body: { content },
    })
    if (error || !data) throw new Error(getErrorMessage(error, 'Failed to send broadcast'))
    const existing = byTeam.value.get(teamId) ?? []
    byTeam.value.set(teamId, [data, ...existing])
    return data
  }

  async function markRead(broadcastId: string): Promise<void> {
    await apiClient.POST('/v1/broadcasts/{id}/read', {
      params: { path: { id: broadcastId } },
    })
  }

  async function loadStats(broadcastId: string): Promise<BroadcastStats | null> {
    const { data, error } = await apiClient.GET('/v1/broadcasts/{id}/stats', {
      params: { path: { id: broadcastId } },
    })
    if (error || !data) return null
    stats.value.set(broadcastId, data)
    return data
  }

  function $reset() {
    byTeam.value = new Map()
    stats.value = new Map()
  }

  return {
    byTeam,
    stats,
    loading,
    loadForTeam,
    send,
    markRead,
    loadStats,
    $reset,
  }
})
