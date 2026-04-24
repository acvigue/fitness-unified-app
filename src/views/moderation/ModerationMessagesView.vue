<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'

interface Message {
  id: string
  chatId: string
  senderId: string
  content: string
  type: string
  createdAt: string
  hiddenAt: string | null
  deletedAt: string | null
}

useHead({ title: 'Moderation · Messages' })

const { setHeader } = usePageHeader()
const toast = useToastStore()

const messages = ref<Message[]>([])
const loading = ref(false)
const error = ref('')

const query = ref('')
const teamIdFilter = ref('')
const flagModal = ref<{ open: boolean; messageId: string; reason: string }>({
  open: false,
  messageId: '',
  reason: '',
})
const deleteModal = ref<{ open: boolean; messageId: string; reason: string }>({
  open: false,
  messageId: '',
  reason: '',
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, string> = {}
    if (query.value.trim()) params.q = query.value.trim()
    if (teamIdFilter.value.trim()) params.teamId = teamIdFilter.value.trim()
    const response = await (
      apiClient as unknown as {
        GET: (
          path: string,
          opts: { params: { query: Record<string, string> } },
        ) => Promise<{ data?: Message[]; error?: unknown }>
      }
    ).GET('/v1/moderation/messages', { params: { query: params } })
    if (response.error) {
      error.value = getErrorMessage(response.error, 'Failed to load messages')
      return
    }
    messages.value = response.data ?? []
  } finally {
    loading.value = false
  }
}

function openFlag(messageId: string) {
  flagModal.value = { open: true, messageId, reason: '' }
}

function openDelete(messageId: string) {
  deleteModal.value = { open: true, messageId, reason: '' }
}

async function flag() {
  const { messageId, reason } = flagModal.value
  const { error: err } = await apiClient.POST('/v1/moderation/messages/{id}/flag', {
    params: { path: { id: messageId } },
    body: { reason },
  })
  if (err) {
    toast.error('Could not flag message', getErrorMessage(err, 'Flag failed'))
    return
  }
  toast.success('Message flagged')
  flagModal.value.open = false
  await load()
}

async function deleteMessage() {
  const { messageId, reason } = deleteModal.value
  if (!reason.trim()) {
    toast.warning('Reason required')
    return
  }
  const { error: err } = await apiClient.DELETE('/v1/moderation/messages/{id}', {
    params: { path: { id: messageId } },
    body: { reason: reason.trim() },
  })
  if (err) {
    toast.error('Could not delete message', getErrorMessage(err, 'Delete failed'))
    return
  }
  toast.success('Message deleted', 'Author has been notified.')
  deleteModal.value.open = false
  await load()
}

onMounted(() => {
  setHeader({ title: 'Moderation · Messages', backRoute: '/settings' })
  load()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <UFormField label="Search content" class="flex-1">
            <UInput v-model="query" placeholder="Find a message…" icon="i-lucide-search" />
          </UFormField>
          <UFormField label="Team ID (optional)" class="flex-1">
            <UInput v-model="teamIdFilter" placeholder="Scope to one team" />
          </UFormField>
          <UButton icon="i-lucide-refresh-cw" :loading="loading" @click="load">Search</UButton>
        </div>
      </UCard>

      <div v-if="loading" class="flex justify-center p-6">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
      </div>

      <div
        v-else-if="messages.length === 0"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        No messages match the filters.
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="m in messages"
          :key="m.id"
          class="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="text-xs text-white/50">
                {{ new Date(m.createdAt).toLocaleString() }} · {{ m.senderId }}
              </p>
              <p class="text-sm whitespace-pre-wrap">{{ m.content }}</p>
            </div>
            <div class="flex flex-col gap-1">
              <UBadge v-if="m.hiddenAt" color="warning" variant="soft" size="xs">Flagged</UBadge>
              <UBadge v-if="m.deletedAt" color="error" variant="soft" size="xs">Deleted</UBadge>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <UButton
              v-if="!m.hiddenAt"
              size="xs"
              variant="outline"
              color="warning"
              icon="i-lucide-flag"
              @click="openFlag(m.id)"
            >
              Flag
            </UButton>
            <UButton
              v-if="!m.deletedAt"
              size="xs"
              variant="outline"
              color="error"
              icon="i-lucide-trash-2"
              @click="openDelete(m.id)"
            >
              Delete
            </UButton>
          </div>
        </li>
      </ul>
    </section>

    <UModal v-model:open="flagModal.open">
      <template #content>
        <div class="p-6 flex flex-col gap-3">
          <h3 class="text-lg font-semibold">Flag message</h3>
          <UFormField label="Reason (optional)">
            <UTextarea v-model="flagModal.reason" :rows="3" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="flagModal.open = false">
              Cancel
            </UButton>
            <UButton color="warning" @click="flag">Flag</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteModal.open">
      <template #content>
        <div class="p-6 flex flex-col gap-3">
          <h3 class="text-lg font-semibold">Delete message</h3>
          <p class="text-sm text-white/60">
            A reason is required. The author will be notified and this action is audit-logged.
          </p>
          <UFormField label="Reason">
            <UTextarea v-model="deleteModal.reason" :rows="3" autofocus />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="deleteModal.open = false">
              Cancel
            </UButton>
            <UButton color="error" :disabled="!deleteModal.reason.trim()" @click="deleteMessage">
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
