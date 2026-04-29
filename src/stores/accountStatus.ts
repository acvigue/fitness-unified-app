import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import type { components } from '@/types/api'

type AccountStatusResponse = components['schemas']['AccountStatusResponseDto']
type Restriction = AccountStatusResponse['restrictions'][number]
type RestrictionAction = Restriction['action']

export const useAccountStatusStore = defineStore('accountStatus', () => {
  const data = ref<AccountStatusResponse | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const status = computed(() => data.value?.status ?? 'ACTIVE')
  const isActive = computed(() => status.value === 'ACTIVE')
  const isSuspended = computed(() => status.value === 'SUSPENDED')
  const isBanned = computed(() => status.value === 'BANNED')
  const reason = computed(() => data.value?.reason ?? null)
  const suspendedUntil = computed(() => data.value?.suspendedUntil ?? null)
  const restrictions = computed<Restriction[]>(() => data.value?.restrictions ?? [])

  function isRestricted(action: RestrictionAction) {
    return restrictions.value.some((r) => r.action === action)
  }

  async function load(force = false) {
    if (initialized.value && !force) return
    loading.value = true
    try {
      const { data: resp, error } = await apiClient.GET('/v1/user/me/account-status')
      if (error) {
        console.error('Failed to load account status:', error)
        return
      }
      data.value = resp ?? null
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    data.value = null
    loading.value = false
    initialized.value = false
  }

  return {
    data,
    loading,
    initialized,
    status,
    isActive,
    isSuspended,
    isBanned,
    reason,
    suspendedUntil,
    restrictions,
    isRestricted,
    load,
    $reset,
  }
})
