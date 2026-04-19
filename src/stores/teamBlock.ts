import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type TeamBlock = components['schemas']['TeamBlockResponseDto']

export const useTeamBlockStore = defineStore('teamBlock', () => {
  const blocksByTeam = ref<Map<string, TeamBlock[]>>(new Map())
  const loading = ref(false)

  async function fetchForTeam(teamId: string) {
    loading.value = true
    try {
      const { data, error } = await apiClient.GET('/v1/teams/{teamId}/blocks', {
        params: { path: { teamId } },
      })
      if (error) throw new Error(getErrorMessage(error, 'Failed to load blocked teams'))
      blocksByTeam.value.set(teamId, data ?? [])
    } finally {
      loading.value = false
    }
  }

  async function block(teamId: string, blockedTeamId: string): Promise<TeamBlock> {
    const { data, error } = await apiClient.POST('/v1/teams/{teamId}/blocks', {
      params: { path: { teamId } },
      body: { blockedTeamId },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to block team'))
    const list = blocksByTeam.value.get(teamId) ?? []
    blocksByTeam.value.set(teamId, [data, ...list.filter((b) => b.blockedTeamId !== blockedTeamId)])
    return data
  }

  async function unblock(teamId: string, blockedTeamId: string) {
    const { error } = await apiClient.DELETE('/v1/teams/{teamId}/blocks/{blockedTeamId}', {
      params: { path: { teamId, blockedTeamId } },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to unblock team'))
    const list = blocksByTeam.value.get(teamId) ?? []
    blocksByTeam.value.set(
      teamId,
      list.filter((b) => b.blockedTeamId !== blockedTeamId),
    )
  }

  function $reset() {
    blocksByTeam.value.clear()
    loading.value = false
  }

  return {
    blocksByTeam,
    loading,
    fetchForTeam,
    block,
    unblock,
    $reset,
  }
})
