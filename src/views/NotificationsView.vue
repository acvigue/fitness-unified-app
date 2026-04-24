<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useNotificationStore } from '@/stores/notifications'
import { useNotificationRouting } from '@/composables/useNotificationRouting'

useHead({
  title: 'Notifications',
})

const { setHeader } = usePageHeader()
const notificationStore = useNotificationStore()
const { open } = useNotificationRouting()

const NOTIFICATION_ICONS: Record<string, string> = {
  TEAM_INVITE: 'i-lucide-user-plus',
  TEAM_JOIN_REQUEST: 'i-lucide-user-check',
  TEAM_INVITE_RESPONSE: 'i-lucide-mail-check',
  TEAM_REQUEST_RESPONSE: 'i-lucide-mail-check',
  CAPTAIN_ASSIGNED: 'i-lucide-shield',
  CAPTAIN_TRANSFERRED: 'i-lucide-shield-check',
  MEMBER_LEFT: 'i-lucide-user-minus',
  REMOVED_FROM_TEAM: 'i-lucide-user-x',
  TEAM_DELETED: 'i-lucide-trash-2',
  TOURNAMENT_DELETED: 'i-lucide-circle-x',
  TOURNAMENT_INVITE: 'i-lucide-trophy',
  TOURNAMENT_REMINDER: 'i-lucide-clock',
  ACHIEVEMENT_UNLOCKED: 'i-lucide-award',
  TEAM_BROADCAST: 'i-lucide-megaphone',
  GYM_STATUS_CHANGED: 'i-lucide-dumbbell',
  MESSAGE_FLAGGED: 'i-lucide-flag',
  MESSAGE_DELETED: 'i-lucide-trash',
  ACCOUNT_SUSPENDED: 'i-lucide-pause-circle',
  ACCOUNT_UNSUSPENDED: 'i-lucide-play-circle',
  ACCOUNT_BANNED: 'i-lucide-ban',
  ACCOUNT_RESTRICTED: 'i-lucide-shield-alert',
  MEETUP_ACCEPTED: 'i-lucide-calendar-check',
  MEETUP_DECLINED: 'i-lucide-calendar-x',
  MEETUP_CANCELLED: 'i-lucide-calendar-minus',
  MEETUP_PROPOSAL: 'i-lucide-calendar-plus',
}

function getIcon(type: string) {
  return NOTIFICATION_ICONS[type] || 'i-lucide-bell'
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

onMounted(() => {
  setHeader({ title: 'Notifications' })
  notificationStore.fetchNotifications()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <div class="flex items-center justify-between">
        <p class="text-sm text-white/60">{{ notificationStore.unreadCount }} unread</p>
        <UButton
          size="sm"
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          :loading="notificationStore.loading"
          @click="notificationStore.fetchNotifications()"
        >
          Refresh
        </UButton>
      </div>

      <div
        v-if="notificationStore.notifications.length === 0"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        No notifications yet.
      </div>

      <div v-else class="flex flex-col gap-2">
        <button
          v-for="notification in notificationStore.notifications"
          :key="notification.id"
          type="button"
          class="flex items-start gap-3 rounded-lg border p-4 text-left transition hover:bg-white/5"
          :class="
            notification.dismissed
              ? 'border-white/5 bg-white/[0.02] opacity-60'
              : !notification.readAt
                ? 'border-primary/40 bg-primary/[0.04]'
                : 'border-white/10 bg-white/5'
          "
          @click="open(notification)"
        >
          <UIcon
            :name="getIcon(notification.type)"
            class="mt-0.5 text-lg shrink-0"
            :class="notification.dismissed ? 'text-white/30' : 'text-primary'"
          />

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="font-medium text-sm">{{ notification.title }}</p>
              <span
                v-if="!notification.readAt && !notification.dismissed"
                class="inline-block size-2 rounded-full bg-primary"
                aria-label="Unread"
              />
            </div>
            <p class="text-sm text-white/60 mt-0.5">{{ notification.content }}</p>
            <p class="text-xs text-white/40 mt-1">{{ formatDate(notification.createdAt) }}</p>
          </div>

          <UButton
            v-if="!notification.dismissed"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            @click.stop="notificationStore.dismiss(notification.id)"
          />
        </button>
      </div>
    </section>
  </PageLayout>
</template>
