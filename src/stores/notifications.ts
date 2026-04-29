import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type Notification = components['schemas']['NotificationResponseDto']

const SILENT_TYPES = new Set<string>(['CAPTAIN_ASSIGNED', 'CAPTAIN_TRANSFERRED', 'MEMBER_LEFT'])

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const loading = ref(false)
  let pollInterval: ReturnType<typeof setInterval> | null = null
  const seenIds = new Set<string>()

  const unreadCount = computed(
    () => notifications.value.filter((n) => !n.dismissed && !n.readAt).length,
  )

  const unreadNotifications = computed(() =>
    notifications.value.filter((n) => !n.dismissed && !n.readAt),
  )

  function detectNewAndToast(next: Notification[]) {
    // First load: mark all as seen without toasting
    if (seenIds.size === 0) {
      for (const n of next) seenIds.add(n.id)
      return
    }
    const toast = useToastStore()
    for (const n of next) {
      if (seenIds.has(n.id)) continue
      seenIds.add(n.id)
      if (n.dismissed || n.readAt || SILENT_TYPES.has(n.type)) continue

      if (n.type === 'ACHIEVEMENT_UNLOCKED') {
        toast.success(n.title || 'Achievement unlocked', n.content)
      } else if (n.type === 'TEAM_BROADCAST') {
        toast.info(n.title || 'Team broadcast', n.content)
      } else if (n.type === 'TOURNAMENT_REMINDER') {
        toast.info(n.title || 'Tournament reminder', n.content)
      } else if (n.type === 'GYM_STATUS_CHANGED') {
        toast.info(n.title || 'Gym update', n.content)
      } else if (n.type === 'MESSAGE_FLAGGED' || n.type === 'MESSAGE_DELETED') {
        toast.warning(n.title, n.content)
      } else if (
        n.type === 'ACCOUNT_SUSPENDED' ||
        n.type === 'ACCOUNT_BANNED' ||
        n.type === 'ACCOUNT_RESTRICTED'
      ) {
        toast.error(n.title, n.content)
      }
    }
  }

  async function fetchNotifications() {
    loading.value = true
    try {
      const { data, error } = await apiClient.GET('/v1/notifications')
      if (error) {
        console.error('Failed to fetch notifications:', error)
        return
      }
      const next = data?.data ?? []
      detectNewAndToast(next)
      notifications.value = next
    } finally {
      loading.value = false
    }
  }

  async function dismiss(id: string) {
    const { error } = await apiClient.PATCH('/v1/notifications/{id}/dismiss', {
      params: { path: { id } },
    })
    if (error) {
      console.error('Failed to dismiss notification:', error)
      return
    }
    const notification = notifications.value.find((n) => n.id === id)
    if (notification) {
      notification.dismissed = true
    }
  }

  async function markRead(id: string) {
    const { error } = await apiClient.PATCH('/v1/notifications/{id}/read', {
      params: { path: { id } },
    })
    if (error) {
      console.error('Failed to mark notification read:', error)
      return
    }
    const notification = notifications.value.find((n) => n.id === id)
    if (notification && !notification.readAt) {
      notification.readAt = new Date().toISOString()
    }
  }

  function startPolling(intervalMs = 30000) {
    stopPolling()
    fetchNotifications()
    pollInterval = setInterval(fetchNotifications, intervalMs)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  function $reset() {
    notifications.value = []
    loading.value = false
    stopPolling()
  }

  return {
    notifications,
    loading,
    unreadCount,
    unreadNotifications,
    fetchNotifications,
    dismiss,
    markRead,
    startPolling,
    stopPolling,
    $reset,
  }
})
