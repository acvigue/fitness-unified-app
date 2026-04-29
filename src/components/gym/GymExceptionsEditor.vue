<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type Exception = components['schemas']['GymAvailabilityExceptionResponseDto']

const props = defineProps<{ gymId: string }>()

const toast = useToastStore()
const exceptions = ref<Exception[]>([])
const loading = ref(false)
const error = ref('')

const formOpen = ref(false)
const submitting = ref(false)
const formError = ref('')
const form = ref({
  date: '',
  isClosed: true,
  startTime: '',
  endTime: '',
  note: '',
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/gyms/{id}', {
      params: { path: { id: props.gymId } },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load exceptions')
      return
    }
    exceptions.value = data?.availabilityExceptions ?? []
  } finally {
    loading.value = false
  }
}

onMounted(load)

const isValid = computed(() => {
  if (!form.value.date) return false
  if (!form.value.isClosed) {
    if (!form.value.startTime || !form.value.endTime) return false
    if (form.value.startTime >= form.value.endTime) return false
  }
  return true
})

function openForm() {
  form.value = {
    date: '',
    isClosed: true,
    startTime: '',
    endTime: '',
    note: '',
  }
  formError.value = ''
  formOpen.value = true
}

async function submit() {
  if (!isValid.value || submitting.value) return
  submitting.value = true
  formError.value = ''
  try {
    const { error: err } = await apiClient.POST('/v1/gyms/{id}/exceptions', {
      params: { path: { id: props.gymId } },
      body: {
        date: form.value.date,
        isClosed: form.value.isClosed,
        startTime: form.value.isClosed ? undefined : form.value.startTime,
        endTime: form.value.isClosed ? undefined : form.value.endTime,
        note: form.value.note.trim() || undefined,
      },
    })
    if (err) {
      const message = getErrorMessage(err, 'Failed to add exception')
      formError.value = message
      toast.error('Could not add exception', message)
      return
    }
    toast.success('Exception added')
    formOpen.value = false
    await load()
  } finally {
    submitting.value = false
  }
}

const removeTarget = ref<Exception | null>(null)
const removeOpen = ref(false)
const removeLoading = ref(false)

function askRemove(ex: Exception) {
  removeTarget.value = ex
  removeOpen.value = true
}

async function confirmRemove() {
  if (!removeTarget.value) return
  removeLoading.value = true
  try {
    const { error: err } = await apiClient.DELETE('/v1/gyms/{id}/exceptions/{exceptionId}', {
      params: { path: { id: props.gymId, exceptionId: removeTarget.value.id } },
    })
    if (err) {
      toast.error('Could not remove', getErrorMessage(err, 'Failed to remove exception'))
      return
    }
    toast.success('Exception removed')
    removeOpen.value = false
    removeTarget.value = null
    await load()
  } finally {
    removeLoading.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-white">Schedule exceptions</h2>
        <p class="text-sm text-white/60">
          Holidays and special days. Override the weekly schedule for a single date.
        </p>
      </div>
      <UButton size="sm" icon="i-lucide-plus" @click="openForm">Add exception</UButton>
    </div>

    <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

    <div v-if="loading && exceptions.length === 0" class="flex flex-col gap-2">
      <div
        v-for="n in 3"
        :key="n"
        class="h-14 rounded-lg border border-white/10 bg-white/5 animate-pulse"
      />
    </div>

    <div
      v-else-if="exceptions.length === 0"
      class="flex flex-col items-center gap-1 rounded-lg border border-dashed border-white/10 p-6 text-center"
    >
      <UIcon name="i-lucide-calendar-off" class="size-6 text-white/40" />
      <p class="text-sm text-white/60">No exceptions yet.</p>
    </div>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="ex in exceptions"
        :key="ex.id"
        class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium">{{ formatDate(ex.date) }}</p>
          <p class="text-xs text-white/60">
            <template v-if="ex.isClosed">Closed all day</template>
            <template v-else-if="ex.startTime && ex.endTime">
              Open {{ ex.startTime }} – {{ ex.endTime }}
            </template>
          </p>
          <p v-if="ex.note" class="text-xs text-white/50 truncate">{{ ex.note }}</p>
        </div>
        <UButton
          size="xs"
          variant="outline"
          color="error"
          icon="i-lucide-trash-2"
          @click="askRemove(ex)"
        >
          Remove
        </UButton>
      </li>
    </ul>

    <UModal v-model:open="formOpen" :dismissible="!submitting">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <div class="rounded-full bg-primary/10 p-2 shrink-0">
              <UIcon name="i-lucide-calendar-plus" class="size-5 text-primary" />
            </div>
            <div class="flex flex-col gap-1">
              <h2 class="text-lg font-semibold">Add schedule exception</h2>
              <p class="text-sm text-white/60">Override the weekly schedule for one date.</p>
            </div>
          </div>

          <UFormField label="Date" required>
            <UInput v-model="form.date" type="date" icon="i-lucide-calendar" />
          </UFormField>

          <div
            class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <div>
              <p class="text-sm font-medium text-white/80">Closed all day</p>
              <p class="text-xs text-white/50">Toggle off to set custom open hours.</p>
            </div>
            <USwitch v-model="form.isClosed" />
          </div>

          <div v-if="!form.isClosed" class="grid gap-3 sm:grid-cols-2">
            <UFormField label="Open from" required>
              <UInput v-model="form.startTime" type="time" step="1800" />
            </UFormField>
            <UFormField label="Open until" required>
              <UInput v-model="form.endTime" type="time" step="1800" />
            </UFormField>
          </div>

          <UFormField label="Note">
            <UTextarea v-model="form.note" :rows="2" placeholder="Holiday, maintenance, etc." />
          </UFormField>

          <UAlert v-if="formError" color="error" :title="formError" icon="i-lucide-circle-alert" />

          <div class="flex gap-2 justify-end">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="submitting"
              @click="formOpen = false"
            >
              Cancel
            </UButton>
            <UButton :loading="submitting" :disabled="!isValid" @click="submit">
              Add exception
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="removeOpen" :dismissible="!removeLoading">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <div class="rounded-full bg-error/10 p-2 shrink-0">
              <UIcon name="i-lucide-trash-2" class="size-5 text-error" />
            </div>
            <div class="flex flex-col gap-1">
              <h2 class="text-lg font-semibold">Remove this exception?</h2>
              <p class="text-sm text-white/60">
                The weekly schedule will apply to that date again.
              </p>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="removeLoading"
              @click="removeOpen = false"
            >
              Cancel
            </UButton>
            <UButton color="error" :loading="removeLoading" @click="confirmRemove">
              Remove
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
