<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DateTimeRangePicker from '@/components/datetime/DateTimeRangePicker.vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import { useMyTeamsStore } from '@/stores/myTeams'

const props = defineProps<{
  open: boolean
  gymId: string
  windowStart: string
  windowEnd: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  reserved: []
}>()

const toast = useToastStore()
const myTeams = useMyTeamsStore()

const teamId = ref<string>('')
const range = ref({ startsAt: '', endsAt: '' })
const note = ref('')
const submitting = ref(false)
const error = ref('')

const teamItems = computed(() => myTeams.captainTeams.map((t) => ({ label: t.name, value: t.id })))

watch(
  () => props.open,
  (v) => {
    if (!v) return
    teamId.value = myTeams.captainTeams[0]?.id ?? ''
    range.value = { startsAt: props.windowStart, endsAt: props.windowEnd }
    note.value = ''
    error.value = ''
  },
  { immediate: true },
)

const isValid = computed(() => {
  if (!teamId.value) return false
  const { startsAt, endsAt } = range.value
  if (!startsAt || !endsAt) return false
  return new Date(endsAt) > new Date(startsAt)
})

async function submit() {
  if (!isValid.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const { error: err } = await apiClient.POST('/v1/gyms/{id}/reservations', {
      params: { path: { id: props.gymId } },
      body: {
        teamId: teamId.value,
        startsAt: range.value.startsAt,
        endsAt: range.value.endsAt,
        note: note.value.trim() || undefined,
      },
    })
    if (err) {
      const message = getErrorMessage(err, 'Failed to reserve slot')
      error.value = message
      toast.error('Could not reserve', message)
      return
    }
    toast.success('Slot reserved', 'Your team is booked.')
    emit('reserved')
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
          <div class="rounded-full bg-primary/10 p-2 shrink-0">
            <UIcon name="i-lucide-calendar-plus" class="size-5 text-primary" />
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <h2 class="text-lg font-semibold">Reserve gym window</h2>
            <p class="text-sm text-white/60">
              Pick the team and the exact time inside this open window.
            </p>
          </div>
        </div>

        <UFormField label="Team" required>
          <USelect v-model="teamId" :items="teamItems" placeholder="Select team" />
        </UFormField>

        <DateTimeRangePicker
          v-model="range"
          :min="props.windowStart"
          :max="props.windowEnd"
          :disabled="submitting"
        />

        <UFormField label="Note">
          <UTextarea v-model="note" :rows="2" placeholder="Optional note for your team" />
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
          <UButton :loading="submitting" :disabled="!isValid" @click="submit"> Reserve </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
