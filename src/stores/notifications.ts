import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import type { components } from '@/types/api'

type Notification = components['schemas']['NotificationResponseDto']

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const loading = ref(false)
  let pollInterval: ReturnType<typeof setInterval> | null = null

  const unreadCount = computed(
    () => notifications.value.filter((n) => !n.dismissed && !n.readAt).length
  )

  const unreadNotifications = computed(() =>
    notifications.value.filter((n) => !n.dismissed && !n.readAt)
  )

  async function fetchNotifications() {
    loading.value = true
    try {
      const { data, error } = await apiClient.GET('/v1/notifications')
      if (error) {
        console.error('Failed to fetch notifications:', error)
        return
      }
      notifications.value = data ?? []
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
