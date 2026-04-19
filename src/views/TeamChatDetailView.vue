<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useAuthStore } from '@/stores/auth/auth'
import { useMessengerStore } from '@/stores/messenger'
import { useTeamChatStore } from '@/stores/teamChat'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { ENV } from '@/config/environment'
import type { components } from '@/types/api'

type TeamChat = components['schemas']['TeamChatResponseDto']
type MediaUploadResponse = components['schemas']['MediaUploadResponseDto']

interface PendingAttachment {
  id: string
  file: File
  previewUrl: string
  uploading: boolean
  mediaId?: string
  error?: string
}

useHead({ title: 'Team Chat' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const messengerStore = useMessengerStore()
const teamChatStore = useTeamChatStore()

const teamId = computed(() => route.params.id as string)
const chatId = computed(() => route.params.chatId as string)

const chat = ref<TeamChat | null>(null)
const loadError = ref('')
const sendError = ref('')
const sending = ref(false)
const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const attachments = ref<PendingAttachment[]>([])
const uploading = computed(() => attachments.value.some((a) => a.uploading))

const currentUserId = computed(() => {
  const user = authStore.user as { sub?: string } | null
  return user?.sub ?? ''
})

const messages = computed(() => messengerStore.messages.get(chatId.value) ?? [])

const otherTeamId = computed(() => {
  if (!chat.value) return null
  return chat.value.team1Id === teamId.value ? chat.value.team2Id : chat.value.team1Id
})

const otherTeamName = ref<string>('Team Chat')

async function loadChatInfo() {
  const { data, error } = await apiClient.GET('/v1/team-chats/team/{teamId}', {
    params: { path: { teamId: teamId.value } },
  })
  if (error) {
    loadError.value = getErrorMessage(error, 'Failed to load chat info')
    return
  }
  const match = (data ?? []).find((c) => c.id === chatId.value)
  if (!match) {
    loadError.value = 'Chat not found for this team.'
    return
  }
  chat.value = match
  await loadOtherTeamName()
}

async function loadOtherTeamName() {
  if (!otherTeamId.value) return
  const { data } = await apiClient.GET('/v1/teams/{id}', {
    params: { path: { id: otherTeamId.value } },
  })
  if (data) otherTeamName.value = data.name
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(
  messages,
  () => {
    scrollToBottom()
  },
  { deep: true },
)

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
        attachments.value[idx] = {
          ...attachments.value[idx],
          mediaId: media.id,
          uploading: false,
        }
    } catch {
      const idx = attachments.value.findIndex((a) => a.id === id)
      if (idx !== -1)
        attachments.value[idx] = {
          ...attachments.value[idx],
          error: 'Upload failed',
          uploading: false,
        }
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

function isVideo(file: File) {
  return file.type.startsWith('video/')
}

const canSend = computed(() => {
  const hasText = messageInput.value.trim().length > 0
  const hasMedia = attachments.value.some((a) => a.mediaId)
  return (hasText || hasMedia) && !uploading.value && !sending.value
})

async function handleSubmit() {
  if (!canSend.value) return
  sending.value = true
  sendError.value = ''
  const content = messageInput.value
  const mediaIds = attachments.value.filter((a) => a.mediaId).map((a) => a.mediaId!)
  try {
    const sent = await teamChatStore.sendMessage(
      chatId.value,
      content,
      mediaIds.length ? mediaIds : undefined,
    )
    // Optimistically place message in the store (socket echo will dedupe via id check)
    const existing = messengerStore.messages.get(chatId.value) ?? []
    if (!existing.some((m) => m.id === sent.id)) {
      messengerStore.messages.set(chatId.value, [...existing, sent])
    }
    messageInput.value = ''
    attachments.value.forEach((a) => URL.revokeObjectURL(a.previewUrl))
    attachments.value = []
    scrollToBottom()
  } catch (e) {
    sendError.value = e instanceof Error ? e.message : 'Failed to send message'
  } finally {
    sending.value = false
  }
}

function initialsFor(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

onMounted(async () => {
  await messengerStore.initialize()
  await Promise.all([
    loadChatInfo(),
    messengerStore
      .loadChatHistory(chatId.value)
      .catch((e) => {
        loadError.value = e instanceof Error ? e.message : 'Failed to load history'
      }),
  ])
  scrollToBottom()
})

onUnmounted(() => {
  attachments.value.forEach((a) => URL.revokeObjectURL(a.previewUrl))
})
</script>

<template>
  <div class="flex flex-col h-full bg-[#09090b]">
    <div
      class="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0"
      :style="{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }"
    >
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        square
        @click="router.push(`/teams/${teamId}/chats`)"
      />
      <UAvatar icon="i-lucide-users" size="sm" />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">{{ otherTeamName }}</p>
        <p v-if="chat" class="text-xs text-white/50">{{ chat.members.length }} members</p>
      </div>
    </div>

    <UAlert
      v-if="loadError"
      color="error"
      :title="loadError"
      icon="i-lucide-circle-alert"
      class="m-4"
      :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
      @close="loadError = ''"
    />

    <div ref="messagesContainer" class="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      <div v-if="!messages.length" class="text-center text-sm text-white/40 pt-8">
        No messages yet. Say hi to {{ otherTeamName }}.
      </div>
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex gap-2"
          :class="msg.sender.id === currentUserId ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[75%] rounded-lg px-3 py-2"
            :class="
              msg.sender.id === currentUserId
                ? 'bg-primary/20 text-white'
                : 'bg-white/5 text-white/90'
            "
          >
            <p
              v-if="msg.sender.id !== currentUserId"
              class="text-[10px] text-white/50 font-medium mb-0.5"
            >
              {{ ((msg.sender.name as unknown as string) ||
                 (msg.sender.username as unknown as string) ||
                 initialsFor('Member')) }}
            </p>
            <div v-if="msg.media?.length" class="flex flex-wrap gap-1.5 mb-1">
              <template v-for="m in msg.media" :key="m.id">
                <video
                  v-if="m.mimeType?.startsWith('video/')"
                  :src="m.url"
                  controls
                  class="max-w-60 max-h-48 rounded-lg"
                />
                <img
                  v-else
                  :src="m.url"
                  alt="attachment"
                  class="max-w-60 max-h-48 rounded-lg object-cover"
                />
              </template>
            </div>
            <p v-if="msg.content" class="text-sm whitespace-pre-wrap break-words">
              {{ msg.content }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="shrink-0 border-t border-white/10">
      <UAlert
        v-if="sendError"
        color="error"
        :title="sendError"
        icon="i-lucide-circle-alert"
        class="m-3"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="sendError = ''"
      />
      <div v-if="attachments.length" class="flex gap-2 px-3 pt-3 overflow-x-auto">
        <div
          v-for="att in attachments"
          :key="att.id"
          class="relative shrink-0 size-16 rounded-lg overflow-hidden bg-white/5"
        >
          <video v-if="isVideo(att.file)" :src="att.previewUrl" class="size-full object-cover" />
          <img v-else :src="att.previewUrl" class="size-full object-cover" />
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
          @keydown.enter.exact.prevent="handleSubmit"
        />
        <UButton
          icon="i-lucide-send"
          variant="ghost"
          :color="canSend ? 'primary' : 'neutral'"
          size="sm"
          square
          :disabled="!canSend"
          :loading="sending"
          @click="handleSubmit"
        />
      </div>
    </div>
  </div>
</template>
