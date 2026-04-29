import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import type { components } from '@/types/api'

type CurrentUser = components['schemas']['UserResponseDto']
type SystemRole = NonNullable<CurrentUser['systemRole']>

const MOD_ROLES: SystemRole[] = ['DEPT_MANAGER', 'ADMIN']

export const useCurrentUserStore = defineStore('currentUser', () => {
  const user = ref<CurrentUser | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const systemRole = computed<SystemRole | null>(() => user.value?.systemRole ?? null)
  const isModerator = computed(() =>
    systemRole.value ? MOD_ROLES.includes(systemRole.value) : false,
  )
  const isSystemAdmin = computed(() => systemRole.value === 'ADMIN')

  async function load(force = false) {
    if (initialized.value && !force) return
    loading.value = true
    try {
      const { data, error } = await apiClient.GET('/v1/user/me')
      if (error) {
        console.error('Failed to load current user:', error)
        return
      }
      user.value = data ?? null
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    user.value = null
    loading.value = false
    initialized.value = false
  }

  return {
    user,
    loading,
    initialized,
    systemRole,
    isModerator,
    isSystemAdmin,
    load,
    $reset,
  }
})
