import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function push(tone: ToastTone, title: string, description?: string, timeoutMs = 5000) {
    const id = Math.random().toString(36).slice(2)
    toasts.value.push({ id, tone, title, description })
    if (timeoutMs > 0) {
      setTimeout(() => dismiss(id), timeoutMs)
    }
    return id
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function info(title: string, description?: string) {
    return push('info', title, description)
  }
  function success(title: string, description?: string) {
    return push('success', title, description)
  }
  function warning(title: string, description?: string) {
    return push('warning', title, description)
  }
  function error(title: string, description?: string) {
    return push('error', title, description)
  }

  return { toasts, push, dismiss, info, success, warning, error }
})
