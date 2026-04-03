<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import TournamentBracket from '@/components/TournamentBracket.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import { useOrganizationStore } from '@/stores/organization'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Tournament = components['schemas']['TournamentResponseDto']
type TournamentTeam = components['schemas']['TournamentTeamResponseDto']
type TournamentMatchDto = components['schemas']['TournamentMatchResponseDto']
type BracketResponse = components['schemas']['TournamentBracketResponseDto']
type StandingsResponse = components['schemas']['TournamentStandingsResponseDto']

useHead({ title: 'Tournament' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()
const orgStore = useOrganizationStore()

const tournament = ref<Tournament | null>(null)
const loading = ref(true)
const error = ref('')
const actionLoading = ref(false)
const actionMessage = ref('')
const actionError = ref('')

// Bracket
const bracket = ref<BracketResponse | null>(null)
const bracketLoading = ref(false)
const bracketError = ref('')
const generatingBracket = ref(false)

// Standings (round robin)
const standings = ref<StandingsResponse | null>(null)
const standingsLoading = ref(false)

// Match result modal
const resultModalOpen = ref(false)
const selectedMatch = ref<TournamentMatchDto | null>(null)
const resultForm = ref({ team1Score: 0, team2Score: 0 })
const submittingResult = ref(false)
const resultError = ref('')

// User's teams where they are captain
const myTeams = ref<{ id: string; name: string; captainId: string }[]>([])
const selectedTeamId = ref('')

const tournamentId = computed(() => route.params.id as string)

const currentUserId = computed(() => {
  const user = (authStore as any).user
  return user?.sub || user?.id || ''
})

const isOrgManager = computed(() => {
  const membership = orgStore.currentOrganization
  return membership && (membership.role === 'STAFF' || membership.role === 'ADMIN')
})

const myCaptainTeams = computed(() =>
  myTeams.value.filter((t) => t.captainId === currentUserId.value),
)

const registeredTeamIds = computed(() =>
  new Set(tournament.value?.teams.map((t) => t.id) ?? []),
)

const joinableTeams = computed(() =>
  myCaptainTeams.value.filter((t) => !registeredTeamIds.value.has(t.id)),
)

const myRegisteredTeams = computed(() =>
  myCaptainTeams.value.filter((t) => registeredTeamIds.value.has(t.id)),
)

const isFull = computed(() =>
  tournament.value
    ? tournament.value.teams.length >= tournament.value.maxTeams
    : false,
)

const isOpen = computed(() => tournament.value?.status === 'OPEN')

const isRoundRobin = computed(() => tournament.value?.format === 'ROUND_ROBIN')

const canGenerateBracket = computed(() =>
  isOrgManager.value
  && tournament.value
  && (tournament.value.status === 'OPEN' || tournament.value.status === 'CLOSED')
  && tournament.value.teams.length >= 2
  && !bracket.value,
)

const showBracket = computed(() =>
  tournament.value
  && (tournament.value.status === 'INPROGRESS' || tournament.value.status === 'COMPLETED'),
)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusColor(status: string) {
  switch (status) {
    case 'OPEN': return 'success'
    case 'UPCOMING': return 'info'
    case 'INPROGRESS': return 'warning'
    case 'COMPLETED': return 'neutral'
    case 'CLOSED': return 'error'
    default: return 'neutral'
  }
}

async function loadTournament() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/tournaments/{id}', {
      params: { path: { id: tournamentId.value } },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load tournament')
      return
    }
    tournament.value = data
    setHeader({
      title: data.name,
      backRoute: '/tournaments',
      actions: isOrgManager.value
        ? [
            { icon: 'i-lucide-pencil', onClick: () => router.push(`/tournaments/${tournamentId.value}/edit`) },
            { icon: 'i-lucide-settings', onClick: () => router.push(`/tournaments/${tournamentId.value}/manage`) },
          ]
        : [],
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load tournament'
  } finally {
    loading.value = false
  }
}

async function loadMyTeams() {
  try {
    const { data } = await apiClient.GET('/v1/teams')
    if (data) {
      myTeams.value = data
    }
  } catch {
    // Not critical
  }
}

async function loadBracket() {
  bracketLoading.value = true
  bracketError.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/tournaments/{id}/bracket', {
      params: { path: { id: tournamentId.value } },
    })
    if (err) {
      // 400 = bracket not generated yet, not an error to display
      bracket.value = null
      return
    }
    bracket.value = data
  } catch {
    bracket.value = null
  } finally {
    bracketLoading.value = false
  }
}

async function loadStandings() {
  if (!isRoundRobin.value) return
  standingsLoading.value = true
  try {
    const { data, error: err } = await apiClient.GET('/v1/tournaments/{id}/standings', {
      params: { path: { id: tournamentId.value } },
    })
    if (err) {
      standings.value = null
      return
    }
    standings.value = data
  } catch {
    standings.value = null
  } finally {
    standingsLoading.value = false
  }
}

async function generateBracket() {
  generatingBracket.value = true
  actionError.value = ''
  actionMessage.value = ''
  try {
    const { data, error: err } = await apiClient.POST('/v1/tournaments/{id}/bracket', {
      params: { path: { id: tournamentId.value } },
    })
    if (err) {
      actionError.value = getErrorMessage(err, 'Failed to generate bracket')
      return
    }
    bracket.value = data
    actionMessage.value = isRoundRobin.value ? 'Fixtures generated successfully!' : 'Bracket generated successfully!'
    await loadTournament()
    if (isRoundRobin.value) await loadStandings()
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Failed to generate bracket'
  } finally {
    generatingBracket.value = false
  }
}

function openRecordResult(match: TournamentMatchDto) {
  selectedMatch.value = match
  resultForm.value = { team1Score: 0, team2Score: 0 }
  resultError.value = ''
  resultModalOpen.value = true
}

async function submitResult() {
  if (!selectedMatch.value) return
  if (!isRoundRobin.value && resultForm.value.team1Score === resultForm.value.team2Score) {
    resultError.value = 'Scores cannot be tied in single elimination'
    return
  }
  if (resultForm.value.team1Score < 0 || resultForm.value.team2Score < 0) {
    resultError.value = 'Scores must be 0 or greater'
    return
  }
  submittingResult.value = true
  resultError.value = ''
  try {
    const { error: err } = await apiClient.PATCH('/v1/tournaments/{id}/matches/{matchId}/result', {
      params: { path: { id: tournamentId.value, matchId: selectedMatch.value.id } },
      body: {
        team1Score: resultForm.value.team1Score,
        team2Score: resultForm.value.team2Score,
      },
    })
    if (err) {
      resultError.value = getErrorMessage(err, 'Failed to record result')
      return
    }
    resultModalOpen.value = false
    await loadBracket()
    await loadTournament()
    if (isRoundRobin.value) await loadStandings()
  } catch (e) {
    resultError.value = e instanceof Error ? e.message : 'Failed to record result'
  } finally {
    submittingResult.value = false
  }
}

async function joinTournament() {
  if (!selectedTeamId.value || !tournament.value) return
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    const { error: err } = await apiClient.POST('/v1/tournaments/{id}/teams/{teamId}/join', {
      params: { path: { id: tournamentId.value, teamId: selectedTeamId.value } },
    })
    if (err) {
      actionError.value = getErrorMessage(err, 'Failed to join tournament')
      return
    }
    actionMessage.value = 'Team registered for tournament!'
    selectedTeamId.value = ''
    await loadTournament()
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Failed to join'
  } finally {
    actionLoading.value = false
  }
}

async function withdrawTeam(teamId: string) {
  if (!tournament.value) return
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    const { error: err } = await apiClient.DELETE('/v1/tournaments/{id}/teams/{teamId}/leave', {
      params: { path: { id: tournamentId.value, teamId } },
    })
    if (err) {
      actionError.value = getErrorMessage(err, 'Failed to withdraw')
      return
    }
    actionMessage.value = 'Team withdrawn from tournament'
    await loadTournament()
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Failed to withdraw'
  } finally {
    actionLoading.value = false
  }
}

// Auto-poll bracket during INPROGRESS
let bracketPollTimer: ReturnType<typeof setInterval> | null = null

function startBracketPolling() {
  stopBracketPolling()
  bracketPollTimer = setInterval(() => {
    loadBracket()
  }, 30000)
}

function stopBracketPolling() {
  if (bracketPollTimer) {
    clearInterval(bracketPollTimer)
    bracketPollTimer = null
  }
}

watch(() => tournament.value?.status, (status) => {
  if (status === 'INPROGRESS') {
    startBracketPolling()
  } else {
    stopBracketPolling()
  }
})

onMounted(() => {
  setHeader({ title: 'Tournament', backRoute: '/tournaments' })
  loadTournament().then(() => {
    if (isRoundRobin.value) loadStandings()
  })
  loadMyTeams()
  loadBracket()
})

onUnmounted(() => {
  stopBracketPolling()
})
</script>

<template>
  <PageLayout>
    <div v-if="loading" class="flex justify-center p-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
    </div>

    <div v-else-if="error" class="p-5">
      <UAlert color="error" :title="error" icon="i-lucide-circle-alert" />
    </div>

    <section v-else-if="tournament" class="flex flex-col gap-5 px-5 py-6">
      <!-- Action messages -->
      <UAlert
        v-if="actionMessage"
        color="success"
        :title="actionMessage"
        icon="i-lucide-circle-check"
        :close="{ color: 'success', variant: 'link', icon: 'i-lucide-x' }"
        @close="actionMessage = ''"
      />
      <UAlert
        v-if="actionError"
        color="error"
        :title="actionError"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="actionError = ''"
      />

      <!-- Tournament Info -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">Tournament</p>
              <p class="text-lg font-medium">{{ tournament.name }}</p>
            </div>
            <UBadge :color="getStatusColor(tournament.status)" variant="soft">
              {{ tournament.status }}
            </UBadge>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div class="rounded-lg border border-white/10 p-3">
              <p class="text-xs uppercase tracking-wide text-white/50">Format</p>
              <p class="mt-1 text-sm">{{ isRoundRobin ? 'Round Robin' : 'Single Elimination' }}</p>
            </div>
            <div class="rounded-lg border border-white/10 p-3">
              <p class="text-xs uppercase tracking-wide text-white/50">Sport</p>
              <p class="mt-1 text-sm">{{ tournament.sport?.icon || '' }} {{ tournament.sport?.name }}</p>
            </div>
            <div class="rounded-lg border border-white/10 p-3">
              <p class="text-xs uppercase tracking-wide text-white/50">Start Date</p>
              <p class="mt-1 text-sm">{{ formatDate(tournament.startDate) }}</p>
            </div>
            <div class="rounded-lg border border-white/10 p-3">
              <p class="text-xs uppercase tracking-wide text-white/50">Teams</p>
              <p class="mt-1 text-sm">{{ tournament.teams.length }} / {{ tournament.maxTeams }}</p>
            </div>
            <div class="rounded-lg border border-white/10 p-3">
              <p class="text-xs uppercase tracking-wide text-white/50">Created</p>
              <p class="mt-1 text-sm">{{ formatDate(tournament.createdAt) }}</p>
            </div>
          </div>

          <!-- Capacity bar -->
          <div class="flex items-center gap-3">
            <div class="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="isFull ? 'bg-red-500' : 'bg-primary'"
                :style="{ width: `${(tournament.teams.length / tournament.maxTeams) * 100}%` }"
              />
            </div>
            <span class="text-xs text-white/50 whitespace-nowrap">
              {{ isFull ? 'Full' : `${tournament.maxTeams - tournament.teams.length} spots left` }}
            </span>
          </div>
        </div>
      </UCard>

      <!-- Generate Bracket (org manager action) -->
      <UCard v-if="canGenerateBracket" class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">{{ isRoundRobin ? 'Fixtures' : 'Bracket' }}</p>
            <p class="text-sm text-white/60">
              Generate {{ isRoundRobin ? 'round robin fixtures' : 'a single-elimination bracket' }}
              with {{ tournament.teams.length }} teams.
              {{ isRoundRobin ? 'Every team plays every other team once.' : 'Teams will be randomly seeded.' }}
            </p>
          </div>
          <UButton
            color="primary"
            icon="i-lucide-git-branch"
            :loading="generatingBracket"
            @click="generateBracket"
          >
            Generate {{ isRoundRobin ? 'Fixtures' : 'Bracket' }}
          </UButton>
        </div>
      </UCard>

      <!-- Bracket Display -->
      <UCard v-if="showBracket && bracket" class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">{{ isRoundRobin ? 'Fixtures' : 'Bracket' }}</p>
              <p class="text-sm text-white/60">{{ bracket.totalRounds }} rounds</p>
            </div>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-refresh-cw"
              :loading="bracketLoading"
              @click="loadBracket"
            >
              Refresh
            </UButton>
          </div>

          <TournamentBracket
            :rounds="bracket.rounds"
            :total-rounds="bracket.totalRounds"
            :is-org-manager="!!isOrgManager"
            :format="tournament.format"
            @record-result="openRecordResult"
          />
        </div>
      </UCard>

      <div v-if="showBracket && bracketLoading && !bracket" class="flex justify-center p-4">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-6" />
      </div>

      <!-- Standings Table (round robin) -->
      <UCard v-if="isRoundRobin && standings && standings.standings.length > 0" class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">Standings</p>
            </div>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-refresh-cw"
              :loading="standingsLoading"
              @click="loadStandings"
            >
              Refresh
            </UButton>
          </div>

          <div class="overflow-x-auto -mx-1">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-white/10 text-white/50 text-xs uppercase tracking-wide">
                  <th class="text-left py-2 px-2">#</th>
                  <th class="text-left py-2 px-2">Team</th>
                  <th class="text-center py-2 px-2">P</th>
                  <th class="text-center py-2 px-2">W</th>
                  <th class="text-center py-2 px-2">D</th>
                  <th class="text-center py-2 px-2">L</th>
                  <th class="text-center py-2 px-2">PF</th>
                  <th class="text-center py-2 px-2">PA</th>
                  <th class="text-center py-2 px-2">+/-</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in standings.standings"
                  :key="row.team.id"
                  class="border-b border-white/5"
                  :class="idx === 0 ? 'bg-primary/5' : ''"
                >
                  <td class="py-2 px-2 text-white/50">{{ idx + 1 }}</td>
                  <td class="py-2 px-2 font-medium">{{ row.team.name }}</td>
                  <td class="py-2 px-2 text-center">{{ row.played }}</td>
                  <td class="py-2 px-2 text-center text-green-400">{{ row.wins }}</td>
                  <td class="py-2 px-2 text-center text-white/50">{{ row.draws }}</td>
                  <td class="py-2 px-2 text-center text-red-400">{{ row.losses }}</td>
                  <td class="py-2 px-2 text-center">{{ row.pointsFor }}</td>
                  <td class="py-2 px-2 text-center">{{ row.pointsAgainst }}</td>
                  <td class="py-2 px-2 text-center font-mono" :class="row.pointDiff > 0 ? 'text-green-400' : row.pointDiff < 0 ? 'text-red-400' : 'text-white/50'">
                    {{ row.pointDiff > 0 ? '+' : '' }}{{ row.pointDiff }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </UCard>

      <!-- Join Tournament (student/captain view) -->
      <UCard v-if="isOpen && !isFull && joinableTeams.length > 0" class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Join Tournament</p>
            <p class="text-sm text-white/60">Register one of your teams for this tournament.</p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <USelect
              v-model="selectedTeamId"
              placeholder="Select a team..."
              :items="joinableTeams.map((t) => ({ label: t.name, value: t.id }))"
              class="flex-1"
            />
            <UButton
              color="primary"
              :loading="actionLoading"
              :disabled="!selectedTeamId"
              @click="joinTournament"
            >
              Join Tournament
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- My Registered Teams (withdraw option) -->
      <UCard v-if="myRegisteredTeams.length > 0" class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">My Registered Teams</p>
          </div>
          <div
            v-for="team in myRegisteredTeams"
            :key="team.id"
            class="flex items-center justify-between rounded-lg border border-white/10 p-3"
          >
            <span class="text-sm font-medium">{{ team.name }}</span>
            <UButton
              size="sm"
              color="error"
              variant="soft"
              :loading="actionLoading"
              @click="withdrawTeam(team.id)"
            >
              Withdraw
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Registered Teams -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">Registered Teams</p>
            </div>
            <UBadge color="neutral" variant="soft" size="xs">
              {{ tournament.teams.length }} teams
            </UBadge>
          </div>

          <div
            v-if="tournament.teams.length === 0"
            class="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/50"
          >
            No teams registered yet.
          </div>

          <div v-else class="grid gap-2 sm:grid-cols-2">
            <div
              v-for="team in tournament.teams"
              :key="team.id"
              class="flex items-center gap-3 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/5 transition"
              @click="router.push(`/teams/${team.id}`)"
            >
              <UIcon name="i-lucide-users" class="text-white/40" />
              <span class="text-sm font-medium">{{ team.name }}</span>
            </div>
          </div>
        </div>
      </UCard>
    </section>

    <!-- Record Match Result Modal -->
    <UModal v-model:open="resultModalOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-pencil" class="size-5 text-primary" />
            <h2 class="text-lg font-semibold">Record Match Result</h2>
          </div>

          <p v-if="resultError" class="text-sm text-red-400">{{ resultError }}</p>

          <div v-if="selectedMatch" class="flex flex-col gap-4">
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <p class="text-sm font-medium mb-1">{{ selectedMatch.team1?.name }}</p>
                <UInput
                  v-model.number="resultForm.team1Score"
                  type="number"
                  :min="0"
                  placeholder="Score"
                />
              </div>
              <span class="text-white/40 text-lg font-bold pt-5">vs</span>
              <div class="flex-1">
                <p class="text-sm font-medium mb-1">{{ selectedMatch.team2?.name }}</p>
                <UInput
                  v-model.number="resultForm.team2Score"
                  type="number"
                  :min="0"
                  placeholder="Score"
                />
              </div>
            </div>

            <p class="text-xs text-white/40">
              {{ isRoundRobin
                ? 'Ties are allowed. Results update the standings table.'
                : 'Scores cannot be tied. The higher score wins and advances.'
              }}
            </p>

            <div class="flex justify-end gap-3">
              <UButton
                variant="ghost"
                color="neutral"
                :disabled="submittingResult"
                @click="resultModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                :loading="submittingResult"
                @click="submitResult"
              >
                Submit Result
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
