<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import DateTimePicker from '@/components/datetime/DateTimePicker.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useToastStore } from '@/stores/toast'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Tournament = components['schemas']['TournamentResponseDto']

useHead({ title: 'Edit Tournament' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const toast = useToastStore()

const tournamentId = computed(() => route.params.id as string)
const tournament = ref<Tournament | null>(null)
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const success = ref('')
const confirmDeleteOpen = ref(false)
const originalStartDate = ref<string>('')

const form = reactive({
  name: '',
  maxTeams: 8,
  startDate: '',
  status: '' as string,
})

const touched = reactive({
  name: false,
  startDate: false,
  maxTeams: false,
})

const STATUS_OPTIONS = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Upcoming', value: 'UPCOMING' },
  { label: 'In Progress', value: 'INPROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
]

const MAX_TEAM_OPTIONS = [2, 4, 8, 16, 32, 64].map((n) => ({
  label: `${n} teams`,
  value: n,
}))

// --- Validation (inline) ---
// A tournament whose start was originally in the past is allowed to keep a
// past start date; only prevent moving a future tournament into the past.
const nameError = computed(() => {
  if (!touched.name) return ''
  if (!form.name.trim()) return 'Tournament name is required'
  if (form.name.trim().length > 120) return 'Name must be 120 characters or fewer'
  return ''
})

const startDateError = computed(() => {
  if (!touched.startDate) return ''
  if (!form.startDate) return 'Start date is required'
  const parsed = new Date(form.startDate)
  if (isNaN(parsed.getTime())) return 'Invalid date'
  const originalWasPast =
    !!originalStartDate.value && new Date(originalStartDate.value).getTime() < Date.now()
  if (!originalWasPast && parsed.getTime() < Date.now() - 60_000) {
    return 'Start date cannot be in the past'
  }
  return ''
})

const maxTeamsError = computed(() => {
  if (!touched.maxTeams) return ''
  if (!Number.isInteger(form.maxTeams) || form.maxTeams < 2) {
    return 'Max teams must be a positive integer (at least 2)'
  }
  const registered = tournament.value?.teams.length ?? 0
  if (form.maxTeams < registered) {
    return `Cannot be less than teams already registered (${registered})`
  }
  return ''
})

const formValid = computed(() => {
  if (!form.name.trim()) return false
  if (!form.startDate) return false
  if (!Number.isInteger(form.maxTeams) || form.maxTeams < 2) return false
  const registered = tournament.value?.teams.length ?? 0
  if (form.maxTeams < registered) return false
  const parsed = new Date(form.startDate)
  if (isNaN(parsed.getTime())) return false
  const originalWasPast =
    !!originalStartDate.value && new Date(originalStartDate.value).getTime() < Date.now()
  if (!originalWasPast && parsed.getTime() < Date.now() - 60_000) return false
  return true
})

const deleteMessage = computed(() => {
  if (!tournament.value) return ''
  const hasTeams = tournament.value.teams.length > 0
  return hasTeams
    ? `This tournament has ${tournament.value.teams.length} registered team(s). Are you sure you want to delete "${tournament.value.name}"?`
    : `Delete "${tournament.value.name}"? This cannot be undone.`
})

async function loadTournament() {
  loading.value = true
  try {
    const { data, error: err } = await apiClient.GET('/v1/tournaments/{id}', {
      params: { path: { id: tournamentId.value } },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load tournament')
      return
    }
    tournament.value = data
    form.name = data.name
    form.maxTeams = data.maxTeams
    form.startDate = data.startDate
    form.status = data.status
    originalStartDate.value = data.startDate
  } catch (e) {
    error.value = getErrorMessage(e, 'Failed to load tournament')
  } finally {
    loading.value = false
  }
}

function markAllTouched() {
  touched.name = true
  touched.startDate = true
  touched.maxTeams = true
}

async function saveTournament() {
  markAllTouched()
  if (!formValid.value) {
    error.value = 'Please fix the errors above before saving.'
    return
  }
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const { error: err } = await apiClient.PATCH('/v1/tournaments/{id}', {
      params: { path: { id: tournamentId.value } },
      body: {
        name: form.name.trim(),
        maxTeams: form.maxTeams,
        startDate: form.startDate,
        status: form.status as 'OPEN' | 'CLOSED' | 'UPCOMING' | 'INPROGRESS' | 'COMPLETED',
      },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to update tournament')
      toast.error('Could not update tournament', error.value)
      return
    }
    success.value = 'Tournament updated successfully'
    toast.success('Tournament updated', form.name.trim())
  } catch (e) {
    error.value = getErrorMessage(e, 'Failed to update tournament')
    toast.error('Could not update tournament', error.value)
  } finally {
    saving.value = false
  }
}

function requestDelete() {
  if (!tournament.value) return
  error.value = ''
  confirmDeleteOpen.value = true
}

async function confirmDelete() {
  if (!tournament.value) return
  deleting.value = true
  error.value = ''
  try {
    const { error: err } = await apiClient.DELETE('/v1/tournaments/{id}', {
      params: { path: { id: tournamentId.value } },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to delete the tournament')
      toast.error('Could not delete tournament', error.value)
      return
    }
    toast.success('Tournament deleted', tournament.value.name)
    confirmDeleteOpen.value = false
    router.push('/tournaments')
  } catch (e) {
    error.value = getErrorMessage(e, 'Failed to delete the tournament')
    toast.error('Could not delete tournament', error.value)
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  setHeader({ title: 'Edit Tournament', backRoute: `/tournaments/${tournamentId.value}` })
  loadTournament()
})
</script>

<template>
  <PageLayout>
    <div v-if="loading" class="flex justify-center p-8">
      <UIcon
        name="i-lucide-loader-2"
        class="animate-spin text-white/50 size-8"
        aria-label="Loading tournament"
      />
    </div>

    <section v-else class="flex flex-col gap-5 px-5 py-6 max-w-xl">
      <UAlert
        v-if="error"
        color="error"
        :title="error"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="error = ''"
      />
      <UAlert
        v-if="success"
        color="success"
        :title="success"
        icon="i-lucide-circle-check"
        :close="{ color: 'success', variant: 'link', icon: 'i-lucide-x' }"
        @close="success = ''"
      />

      <UCard class="bg-white/5">
        <div class="flex flex-col gap-5">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Edit Tournament</p>
          </div>

          <UFormField label="Tournament Name" required :error="nameError">
            <UInput
              v-model="form.name"
              placeholder="Tournament name"
              :disabled="saving || deleting"
              aria-label="Tournament name"
              @blur="touched.name = true"
            />
          </UFormField>

          <UFormField label="Status">
            <USelect
              v-model="form.status"
              :items="STATUS_OPTIONS"
              :disabled="saving || deleting"
              aria-label="Tournament status"
            />
          </UFormField>

          <UFormField label="Max Teams" required :error="maxTeamsError">
            <USelect
              v-model="form.maxTeams"
              :items="MAX_TEAM_OPTIONS"
              :disabled="saving || deleting"
              aria-label="Maximum number of teams"
              @change="touched.maxTeams = true"
            />
          </UFormField>

          <UFormField label="Start Date" required :error="startDateError">
            <DateTimePicker
              v-model="form.startDate"
              :disabled="saving || deleting"
              @update:model-value="touched.startDate = true"
            />
          </UFormField>

          <div class="flex justify-end">
            <UButton
              color="primary"
              :loading="saving"
              :disabled="saving || deleting"
              @click="saveTournament"
            >
              Save Changes
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Danger Zone -->
      <UCard class="bg-white/5">
        <div class="rounded-lg border border-red-400/30 bg-red-500/10 p-4">
          <p class="font-medium text-red-100">Danger Zone</p>
          <p class="mt-1 text-sm text-red-100/80">
            Deleting a tournament cannot be undone.
            {{
              tournament && tournament.teams.length > 0
                ? `${tournament.teams.length} team(s) are currently registered.`
                : ''
            }}
          </p>
          <UButton
            class="mt-4"
            color="error"
            variant="soft"
            :loading="deleting"
            :disabled="saving || deleting"
            @click="requestDelete"
          >
            Delete Tournament
          </UButton>
        </div>
      </UCard>
    </section>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="confirmDeleteOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-triangle-alert" class="size-5 text-red-400" />
            <h2 class="text-lg font-semibold">Delete Tournament?</h2>
          </div>
          <p class="text-sm text-white/70">{{ deleteMessage }}</p>
          <p class="text-xs text-red-300/80">This action cannot be undone.</p>
          <div class="flex justify-end gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="deleting"
              @click="confirmDeleteOpen = false"
            >
              Cancel
            </UButton>
            <UButton color="error" :loading="deleting" :disabled="deleting" @click="confirmDelete">
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
