<script setup lang="ts">
import { computed } from 'vue'
import { useAccountStatusStore } from '@/stores/accountStatus'

const store = useAccountStatusStore()

const visible = computed(() => store.isSuspended || store.isBanned)

const tone = computed(() => (store.isBanned ? 'error' : 'warning'))
const icon = computed(() => (store.isBanned ? 'i-lucide-shield-x' : 'i-lucide-shield-alert'))

const title = computed(() => {
  if (store.isBanned) return 'Your account has been banned'
  if (store.isSuspended) return 'Your account is suspended'
  return ''
})

const detail = computed(() => {
  const parts: string[] = []
  if (store.isSuspended && store.suspendedUntil) {
    const until = new Date(store.suspendedUntil)
    parts.push(
      `Suspension lifts ${until.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.`,
    )
  }
  if (store.reason) parts.push(`Reason: ${store.reason}`)
  return parts.join(' ')
})
</script>

<template>
  <UAlert
    v-if="visible"
    :color="tone"
    variant="soft"
    :icon="icon"
    :title="title"
    :description="detail || undefined"
    class="rounded-none border-x-0 border-t-0"
  />
</template>
