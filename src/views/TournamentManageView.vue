<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Tournament = components['schemas']['TournamentResponseDto']
type TournamentInvitation = components['schemas']['TournamentInvitationResponseDto']

useHead({ title: 'Manage Tournament' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()

const tournamentId = computed(() => route.params.id as string)
const tournament = ref<Tournament | null>(null)
const invitations = ref<TournamentInvitation[]>([])
const allTeams = ref<{ id: string; name: string; captainId: string }[]>([])
const loading = ref(true)
const actionLoading = ref(false)
const error = ref('')
const success = ref('')

const searchTeamId = ref('')
const searchQuery = ref('')

const availableTeams = computed(() => {
  const registeredIds = new Set(tournament.value?.teams.map((t) => t.id) ?? [])
  const invitedIds = new Set(
    invitations.value.filter((i) => i.status === 'PENDING').map((i) => i.teamId),
  )
  return allTeams.value.filter((t) => !registeredIds.has(t.id) && !invitedIds.has(t.id))
})

const filteredTeams = computed(() => {
  if (!searchQuery.value.trim()) return availableTeams.value
  const q = searchQuery.value.toLowerCase()
  return availableTeams.value.filter((t) => t.name.toLowerCase().includes(q))
})

const isFull = computed(() =>
  tournament.value ? tournament.value.teams.length >= tournament.value.maxTeams : false,
)

function setMessages(s = '', e = '') {
  success.value = s
  error.value = e
}

async function loadData() {
  loading.value = true
  try {
    const [tournamentRes, teamsRes] = await Promise.all([
      apiClient.GET('/v1/tournaments/{id}', { params: { path: { id: tournamentId.value } } }),
      apiClient.GET('/v1/teams'),
    ])
    if (tournamentRes.error) {
      error.value = getErrorMessage(tournamentRes.error, 'Failed to load tournament')
      return
    }
    tournament.value = tournamentRes.data
    allTeams.value = teamsRes.data ?? []

    await loadInvitations()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function loadInvitations() {
  try {
    const { data } = await apiClient.GET('/v1/tournaments/{id}/invitations', {
      params: { path: { id: tournamentId.value } },
    })
    invitations.value = data ?? []
  } catch {
    // Not critical
  }
}

async function addTeam(teamId: string) {
  if (!teamId) return
  actionLoading.value = true
  setMessages()
  try {
    const { error: err } = await apiClient.POST('/v1/tournaments/{id}/teams/{teamId}', {
      params: { path: { id: tournamentId.value, teamId } },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to add team'))
      return
    }
    setMessages('Team added to tournament')
    searchTeamId.value = ''
    const { data } = await apiClient.GET('/v1/tournaments/{id}', {
      params: { path: { id: tournamentId.value } },
    })
    if (data) tournament.value = data
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to add team')
  } finally {
    actionLoading.value = false
  }
}

async function removeTeam(teamId: string) {
  actionLoading.value = true
  setMessages()
  try {
    const { error: err } = await apiClient.DELETE('/v1/tournaments/{id}/teams/{teamId}', {
      params: { path: { id: tournamentId.value, teamId } },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to remove team'))
      return
    }
    setMessages('Team removed from tournament')
    const { data } = await apiClient.GET('/v1/tournaments/{id}', {
      params: { path: { id: tournamentId.value } },
    })
    if (data) tournament.value = data
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to remove team')
  } finally {
    actionLoading.value = false
  }
}

async function inviteTeam(teamId: string) {
  if (!teamId) return
  actionLoading.value = true
  setMessages()
  try {
    const { error: err } = await apiClient.POST('/v1/tournaments/{id}/invitations/{teamId}', {
      params: { path: { id: tournamentId.value, teamId } },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to invite team'))
      return
    }
    setMessages('Invitation sent')
    await loadInvitations()
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to invite')
  } finally {
    actionLoading.value = false
  }
}

function getInvitationStatusColor(status: string) {
  switch (status) {
    case 'PENDING':
      return 'warning'
    case 'ACCEPTED':
      return 'success'
    case 'DECLINED':
      return 'error'
    default:
      return 'neutral'
  }
}

function getTeamName(teamId: string) {
  return allTeams.value.find((t) => t.id === teamId)?.name || teamId
}

onMounted(() => {
  setHeader({
    title: 'Manage Tournament',
    backRoute: `/tournaments/${tournamentId.value}`,
  })
  loadData()
})
</script>

<template>
  <PageLayout>
    <div v-if="loading" class="flex justify-center p-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
    </div>

    <section v-else class="flex flex-col gap-5 px-5 py-6">
      <UAlert
        v-if="success"
        color="success"
        :title="success"
        icon="i-lucide-circle-check"
        :close="{ color: 'success', variant: 'link', icon: 'i-lucide-x' }"
        @close="success = ''"
      />
      <UAlert
        v-if="error"
        color="error"
        :title="error"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="error = ''"
      />

      <div class="grid gap-5 xl:grid-cols-2">
        <!-- Team Roster -->
        <UCard class="bg-white/5">
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.3em] text-white/60">Team Roster</p>
                <p class="text-sm text-white/60">
                  {{ tournament?.teams.length }}/{{ tournament?.maxTeams }} teams registered
                </p>
              </div>
            </div>

            <div
              v-if="!tournament?.teams.length"
              class="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/50"
            >
              No teams registered.
            </div>

            <div v-else class="flex flex-col gap-2">
              <div
                v-for="team in tournament!.teams"
                :key="team.id"
                class="flex items-center justify-between rounded-lg border border-white/10 p-3"
              >
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-users" class="text-white/40" />
                  <span class="text-sm font-medium">{{ team.name }}</span>
                </div>
                <UButton
                  size="xs"
                  color="error"
                  variant="soft"
                  icon="i-lucide-x"
                  :loading="actionLoading"
                  @click="removeTeam(team.id)"
                >
                  Remove
                </UButton>
              </div>
            </div>

            <!-- Add team -->
            <div v-if="!isFull" class="border-t border-white/10 pt-4">
              <p class="text-sm font-medium mb-2">Add Team</p>
              <UInput
                v-model="searchQuery"
                placeholder="Search teams..."
                icon="i-lucide-search"
                class="mb-2"
              />
              <div
                v-if="filteredTeams.length > 0"
                class="flex flex-col gap-1 max-h-48 overflow-y-auto"
              >
                <button
                  v-for="team in filteredTeams.slice(0, 10)"
                  :key="team.id"
                  type="button"
                  class="flex items-center justify-between rounded-lg border border-white/10 p-2 text-left text-sm hover:bg-white/5 transition"
                  @click="addTeam(team.id)"
                >
                  <span>{{ team.name }}</span>
                  <UIcon name="i-lucide-plus" class="text-primary text-xs" />
                </button>
              </div>
              <p v-else-if="searchQuery" class="text-xs text-white/40">No matching teams found.</p>
            </div>
            <div
              v-else
              class="text-sm text-amber-200/80 border border-amber-400/30 bg-amber-500/10 rounded-lg p-3"
            >
              Tournament is at capacity. Remove a team before adding another.
            </div>
          </div>
        </UCard>

        <!-- Invitations -->
        <UCard class="bg-white/5">
          <div class="flex flex-col gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">Team Invitations</p>
              <p class="text-sm text-white/60">Invite teams to join this tournament.</p>
            </div>

            <!-- Send invitation -->
            <div class="border-b border-white/10 pb-4">
              <p class="text-sm font-medium mb-2">Invite a Team</p>
              <UInput
                v-model="searchQuery"
                placeholder="Search teams..."
                icon="i-lucide-search"
                class="mb-2"
              />
              <div
                v-if="filteredTeams.length > 0"
                class="flex flex-col gap-1 max-h-48 overflow-y-auto"
              >
                <button
                  v-for="team in filteredTeams.slice(0, 10)"
                  :key="team.id"
                  type="button"
                  class="flex items-center justify-between rounded-lg border border-white/10 p-2 text-left text-sm hover:bg-white/5 transition"
                  @click="inviteTeam(team.id)"
                >
                  <span>{{ team.name }}</span>
                  <UIcon name="i-lucide-send" class="text-primary text-xs" />
                </button>
              </div>
            </div>

            <!-- Invitation list -->
            <div>
              <p class="text-sm font-medium mb-2">Sent Invitations</p>
              <div
                v-if="invitations.length === 0"
                class="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/50"
              >
                No invitations sent yet.
              </div>
              <div v-else class="flex flex-col gap-2">
                <div
                  v-for="inv in invitations"
                  :key="inv.id"
                  class="flex items-center justify-between rounded-lg border border-white/10 p-3"
                >
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-mail" class="text-white/40" />
                    <span class="text-sm">{{ getTeamName(inv.teamId) }}</span>
                  </div>
                  <UBadge :color="getInvitationStatusColor(inv.status)" variant="soft" size="xs">
                    {{ inv.status }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </section>
  </PageLayout>
</template>
