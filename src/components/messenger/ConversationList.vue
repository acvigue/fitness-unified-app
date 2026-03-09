<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ConversationItem from './ConversationItem.vue'
import { useMessengerStore } from '@/stores/messenger'
import type { ConversationSummary } from '@/stores/messenger'

const { t } = useI18n()
const route = useRoute()
const messengerStore = useMessengerStore()

function getConversationName(convo: ConversationSummary): string {
  if (convo.chat.type === 'GROUP' && convo.chat.name) {
    return convo.chat.name as unknown as string
  }
  const otherMember = convo.chat.members.find((m) => m.id !== messengerStore.currentUserId)
  return (
    (otherMember?.name as unknown as string) ??
    (otherMember?.username as unknown as string) ??
    'Chat'
  )
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffHours < 48) return 'Yesterday'
  return date.toLocaleDateString()
}
</script>

<template>
  <div class="flex flex-col h-full overflow-y-auto">
    <!-- Loading state -->
    <div v-if="messengerStore.loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="text-xl text-white/40 animate-spin" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="messengerStore.sortedConversations.length === 0"
      class="flex-1 flex items-center justify-center text-white/30 py-8"
    >
      <p class="text-sm">{{ t('messenger.noconversations') }}</p>
    </div>

    <!-- Conversation list -->
    <template v-else>
      <ConversationItem
        v-for="convo in messengerStore.sortedConversations"
        :key="convo.chat.id"
        :id="convo.chat.id"
        :name="getConversationName(convo)"
        :last-message="convo.lastMessage?.content ?? ''"
        :timestamp="formatTimestamp(convo.lastMessage?.createdAt ?? convo.chat.createdAt)"
        :unread="convo.unreadCount"
        :is-group="convo.chat.type === 'GROUP'"
        :active="route.params.id === convo.chat.id"
      />
    </template>
  </div>
</template>
