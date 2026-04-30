import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useOrganizationStore } from '@/stores/organization'

export function useTournamentPermissions(
  organizationId: MaybeRefOrGetter<string | null | undefined>,
) {
  const orgStore = useOrganizationStore()

  const orgRole = computed(() => {
    const orgId = toValue(organizationId)
    if (!orgId) return null
    return orgStore.memberships.find((m) => m.organizationId === orgId)?.role ?? null
  })

  const canManage = computed(() => orgRole.value === 'STAFF' || orgRole.value === 'ADMIN')

  return {
    orgRole,
    canManage,
  }
}
