<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type Appeal = components['schemas']['SuspensionAppealResponseDto']

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  submitted: []
}>()

const toast = useToastStore()
const message = ref('')
const submitting = ref(false)
const error = ref('')
const appeals = ref<Appeal[]>([])
const loadingHistory = ref(false)

const isValid = computed(() => message.value.trim().length >= 10)

watch(
  () => props.open,
  (v) => {
    if (!v) return
    message.value = ''
    error.value = ''
    void loadHistory()
  },
)

async function loadHistory() {
  loadingHistory.value = true
  try {
    const { data } = await apiClient.GET('/v1/me/suspension-appeals')
    appeals.value = data ?? []
  } finally {
    loadingHistory.value = false
  }
}

onMounted(loadHistory)

async function submit() {
  if (!isValid.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const { error: err } = await apiClient.POST('/v1/me/suspension-appeals', {
      body: { message: message.value.trim() },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to submit appeal')
      return
    }
    toast.success('Appeal submitted', 'A moderator will review it.')
    emit('submitted')
    emit('update:open', false)
    await loadHistory()
  } finally {
    submitting.value = false
  }
}

function statusColor(status: Appeal['status']) {
  if (status === 'APPROVED') return 'success'
  if (status === 'DENIED') return 'error'
  return 'warning'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <UModal
    :open="props.open"
    :dismissible="!submitting"
    @update:open="(v) => emit('update:open', v)"
  >
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="text-lg font-semibold">Appeal your suspension</h2>
          <p class="text-sm text-white/60">
            Explain why your suspension should be lifted. A moderator will review your appeal.
          </p>
        </div>

        <UFormField
          label="Your case"
          required
          :hint="`${message.length}/2000`"
          :error="message.length > 0 && !isValid ? 'At least 10 characters required' : undefined"
        >
          <UTextarea v-model="message" :rows="6" maxlength="2000" />
        </UFormField>

        <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

        <div class="flex gap-2 justify-end">
          <UButton
            variant="ghost"
            color="neutral"
            :disabled="submitting"
            @click="emit('update:open', false)"
          >
            Close
          </UButton>
          <UButton :loading="submitting" :disabled="!isValid" @click="submit"
            >Submit appeal</UButton
          >
        </div>

        <div v-if="appeals.length > 0" class="flex flex-col gap-2">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">Your appeals</p>
          <ul class="flex flex-col gap-2 max-h-60 overflow-auto">
            <li
              v-for="a in appeals"
              :key="a.id"
              class="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <div class="flex items-center justify-between gap-2">
                <UBadge :color="statusColor(a.status)" variant="soft" size="xs">
                  {{ a.status }}
                </UBadge>
                <span class="text-xs text-white/50">{{ formatDate(a.createdAt) }}</span>
              </div>
              <p class="mt-1 text-sm text-white/80 whitespace-pre-wrap">{{ a.message }}</p>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </UModal>
</template>
