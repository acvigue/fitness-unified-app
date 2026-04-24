<script setup lang="ts">
import { ref, watch } from 'vue'
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

const reason = ref('')
const submitting = ref(false)
const toast = useToastStore()

watch(
  () => props.open,
  (v) => {
    if (v) reason.value = ''
  }
)

async function submit() {
  if (!reason.value.trim()) return
  submitting.value = true
  try {
    const { error: err } = await apiClient.POST('/v1/report', {
      body: {
        reportedId: props.reportedUserId,
        messageId: props.messageId,
        reason: reason.value.trim(),
      },
    })
    if (err) {
      toast.error('Could not submit report', getErrorMessage(err, 'Report failed'))
      return
    }
    toast.success('Report submitted', 'Our team will review it shortly.')
    emit('update:open', false)
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
        <UFormField label="Reason">
          <UTextarea
            v-model="reason"
            placeholder="Describe why this message is inappropriate…"
            :rows="4"
            autoresize
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="emit('update:open', false)">
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="submitting"
            :disabled="!reason.trim()"
            @click="submit"
          >
            Submit report
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
