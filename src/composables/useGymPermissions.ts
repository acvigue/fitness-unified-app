import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMyTeamsStore } from '@/stores/myTeams'
import { useOrganizationStore } from '@/stores/organization'

export function useGymPermissions(organizationId: MaybeRefOrGetter<string | null | undefined>) {
  const myTeams = useMyTeamsStore()
  const orgStore = useOrganizationStore()

  const orgRole = computed(() => {
    const orgId = toValue(organizationId)
    if (!orgId) return null
    return orgStore.memberships.find((m) => m.organizationId === orgId)?.role ?? null
  })

  const canManage = computed(() => orgRole.value === 'STAFF' || orgRole.value === 'ADMIN')

  const canReserve = computed(() => myTeams.isCaptain)

  const captainTeams = computed(() => myTeams.captainTeams)

  return {
    orgRole,
    canManage,
    canReserve,
    captainTeams,
  }
}

export function useHasStaffRoleAnywhere() {
  const orgStore = useOrganizationStore()
  return computed(() => orgStore.memberships.some((m) => m.role === 'STAFF' || m.role === 'ADMIN'))
}
