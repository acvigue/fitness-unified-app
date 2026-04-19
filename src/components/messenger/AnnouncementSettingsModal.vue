<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type OrgRole = 'MEMBER' | 'STAFF' | 'ADMIN'
type ChatResponse = components['schemas']['ChatResponseDto']

const props = defineProps<{
  chat: ChatResponse
}>()

const emit = defineEmits<{
  (e: 'updated', chat: ChatResponse): void
  (e: 'deleted', chatId: string): void
}>()

const open = defineModel<boolean>('open', { default: false })

const router = useRouter()

const form = reactive({
  name: '',
  writeRoles: [] as OrgRole[],
})
const saving = ref(false)
const deleting = ref(false)
const error = ref('')

const roleOptions: { label: string; value: OrgRole }[] = [
  { label: 'Admins', value: 'ADMIN' },
  { label: 'Staff', value: 'STAFF' },
  { label: 'Members', value: 'MEMBER' },
]

watch(
  () => [open.value, props.chat] as const,
  ([isOpen]) => {
    if (!isOpen) return
    error.value = ''
    form.name = (props.chat.name as unknown as string) ?? ''
    form.writeRoles = [...(props.chat.writeRoles ?? [])]
  },
  { immediate: true },
)

const canSubmit = computed(() => !!form.name.trim() && form.writeRoles.length > 0)

function toggleRole(role: OrgRole) {
  if (form.writeRoles.includes(role)) {
    form.writeRoles = form.writeRoles.filter((r) => r !== role)
  } else {
    form.writeRoles = [...form.writeRoles, role]
  }
}

async function save() {
  if (!canSubmit.value) return
  saving.value = true
  error.value = ''
  try {
    const { data, error: apiError } = await apiClient.PATCH(
      '/v1/chats/announcements/{chatId}',
      {
        params: { path: { chatId: props.chat.id } },
        body: {
          name: form.name.trim(),
          writeRoles: form.writeRoles,
        },
      },
    )
    if (apiError) {
      error.value = getErrorMessage(apiError, 'Failed to update channel')
      return
    }
    emit('updated', data)
    open.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to update channel'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!window.confirm('Delete this announcement channel? This cannot be undone.')) return
  deleting.value = true
  error.value = ''
  try {
    const { error: apiError } = await apiClient.DELETE(
      '/v1/chats/announcements/{chatId}',
      {
        params: { path: { chatId: props.chat.id } },
      },
    )
    if (apiError) {
      error.value = getErrorMessage(apiError, 'Failed to delete channel')
      return
    }
    emit('deleted', props.chat.id)
    open.value = false
    router.push('/messenger')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete channel'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <h2 class="text-lg font-semibold">Announcement Settings</h2>

        <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

        <UFormField label="Channel name">
          <UInput v-model="form.name" />
        </UFormField>

        <UFormField label="Who can post?">
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="r in roleOptions"
              :key="r.value"
              size="sm"
              :variant="form.writeRoles.includes(r.value) ? 'solid' : 'outline'"
              :color="form.writeRoles.includes(r.value) ? 'primary' : 'neutral'"
              @click="toggleRole(r.value)"
            >
              {{ r.label }}
            </UButton>
          </div>
        </UFormField>

        <div class="flex flex-wrap gap-2 pt-2">
          <UButton color="primary" :loading="saving" :disabled="!canSubmit" @click="save">
            Save Changes
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-trash-2"
            :loading="deleting"
            @click="remove"
          >
            Delete
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
