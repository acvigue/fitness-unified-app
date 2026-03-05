import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { ENV } from '@/config/environment'
import { useAuthStore } from '@/stores/auth/auth'
import type { components } from '@/types/api'

// ENV and useAuthStore still needed for uploadMedia (raw fetch)

// Re-export types from generated API types
export type UserProfile = components['schemas']['UserProfileResponseDto']
export type ProfilePicture = components['schemas']['UserProfilePictureDto']
export type Session = components['schemas']['KeycloakSessionResponseDto']
export type RevokeSessionsResponse = components['schemas']['RevokeSessionsResponseDto']
export type MediaUploadResponse = components['schemas']['MediaUploadResponseDto']

export const userApi = {
  async getProfile(): Promise<UserProfile> {
    const { data, error } = await apiClient.GET('/v1/user/profile')
    if (error) throw new Error(getErrorMessage(error, 'Failed to load profile'))
    return data
  },

  async updateProfile(body: { bio?: string; favoriteSportIds?: string[]; pictureIds?: string[] }): Promise<UserProfile> {
    const { data, error } = await apiClient.PATCH('/v1/user/profile', { body })
    if (error) throw new Error(getErrorMessage(error, 'Failed to update profile'))
    return data
  },

  async uploadMedia(file: File): Promise<MediaUploadResponse> {
    const authStore = useAuthStore()
    const token = await authStore.getAccessToken()
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${ENV.apiBaseUrl}/v1/utils/media-upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(getErrorMessage(body, 'Failed to upload media'))
    }
    return response.json()
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

  async deactivateAccount(): Promise<void> {
    const { error } = await apiClient.POST('/v1/user/me/deactivate')
    if (error) throw new Error(getErrorMessage(error, 'Failed to deactivate account'))
  },

  async deleteAccount(): Promise<void> {
    const { error } = await apiClient.DELETE('/v1/user/me')
    if (error) throw new Error(getErrorMessage(error, 'Failed to delete account'))
  },
}
