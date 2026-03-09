import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useAuthStore } from '@/stores/auth/auth'

export const SessionsApi = {
  async getSessions() {
    const token = await useAuthStore().getAccessToken()

    if (!token) throw new Error('No access token available')

    const { data, error } = await apiClient.GET('/v1/sessions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (error) throw new Error(getErrorMessage(error, 'Failed to fetch sessions'))

    return data
  },

  async revokeSession(id: string) {
    const token = await useAuthStore().getAccessToken()

    if (!token) throw new Error('No access token available')

    const { error } = await apiClient.POST('/v1/sessions/{id}/revoke', {
      params: { path: { id } },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (error) throw new Error(getErrorMessage(error, 'Failed to revoke session'))
  },
}
