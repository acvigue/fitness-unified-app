<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import ConversationList from '@/components/messenger/ConversationList.vue'
import NewChatModal from '@/components/messenger/NewChatModal.vue'
import AnnouncementCreateModal from '@/components/messenger/AnnouncementCreateModal.vue'
import { useMessengerStore } from '@/stores/messenger'
import { useOrganizationStore } from '@/stores/organization'

const { t } = useI18n()
const route = useRoute()
const messengerStore = useMessengerStore()
const orgStore = useOrganizationStore()

useHead({ title: 'Messenger' })

const hasChatSelected = computed(() => !!route.params.id)
const showNewChatModal = ref(false)
const showAnnouncementModal = ref(false)
const canCreateAnnouncement = computed(() =>
  orgStore.memberships.some((m) => m.role === 'STAFF' || m.role === 'ADMIN'),
)

onMounted(() => {
  messengerStore.initialize()
})
</script>

<template>
  <div class="flex flex-row h-full">
    <!-- Conversation list panel -->
    <div
      class="flex flex-col h-full border-r border-white/10 overflow-hidden"
      :class="
        hasChatSelected
          ? 'hidden lg:flex lg:w-80 lg:shrink-0'
          : 'flex-1 lg:w-80 lg:shrink-0 lg:flex-initial'
      "
    >
      <!-- List header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h1 class="text-lg font-semibold">{{ t('messenger.messenger') }}</h1>
        <div class="flex items-center gap-1">
          <UButton
            v-if="canCreateAnnouncement"
            icon="i-lucide-megaphone"
            variant="ghost"
            color="neutral"
            size="sm"
            square
            title="New announcement channel"
            aria-label="New announcement channel"
            @click="showAnnouncementModal = true"
          />
          <UButton
            icon="i-lucide-square-pen"
            variant="ghost"
            color="neutral"
            size="sm"
            square
            title="New chat"
            aria-label="New chat"
            @click="showNewChatModal = true"
          />
        </div>
      </div>

      <ConversationList @start-chat="showNewChatModal = true" />
    </div>

    <!-- Chat panel (nested route or empty state) -->
    <div
      class="flex flex-col h-full min-w-0"
      :class="hasChatSelected ? 'flex-1' : 'hidden lg:flex lg:flex-1'"
    >
      <RouterView v-if="hasChatSelected" />

      <!-- Desktop empty state when no chat selected -->
      <div v-else class="flex flex-1 items-center justify-center text-white/30">
        <div class="text-center">
          <UIcon name="i-lucide-message-circle" class="text-4xl mb-3" aria-hidden="true" />
          <p class="text-sm">{{ t('messenger.selectconversation') }}</p>
        </div>
      </div>
    </div>

    <NewChatModal v-model:open="showNewChatModal" />
    <AnnouncementCreateModal
      v-model:open="showAnnouncementModal"
      @created="(chat) => messengerStore.upsertChat(chat)"
    />
  </div>
</template>
