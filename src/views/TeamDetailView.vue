<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import UserLink from '@/components/UserLink.vue'
import MeetupProposeModal from '@/components/meetup/MeetupProposeModal.vue'
import TeamChatSearchModal from '@/components/team-chat/TeamChatSearchModal.vue'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

type Team = components['schemas']['TeamResponseDto']
type TeamInvitation = components['schemas']['TeamInvitationResponseDto']

useHead({ title: 'Team' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()

const teamId = computed(() => route.params.id as string)
const team = ref<Team | null>(null)
const sports = ref<Sport[]>([])
const loading = ref(true)
const error = ref('')
const actionLoading = ref(false)
const actionMessage = ref('')
const actionError = ref('')

// Captain-visible: pending invitations/requests
const teamInvitations = ref<TeamInvitation[]>([])

// Viewer's own teams (used for proposing a meetup / starting a team chat)
const myTeams = ref<Team[]>([])
const selectedProposingTeamId = ref<string>('')
const proposeModalOpen = ref(false)
const chatPickerOpen = ref(false)
const chatPickerError = ref('')

const isMyOwnTeam = computed(() => myTeams.value.some((t) => t.id === teamId.value))
const myOtherTeams = computed(() => myTeams.value.filter((t) => t.id !== teamId.value))
const canProposeMeetup = computed(
  () => !isMyOwnTeam.value && myOtherTeams.value.length > 0 && !!team.value,
)
const canStartTeamChat = computed(() => isMyOwnTeam.value || myOtherTeams.value.length > 0)

const currentUserId = computed(() => {
  const user = (authStore as any).user
  return user?.sub || user?.id || ''
})

const isCaptain = computed(() => team.value?.captainId === currentUserId.value)

const teamSport = computed(() => sports.value.find((s) => s.id === team.value?.sportId))

// Members: the API doesn't return a members array on TeamResponseDto,
// but we can show the captain. We also show accepted invitation users
// as "members" derived from the invitations list.
const memberUserIds = computed(() => {
  const ids = new Set<string>()
  if (team.value) {
    for (const u of team.value.members) {
      ids.add(u.sub)
    }
  }
  /*if (team.value) ids.add(team.value.captainId)
  for (const inv of teamInvitations.value) {
    if (inv.status === 'ACCEPTED') ids.add(inv.userId)
  }*/
  return [...ids]
})

const isMember = computed(() => memberUserIds.value.includes(currentUserId.value))

async function loadTeam() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/teams/{id}', {
      params: { path: { id: teamId.value } },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load team')
      return
    }
    team.value = data
    setHeader({
      title: data.name,
      backRoute: '/team',
      actions:
        data.captainId === currentUserId.value
          ? [
              {
                icon: 'i-lucide-settings',
                onClick: () => router.push(`/teams/${teamId.value}/settings`),
              },
            ]
          : [],
    })
    // If captain, load invitations to derive member list
    if (data.captainId === currentUserId.value) {
      await loadTeamInvitations()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load team'
  } finally {
    loading.value = false
  }
}

async function loadTeamInvitations() {
  try {
    const { data } = await apiClient.GET('/v1/teams/{id}/invitations', {
      params: { path: { id: teamId.value } },
    })
    teamInvitations.value = data ?? []
  } catch {
    // Non-critical
  }
}

async function requestToJoin() {
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    const { error: err } = await apiClient.POST('/v1/teams/{id}/requests', {
      params: { path: { id: teamId.value } },
    })
    if (err) {
      actionError.value = getErrorMessage(err, 'Failed to send join request')
      return
    }
    actionMessage.value = 'Join request sent!'
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Failed to send request'
  } finally {
    actionLoading.value = false
  }
}

async function acceptRequest(invitationId: string) {
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    const { error: err } = await apiClient.PATCH('/v1/teams/invitations/{invitationId}/accept', {
      params: { path: { invitationId } },
    })
    if (err) {
      actionError.value = getErrorMessage(err, 'Failed to accept request')
      return
    }
    actionMessage.value = 'Request accepted'
    await loadTeamInvitations()
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Failed to accept'
  } finally {
    actionLoading.value = false
  }
}

async function declineRequest(invitationId: string) {
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    const { error: err } = await apiClient.PATCH('/v1/teams/invitations/{invitationId}/decline', {
      params: { path: { invitationId } },
    })
    if (err) {
      actionError.value = getErrorMessage(err, 'Failed to decline request')
      return
    }
    actionMessage.value = 'Request declined'
    await loadTeamInvitations()
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Failed to decline'
  } finally {
    actionLoading.value = false
  }
}

async function leaveTeam() {
  if (!window.confirm('Are you sure you want to leave this team?')) return
  actionLoading.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    const { error: err } = await apiClient.POST('/v1/teams/{id}/leave', {
      params: { path: { id: teamId.value } },
    })
    if (err) {
      actionError.value = getErrorMessage(
        err,
        'Failed to leave team. If you are captain, transfer captaincy first.',
      )
      return
    }
    router.push('/team')
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Failed to leave team'
  } finally {
    actionLoading.value = false
  }
}

async function loadMyTeams() {
  try {
    const { data, error: err } = await apiClient.GET('/v1/teams')
    if (err) return
    myTeams.value = (data ?? []).filter(
      (t) => t.captainId === currentUserId.value || t.members.some((m) => m.sub === currentUserId.value),
    )
  } catch {
    // Non-critical
  }
}

function openProposeModal() {
  const defaultTeam = myOtherTeams.value[0]
  if (!defaultTeam) return
  selectedProposingTeamId.value = defaultTeam.id
  proposeModalOpen.value = true
}

function openTeamChatPicker() {
  chatPickerError.value = ''
  if (isMyOwnTeam.value) {
    router.push(`/teams/${teamId.value}/chats`)
    return
  }
  // Viewer is only on other teams — let them pick which of their teams initiates
  const fromTeam = myOtherTeams.value[0]
  if (!fromTeam) return
  selectedProposingTeamId.value = fromTeam.id
  chatPickerOpen.value = true
}

onMounted(async () => {
  setHeader({ title: 'Team', backRoute: '/team' })
  try {
    const { data: sportsData, error: sportsError } = await apiClient.GET('/v1/sports')
    if (sportsError) throw new Error(getErrorMessage(sportsError, 'Failed to load sports'))
    sports.value = sportsData
  } catch {
    // Non-critical
  }
  await Promise.all([loadTeam(), loadMyTeams()])
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

    <section v-else-if="team" class="flex flex-col gap-5 px-5 py-6">
      <!-- Action alerts -->
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

      <!-- Team Info -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-lg font-medium">{{ team.name }}</p>
              <p v-if="teamSport" class="text-sm text-white/60 mt-0.5">
                {{ teamSport.icon || '' }} {{ teamSport.name }}
              </p>
            </div>
            <UBadge v-if="isCaptain" color="primary" variant="soft">Captain</UBadge>
          </div>

          <div class="rounded-lg border border-white/10 p-3">
            <p class="text-xs uppercase tracking-wide text-white/50">Description</p>
            <p class="mt-1 text-sm text-white/80">
              {{ team.description || 'No description yet.' }}
            </p>
          </div>
        </div>
      </UCard>

      <!-- Members -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Members</p>
            <UBadge color="neutral" variant="soft" size="xs">{{ memberUserIds.length }}</UBadge>
          </div>

          <div class="flex flex-col gap-2">
            <div
              v-for="userId in memberUserIds"
              :key="userId"
              class="flex items-center justify-between rounded-lg border border-white/10 p-3"
            >
              <div class="flex items-center gap-2 min-w-0">
                <UIcon name="i-lucide-user" class="text-white/40 shrink-0" />
                <UserLink :user-id="userId" class="text-sm" />
              </div>
              <UBadge v-if="userId === team.captainId" color="primary" variant="soft" size="xs">
                Captain
              </UBadge>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Pending Join Requests (captain view) -->
      <UCard
        v-if="
          isCaptain &&
          teamInvitations.filter((i) => i.type === 'REQUEST' && i.status === 'PENDING').length > 0
        "
        class="bg-white/5"
      >
        <div class="flex flex-col gap-3">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">Pending Join Requests</p>
          <div
            v-for="inv in teamInvitations.filter(
              (i) => i.type === 'REQUEST' && i.status === 'PENDING',
            )"
            :key="inv.id"
            class="flex items-center justify-between rounded-lg border border-white/10 p-3"
          >
            <UserLink :user-id="inv.userId" class="text-sm" />
            <div class="flex gap-2 shrink-0">
              <UButton
                size="xs"
                color="primary"
                :loading="actionLoading"
                @click="acceptRequest(inv.id)"
              >
                Accept
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="soft"
                :loading="actionLoading"
                @click="declineRequest(inv.id)"
              >
                Decline
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Actions -->
      <div class="flex flex-wrap gap-3">
        <UButton
          v-if="isCaptain"
          icon="i-lucide-settings"
          @click="router.push(`/teams/${team.id}/settings`)"
        >
          Team Settings
        </UButton>

        <UButton
          v-if="isMyOwnTeam"
          icon="i-lucide-message-circle"
          color="primary"
          variant="soft"
          @click="router.push(`/teams/${team.id}/chats`)"
        >
          Team Chats
        </UButton>

        <UButton
          v-if="!isMyOwnTeam && canStartTeamChat"
          icon="i-lucide-message-circle"
          color="primary"
          variant="soft"
          @click="openTeamChatPicker"
        >
          Message Team
        </UButton>

        <UButton
          icon="i-lucide-calendar"
          color="neutral"
          variant="outline"
          @click="router.push(`/teams/${team.id}/meetups`)"
        >
          Meetups
        </UButton>

        <UButton
          v-if="canProposeMeetup"
          icon="i-lucide-calendar-plus"
          color="primary"
          @click="openProposeModal"
        >
          Propose Meetup
        </UButton>

        <UButton
          v-if="isCaptain"
          icon="i-lucide-shield-ban"
          color="neutral"
          variant="outline"
          @click="router.push(`/teams/${team.id}/blocks`)"
        >
          Blocked Teams
        </UButton>

        <UButton v-if="!isCaptain" color="primary" :loading="actionLoading" @click="requestToJoin">
          Request to Join
        </UButton>

        <UButton
          v-if="isMember && !isCaptain"
          color="error"
          variant="soft"
          :loading="actionLoading"
          @click="leaveTeam"
        >
          Leave Team
        </UButton>
      </div>

      <UAlert
        v-if="chatPickerError"
        color="error"
        :title="chatPickerError"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="chatPickerError = ''"
      />
    </section>

    <MeetupProposeModal
      v-if="team && selectedProposingTeamId"
      v-model:open="proposeModalOpen"
      :proposing-team-id="selectedProposingTeamId"
      :receiving-team-id="team.id"
      :receiving-team-name="team.name"
      @proposed="router.push(`/teams/${selectedProposingTeamId}/meetups`)"
    />

    <TeamChatSearchModal
      v-if="selectedProposingTeamId"
      v-model:open="chatPickerOpen"
      :from-team-id="selectedProposingTeamId"
      @error="(msg) => (chatPickerError = msg)"
    />
  </PageLayout>
</template>
