<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Tournament = components['schemas']['TournamentResponseDto']

useHead({ title: 'Edit Tournament' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()

const tournamentId = computed(() => route.params.id as string)
const tournament = ref<Tournament | null>(null)
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  name: '',
  maxTeams: 8,
  startDate: '',
  status: '' as string,
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
    form.startDate = data.startDate.slice(0, 16)
    form.status = data.status
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function saveTournament() {
  if (!form.name.trim()) {
    error.value = 'Tournament name is required'
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
        startDate: new Date(form.startDate).toISOString(),
        status: form.status as any,
      },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to update tournament')
      return
    }
    success.value = 'Tournament updated successfully'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to update'
  } finally {
    saving.value = false
  }
}

async function deleteTournament() {
  if (!tournament.value) return
  const hasTeams = tournament.value.teams.length > 0
  const msg = hasTeams
    ? `This tournament has ${tournament.value.teams.length} registered team(s). Are you sure you want to delete "${tournament.value.name}"?`
    : `Delete "${tournament.value.name}"? This cannot be undone.`
  if (!window.confirm(msg)) return

  deleting.value = true
  error.value = ''
  try {
    const { error: err } = await apiClient.DELETE('/v1/tournaments/{id}', {
      params: { path: { id: tournamentId.value } },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to delete tournament')
      return
    }
    router.push('/tournaments')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete'
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
      <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
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

          <UFormField label="Tournament Name">
            <UInput v-model="form.name" placeholder="Tournament name" />
          </UFormField>

          <UFormField label="Status">
            <USelect v-model="form.status" :items="STATUS_OPTIONS" />
          </UFormField>

          <UFormField label="Max Teams">
            <USelect v-model="form.maxTeams" :items="MAX_TEAM_OPTIONS" />
          </UFormField>

          <UFormField label="Start Date">
            <UInput v-model="form.startDate" type="datetime-local" />
          </UFormField>

          <div class="flex justify-end">
            <UButton color="primary" :loading="saving" @click="saveTournament">
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
            {{ tournament && tournament.teams.length > 0 ? `${tournament.teams.length} team(s) are currently registered.` : '' }}
          </p>
          <UButton
            class="mt-4"
            color="error"
            variant="soft"
            :loading="deleting"
            @click="deleteTournament"
          >
            Delete Tournament
          </UButton>
        </div>
      </UCard>
    </section>
  </PageLayout>
</template>
