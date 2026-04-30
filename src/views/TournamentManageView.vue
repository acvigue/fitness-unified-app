<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useToastStore } from '@/stores/toast'
import { useOrganizationStore } from '@/stores/organization'
import { useTournamentPermissions } from '@/composables/useTournamentPermissions'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Tournament = components['schemas']['TournamentResponseDto']
type TournamentInvitation = components['schemas']['TournamentInvitationResponseDto']

useHead({ title: 'Manage Tournament' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const toast = useToastStore()
const orgStore = useOrganizationStore()

const tournamentId = computed(() => route.params.id as string)
const tournament = ref<Tournament | null>(null)
const { canManage } = useTournamentPermissions(() => tournament.value?.organizationId)
const invitations = ref<TournamentInvitation[]>([])
const allTeams = ref<{ id: string; name: string; captainId: string }[]>([])
const loading = ref(true)
const actionLoading = ref(false)
const pendingTeamId = ref<string>('')
const error = ref('')
const success = ref('')

const rosterSearch = ref('')
const invitesSearch = ref('')
const confirmRemoveOpen = ref(false)
const teamToRemove = ref<{ id: string; name: string } | null>(null)

const availableTeams = computed(() => {
  const registeredIds = new Set(tournament.value?.teams.map((t) => t.id) ?? [])
  const invitedIds = new Set(
    invitations.value.filter((i) => i.status === 'PENDING').map((i) => i.teamId),
  )
  return allTeams.value.filter((t) => !registeredIds.has(t.id) && !invitedIds.has(t.id))
})

const filteredForRoster = computed(() => {
  const q = rosterSearch.value.trim().toLowerCase()
  if (!q) return availableTeams.value
  return availableTeams.value.filter((t) => t.name.toLowerCase().includes(q))
})

const filteredForInvite = computed(() => {
  const q = invitesSearch.value.trim().toLowerCase()
  if (!q) return availableTeams.value
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
      orgStore.initialized ? Promise.resolve() : orgStore.fetchMemberships(),
    ])
    if (tournamentRes.error) {
      error.value = getErrorMessage(tournamentRes.error, 'Failed to load tournament')
      return
    }
    tournament.value = tournamentRes.data
    allTeams.value = teamsRes.data?.data ?? []

    if (!canManage.value) return
    await loadInvitations()
  } catch (e) {
    error.value = getErrorMessage(e, 'Failed to load')
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
  pendingTeamId.value = teamId
  setMessages()
  try {
    const { error: err } = await apiClient.POST('/v1/tournaments/{id}/teams/{teamId}', {
      params: { path: { id: tournamentId.value, teamId } },
    })
    if (err) {
      const msg = getErrorMessage(err, 'Failed to add team')
      setMessages('', msg)
      toast.error('Could not add team', msg)
      return
    }
    setMessages('Team added to tournament')
    toast.success('Team added to tournament')
    rosterSearch.value = ''
    const { data } = await apiClient.GET('/v1/tournaments/{id}', {
      params: { path: { id: tournamentId.value } },
    })
    if (data) tournament.value = data
  } catch (e) {
    const msg = getErrorMessage(e, 'Failed to add team')
    setMessages('', msg)
    toast.error('Could not add team', msg)
  } finally {
    actionLoading.value = false
    pendingTeamId.value = ''
  }
}

function requestRemoveTeam(team: { id: string; name: string }) {
  teamToRemove.value = team
  confirmRemoveOpen.value = true
}

async function confirmRemoveTeam() {
  if (!teamToRemove.value) return
  const team = teamToRemove.value
  actionLoading.value = true
  pendingTeamId.value = team.id
  setMessages()
  try {
    const { error: err } = await apiClient.DELETE('/v1/tournaments/{id}/teams/{teamId}', {
      params: { path: { id: tournamentId.value, teamId: team.id } },
    })
    if (err) {
      const msg = getErrorMessage(err, 'Failed to remove team')
      setMessages('', msg)
      toast.error('Could not remove team', msg)
      return
    }
    setMessages('Team removed from tournament')
    toast.success('Team removed', team.name)
    confirmRemoveOpen.value = false
    teamToRemove.value = null
    const { data } = await apiClient.GET('/v1/tournaments/{id}', {
      params: { path: { id: tournamentId.value } },
    })
    if (data) tournament.value = data
  } catch (e) {
    const msg = getErrorMessage(e, 'Failed to remove team')
    setMessages('', msg)
    toast.error('Could not remove team', msg)
  } finally {
    actionLoading.value = false
    pendingTeamId.value = ''
  }
}

async function inviteTeam(teamId: string) {
  if (!teamId) return
  actionLoading.value = true
  pendingTeamId.value = teamId
  setMessages()
  try {
    const { error: err } = await apiClient.POST('/v1/tournaments/{id}/invitations/{teamId}', {
      params: { path: { id: tournamentId.value, teamId } },
    })
    if (err) {
      const msg = getErrorMessage(err, 'Failed to invite team')
      setMessages('', msg)
      toast.error('Could not invite team', msg)
      return
    }
    setMessages('Invitation sent')
    toast.success('Invitation sent')
    invitesSearch.value = ''
    await loadInvitations()
  } catch (e) {
    const msg = getErrorMessage(e, 'Failed to invite')
    setMessages('', msg)
    toast.error('Could not invite team', msg)
  } finally {
    actionLoading.value = false
    pendingTeamId.value = ''
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
  return allTeams.value.find((t) => t.id === teamId)?.name || 'Unknown team'
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
      <UIcon
        name="i-lucide-loader-2"
        class="animate-spin text-white/50 size-8"
        aria-label="Loading tournament"
      />
    </div>

    <section
      v-else-if="tournament && !canManage"
      class="flex flex-col items-center gap-4 px-5 py-12 text-center max-w-md mx-auto"
    >
      <UIcon name="i-lucide-shield-alert" class="size-10 text-white/40" />
      <div>
        <p class="text-lg font-medium">You don't have permission to manage this tournament</p>
        <p class="mt-1 text-sm text-white/60">
          Only staff or admins of the hosting organization can manage teams and invitations.
        </p>
      </div>
      <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-arrow-left"
        @click="router.push(`/tournaments/${tournamentId}`)"
      >
        Back to tournament
      </UButton>
    </section>

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
              class="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-white/50"
            >
              <UIcon name="i-lucide-users" class="size-6 mx-auto mb-2 text-white/30" />
              <p class="font-medium">No teams have joined yet</p>
              <p class="mt-1 text-xs text-white/40">
                Add a team below or send an invitation to get started.
              </p>
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
                  :loading="actionLoading && pendingTeamId === team.id"
                  :disabled="actionLoading"
                  :aria-label="`Remove ${team.name} from tournament`"
                  @click="requestRemoveTeam({ id: team.id, name: team.name })"
                >
                  Remove
                </UButton>
              </div>
            </div>

            <!-- Add team -->
            <div v-if="!isFull" class="border-t border-white/10 pt-4">
              <UFormField label="Add Team">
                <UInput
                  v-model="rosterSearch"
                  placeholder="Search teams..."
                  icon="i-lucide-search"
                  class="mb-2"
                  :disabled="actionLoading"
                  aria-label="Search teams to add to tournament"
                />
              </UFormField>
              <div
                v-if="filteredForRoster.length > 0"
                class="flex flex-col gap-1 max-h-48 overflow-y-auto mt-2"
                role="listbox"
                aria-label="Available teams"
              >
                <button
                  v-for="team in filteredForRoster.slice(0, 10)"
                  :key="team.id"
                  type="button"
                  role="option"
                  :aria-selected="false"
                  class="flex items-center justify-between rounded-lg border border-white/10 p-2 text-left text-sm hover:bg-white/5 transition disabled:opacity-50"
                  :disabled="actionLoading"
                  :aria-label="`Add ${team.name} to tournament`"
                  @click="addTeam(team.id)"
                >
                  <span>{{ team.name }}</span>
                  <UIcon
                    :name="
                      actionLoading && pendingTeamId === team.id
                        ? 'i-lucide-loader-2'
                        : 'i-lucide-plus'
                    "
                    class="text-primary text-xs"
                    :class="actionLoading && pendingTeamId === team.id ? 'animate-spin' : ''"
                  />
                </button>
              </div>
              <p v-else-if="rosterSearch" class="text-xs text-white/40 mt-2">
                No matching teams found.
              </p>
              <p v-else class="text-xs text-white/40 mt-2">No available teams to add.</p>
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
              <UFormField label="Invite a Team">
                <UInput
                  v-model="invitesSearch"
                  placeholder="Search teams..."
                  icon="i-lucide-search"
                  class="mb-2"
                  :disabled="actionLoading"
                  aria-label="Search teams to invite"
                />
              </UFormField>
              <div
                v-if="filteredForInvite.length > 0"
                class="flex flex-col gap-1 max-h-48 overflow-y-auto mt-2"
                role="listbox"
                aria-label="Teams available to invite"
              >
                <button
                  v-for="team in filteredForInvite.slice(0, 10)"
                  :key="team.id"
                  type="button"
                  role="option"
                  :aria-selected="false"
                  class="flex items-center justify-between rounded-lg border border-white/10 p-2 text-left text-sm hover:bg-white/5 transition disabled:opacity-50"
                  :disabled="actionLoading"
                  :aria-label="`Invite ${team.name} to tournament`"
                  @click="inviteTeam(team.id)"
                >
                  <span>{{ team.name }}</span>
                  <UIcon
                    :name="
                      actionLoading && pendingTeamId === team.id
                        ? 'i-lucide-loader-2'
                        : 'i-lucide-send'
                    "
                    class="text-primary text-xs"
                    :class="actionLoading && pendingTeamId === team.id ? 'animate-spin' : ''"
                  />
                </button>
              </div>
              <p v-else-if="invitesSearch" class="text-xs text-white/40 mt-2">
                No matching teams found.
              </p>
              <p v-else class="text-xs text-white/40 mt-2">No eligible teams to invite.</p>
            </div>

            <!-- Invitation list -->
            <div>
              <p class="text-sm font-medium mb-2">Sent Invitations</p>
              <div
                v-if="invitations.length === 0"
                class="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-white/50"
              >
                <UIcon name="i-lucide-mail" class="size-6 mx-auto mb-2 text-white/30" />
                <p class="font-medium">No invitations sent yet</p>
                <p class="mt-1 text-xs text-white/40">
                  Invite teams above to see their status here.
                </p>
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

    <!-- Remove team confirmation -->
    <UModal v-model:open="confirmRemoveOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-triangle-alert" class="size-5 text-red-400" />
            <h2 class="text-lg font-semibold">Remove Team?</h2>
          </div>
          <p class="text-sm text-white/70">
            Remove <span class="font-medium">{{ teamToRemove?.name }}</span> from this tournament?
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="actionLoading"
              @click="confirmRemoveOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="actionLoading"
              :disabled="actionLoading"
              @click="confirmRemoveTeam"
            >
              Remove
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
