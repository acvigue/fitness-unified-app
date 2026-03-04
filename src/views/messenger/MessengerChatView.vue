<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMessengerStore } from '@/stores/messenger'

const { t } = useI18n()
const route = useRoute()
const messengerStore = useMessengerStore()
const messageInput = ref('')

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

const chatMessages = computed(() => {
  return messengerStore.activeMessages.map((msg) => ({
    id: msg.id,
    role: (msg.sender.id === messengerStore.currentUserId ? 'user' : 'assistant') as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: msg.content }],
    sender: (msg.sender.name as unknown as string) ?? (msg.sender.username as unknown as string) ?? undefined,
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

function handleSubmit() {
  if (!messageInput.value.trim()) return
  messengerStore.sendMessage(messageInput.value)
  messageInput.value = ''
  if (typingTimeout) clearTimeout(typingTimeout)
  if (chatId.value) messengerStore.emitTypingStop(chatId.value)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Chat header -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
      <RouterLink to="/messenger" class="lg:hidden text-white/70 hover:text-white transition-colors">
        <UIcon name="i-fa6-solid:arrow-left" class="text-lg" />
      </RouterLink>
      <UAvatar :icon="isGroup ? 'i-fa6-solid:users' : 'i-fa6-solid:user'" size="sm" />
      <span class="font-medium text-sm">{{ chatName }}</span>
    </div>

    <!-- Messages area -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <UChatMessages
        :messages="chatMessages"
        :user="{ side: 'right', variant: 'soft' }"
        :assistant="{ side: 'left', variant: 'soft' }"
        :should-scroll-to-bottom="true"
        class="h-full py-4"
      >
        <template #content="{ message }">
          <p
            v-if="isGroup && message.role !== 'user' && (message as any).sender"
            class="text-xs text-white/50 font-medium mb-0.5"
          >
            {{ (message as any).sender }}
          </p>
          <template v-for="part in message.parts" :key="part">
            <p v-if="part.type === 'text'">{{ part.text }}</p>
          </template>
        </template>
      </UChatMessages>

      <!-- Typing indicator -->
      <div v-if="typingText" class="px-4 pb-2 text-xs text-white/40 italic">
        {{ typingText }}
      </div>
    </div>

    <!-- Input bar -->
    <div class="shrink-0 border-t border-white/10">
      <UChatPrompt
        v-model="messageInput"
        :placeholder="t('messenger.typemessage')"
        :autofocus="false"
        @update:model-value="onInputChange"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
