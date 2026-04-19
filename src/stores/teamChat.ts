import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type TeamChat = components['schemas']['TeamChatResponseDto']

export const useTeamChatStore = defineStore('teamChat', () => {
  const chatsByTeam = ref<Map<string, TeamChat[]>>(new Map())
  const loading = ref(false)

  async function fetchForTeam(teamId: string) {
    loading.value = true
    try {
      const { data, error } = await apiClient.GET('/v1/team-chats/team/{teamId}', {
        params: { path: { teamId } },
      })
      if (error) throw new Error(getErrorMessage(error, 'Failed to load team chats'))
      chatsByTeam.value.set(teamId, data ?? [])
    } finally {
      loading.value = false
    }
  }

  async function createOrGet(fromTeamId: string, toTeamId: string): Promise<TeamChat> {
    const { data, error } = await apiClient.POST('/v1/team-chats', {
      body: { fromTeamId, toTeamId },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to open team chat'))
    // Upsert into both teams' lists if already populated
    for (const tid of [data.team1Id, data.team2Id]) {
      const list = chatsByTeam.value.get(tid)
      if (!list) continue
      const idx = list.findIndex((c) => c.id === data.id)
      if (idx >= 0) list.splice(idx, 1, data)
      else list.unshift(data)
    }
    return data
  }

  async function sendMessage(chatId: string, content: string, mediaIds?: string[]) {
    const { data, error } = await apiClient.POST('/v1/team-chats/{chatId}/messages', {
      params: { path: { chatId } },
      body: { content, ...(mediaIds?.length ? { mediaIds } : {}) },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to send team message'))
    return data
  }

  function $reset() {
    chatsByTeam.value.clear()
    loading.value = false
  }

  return {
    chatsByTeam,
    loading,
    fetchForTeam,
    createOrGet,
    sendMessage,
    $reset,
  }
})
