import { ref, readonly } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { ENV } from '@/config/environment'
import { useAuthStore } from '@/stores/auth/auth'
import type { MessageResponse } from '@/stores/api/chat'

export interface TypingStartEvent {
  chatId: string
  userId: string
  username: string
}

export interface TypingStopEvent {
  chatId: string
  userId: string
}

export interface SocketCallbacks {
  onNewMessage: (message: MessageResponse) => void
  onTypingStart: (event: TypingStartEvent) => void
  onTypingStop: (event: TypingStopEvent) => void
  onError: (error: { message: string }) => void
}

let socket: Socket | null = null
const connected = ref(false)

export function useChatSocket() {
  function connect(callbacks: SocketCallbacks) {
    if (socket?.connected) return

    const authStore = useAuthStore()

    socket = io(`${ENV.apiBaseUrl}/chat`, {
      auth: async (cb) => {
        const token = await authStore.getAccessToken()
        cb({ token })
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      connected.value = true
    })
    socket.on('disconnect', () => {
      connected.value = false
    })
    socket.on('new_message', callbacks.onNewMessage)
    socket.on('typing_start', callbacks.onTypingStart)
    socket.on('typing_stop', callbacks.onTypingStop)
    socket.on('error', callbacks.onError)
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
    connected.value = false
  }

  function sendMessage(chatId: string, content: string, mediaIds?: string[]) {
    socket?.emit('send_message', { chatId, content, ...(mediaIds?.length ? { mediaIds } : {}) })
  }

  function joinChat(chatId: string) {
    socket?.emit('join_chat', { chatId })
  }

  function emitTypingStart(chatId: string) {
    socket?.emit('typing_start', { chatId })
  }

  function emitTypingStop(chatId: string) {
    socket?.emit('typing_stop', { chatId })
  }

  return {
    connected: readonly(connected),
    connect,
    disconnect,
    sendMessage,
    joinChat,
    emitTypingStart,
    emitTypingStop,
  }
}
