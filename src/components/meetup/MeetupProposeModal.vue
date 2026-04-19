<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useMeetupStore } from '@/stores/meetup'

const props = defineProps<{
  proposingTeamId: string
  receivingTeamId: string
  receivingTeamName: string
}>()

const emit = defineEmits<{
  (e: 'proposed'): void
}>()

const open = defineModel<boolean>('open', { default: false })

const meetupStore = useMeetupStore()

const form = reactive({
  title: '',
  description: '',
  location: '',
  dateTime: '',
})

const submitting = ref(false)
const error = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    form.title = ''
    form.description = ''
    form.location = ''
    form.dateTime = ''
    error.value = ''
  }
})

const canSubmit = computed(() => {
  if (!form.title.trim() || !form.location.trim() || !form.dateTime) return false
  const parsed = Date.parse(form.dateTime)
  return !Number.isNaN(parsed)
})

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  error.value = ''
  try {
    await meetupStore.propose({
      proposingTeamId: props.proposingTeamId,
      receivingTeamId: props.receivingTeamId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      location: form.location.trim(),
      dateTime: new Date(form.dateTime).toISOString(),
    })
    open.value = false
    emit('proposed')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to propose meetup'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <h2 class="text-lg font-semibold">Propose Meetup</h2>
        <p class="text-sm text-white/60">with {{ receivingTeamName }}</p>

        <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

        <UFormField label="Title">
          <UInput v-model="form.title" placeholder="Saturday Scrimmage" autofocus />
        </UFormField>

        <UFormField label="Location">
          <UInput v-model="form.location" placeholder="Central Park Field 3" />
        </UFormField>

        <UFormField label="Date & time">
          <UInput v-model="form.dateTime" type="datetime-local" />
        </UFormField>

        <UFormField label="Description">
          <UTextarea
            v-model="form.description"
            placeholder="Friendly match — bring your own gear"
            :rows="3"
            autoresize
          />
        </UFormField>

        <UButton block color="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
          Send Proposal
        </UButton>
      </div>
    </template>
  </UModal>
</template>
