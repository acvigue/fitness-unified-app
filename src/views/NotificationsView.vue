<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useNotificationStore } from '@/stores/notifications'
import { useNotificationRouting } from '@/composables/useNotificationRouting'
import { useToastStore } from '@/stores/toast'
import { getErrorMessage } from '@/lib/api/errors'

useHead({
  title: 'Notifications',
})

const { setHeader } = usePageHeader()
const notificationStore = useNotificationStore()
const { open } = useNotificationRouting()
const toast = useToastStore()

const confirmMarkAllOpen = ref(false)
const confirmDeleteOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)
const pendingDeleteTitle = ref('')
const busy = ref(false)

const hasUnread = computed(() => notificationStore.unreadCount > 0)

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
  return date.toLocaleString()
}

async function refresh() {
  try {
    await notificationStore.fetchNotifications()
  } catch (e) {
    toast.error('Could not load notifications', getErrorMessage(e))
  }
}

function askDelete(id: string, title: string) {
  pendingDeleteId.value = id
  pendingDeleteTitle.value = title
  confirmDeleteOpen.value = true
}

async function confirmDelete() {
  if (!pendingDeleteId.value) return
  busy.value = true
  try {
    await notificationStore.dismiss(pendingDeleteId.value)
    toast.success('Notification dismissed')
  } catch (e) {
    toast.error('Could not dismiss notification', getErrorMessage(e))
  } finally {
    busy.value = false
    confirmDeleteOpen.value = false
    pendingDeleteId.value = null
    pendingDeleteTitle.value = ''
  }
}

async function confirmMarkAll() {
  busy.value = true
  try {
    const unread = notificationStore.unreadNotifications.slice()
    await Promise.all(unread.map((n) => notificationStore.markRead(n.id)))
    toast.success('All notifications marked as read')
  } catch (e) {
    toast.error('Could not mark all as read', getErrorMessage(e))
  } finally {
    busy.value = false
    confirmMarkAllOpen.value = false
  }
}

onMounted(() => {
  setHeader({ title: 'Notifications' })
  refresh()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm text-white/60">{{ notificationStore.unreadCount }} unread</p>
        <div class="flex items-center gap-1">
          <UButton
            v-if="hasUnread"
            size="sm"
            variant="ghost"
            color="neutral"
            icon="i-lucide-check-check"
            aria-label="Mark all notifications as read"
            @click="confirmMarkAllOpen = true"
          >
            Mark all read
          </UButton>
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            icon="i-lucide-refresh-cw"
            :loading="notificationStore.loading"
            aria-label="Refresh notifications"
            @click="refresh"
          />
        </div>
      </div>

      <div
        v-if="notificationStore.loading && notificationStore.notifications.length === 0"
        class="flex flex-col gap-2"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4"
        >
          <div class="size-5 rounded-full bg-white/10 animate-pulse shrink-0" />
          <div class="flex-1 min-w-0 flex flex-col gap-2">
            <div class="h-3 w-1/3 rounded bg-white/10 animate-pulse" />
            <div class="h-3 w-2/3 rounded bg-white/5 animate-pulse" />
          </div>
        </div>
      </div>

      <div
        v-else-if="notificationStore.notifications.length === 0"
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        <UIcon name="i-lucide-bell-off" class="size-8 text-white/40" />
        <p>You're all caught up</p>
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
            :aria-label="`Dismiss notification: ${notification.title}`"
            @click.stop="askDelete(notification.id, notification.title)"
          />
        </button>
      </div>
    </section>

    <UModal v-model:open="confirmMarkAllOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div>
            <h2 class="text-lg font-semibold">Mark all as read?</h2>
            <p class="text-sm text-white/60 mt-1">
              This will mark {{ notificationStore.unreadCount }} notifications as read.
            </p>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton variant="ghost" color="neutral" @click="confirmMarkAllOpen = false"
              >Cancel</UButton
            >
            <UButton color="primary" :loading="busy" @click="confirmMarkAll">Mark all read</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="confirmDeleteOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div>
            <h2 class="text-lg font-semibold">Dismiss notification?</h2>
            <p class="text-sm text-white/60 mt-1 truncate">{{ pendingDeleteTitle }}</p>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton variant="ghost" color="neutral" @click="confirmDeleteOpen = false"
              >Cancel</UButton
            >
            <UButton color="error" :loading="busy" @click="confirmDelete">Dismiss</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
