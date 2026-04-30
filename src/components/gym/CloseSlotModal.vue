<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DateTimeRangePicker from '@/components/datetime/DateTimeRangePicker.vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  open: boolean
  gymId: string
  windowStart: string
  windowEnd: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  closed: []
}>()

const toast = useToastStore()

const range = ref({ startsAt: '', endsAt: '' })
const note = ref('')
const submitting = ref(false)
const error = ref('')

watch(
  () => props.open,
  (v) => {
    if (!v) return
    range.value = { startsAt: props.windowStart, endsAt: props.windowEnd }
    note.value = ''
    error.value = ''
  },
  { immediate: true },
)

const isValid = computed(() => {
  const { startsAt, endsAt } = range.value
  if (!startsAt || !endsAt) return false
  return new Date(endsAt) > new Date(startsAt)
})

async function submit() {
  if (!isValid.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const { error: err } = await apiClient.POST('/v1/gyms/{id}/closures', {
      params: { path: { id: props.gymId } },
      body: {
        startsAt: range.value.startsAt,
        endsAt: range.value.endsAt,
        note: note.value.trim() || undefined,
      },
    })
    if (err) {
      const message = getErrorMessage(err, 'Failed to close window')
      error.value = message
      toast.error('Could not close window', message)
      return
    }
    toast.success('Window closed', 'Watchers will be notified.')
    emit('closed')
    emit('update:open', false)
  } finally {
    submitting.value = false
  }
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
        <div class="flex items-start gap-3">
          <div class="rounded-full bg-error/10 p-2 shrink-0">
            <UIcon name="i-lucide-ban" class="size-5 text-error" />
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <h2 class="text-lg font-semibold">Close this window</h2>
            <p class="text-sm text-white/60">
              No one can reserve while this window is closed. Watchers will be notified.
            </p>
          </div>
        </div>

        <DateTimeRangePicker
          v-model="range"
          :min="props.windowStart"
          :max="props.windowEnd"
          :disabled="submitting"
        />

        <UFormField label="Reason">
          <UTextarea v-model="note" :rows="2" placeholder="Optional note for watchers" />
        </UFormField>

        <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

        <div class="flex gap-2 justify-end">
          <UButton
            variant="ghost"
            color="neutral"
            :disabled="submitting"
            @click="emit('update:open', false)"
          >
            Cancel
          </UButton>
          <UButton color="error" :loading="submitting" :disabled="!isValid" @click="submit">
            Close window
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
