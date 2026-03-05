import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { ENV } from '@/config/environment'
import { useAuthStore } from '@/stores/auth/auth'
import type { components } from '@/types/api'

// Re-export types from generated API types
export type UserProfile = components['schemas']['UserProfileResponseDto']
export type ProfilePicture = components['schemas']['UserProfilePictureDto']
export type Session = components['schemas']['KeycloakSessionResponseDto']
export type RevokeSessionsResponse = components['schemas']['RevokeSessionsResponseDto']

export const userApi = {
  async getProfile(): Promise<UserProfile> {
    const { data, error } = await apiClient.GET('/v1/user/profile')
    if (error) throw new Error(getErrorMessage(error, 'Failed to load profile'))
    return data
  },

  async updateProfile(body: { bio?: string; favoriteSports?: string[] }): Promise<UserProfile> {
    const { data, error } = await apiClient.PATCH('/v1/user/profile', { body })
    if (error) throw new Error(getErrorMessage(error, 'Failed to update profile'))
    return data
  },

  async getSessions(): Promise<Session[]> {
    const { data, error } = await apiClient.GET('/v1/user/sessions')
    if (error) throw new Error(getErrorMessage(error, 'Failed to load sessions'))
    return data
  },

  async revokeSession(id: string): Promise<void> {
    const { error } = await apiClient.DELETE('/v1/user/sessions/{id}', {
      params: { path: { id } },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to revoke session'))
  },

  async enrichSession(refreshToken: string): Promise<void> {
    const { error } = await apiClient.POST('/v1/user/sessions/enrich', {
      body: { refreshToken },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to enrich session'))
  },

  async revokeAllSessions(): Promise<RevokeSessionsResponse> {
    const { data, error } = await apiClient.POST('/v1/user/sessions/logout')
    if (error) throw new Error(getErrorMessage(error, 'Failed to revoke all sessions'))
    return data
  },

  // These endpoints are not in the OpenAPI spec (no /v1/ prefix).
  // Use raw fetch with auth token until they are added to the spec.
  async deactivateAccount(password: string): Promise<void> {
    const authStore = useAuthStore()
    const token = await authStore.getAccessToken()
    const response = await fetch(`${ENV.apiBaseUrl}/users/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ password }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(getErrorMessage(body, 'Failed to deactivate account'))
    }
  },

  async deleteAccount(password: string): Promise<void> {
    const authStore = useAuthStore()
    const token = await authStore.getAccessToken()
    const response = await fetch(`${ENV.apiBaseUrl}/users/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ password }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(getErrorMessage(body, 'Failed to delete account'))
    }
  },
}
