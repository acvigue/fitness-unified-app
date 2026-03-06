<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMessengerStore } from '@/stores/messenger'
import { userApi, type MediaUploadResponse } from '@/stores/api/user'
import ChatSearchModal from '@/components/messenger/ChatSearchModal.vue'
import type { SearchMessageHit } from '@/stores/api/chat'

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
const messageInput = ref('')
const showSearchModal = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const attachments = ref<PendingAttachment[]>([])
const uploading = computed(() => attachments.value.some((a) => a.uploading))

const chatId = computed(() => route.params.id as string)

watch(
  chatId,
  async (id) => {
    if (id) {
      messengerStore.setActiveChat(id)
      if (!messengerStore.messages.has(id)) {
        await messengerStore.loadChatHistory(id)
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
  if (chat.chat.type === 'GROUP' && chat.chat.name) {
    return chat.chat.name as unknown as string
  }
  const other = chat.chat.members.find((m) => m.id !== messengerStore.currentUserId)
  return (other?.name as unknown as string) ?? (other?.username as unknown as string) ?? 'Chat'
})

const isGroup = computed(() => messengerStore.activeChat?.chat.type === 'GROUP')

const otherUserId = computed(() => {
  const chat = messengerStore.activeChat?.chat
  if (!chat || chat.type === 'GROUP') return null
  const other = chat.members.find((m) => m.id !== messengerStore.currentUserId)
  return other?.id || null
})


const chatMessages = computed(() => {
  return messengerStore.activeMessages.map((msg) => ({
    id: msg.id,
    role: (msg.sender.id === messengerStore.currentUserId ? 'user' : 'assistant') as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: msg.content }],
    sender: (msg.sender.name as unknown as string) ?? (msg.sender.username as unknown as string) ?? undefined,
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
      const media: MediaUploadResponse = await userApi.uploadMedia(file)
      const idx = attachments.value.findIndex((a) => a.id === id)
      if (idx !== -1) attachments.value[idx] = { ...attachments.value[idx], mediaId: media.id, uploading: false }
    } catch {
      const idx = attachments.value.findIndex((a) => a.id === id)
      if (idx !== -1) attachments.value[idx] = { ...attachments.value[idx], error: 'Upload failed', uploading: false }
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
  const hasText = messageInput.value.trim().length > 0
  const hasMedia = attachments.value.some((a) => a.mediaId)
  const stillUploading = uploading.value
  return (hasText || hasMedia) && !stillUploading
})

function handleSubmit() {
  if (!canSend.value) return
  const mediaIds = attachments.value.filter((a) => a.mediaId).map((a) => a.mediaId!)
  messengerStore.sendMessage(messageInput.value, mediaIds.length ? mediaIds : undefined)
  messageInput.value = ''
  attachments.value.forEach((a) => URL.revokeObjectURL(a.previewUrl))
  attachments.value = []
  if (typingTimeout) clearTimeout(typingTimeout)
  if (chatId.value) messengerStore.emitTypingStop(chatId.value)
  scrollToBottom()
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
      <RouterLink to="/messenger" class="lg:hidden text-white/70 hover:text-white transition-colors">
        <UIcon name="i-lucide-arrow-left" class="text-lg" />
      </RouterLink>
      <UAvatar :icon="isGroup ? 'i-lucide-users' : 'i-lucide-user'" size="sm" />
      <span class="font-medium text-sm flex-1">{{ chatName }}</span>

      <UDropdown v-if="otherUserId" :items="profileDropdownItems">
        <!-- <UButton icon="i-lucide-more-vertical" variant="ghost" color="neutral" size="sm" square /> -->
        <UButton
          v-if="otherUserId" icon="i-lucide-user" variant="ghost" color="neutral" size="sm" square
          @click="router.push({ path: `/profile/${otherUserId}`, query: { name: chatName } })"/>
      </UDropdown>


      <UButton
        icon="i-lucide-search"
        variant="ghost"
        color="neutral"
        size="sm"
        square
        @click="showSearchModal = true"
      />
    </div>

    <!-- Messages area -->
    <div ref="messagesContainer" class="flex-1 min-h-0 overflow-y-auto">
      <UChatMessages
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
            :class="messengerStore.highlightedMessageId === (message as any).id ? 'bg-primary/20 rounded-lg -mx-2 px-2 py-1' : ''"
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
    <div class="shrink-0 border-t border-white/10">
      <!-- Attachment previews -->
      <div v-if="attachments.length" class="flex gap-2 px-3 pt-3 overflow-x-auto">
        <div v-for="att in attachments" :key="att.id" class="relative shrink-0 size-16 rounded-lg overflow-hidden bg-white/5">
          <video v-if="isVideo(att.file)" :src="att.previewUrl" class="size-full object-cover" />
          <img v-else :src="att.previewUrl" class="size-full object-cover" />
          <div v-if="att.uploading" class="absolute inset-0 flex items-center justify-center bg-black/50">
            <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
          </div>
          <div v-else-if="att.error" class="absolute inset-0 flex items-center justify-center bg-red-900/50">
            <UIcon name="i-lucide-alert-circle" class="size-4 text-red-400" />
          </div>
          <button
            class="absolute top-0.5 right-0.5 size-4 rounded-full bg-black/60 flex items-center justify-center"
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
          @click="openFilePicker"
        />
        <UTextarea
          v-model="messageInput"
          :placeholder="t('messenger.typemessage')"
          autoresize
          :rows="1"
          :maxrows="4"
          class="flex-1"
          @update:model-value="onInputChange"
          @keydown.enter.exact.prevent="handleSubmit"
        />
        <UButton
          icon="i-lucide-send"
          variant="ghost"
          :color="canSend ? 'primary' : 'neutral'"
          size="sm"
          square
          :disabled="!canSend"
          @click="handleSubmit"
        />
      </div>
    </div>
    <ChatSearchModal
      v-model:open="showSearchModal"
      :chat-id="chatId"
      @select="handleSearchSelect"
    />
  </div>
</template>
