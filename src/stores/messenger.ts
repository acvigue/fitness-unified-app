import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'
import {
  useChatSocket,
  type TypingStartEvent,
  type TypingStopEvent,
} from '@/composables/useChatSocket'

type UserChat = components['schemas']['UserChatResponseDto']
type ChatResponse = components['schemas']['ChatResponseDto']
type MessageResponse = components['schemas']['MessageResponseDto']

export interface ConversationSummary {
  chat: UserChat | ChatResponse
  lastMessage: MessageResponse | null
  unreadCount: number
}

export const useMessengerStore = defineStore('messenger', () => {
  const conversations = ref<Map<string, ConversationSummary>>(new Map())
  const messages = ref<Map<string, MessageResponse[]>>(new Map())
  const activeChatId = ref<string | null>(null)
  const highlightedMessageId = ref<string | null>(null)
  const loading = ref(false)
  const initialized = ref(false)
  const currentUserId = ref<string | null>(null)
  const typingUsers = ref<Map<string, Map<string, string>>>(new Map())

  const {
    connect,
    disconnect,
    sendMessage: socketSendMessage,
    joinChat,
    emitTypingStart,
    emitTypingStop,
    connected,
  } = useChatSocket()

  const sortedConversations = computed(() => {
    return Array.from(conversations.value.values()).sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.chat.createdAt
      const bTime = b.lastMessage?.createdAt ?? b.chat.createdAt
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
  })

  const activeMessages = computed(() => {
    if (!activeChatId.value) return []
    return messages.value.get(activeChatId.value) ?? []
  })

  const activeChat = computed(() => {
    if (!activeChatId.value) return null
    return conversations.value.get(activeChatId.value) ?? null
  })

  const activeTypingUsers = computed(() => {
    if (!activeChatId.value) return []
    const users = typingUsers.value.get(activeChatId.value)
    return users ? Array.from(users.values()) : []
  })

  async function initialize() {
    if (initialized.value) return
    loading.value = true

    try {
      const { data } = await apiClient.GET('/v1/user/me')
      if (data) currentUserId.value = data.sub

      const { data: chatsData, error: chatsError } = await apiClient.GET('/v1/chats')
      if (chatsError) throw new Error(getErrorMessage(chatsError, 'Failed to load chats'))
      for (const chat of chatsData) {
        conversations.value.set(chat.id, {
          chat,
          lastMessage: (chat.lastMessage as MessageResponse) ?? null,
          unreadCount: 0,
        })
      }

      connect({
        onNewMessage: handleNewMessage,
        onTypingStart: handleTypingStart,
        onTypingStop: handleTypingStop,
        onError: (err) => console.error('Chat socket error:', err.message),
      })
    } catch (err) {
      console.error('Failed to initialize messenger:', err)
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  async function loadChatHistory(chatId: string, page = 1) {
    const { data: historyData, error: historyError } = await apiClient.GET(
      '/v1/chats/history/{chatId}',
      {
        params: {
          path: { chatId },
          query: { page, per_page: 50 },
        },
      },
    )
    if (historyError) throw new Error(getErrorMessage(historyError, 'Failed to load chat history'))
    const history = historyData
    const existing = messages.value.get(chatId) ?? []
    if (page === 1) {
      messages.value.set(chatId, [...history.data].reverse())
    } else {
      messages.value.set(chatId, [...history.data.reverse(), ...existing])
    }
    return history.meta
  }

  async function jumpToMessage(chatId: string, messageId: string, page: number) {
    const { data: jumpData, error: jumpError } = await apiClient.GET('/v1/chats/history/{chatId}', {
      params: {
        path: { chatId },
        query: { page, per_page: 50 },
      },
    })
    if (jumpError) throw new Error(getErrorMessage(jumpError, 'Failed to load chat history'))
    messages.value.set(chatId, [...jumpData.data].reverse())
    highlightedMessageId.value = messageId
  }

  function handleNewMessage(message: MessageResponse) {
    const chatMessages = messages.value.get(message.chatId) ?? []
    // Avoid duplicates
    if (chatMessages.some((m) => m.id === message.id)) return
    chatMessages.push(message)
    messages.value.set(message.chatId, chatMessages)

    const convo = conversations.value.get(message.chatId)
    if (convo) {
      convo.lastMessage = message
      if (message.chatId !== activeChatId.value && message.sender.id !== currentUserId.value) {
        convo.unreadCount++
      }
    }

    // Clear typing indicator for sender
    typingUsers.value.get(message.chatId)?.delete(message.sender.id)
  }

  function handleTypingStart(event: TypingStartEvent) {
    if (event.userId === currentUserId.value) return
    if (!typingUsers.value.has(event.chatId)) {
      typingUsers.value.set(event.chatId, new Map())
    }
    typingUsers.value.get(event.chatId)!.set(event.userId, event.username)
  }

  function handleTypingStop(event: TypingStopEvent) {
    typingUsers.value.get(event.chatId)?.delete(event.userId)
  }

  async function createChat(recipientIds: string[], name?: string): Promise<ChatResponse> {
    const { data: chatData, error: chatError } = await apiClient.POST('/v1/chats/create', {
      body: { recipientIds, name },
    })
    if (chatError) throw new Error(getErrorMessage(chatError, 'Failed to create chat'))
    const chat = chatData
    conversations.value.set(chat.id, { chat, lastMessage: null, unreadCount: 0 })
    messages.value.set(chat.id, [])
    joinChat(chat.id)
    return chat
  }

  async function sendMessage(content: string, mediaIds?: string[]) {
    if (!activeChatId.value || (!content.trim() && !mediaIds?.length)) return
    if (connected.value) {
      socketSendMessage(activeChatId.value, content, mediaIds)
    } else {
      const { data: msgData, error: msgError } = await apiClient.POST('/v1/chats/send-message', {
        body: { chatId: activeChatId.value, content, ...(mediaIds?.length ? { mediaIds } : {}) },
      })
      if (msgError) throw new Error(getErrorMessage(msgError, 'Failed to send message'))
      handleNewMessage(msgData)
    }
  }

  function setActiveChat(chatId: string | null) {
    activeChatId.value = chatId
    if (chatId) {
      const convo = conversations.value.get(chatId)
      if (convo) convo.unreadCount = 0
    }
  }

  function $reset() {
    disconnect()
    conversations.value.clear()
    messages.value.clear()
    activeChatId.value = null
    highlightedMessageId.value = null
    loading.value = false
    initialized.value = false
    currentUserId.value = null
    typingUsers.value.clear()
  }

  return {
    conversations,
    messages,
    activeChatId,
    highlightedMessageId,
    loading,
    initialized,
    connected,
    currentUserId,
    typingUsers,
    sortedConversations,
    activeMessages,
    activeChat,
    activeTypingUsers,
    initialize,
    loadChatHistory,
    jumpToMessage,
    createChat,
    sendMessage,
    setActiveChat,
    emitTypingStart,
    emitTypingStop,
    $reset,
  }
})
