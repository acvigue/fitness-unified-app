import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import type { components } from '@/types/api'

type Member = components['schemas']['OrganizationMemberListItemDto']
type Invitation = components['schemas']['OrganizationInvitationResponseDto']
type Role = Member['role']

export const useOrganizationMembersStore = defineStore('organizationMembers', () => {
  const orgId = ref<string | null>(null)
  const members = ref<Member[]>([])
  const invitations = ref<Invitation[]>([])
  const myInvitations = ref<Invitation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const adminCount = computed(() => members.value.filter((m) => m.role === 'ADMIN').length)

  async function loadFor(targetOrgId: string) {
    if (orgId.value === targetOrgId && members.value.length > 0) return
    orgId.value = targetOrgId
    loading.value = true
    error.value = null
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        apiClient.GET('/v1/organizations/{id}/members', {
          params: { path: { id: targetOrgId }, query: { page: 1, per_page: 200 } },
        }),
        apiClient.GET('/v1/organizations/{id}/invitations', {
          params: { path: { id: targetOrgId } },
        }),
      ])
      if (membersRes.error) {
        error.value = 'Failed to load members'
      }
      members.value = membersRes.data?.data ?? []
      // Invitations are STAFF/ADMIN only — silent failure for STAFF view if forbidden.
      if (invitationsRes.data) invitations.value = invitationsRes.data
    } finally {
      loading.value = false
    }
  }

  async function loadMyInvitations() {
    const { data, error: err } = await apiClient.GET('/v1/organizations/invitations/mine')
    if (err) return
    myInvitations.value = data ?? []
  }

  async function updateRole(userId: string, role: Role): Promise<Member | null> {
    if (!orgId.value) return null
    const idx = members.value.findIndex((m) => m.userId === userId)
    if (idx === -1) return null
    const previous = members.value[idx]
    // Optimistic update.
    members.value[idx] = { ...previous, role }
    const { data, error: err } = await apiClient.PATCH(
      '/v1/organizations/{id}/members/{userId}/role',
      {
        params: { path: { id: orgId.value, userId } },
        body: { role },
      },
    )
    if (err || !data) {
      // Roll back.
      members.value[idx] = previous
      throw err ?? new Error('Failed to update role')
    }
    members.value[idx] = data
    return data
  }

  async function removeMember(userId: string): Promise<void> {
    if (!orgId.value) return
    const { error: err } = await apiClient.DELETE('/v1/organizations/{id}/members/{userId}', {
      params: { path: { id: orgId.value, userId } },
    })
    if (err) throw err
    members.value = members.value.filter((m) => m.userId !== userId)
  }

  async function invite(invitedUserId: string, role: Role): Promise<Invitation> {
    if (!orgId.value) throw new Error('No organization selected')
    const { data, error: err } = await apiClient.POST('/v1/organizations/{id}/invitations', {
      params: { path: { id: orgId.value } },
      body: { invitedUserId, role },
    })
    if (err || !data) throw err ?? new Error('Failed to invite member')
    invitations.value = [data, ...invitations.value]
    return data
  }

  async function revokeInvitation(invitationId: string): Promise<void> {
    const { error: err } = await apiClient.DELETE(
      '/v1/organizations/invitations/{invitationId}',
      { params: { path: { invitationId } } },
    )
    if (err) throw err
    invitations.value = invitations.value.filter((i) => i.id !== invitationId)
  }

  async function acceptMyInvitation(invitationId: string): Promise<void> {
    const { error: err } = await apiClient.PATCH(
      '/v1/organizations/invitations/{invitationId}/accept',
      { params: { path: { invitationId } } },
    )
    if (err) throw err
    myInvitations.value = myInvitations.value.filter((i) => i.id !== invitationId)
  }

  async function declineMyInvitation(invitationId: string): Promise<void> {
    const { error: err } = await apiClient.PATCH(
      '/v1/organizations/invitations/{invitationId}/decline',
      { params: { path: { invitationId } } },
    )
    if (err) throw err
    myInvitations.value = myInvitations.value.filter((i) => i.id !== invitationId)
  }

  function $reset() {
    orgId.value = null
    members.value = []
    invitations.value = []
    myInvitations.value = []
    loading.value = false
    error.value = null
  }

  return {
    orgId,
    members,
    invitations,
    myInvitations,
    loading,
    error,
    adminCount,
    loadFor,
    loadMyInvitations,
    updateRole,
    removeMember,
    invite,
    revokeInvitation,
    acceptMyInvitation,
    declineMyInvitation,
    $reset,
  }
})
