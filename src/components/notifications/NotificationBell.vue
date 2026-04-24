<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'

const router = useRouter()
const notificationStore = useNotificationStore()

const bellLabel = computed(() => {
  const count = notificationStore.unreadCount
  if (count === 0) return 'Notifications, no unread'
  if (count === 1) return 'Notifications, 1 unread'
  return `Notifications, ${count} unread`
})

onMounted(() => {
  notificationStore.startPolling()
})

onUnmounted(() => {
  notificationStore.stopPolling()
})
</script>

<template>
  <UButton
    color="neutral"
    variant="ghost"
    icon="i-lucide-bell"
    square
    class="relative"
    :aria-label="bellLabel"
    @click="router.push('/notifications')"
  >
    <UBadge
      v-if="notificationStore.unreadCount > 0"
      color="error"
      size="xs"
      class="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center text-[10px]"
      :aria-label="`${notificationStore.unreadCount} unread notifications`"
    >
      {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
    </UBadge>
  </UButton>
</template>
