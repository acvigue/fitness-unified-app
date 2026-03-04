import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

export type UserChat = components['schemas']['UserChatResponseDto']
export type ChatResponse = components['schemas']['ChatResponseDto']
export type ChatMember = components['schemas']['ChatMemberDto']
export type MessageResponse = components['schemas']['MessageResponseDto']
export type MessageSender = components['schemas']['MessageSenderDto']
export type ChatHistory = components['schemas']['ChatHistoryResponseDto']
export type UserLookupItem = components['schemas']['UserLookupItemDto']

export const chatApi = {
  async getUserChats(): Promise<UserChat[]> {
    const { data, error } = await apiClient.GET('/v1/chats')
    if (error) throw new Error(getErrorMessage(error, 'Failed to load chats'))
    return data
  },

  async createChat(recipientIds: string[], name?: string): Promise<ChatResponse> {
    const { data, error } = await apiClient.POST('/v1/chats/create', {
      body: { recipientIds, name },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to create chat'))
    return data
  },

  async getChatHistory(chatId: string, page = 1, perPage = 50): Promise<ChatHistory> {
    const { data, error } = await apiClient.GET('/v1/chats/history/{chatId}', {
      params: {
        path: { chatId },
        query: { page, per_page: perPage },
      },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to load chat history'))
    return data
  },

  async sendMessage(chatId: string, content: string): Promise<MessageResponse> {
    const { data, error } = await apiClient.POST('/v1/chats/send-message', {
      body: { chatId, content },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to send message'))
    return data
  },

  async lookupUsers(query: string): Promise<UserLookupItem[]> {
    const { data, error } = await apiClient.GET('/v1/user/lookup', {
      params: { query: { q: query } },
    })
    if (error) throw new Error(getErrorMessage(error, 'Failed to search users'))
    return data.users
  },
}
