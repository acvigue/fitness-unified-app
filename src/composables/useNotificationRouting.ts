import { useRouter } from 'vue-router'
import type { components } from '@/types/api'
import { useNotificationStore } from '@/stores/notifications'

type Notification = components['schemas']['NotificationResponseDto']

type Metadata = Record<string, unknown> | null | undefined

function m<T = string>(meta: Metadata, key: string): T | undefined {
  if (!meta || typeof meta !== 'object') return undefined
  return (meta as Record<string, unknown>)[key] as T | undefined
}

export function useNotificationRouting() {
  const router = useRouter()
  const store = useNotificationStore()

  async function open(n: Notification) {
    if (!n.readAt) {
      store.markRead(n.id).catch(() => undefined)
    }

    const meta = n.metadata as Metadata

    switch (n.type) {
      case 'TEAM_BROADCAST': {
        const teamId = m(meta, 'teamId')
        if (teamId) return router.push(`/teams/${teamId}/broadcasts`)
        return
      }
      case 'TOURNAMENT_REMINDER': {
        const tournamentId = m(meta, 'tournamentId')
        if (tournamentId) return router.push(`/tournaments/${tournamentId}`)
        return
      }
      case 'GYM_STATUS_CHANGED': {
        const gymId = m(meta, 'gymId')
        if (gymId) return router.push(`/gyms/${gymId}`)
        return
      }
      case 'TEAM_INVITE':
      case 'TEAM_JOIN_REQUEST':
      case 'TEAM_INVITE_RESPONSE':
      case 'TEAM_REQUEST_RESPONSE':
        return router.push('/team')
      case 'MEETUP_ACCEPTED':
      case 'MEETUP_DECLINED':
      case 'MEETUP_CANCELLED':
      case 'MEETUP_PROPOSAL': {
        const teamId = m(meta, 'teamId')
        return teamId ? router.push(`/teams/${teamId}/meetups`) : router.push('/notifications')
      }
      case 'ACHIEVEMENT_UNLOCKED':
        return router.push('/achievements')
      case 'MESSAGE_FLAGGED':
      case 'MESSAGE_DELETED':
      case 'ACCOUNT_SUSPENDED':
      case 'ACCOUNT_UNSUSPENDED':
      case 'ACCOUNT_BANNED':
      case 'ACCOUNT_RESTRICTED':
        return router.push('/settings')
      default:
        return
    }
  }

  return { open }
}
