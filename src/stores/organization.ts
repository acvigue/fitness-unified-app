import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import type { components } from '@/types/api'

type UserMembershipResponseDto = components['schemas']['UserMembershipResponseDto']

export const useOrganizationStore = defineStore('organization', () => {
  const memberships = ref<UserMembershipResponseDto[]>([])
  const loading = ref(false)
  const initialized = ref(false)

  const hasMembership = computed(() => memberships.value.length > 0)
  const currentOrganization = computed(() => memberships.value[0] ?? null)

  async function fetchMemberships() {
    loading.value = true
    try {
      const { data, error } = await apiClient.GET('/v1/user/me/memberships')
      if (error) {
        console.error('Failed to fetch memberships:', error)
        return
      }
      memberships.value = data ?? []
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function createOrganization(name: string) {
    const { error } = await apiClient.POST('/v1/organizations', {
      body: { name },
    })
    if (error) {
      throw new Error('Failed to create organization')
    }
    // Creator is automatically added as ADMIN, just refresh memberships
    await fetchMemberships()
  }

  async function joinOrganization(id: string) {
    const { error } = await apiClient.POST('/v1/organizations/{id}/join', {
      params: { path: { id } },
    })
    if (error) {
      throw new Error('Failed to join organization')
    }
    await fetchMemberships()
  }

  function $reset() {
    memberships.value = []
    loading.value = false
    initialized.value = false
  }

  return {
    memberships,
    loading,
    initialized,
    hasMembership,
    currentOrganization,
    fetchMemberships,
    createOrganization,
    joinOrganization,
    $reset,
  }
})
