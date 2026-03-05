import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

export type Sport = components['schemas']['SportResponseDto']

export const sportsApi = {
  async getAll(): Promise<Sport[]> {
    const { data, error } = await apiClient.GET('/v1/sports')
    if (error) throw new Error(getErrorMessage(error, 'Failed to load sports'))
    return data
  },
}
