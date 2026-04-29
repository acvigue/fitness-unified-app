<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useNotificationStore } from '@/stores/notifications'
import { useNotificationRouting } from '@/composables/useNotificationRouting'
import { useToastStore } from '@/stores/toast'
import { getErrorMessage } from '@/lib/api/errors'

useHead({ title: 'Notifications' })

const { setHeader } = usePageHeader()
const notificationStore = useNotificationStore()
const { open } = useNotificationRouting()
const toast = useToastStore()

const confirmDeleteOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)
const pendingDeleteTitle = ref('')
const busy = ref(false)

type Category = 'ALL' | 'UNREAD' | 'TEAM' | 'TOURNAMENT' | 'ORG' | 'GYM' | 'MEETUP' | 'MODERATION'

const category = ref<Category>('ALL')

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
  TEAM_BROADCAST: 'i-lucide-megaphone',
  TEAM_CHAT_MESSAGE: 'i-lucide-message-square',
  ORGANIZATION_INVITE: 'i-lucide-mail',
  ORGANIZATION_INVITE_RESPONSE: 'i-lucide-mail-check',
  ORGANIZATION_ROLE_CHANGED: 'i-lucide-shield',
  ORGANIZATION_MEMBER_REMOVED: 'i-lucide-user-x',
  TOURNAMENT_INVITATION_RECEIVED: 'i-lucide-trophy',
  TOURNAMENT_REMINDER: 'i-lucide-clock',
  TOURNAMENT_FORFEIT_RECORDED: 'i-lucide-flag',
  TOURNAMENT_MATCH_RESULT_PENDING: 'i-lucide-flag-triangle-right',
  TOURNAMENT_MATCH_RESULT_CONFIRMED: 'i-lucide-check-check',
  TOURNAMENT_MATCH_RESULT_DISPUTED: 'i-lucide-alert-triangle',
  GYM_STATUS_CHANGED: 'i-lucide-dumbbell',
  MESSAGE_FLAGGED: 'i-lucide-flag',
  MESSAGE_DELETED: 'i-lucide-trash',
  ACCOUNT_SUSPENDED: 'i-lucide-pause-circle',
  ACCOUNT_UNSUSPENDED: 'i-lucide-play-circle',
  ACCOUNT_BANNED: 'i-lucide-ban',
  ACCOUNT_UNBANNED: 'i-lucide-circle-check',
  ACCOUNT_RESTRICTED: 'i-lucide-shield-alert',
  SUSPENSION_APPEAL_SUBMITTED: 'i-lucide-shield-question',
  SUSPENSION_APPEAL_DECIDED: 'i-lucide-shield-check',
  MEETUP_ACCEPTED: 'i-lucide-calendar-check',
  MEETUP_DECLINED: 'i-lucide-calendar-x',
  MEETUP_CANCELLED: 'i-lucide-calendar-minus',
  MEETUP_PROPOSAL: 'i-lucide-calendar-plus',
}

function getIcon(type: string) {
  return NOTIFICATION_ICONS[type] || 'i-lucide-bell'
}

function categoryFor(type: string): Exclude<Category, 'ALL' | 'UNREAD'> | 'OTHER' {
  if (
    type.startsWith('TEAM_') ||
    type.startsWith('CAPTAIN_') ||
    type === 'MEMBER_LEFT' ||
    type === 'REMOVED_FROM_TEAM'
  )
    return 'TEAM'
  if (type.startsWith('TOURNAMENT_')) return 'TOURNAMENT'
  if (type.startsWith('ORGANIZATION_')) return 'ORG'
  if (type === 'GYM_STATUS_CHANGED') return 'GYM'
  if (type.startsWith('MEETUP_')) return 'MEETUP'
  if (type.startsWith('MESSAGE_') || type.startsWith('ACCOUNT_') || type.startsWith('SUSPENSION_'))
    return 'MODERATION'
  return 'OTHER'
}

const filtered = computed(() => {
  const list = notificationStore.notifications
  if (category.value === 'ALL') return list
  if (category.value === 'UNREAD') return list.filter((n) => !n.readAt && !n.dismissed)
  return list.filter((n) => categoryFor(n.type) === category.value)
})

const groups = computed<{ key: string; label: string; items: typeof filtered.value }[]>(() => {
  if (category.value !== 'ALL') {
    return [{ key: category.value, label: '', items: filtered.value }]
  }
  const buckets = new Map<string, typeof filtered.value>()
  for (const n of filtered.value) {
    const cat = categoryFor(n.type)
    if (!buckets.has(cat)) buckets.set(cat, [])
    buckets.get(cat)!.push(n)
  }
  const labels: Record<string, string> = {
    TEAM: 'Team',
    TOURNAMENT: 'Tournaments',
    ORG: 'Organizations',
    GYM: 'Gyms',
    MEETUP: 'Meetups',
    MODERATION: 'Account & moderation',
    OTHER: 'Other',
  }
  return [...buckets.entries()].map(([k, items]) => ({
    key: k,
    label: labels[k] ?? k,
    items,
  }))
})

const filterItems: { label: string; value: Category }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Unread', value: 'UNREAD' },
  { label: 'Team', value: 'TEAM' },
  { label: 'Tournament', value: 'TOURNAMENT' },
  { label: 'Org', value: 'ORG' },
  { label: 'Gym', value: 'GYM' },
  { label: 'Meetup', value: 'MEETUP' },
  { label: 'Moderation', value: 'MODERATION' },
]

const hasUnread = computed(() => notificationStore.unreadCount > 0)

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

async function markAll() {
  if (!hasUnread.value || busy.value) return
  busy.value = true
  try {
    const unread = notificationStore.unreadNotifications.slice()
    await Promise.all(unread.map((n) => notificationStore.markRead(n.id)))
  } catch (e) {
    toast.error('Could not mark all as read', getErrorMessage(e))
  } finally {
    busy.value = false
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
            :loading="busy"
            aria-label="Mark all notifications as read"
            @click="markAll"
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

      <div class="flex flex-wrap gap-1">
        <UButton
          v-for="item in filterItems"
          :key="item.value"
          size="xs"
          :color="category === item.value ? 'primary' : 'neutral'"
          :variant="category === item.value ? 'soft' : 'ghost'"
          @click="category = item.value"
        >
          {{ item.label }}
        </UButton>
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
        v-else-if="filtered.length === 0"
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        <UIcon name="i-lucide-bell-off" class="size-8 text-white/40" />
        <p>{{ category === 'ALL' ? "You're all caught up" : 'Nothing matches this filter' }}</p>
      </div>

      <div v-else class="flex flex-col gap-4">
        <div v-for="group in groups" :key="group.key" class="flex flex-col gap-2">
          <p v-if="group.label" class="text-xs uppercase tracking-[0.3em] text-white/50">
            {{ group.label }}
            <span class="ml-1 text-white/30 normal-case tracking-normal">
              ({{ group.items.length }})
            </span>
          </p>
          <button
            v-for="notification in group.items"
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
      </div>
    </section>

    <UModal v-model:open="confirmDeleteOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div>
            <h2 class="text-lg font-semibold">Dismiss notification?</h2>
            <p class="text-sm text-white/60 mt-1 truncate">{{ pendingDeleteTitle }}</p>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton variant="ghost" color="neutral" @click="confirmDeleteOpen = false">
              Cancel
            </UButton>
            <UButton color="error" :loading="busy" @click="confirmDelete">Dismiss</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
