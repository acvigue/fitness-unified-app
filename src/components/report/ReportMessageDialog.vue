<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  open: boolean
  messageId: string
  reportedUserId: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const MIN_DESCRIPTION_LENGTH = 10

const REASON_OPTIONS: { label: string; value: string }[] = [
  { label: 'Harassment or bullying', value: 'harassment' },
  { label: 'Hate speech', value: 'hate_speech' },
  { label: 'Spam or scam', value: 'spam' },
  { label: 'Inappropriate content', value: 'inappropriate' },
  { label: 'Threats or violence', value: 'threats' },
  { label: 'Other', value: 'other' },
]

const reasonCategory = ref<string>('')
const description = ref('')
const submitting = ref(false)
const attemptedSubmit = ref(false)
const toast = useToastStore()

const reasonError = computed(() => {
  if (!attemptedSubmit.value) return ''
  if (!reasonCategory.value) return 'Please select a reason'
  return ''
})

const descriptionError = computed(() => {
  if (!attemptedSubmit.value) return ''
  const trimmed = description.value.trim()
  if (!trimmed) return 'Please add a description'
  if (trimmed.length < MIN_DESCRIPTION_LENGTH)
    return `Please describe in at least ${MIN_DESCRIPTION_LENGTH} characters`
  return ''
})

const isValid = computed(
  () =>
    reasonCategory.value.length > 0 && description.value.trim().length >= MIN_DESCRIPTION_LENGTH,
)

watch(
  () => props.open,
  (v) => {
    if (v) {
      reasonCategory.value = ''
      description.value = ''
      attemptedSubmit.value = false
    }
  },
)

function selectedReasonLabel() {
  return REASON_OPTIONS.find((r) => r.value === reasonCategory.value)?.label ?? reasonCategory.value
}

async function submit() {
  attemptedSubmit.value = true
  if (!isValid.value) return
  submitting.value = true
  try {
    const combinedReason = `${selectedReasonLabel()}: ${description.value.trim()}`
    const { error: err } = await apiClient.POST('/v1/report', {
      body: {
        reportedId: props.reportedUserId,
        messageId: props.messageId,
        reason: combinedReason,
      },
    })
    if (err) {
      toast.error('Could not submit report', getErrorMessage(err, 'Report failed'))
      return
    }
    toast.success('Report submitted', 'Our team will review it shortly.')
    emit('update:open', false)
  } catch (e) {
    toast.error('Could not submit report', getErrorMessage(e, 'Report failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <h2 class="text-lg font-semibold">Report this message</h2>
        <p class="text-sm text-white/60">
          Our moderators will review the message and take appropriate action. You'll be notified of
          the outcome.
        </p>

        <UFormField label="Reason" required :error="reasonError">
          <USelect
            v-model="reasonCategory"
            :items="REASON_OPTIONS"
            value-key="value"
            placeholder="Select a reason"
            aria-label="Reason for report"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Description"
          required
          :error="descriptionError"
          :hint="`At least ${MIN_DESCRIPTION_LENGTH} characters`"
        >
          <UTextarea
            v-model="description"
            placeholder="Describe what happened in this message..."
            :rows="4"
            autoresize
            aria-label="Report description"
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            variant="ghost"
            color="neutral"
            :disabled="submitting"
            @click="emit('update:open', false)"
          >
            Cancel
          </UButton>
          <UButton
            type="button"
            color="error"
            :loading="submitting"
            :disabled="!isValid || submitting"
            @click="submit"
          >
            Submit report
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
