<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMessengerStore } from '@/stores/messenger'
import { useAuthStore } from '@/stores/auth/auth'
import { useOrganizationStore } from '@/stores/organization'
import { useToastStore } from '@/stores/toast'
import { ENV } from '@/config/environment'
import { getErrorMessage } from '@/lib/api/errors'
import ChatSearchModal from '@/components/messenger/ChatSearchModal.vue'
import AnnouncementSettingsModal from '@/components/messenger/AnnouncementSettingsModal.vue'
import type { components } from '@/types/api'

type MediaUploadResponse = components['schemas']['MediaUploadResponseDto']
type SearchMessageHit = components['schemas']['SearchMessageHitDto']
type ChatResponse = components['schemas']['ChatResponseDto']
type AnnouncementChat = ChatResponse & {
  type: 'ANNOUNCEMENT'
  organizationId?: string
  writeRoles?: ('MEMBER' | 'STAFF' | 'ADMIN')[]
}

interface PendingAttachment {
  id: string
  file: File
  previewUrl: string
  uploading: boolean
  mediaId?: string
  error?: string
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const messengerStore = useMessengerStore()
const orgStore = useOrganizationStore()
const toast = useToastStore()
const messageInput = ref('')
const showSearchModal = ref(false)
const showAnnouncementSettings = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const attachments = ref<PendingAttachment[]>([])
const uploading = computed(() => attachments.value.some((a) => a.uploading))
const messagesLoading = ref(false)
const sending = ref(false)

const chatId = computed(() => route.params.id as string)

watch(
  chatId,
  async (id) => {
    if (id) {
      messengerStore.setActiveChat(id)
      if (!messengerStore.messages.has(id)) {
        messagesLoading.value = true
        try {
          await messengerStore.loadChatHistory(id)
        } catch (e) {
          toast.error('Failed to load messages', getErrorMessage(e, 'Please try again.'))
        } finally {
          messagesLoading.value = false
        }
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  messengerStore.setActiveChat(null)
})

const chatName = computed(() => {
  const chat = messengerStore.activeChat
  if (!chat) return 'Chat'
  if ((chat.chat.type === 'GROUP' || isAnnouncement.value) && chat.chat.name) {
    return chat.chat.name as unknown as string
  }
  const other = chat.chat.members.find((m) => m.id !== messengerStore.currentUserId)
  return (other?.name as unknown as string) ?? (other?.username as unknown as string) ?? 'Chat'
})

const isGroup = computed(() => messengerStore.activeChat?.chat.type === 'GROUP')

const rawChat = computed(() => messengerStore.activeChat?.chat as unknown as ChatResponse | null)

const isAnnouncement = computed(() => rawChat.value?.type === 'ANNOUNCEMENT')

const announcementChat = computed<AnnouncementChat | null>(() => {
  if (!isAnnouncement.value || !rawChat.value) return null
  return rawChat.value as AnnouncementChat
})

const announcementOrgId = computed<string | null>(() => {
  const orgId = announcementChat.value?.organizationId as unknown
  return typeof orgId === 'string' ? orgId : null
})

const currentUserOrgRole = computed<'MEMBER' | 'STAFF' | 'ADMIN' | null>(() => {
  if (!announcementOrgId.value) return null
  const membership = orgStore.memberships.find((m) => m.organizationId === announcementOrgId.value)
  return membership?.role ?? null
})

const canPostAnnouncement = computed(() => {
  if (!isAnnouncement.value) return true
  const writeRoles = announcementChat.value?.writeRoles
  if (!writeRoles || !currentUserOrgRole.value) return false
  return writeRoles.includes(currentUserOrgRole.value)
})

const canManageAnnouncement = computed(() => {
  if (!isAnnouncement.value || !announcementOrgId.value) return false
  return currentUserOrgRole.value === 'STAFF' || currentUserOrgRole.value === 'ADMIN'
})

const canSendInChat = computed(() => {
  if (isAnnouncement.value) return canPostAnnouncement.value
  return true
})

const otherUserId = computed(() => {
  const chat = messengerStore.activeChat?.chat
  if (!chat || chat.type === 'GROUP') return null
  if (isAnnouncement.value) return null
  const other = chat.members.find((m) => m.id !== messengerStore.currentUserId)
  return other?.id || null
})

function handleAnnouncementUpdated(chat: ChatResponse) {
  messengerStore.upsertChat(chat)
}

function handleAnnouncementDeleted(chatId: string) {
  messengerStore.removeChat(chatId)
}

const chatMessages = computed(() => {
  return messengerStore.activeMessages.map((msg) => ({
    id: msg.id,
    role: (msg.sender.id === messengerStore.currentUserId ? 'user' : 'assistant') as
      | 'user'
      | 'assistant',
    parts: [{ type: 'text' as const, text: msg.content }],
    sender:
      (msg.sender.name as unknown as string) ??
      (msg.sender.username as unknown as string) ??
      undefined,
    media: msg.media ?? [],
  }))
})

const typingText = computed(() => {
  const users = messengerStore.activeTypingUsers
  if (users.length === 0) return ''
  if (users.length === 1) return `${users[0]} is typing...`
  return `${users.slice(0, 2).join(', ')} are typing...`
})

let typingTimeout: ReturnType<typeof setTimeout> | null = null

function onInputChange() {
  if (!chatId.value) return
  messengerStore.emitTypingStart(chatId.value)
  if (typingTimeout) clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    messengerStore.emitTypingStop(chatId.value)
  }, 2000)
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return

  for (const file of Array.from(files)) {
    const id = crypto.randomUUID()
    attachments.value.push({
      id,
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    })

    try {
      const authStore = useAuthStore()
      const token = await authStore.getAccessToken()
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`${ENV.apiBaseUrl}/v1/utils/media-upload`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(getErrorMessage(body, 'Failed to upload media'))
      }
      const media: MediaUploadResponse = await response.json()
      const idx = attachments.value.findIndex((a) => a.id === id)
      if (idx !== -1)
        attachments.value[idx] = { ...attachments.value[idx], mediaId: media.id, uploading: false }
    } catch (e) {
      const idx = attachments.value.findIndex((a) => a.id === id)
      if (idx !== -1)
        attachments.value[idx] = {
          ...attachments.value[idx],
          error: 'Upload failed',
          uploading: false,
        }
      toast.error('Upload failed', getErrorMessage(e, 'Failed to upload media'))
    }
  }

  input.value = ''
}

function removeAttachment(id: string) {
  const idx = attachments.value.findIndex((a) => a.id === id)
  if (idx !== -1) {
    URL.revokeObjectURL(attachments.value[idx].previewUrl)
    attachments.value.splice(idx, 1)
  }
}

const canSend = computed(() => {
  if (sending.value) return false
  const hasText = messageInput.value.trim().length > 0
  const hasMedia = attachments.value.some((a) => a.mediaId)
  const stillUploading = uploading.value
  return (hasText || hasMedia) && !stillUploading
})

async function handleSubmit() {
  if (!canSend.value) return
  const mediaIds = attachments.value.filter((a) => a.mediaId).map((a) => a.mediaId!)
  const text = messageInput.value
  sending.value = true
  try {
    await messengerStore.sendMessage(text, mediaIds.length ? mediaIds : undefined)
    messageInput.value = ''
    attachments.value.forEach((a) => URL.revokeObjectURL(a.previewUrl))
    attachments.value = []
    if (typingTimeout) clearTimeout(typingTimeout)
    if (chatId.value) messengerStore.emitTypingStop(chatId.value)
    scrollToBottom()
  } catch (e) {
    toast.error('Message failed to send', getErrorMessage(e, 'Please try again.'))
  } finally {
    sending.value = false
  }
}

function isVideo(file: File) {
  return file.type.startsWith('video/')
}

async function handleSearchSelect(hit: SearchMessageHit) {
  await messengerStore.jumpToMessage(chatId.value, hit.id, hit.page)
  await nextTick()
  const el = document.getElementById(`msg-${hit.id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  // Auto-clear highlight after animation
  setTimeout(() => {
    messengerStore.highlightedMessageId = null
  }, 2000)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Chat header -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
      <RouterLink
        to="/messenger"
        class="lg:hidden text-white/70 hover:text-white transition-colors"
        aria-label="Back to conversations"
      >
        <UIcon name="i-lucide-arrow-left" class="text-lg" />
      </RouterLink>
      <UAvatar
        :icon="isAnnouncement ? 'i-lucide-megaphone' : isGroup ? 'i-lucide-users' : 'i-lucide-user'"
        size="sm"
      />
      <span class="font-medium text-sm flex-1">{{ chatName }}</span>

      <UButton
        v-if="otherUserId"
        icon="i-lucide-user"
        variant="ghost"
        color="neutral"
        size="sm"
        square
        title="View profile"
        aria-label="View profile"
        @click="router.push({ path: `/profile/${otherUserId}`, query: { name: chatName } })"
      />

      <UButton
        v-if="canManageAnnouncement"
        icon="i-lucide-settings"
        variant="ghost"
        color="neutral"
        size="sm"
        square
        title="Channel settings"
        aria-label="Channel settings"
        @click="showAnnouncementSettings = true"
      />

      <UButton
        icon="i-lucide-search"
        variant="ghost"
        color="neutral"
        size="sm"
        square
        title="Search messages"
        aria-label="Search messages"
        @click="showSearchModal = true"
      />
    </div>

    <UAlert
      v-if="isAnnouncement && !canPostAnnouncement"
      icon="i-lucide-megaphone"
      color="warning"
      title="Read-only channel"
      description="Only authorized roles can post in this announcement channel."
      class="mx-4 mt-3"
    />

    <!-- Messages area -->
    <div ref="messagesContainer" class="flex-1 min-h-0 overflow-y-auto">
      <div
        v-if="messagesLoading"
        class="flex items-center justify-center py-8 text-white/40"
        role="status"
      >
        <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" aria-label="Loading messages" />
      </div>
      <div
        v-else-if="!chatMessages.length"
        class="flex flex-col items-center justify-center gap-2 py-12 text-white/40"
      >
        <UIcon name="i-lucide-message-square" class="size-8" aria-hidden="true" />
        <p class="text-sm">No messages yet</p>
        <p v-if="canSendInChat" class="text-xs">Say hello to get started.</p>
      </div>
      <UChatMessages
        v-else
        :messages="chatMessages"
        :user="{ side: 'right', variant: 'soft' }"
        :assistant="{ side: 'left', variant: 'soft' }"
        :should-scroll-to-bottom="true"
        class="h-full py-4"
      >
        <template #content="{ message }">
          <div
            :id="`msg-${(message as any).id}`"
            class="transition-colors duration-500"
            :class="
              messengerStore.highlightedMessageId === (message as any).id
                ? 'bg-primary/20 rounded-lg -mx-2 px-2 py-1'
                : ''
            "
          >
            <p
              v-if="isGroup && message.role !== 'user' && (message as any).sender"
              class="text-xs text-white/50 font-medium mb-0.5"
            >
              {{ (message as any).sender }}
            </p>
            <!-- Media attachments -->
            <div v-if="(message as any).media?.length" class="flex flex-wrap gap-1.5 mb-1">
              <template v-for="media in (message as any).media" :key="media.id">
                <video
                  v-if="media.mimeType?.startsWith('video/')"
                  :src="media.url"
                  controls
                  class="max-w-60 max-h-48 rounded-lg"
                />
                <img
                  v-else
                  :src="media.url"
                  :alt="'attachment'"
                  class="max-w-60 max-h-48 rounded-lg object-cover cursor-pointer"
                />
              </template>
            </div>
            <template v-for="part in message.parts" :key="part">
              <p v-if="part.type === 'text' && part.text">{{ part.text }}</p>
            </template>
          </div>
        </template>
      </UChatMessages>

      <!-- Typing indicator -->
      <div v-if="typingText" class="px-4 pb-2 text-xs text-white/40 italic">
        {{ typingText }}
      </div>
    </div>

    <!-- Input bar -->
    <div v-if="canSendInChat" class="shrink-0 border-t border-white/10">
      <!-- Attachment previews -->
      <div v-if="attachments.length" class="flex gap-2 px-3 pt-3 overflow-x-auto">
        <div
          v-for="att in attachments"
          :key="att.id"
          class="relative shrink-0 size-16 rounded-lg overflow-hidden bg-white/5"
        >
          <video v-if="isVideo(att.file)" :src="att.previewUrl" class="size-full object-cover" />
          <img
            v-else
            :src="att.previewUrl"
            :alt="att.file.name || 'Attachment preview'"
            class="size-full object-cover"
          />
          <div
            v-if="att.uploading"
            class="absolute inset-0 flex items-center justify-center bg-black/50"
          >
            <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
          </div>
          <div
            v-else-if="att.error"
            class="absolute inset-0 flex items-center justify-center bg-red-900/50"
          >
            <UIcon name="i-lucide-alert-circle" class="size-4 text-red-400" />
          </div>
          <button
            type="button"
            class="absolute top-0.5 right-0.5 size-4 rounded-full bg-black/60 flex items-center justify-center"
            aria-label="Remove attachment"
            @click="removeAttachment(att.id)"
          >
            <UIcon name="i-lucide-x" class="size-2.5" />
          </button>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*,video/*"
        multiple
        class="hidden"
        @change="handleFileSelect"
      />

      <div class="flex items-end gap-2 p-3">
        <UButton
          icon="i-lucide-plus"
          variant="ghost"
          color="neutral"
          size="sm"
          square
          title="Attach media"
          aria-label="Attach media"
          @click="openFilePicker"
        />
        <UTextarea
          v-model="messageInput"
          :placeholder="t('messenger.typemessage')"
          autoresize
          :rows="1"
          :maxrows="4"
          class="flex-1"
          :aria-label="t('messenger.typemessage')"
          @update:model-value="onInputChange"
          @keydown.enter.exact.prevent="handleSubmit"
        />
        <UButton
          icon="i-lucide-send"
          variant="ghost"
          :color="canSend ? 'primary' : 'neutral'"
          size="sm"
          square
          :loading="sending"
          :disabled="!canSend"
          title="Send message"
          aria-label="Send message"
          @click="handleSubmit"
        />
      </div>
    </div>
    <ChatSearchModal
      v-model:open="showSearchModal"
      :chat-id="chatId"
      @select="handleSearchSelect"
    />
    <AnnouncementSettingsModal
      v-if="announcementChat"
      v-model:open="showAnnouncementSettings"
      :chat="announcementChat"
      @updated="handleAnnouncementUpdated"
      @deleted="handleAnnouncementDeleted"
    />
  </div>
</template>
