import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/auth/auth'
import type { components } from '@/types/api'

type Team = components['schemas']['TeamResponseDto']

export const useMyTeamsStore = defineStore('myTeams', () => {
  const authStore = useAuthStore()
  const teams = ref<Team[]>([])
  const loading = ref(false)
  const initialized = ref(false)

  const captainTeams = computed(() => {
    const sub = authStore.user?.sub
    if (!sub) return []
    return teams.value.filter((t) => t.captainId === sub)
  })

  const isCaptain = computed(() => captainTeams.value.length > 0)

  async function load(force = false) {
    if (initialized.value && !force) return
    loading.value = true
    try {
      const { data } = await apiClient.GET('/v1/teams')
      teams.value = data?.data ?? []
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    teams.value = []
    loading.value = false
    initialized.value = false
  }

  return {
    teams,
    loading,
    initialized,
    captainTeams,
    isCaptain,
    load,
    $reset,
  }
})
