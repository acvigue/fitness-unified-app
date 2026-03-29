<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'

const router = useRouter()
const notificationStore = useNotificationStore()

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
    @click="router.push('/notifications')"
  >
    <UBadge
      v-if="notificationStore.unreadCount > 0"
      color="error"
      size="xs"
      class="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center text-[10px]"
    >
      {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
    </UBadge>
  </UButton>
</template>
