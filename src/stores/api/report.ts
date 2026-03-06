import type { components } from '@/types/api'
import { getErrorMessage } from '@/lib/api/errors'
import { apiClient } from '@/lib/api/client'

export type Report = components['schemas']['ReportResponseDto']

export const ReportApi = {
  async submitReport(reporterId: string, reportedUserId: string, reason: string): Promise<void> {
    const now = new Date()
    const { error } = await apiClient.POST('/v1/report', {
      body: {
        reporterId,
        reportedId: reportedUserId,
        reason,
        status: 'PENDING',
        createdAt: now.toISOString(),
      },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to submit report'))
  },

  async getReportsForUser(): Promise<Report[]> {
    const { data, error } = await apiClient.GET('/v1/report/user')
    if (error) throw new Error(getErrorMessage(error, 'Failed to load reports'))
    return Array.isArray(data) ? data : [data]
  },
}
