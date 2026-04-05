<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import SportsPickerModal from '@/components/SportsPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
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

const currentUserId = computed(() => {
  const user = (authStore as any).user
  return user?.sub || user?.id || ''
})

const teams = ref<Team[]>([])
const sports = ref<Sport[]>([])
const myInvitations = ref<TeamInvitation[]>([])

const loadingTeams = ref(false)
const actionLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

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

function setMessages(success = '', error = '') {
  successMessage.value = success
  errorMessage.value = error
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
  setMessages()
  try {
    const { data, error } = await apiClient.GET('/v1/teams')
    if (error) {
      setMessages('', getErrorMessage(error, 'Failed to load teams'))
      return
    }
    teams.value = data ?? []
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to load teams')
  } finally {
    loadingTeams.value = false
  }
}

async function loadMyInvitations() {
  try {
    const { data } = await apiClient.GET('/v1/teams/invitations/mine')
    myInvitations.value = (data ?? []).filter((i) => i.status === 'PENDING')
  } catch {
    // Non-critical
  }
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
  setMessages()
  try {
    const { error } = await apiClient.PATCH('/v1/teams/invitations/{invitationId}/accept', {
      params: { path: { invitationId } },
    })
    if (error) {
      setMessages('', getErrorMessage(error, 'Failed to accept'))
      return
    }
    setMessages('Invitation accepted')
    await Promise.all([loadMyInvitations(), loadTeams()])
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to accept')
  } finally {
    actionLoading.value = false
  }
}

async function declineInvitation(invitationId: string) {
  actionLoading.value = true
  setMessages()
  try {
    const { error } = await apiClient.PATCH('/v1/teams/invitations/{invitationId}/decline', {
      params: { path: { invitationId } },
    })
    if (error) {
      setMessages('', getErrorMessage(error, 'Failed to decline'))
      return
    }
    setMessages('Invitation declined')
    await loadMyInvitations()
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to decline')
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
  } catch {
    // Non-critical
  }
  await Promise.all([loadTeams(), loadMyInvitations()])
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
      <!-- Alerts -->
      <UAlert
        v-if="errorMessage"
        color="error"
        :title="errorMessage"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="errorMessage = ''"
      />
      <UAlert
        v-if="successMessage"
        color="success"
        :title="successMessage"
        icon="i-lucide-circle-check"
        :close="{ color: 'success', variant: 'link', icon: 'i-lucide-x' }"
        @close="successMessage = ''"
      />

      <!-- Pending Invitations -->
      <UCard v-if="myInvitations.length > 0" class="bg-white/5">
        <div class="flex flex-col gap-3">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">Pending Invitations</p>
          <div
            v-for="inv in myInvitations"
            :key="inv.id"
            class="flex items-center justify-between rounded-lg border border-white/10 p-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">Team invitation</p>
              <p class="text-xs text-white/50">Team: {{ inv.teamId }}</p>
            </div>
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
                @click="declineInvitation(inv.id)"
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
            :loading="loadingTeams"
            @click="loadTeams"
          />
        </div>

        <div v-if="loadingTeams" class="flex justify-center p-8">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
        </div>

        <div
          v-else-if="otherTeams.length === 0 && myTeams.length === 0"
          class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
        >
          No teams found yet. Tap + to create one!
        </div>

        <div v-else-if="otherTeams.length === 0" class="text-sm text-white/40 text-center py-4">
          No other teams found.
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
  </PageLayout>
</template>
