<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import SportsPickerModal from '@/components/SportsPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import { useToastStore } from '@/stores/toast'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

type Team = components['schemas']['TeamResponseDto']
type TeamInvitation = components['schemas']['TeamInvitationResponseDto']

useHead({ title: 'Teams' })

const router = useRouter()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()
const toast = useToastStore()

const currentUserId = computed(() => {
  const user = authStore.user as { sub?: string; id?: string } | null | undefined
  return user?.sub || user?.id || ''
})

const teams = ref<Team[]>([])
const sports = ref<Sport[]>([])
const myInvitations = ref<TeamInvitation[]>([])
const invitationTeamNames = ref<Record<string, string>>({})

const loadingTeams = ref(false)
const actionLoading = ref(false)

const declineConfirmOpen = ref(false)
const pendingDeclineId = ref('')
const pendingDeclineLabel = ref('')

// Create team modal
const createModalOpen = ref(false)
const createSportsPickerOpen = ref(false)
const createSelectedSport = ref<Sport | null>(null)
const createForm = reactive({ name: '', description: '' })
const creatingTeam = ref(false)
const createError = ref('')

const myTeams = computed(() => teams.value.filter((t) => t.captainId === currentUserId.value))
const otherTeams = computed(() => teams.value.filter((t) => t.captainId !== currentUserId.value))

function getSportName(sportId: string) {
  const sport = sports.value.find((s) => s.id === sportId)
  return sport ? `${sport.icon || ''} ${sport.name}`.trim() : ''
}

function openCreateModal() {
  createForm.name = ''
  createForm.description = ''
  createSelectedSport.value = null
  createError.value = ''
  createModalOpen.value = true
}

async function loadTeams() {
  loadingTeams.value = true
  try {
    const query: Record<string, string> = {}
    if (teamSearch.value.trim()) query.q = teamSearch.value.trim()
    const { data, error } = await apiClient.GET('/v1/teams', {
      params: { query: Object.keys(query).length > 0 ? query : undefined },
    })
    if (error) {
      toast.error('Failed to load teams', getErrorMessage(error))
      return
    }
    teams.value = data ?? []
  } catch (e) {
    toast.error('Failed to load teams', getErrorMessage(e))
  } finally {
    loadingTeams.value = false
  }
}

const teamSearch = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => loadTeams(), 300)
}

async function loadMyInvitations() {
  try {
    const { data, error } = await apiClient.GET('/v1/teams/invitations/mine')
    if (error) {
      toast.error('Failed to load invitations', getErrorMessage(error))
      return
    }
    myInvitations.value = (data ?? []).filter((i) => i.status === 'PENDING')
    // Resolve team names for any invitations whose team isn't already loaded
    const missingTeamIds = Array.from(
      new Set(
        myInvitations.value
          .map((i) => i.teamId)
          .filter((id) => !teams.value.some((t) => t.id === id) && !invitationTeamNames.value[id]),
      ),
    )
    await Promise.all(
      missingTeamIds.map(async (id) => {
        try {
          const { data: t } = await apiClient.GET('/v1/teams/{id}', {
            params: { path: { id } },
          })
          if (t) invitationTeamNames.value[id] = t.name
        } catch {
          // If single team lookup fails, fall back to generic label
        }
      }),
    )
  } catch (e) {
    toast.error('Failed to load invitations', getErrorMessage(e))
  }
}

function invitationTeamLabel(teamId: string) {
  const loaded = teams.value.find((t) => t.id === teamId)
  if (loaded) return loaded.name
  return invitationTeamNames.value[teamId] ?? 'Team'
}

async function createTeam() {
  if (!createForm.name.trim() || !createSelectedSport.value) {
    createError.value = 'Team name and sport are required'
    return
  }
  creatingTeam.value = true
  createError.value = ''
  try {
    const { data, error } = await apiClient.POST('/v1/teams', {
      body: {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        sportId: createSelectedSport.value.id,
      },
    })
    if (error) {
      createError.value = getErrorMessage(error, 'Failed to create team')
      return
    }
    createModalOpen.value = false
    router.push(`/teams/${data.id}`)
  } catch (e) {
    createError.value = e instanceof Error ? e.message : 'Failed to create team'
  } finally {
    creatingTeam.value = false
  }
}

async function acceptInvitation(invitationId: string) {
  actionLoading.value = true
  try {
    const { error } = await apiClient.PATCH('/v1/teams/invitations/{invitationId}/accept', {
      params: { path: { invitationId } },
    })
    if (error) {
      toast.error('Failed to accept invitation', getErrorMessage(error))
      return
    }
    toast.success('Invitation accepted')
    await Promise.all([loadMyInvitations(), loadTeams()])
  } catch (e) {
    toast.error('Failed to accept invitation', getErrorMessage(e))
  } finally {
    actionLoading.value = false
  }
}

function requestDeclineInvitation(invitationId: string, teamId: string) {
  pendingDeclineId.value = invitationId
  pendingDeclineLabel.value = invitationTeamLabel(teamId)
  declineConfirmOpen.value = true
}

async function confirmDeclineInvitation() {
  const invitationId = pendingDeclineId.value
  if (!invitationId) return
  actionLoading.value = true
  try {
    const { error } = await apiClient.PATCH('/v1/teams/invitations/{invitationId}/decline', {
      params: { path: { invitationId } },
    })
    if (error) {
      toast.error('Failed to decline invitation', getErrorMessage(error))
      return
    }
    toast.success('Invitation declined')
    declineConfirmOpen.value = false
    pendingDeclineId.value = ''
    await loadMyInvitations()
  } catch (e) {
    toast.error('Failed to decline invitation', getErrorMessage(e))
  } finally {
    actionLoading.value = false
  }
}

onMounted(async () => {
  setHeader({
    title: 'Teams',
    actions: [{ icon: 'i-lucide-plus', onClick: openCreateModal }],
  })
  try {
    const { data: sportsData, error: sportsError } = await apiClient.GET('/v1/sports')
    if (sportsError) throw new Error(getErrorMessage(sportsError, 'Failed to load sports'))
    sports.value = sportsData
  } catch (e) {
    toast.warning('Could not load sports', getErrorMessage(e))
  }
  await Promise.all([loadTeams(), loadMyInvitations()])
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
      <!-- Pending Invitations -->
      <UCard v-if="myInvitations.length > 0" class="bg-white/5">
        <div class="flex flex-col gap-3">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">Pending Invitations</p>
          <div
            v-for="inv in myInvitations"
            :key="inv.id"
            class="flex items-center justify-between rounded-lg border border-white/10 p-3"
          >
            <button
              type="button"
              class="min-w-0 flex flex-col items-start text-left"
              @click="router.push(`/teams/${inv.teamId}`)"
            >
              <p class="text-sm font-medium truncate">Team invitation</p>
              <p class="text-xs text-white/50 truncate">
                {{ invitationTeamLabel(inv.teamId) }}
              </p>
            </button>
            <div class="flex gap-2 shrink-0">
              <UButton
                size="xs"
                color="primary"
                :loading="actionLoading"
                @click="acceptInvitation(inv.id)"
              >
                Accept
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="soft"
                :loading="actionLoading"
                @click="requestDeclineInvitation(inv.id, inv.teamId)"
              >
                Decline
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <!-- My Teams -->
      <div v-if="myTeams.length > 0">
        <p class="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">My Teams</p>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="team in myTeams"
            :key="team.id"
            type="button"
            class="rounded-lg border border-primary/30 bg-primary/5 p-4 text-left transition hover:bg-primary/10"
            @click="router.push(`/teams/${team.id}`)"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium truncate">{{ team.name }}</p>
              <UBadge color="primary" variant="soft" size="xs">Captain</UBadge>
            </div>
            <p v-if="getSportName(team.sportId)" class="mt-1 text-xs text-white/50">
              {{ getSportName(team.sportId) }}
            </p>
            <p class="mt-2 line-clamp-2 text-sm text-white/60">
              {{ team.description || 'No description.' }}
            </p>
          </button>
        </div>
      </div>

      <!-- All Teams -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">All Teams</p>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-refresh-cw"
            aria-label="Refresh teams"
            :loading="loadingTeams"
            @click="loadTeams"
          />
        </div>

        <UInput
          v-model="teamSearch"
          icon="i-lucide-search"
          placeholder="Search teams by name"
          class="mb-3 w-full"
          @update:model-value="onSearchInput"
        />

        <div v-if="loadingTeams" class="flex justify-center p-8">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
        </div>

        <div
          v-else-if="otherTeams.length === 0 && myTeams.length === 0"
          class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-white/10 p-8 text-center"
        >
          <UIcon name="i-lucide-users" class="size-10 text-white/30" />
          <p class="text-sm text-white/60">No teams yet — be the first to create one.</p>
          <UButton size="sm" color="primary" icon="i-lucide-plus" @click="openCreateModal">
            Create Team
          </UButton>
        </div>

        <div
          v-else-if="otherTeams.length === 0"
          class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-6 text-center"
        >
          <UIcon name="i-lucide-search-x" class="size-6 text-white/30" />
          <p class="text-sm text-white/50">No other teams match your search.</p>
        </div>

        <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="team in otherTeams"
            :key="team.id"
            type="button"
            class="rounded-lg border border-white/10 p-4 text-left transition hover:bg-white/5"
            @click="router.push(`/teams/${team.id}`)"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium truncate">{{ team.name }}</p>
            </div>
            <p v-if="getSportName(team.sportId)" class="mt-1 text-xs text-white/50">
              {{ getSportName(team.sportId) }}
            </p>
            <p class="mt-2 line-clamp-2 text-sm text-white/60">
              {{ team.description || 'No description.' }}
            </p>
          </button>
        </div>
      </div>
    </section>

    <!-- Create Team Modal -->
    <UModal v-model:open="createModalOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <h2 class="text-lg font-semibold">Create Team</h2>

          <UAlert
            v-if="createError"
            color="error"
            :title="createError"
            icon="i-lucide-circle-alert"
          />

          <UFormField label="Team Name">
            <UInput v-model="createForm.name" placeholder="Purdue Badminton A" autofocus />
          </UFormField>

          <UFormField label="Sport">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge v-if="createSelectedSport" color="primary" variant="soft" class="gap-1.5">
                {{ createSelectedSport.icon }} {{ createSelectedSport.name }}
              </UBadge>
              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                icon="i-lucide-plus"
                @click="createSportsPickerOpen = true"
              >
                {{ createSelectedSport ? 'Change' : 'Select Sport' }}
              </UButton>
            </div>
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="createForm.description"
              placeholder="Competitive student badminton team"
              :rows="3"
              autoresize
            />
          </UFormField>

          <UButton block color="primary" :loading="creatingTeam" @click="createTeam">
            Create Team
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Sports picker (nested, opened from within create modal) -->
    <SportsPickerModal
      v-model:open="createSportsPickerOpen"
      :selected="createSelectedSport ? [createSelectedSport] : []"
      @update="(s: Sport[]) => (createSelectedSport = s[0] ?? null)"
    />

    <!-- Decline invitation confirm -->
    <UModal v-model:open="declineConfirmOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <div class="rounded-full bg-error/10 p-2 shrink-0">
              <UIcon name="i-lucide-x" class="size-5 text-error" />
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <h2 class="text-lg font-semibold">Decline invitation?</h2>
              <p class="text-sm text-white/60">
                Decline the invitation to
                <span class="text-white/80">{{ pendingDeclineLabel }}</span
                >?
              </p>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="actionLoading"
              @click="declineConfirmOpen = false"
            >
              Cancel
            </UButton>
            <UButton color="error" :loading="actionLoading" @click="confirmDeclineInvitation">
              Decline
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
