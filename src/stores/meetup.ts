import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Meetup = components['schemas']['MeetupResponseDto']
type CreateMeetup = components['schemas']['CreateMeetupDto']

export const useMeetupStore = defineStore('meetup', () => {
  const meetupsByTeam = ref<Map<string, Meetup[]>>(new Map())
  const loading = ref(false)

  async function fetchForTeam(teamId: string) {
    loading.value = true
    try {
      const { data, error } = await apiClient.GET('/v1/meetups/team/{teamId}', {
        params: { path: { teamId } },
      })
      if (error) throw new Error(getErrorMessage(error, 'Failed to load meetups'))
      meetupsByTeam.value.set(teamId, data?.data ?? [])
    } finally {
      loading.value = false
    }
  }

  async function propose(dto: CreateMeetup): Promise<Meetup> {
    const { data, error } = await apiClient.POST('/v1/meetups', { body: dto })
    if (error) throw new Error(getErrorMessage(error, 'Failed to propose meetup'))
    upsert(data)
    return data
  }

  async function accept(id: string): Promise<Meetup> {
    const { data, error } = await apiClient.PATCH('/v1/meetups/{id}/accept', {
      params: { path: { id } },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to accept meetup'))
    upsert(data)
    return data
  }

  async function decline(id: string): Promise<Meetup> {
    const { data, error } = await apiClient.PATCH('/v1/meetups/{id}/decline', {
      params: { path: { id } },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to decline meetup'))
    upsert(data)
    return data
  }

  async function cancel(id: string): Promise<Meetup> {
    const { data, error } = await apiClient.PATCH('/v1/meetups/{id}/cancel', {
      params: { path: { id } },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to cancel meetup'))
    upsert(data)
    return data
  }

  function upsert(meetup: Meetup) {
    for (const teamId of [meetup.proposingTeamId, meetup.receivingTeamId]) {
      const list = meetupsByTeam.value.get(teamId)
      if (!list) continue
      const idx = list.findIndex((m) => m.id === meetup.id)
      if (idx >= 0) list.splice(idx, 1, meetup)
      else list.unshift(meetup)
    }
  }

  function $reset() {
    meetupsByTeam.value.clear()
    loading.value = false
  }

  return {
    meetupsByTeam,
    loading,
    fetchForTeam,
    propose,
    accept,
    decline,
    cancel,
    $reset,
  }
})
