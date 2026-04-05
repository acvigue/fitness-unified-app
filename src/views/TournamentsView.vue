<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useOrganizationStore } from '@/stores/organization'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

type Tournament = components['schemas']['TournamentResponseDto']
type PaginationMeta = components['schemas']['PaginationMetaDto']

useHead({
  title: 'Tournaments',
})

const router = useRouter()
const { setHeader } = usePageHeader()
const orgStore = useOrganizationStore()

const tournaments = ref<Tournament[]>([])
const meta = ref<PaginationMeta | null>(null)
const loading = ref(false)
const error = ref('')
const sports = ref<Sport[]>([])

const filterSportId = ref('all')
const filterStatus = ref('all')
const page = ref(1)

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Upcoming', value: 'UPCOMING' },
  { label: 'In Progress', value: 'INPROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Closed', value: 'CLOSED' },
]

const isOrgManager = computed(() => {
  const membership = orgStore.currentOrganization
  return membership && (membership.role === 'STAFF' || membership.role === 'ADMIN')
})

async function loadTournaments() {
  loading.value = true
  error.value = ''
  try {
    const query: Record<string, unknown> = {
      page: page.value,
      per_page: 12,
    }
    if (filterSportId.value && filterSportId.value !== 'all') query.sportId = filterSportId.value
    if (filterStatus.value && filterStatus.value !== 'all') query.status = filterStatus.value

    const { data, error: err } = await apiClient.GET('/v1/tournaments', {
      params: { query: query as any },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load tournaments')
      return
    }
    tournaments.value = data.data
    meta.value = data.meta
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load tournaments'
  } finally {
    loading.value = false
  }
}

async function loadSports() {
  try {
    const { data: sportsData, error: sportsError } = await apiClient.GET('/v1/sports')
    if (sportsError) throw new Error(getErrorMessage(sportsError, 'Failed to load sports'))
    sports.value = sportsData
  } catch {
    // Sports filter optional
  }
}

function applyFilters() {
  page.value = 1
  loadTournaments()
}

function goToPage(p: number) {
  page.value = p
  loadTournaments()
}

function getStatusColor(status: string) {
  switch (status) {
    case 'OPEN':
      return 'success'
    case 'UPCOMING':
      return 'info'
    case 'INPROGRESS':
      return 'warning'
    case 'COMPLETED':
      return 'neutral'
    case 'CLOSED':
      return 'error'
    default:
      return 'neutral'
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

onMounted(() => {
  setHeader({
    title: 'Tournaments',
    actions: isOrgManager.value
      ? [{ icon: 'i-lucide-plus', onClick: () => router.push('/tournaments/create') }]
      : [],
  })
  loadSports()
  loadTournaments()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
      <!-- Filters -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <UFormField label="Sport" class="flex-1">
            <USelect
              v-model="filterSportId"
              :items="[
                { label: 'All Sports', value: 'all' },
                ...sports.map((s) => ({ label: `${s.icon || ''} ${s.name}`.trim(), value: s.id })),
              ]"
              @update:model-value="applyFilters"
            />
          </UFormField>

          <UFormField label="Status" class="flex-1">
            <USelect
              v-model="filterStatus"
              :items="STATUS_OPTIONS"
              @update:model-value="applyFilters"
            />
          </UFormField>

          <UButton icon="i-lucide-search" :loading="loading" @click="applyFilters">
            Search
          </UButton>
        </div>
      </UCard>

      <!-- Error -->
      <UAlert
        v-if="error"
        color="error"
        :title="error"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="error = ''"
      />

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center p-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
      </div>

      <!-- Empty -->
      <div
        v-else-if="tournaments.length === 0"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        No tournaments found. Try adjusting your filters.
      </div>

      <!-- Tournament Cards -->
      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="tournament in tournaments"
          :key="tournament.id"
          type="button"
          class="rounded-lg border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
          @click="router.push(`/tournaments/${tournament.id}`)"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium truncate">{{ tournament.name }}</p>
            <UBadge :color="getStatusColor(tournament.status)" variant="soft" size="xs">
              {{ tournament.status }}
            </UBadge>
          </div>

          <div class="mt-3 flex items-center gap-2 text-sm text-white/60">
            <UIcon name="i-lucide-calendar" class="text-xs" />
            <span>{{ formatDate(tournament.startDate) }}</span>
          </div>

          <div class="mt-1.5 flex items-center gap-2 text-sm text-white/60">
            <UIcon name="i-lucide-dumbbell" class="text-xs" />
            <span
              >{{ tournament.sport?.icon || '' }} {{ tournament.sport?.name || 'Unknown' }}</span
            >
            <UBadge variant="subtle" color="neutral" size="xs">
              {{ tournament.format === 'ROUND_ROBIN' ? 'Round Robin' : 'Elimination' }}
            </UBadge>
          </div>

          <div class="mt-3 flex items-center gap-2">
            <div class="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                class="h-full rounded-full bg-primary transition-all"
                :style="{
                  width: `${Math.min((tournament.teams.length / tournament.maxTeams) * 100, 100)}%`,
                }"
              />
            </div>
            <span class="text-xs text-white/50">
              {{ tournament.teams.length }}/{{ tournament.maxTeams }} teams
            </span>
          </div>
        </button>
      </div>

      <!-- Pagination -->
      <div v-if="meta && meta.total_pages > 1" class="flex items-center justify-center gap-2">
        <UButton
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-lucide-chevron-left"
          :disabled="page <= 1"
          @click="goToPage(page - 1)"
        />
        <span class="text-sm text-white/60"> Page {{ meta.page }} of {{ meta.total_pages }} </span>
        <UButton
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-lucide-chevron-right"
          :disabled="page >= meta.total_pages"
          @click="goToPage(page + 1)"
        />
      </div>
    </section>
  </PageLayout>
</template>
