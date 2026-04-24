<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import SportsPickerModal from '@/components/SportsPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import UserLink from '@/components/UserLink.vue'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

type Team = components['schemas']['TeamResponseDto']
type TeamInvitation = components['schemas']['TeamInvitationResponseDto']
type UserLookupItem = components['schemas']['UserLookupItemDto']

useHead({ title: 'Team Settings' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()

const teamId = computed(() => route.params.id as string)
const team = ref<Team | null>(null)
const sports = ref<Sport[]>([])
const loading = ref(true)
const error = ref('')
const success = ref('')

// Edit form
const editForm = reactive({ name: '', description: '' })
const editSelectedSport = ref<Sport | null>(null)
const editSportsPickerOpen = ref(false)
const savingTeam = ref(false)

// Captain transfer
const captainForm = reactive({ captainId: '' })
const transferringCaptain = ref(false)

const nonCaptainMembers = computed(() =>
  (team.value?.members ?? []).filter((m) => m.sub !== team.value?.captainId),
)

// Invitations
const teamInvitations = ref<TeamInvitation[]>([])
const userSearchQuery = ref('')
const userSearchResults = ref<UserLookupItem[]>([])
const actionLoading = ref(false)

// Remove member
const removeMemberId = ref('')

// Delete
const deletingTeam = ref(false)

const currentUserId = computed(() => {
  const user = authStore.user as { sub?: string; id?: string } | null | undefined
  return user?.sub || user?.id || ''
})

const isCaptain = computed(() => team.value?.captainId === currentUserId.value)

function setMessages(s = '', e = '') {
  success.value = s
  error.value = e
}

function fillEditForm(t: Team) {
  editForm.name = t.name
  editForm.description = t.description ?? ''
  const sport = sports.value.find((s) => s.id === t.sportId)
  editSelectedSport.value = sport ?? null
}

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
    fillEditForm(data)
    setHeader({
      title: 'Team Settings',
      backRoute: `/teams/${teamId.value}`,
    })

    if (data.captainId !== currentUserId.value) {
      error.value = 'You are not the captain of this team.'
      return
    }

    await loadTeamInvitations()
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

async function saveTeam() {
  if (!editForm.name.trim() || !editSelectedSport.value) {
    setMessages('', 'Team name and sport are required')
    return
  }
  savingTeam.value = true
  setMessages()
  try {
    const { data, error: err } = await apiClient.PATCH('/v1/teams/{id}', {
      params: { path: { id: teamId.value } },
      body: {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        sportId: editSelectedSport.value.id,
      },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to update team'))
      return
    }
    team.value = data
    setMessages('Team settings saved')
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to update')
  } finally {
    savingTeam.value = false
  }
}

async function transferCaptain() {
  if (!captainForm.captainId) {
    setMessages('', 'Please select a team member')
    return
  }
  transferringCaptain.value = true
  setMessages()
  try {
    const { error: err } = await apiClient.PATCH('/v1/teams/{id}/captain', {
      params: { path: { id: teamId.value } },
      body: { captainId: captainForm.captainId },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to transfer captain'))
      return
    }
    captainForm.captainId = ''
    // No longer captain, redirect to detail page
    router.push(`/teams/${teamId.value}`)
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to transfer captain')
  } finally {
    transferringCaptain.value = false
  }
}

async function deleteTeam() {
  if (!team.value) return
  if (!window.confirm(`Delete "${team.value.name}"? This cannot be undone.`)) return
  deletingTeam.value = true
  setMessages()
  try {
    const { data, error: err } = await apiClient.DELETE('/v1/teams/{id}', {
      params: { path: { id: teamId.value } },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to delete team'))
      return
    }
    if (data?.warning) {
      window.alert(data.warning)
    }
    router.push('/team')
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to delete team')
  } finally {
    deletingTeam.value = false
  }
}

// --- Invitations ---
async function searchUsers() {
  if (!userSearchQuery.value.trim()) return
  try {
    const { data } = await apiClient.GET('/v1/user/lookup', {
      params: { query: { q: userSearchQuery.value.trim() } },
    })
    userSearchResults.value = data?.users ?? []
  } catch {
    // Non-critical
  }
}

async function inviteUser(userId: string) {
  actionLoading.value = true
  setMessages()
  try {
    const { error: err } = await apiClient.POST('/v1/teams/{id}/invitations', {
      params: { path: { id: teamId.value } },
      body: { userId },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to invite user'))
      return
    }
    setMessages('Invitation sent')
    userSearchResults.value = []
    userSearchQuery.value = ''
    await loadTeamInvitations()
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to invite')
  } finally {
    actionLoading.value = false
  }
}

async function acceptInvitation(invitationId: string) {
  actionLoading.value = true
  setMessages()
  try {
    const { error: err } = await apiClient.PATCH('/v1/teams/invitations/{invitationId}/accept', {
      params: { path: { invitationId } },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to accept'))
      return
    }
    setMessages('Request accepted')
    await loadTeamInvitations()
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
    const { error: err } = await apiClient.PATCH('/v1/teams/invitations/{invitationId}/decline', {
      params: { path: { invitationId } },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to decline'))
      return
    }
    setMessages('Request declined')
    await loadTeamInvitations()
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to decline')
  } finally {
    actionLoading.value = false
  }
}

async function cancelInvitation(invitationId: string) {
  actionLoading.value = true
  setMessages()
  try {
    const { error: err } = await apiClient.DELETE('/v1/teams/invitations/{invitationId}', {
      params: { path: { invitationId } },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to cancel'))
      return
    }
    setMessages('Invitation cancelled')
    await loadTeamInvitations()
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to cancel')
  } finally {
    actionLoading.value = false
  }
}

async function removeMember() {
  if (!removeMemberId.value.trim()) {
    setMessages('', 'User ID is required')
    return
  }
  if (!window.confirm('Remove this member from the team?')) return
  actionLoading.value = true
  setMessages()
  try {
    const { error: err } = await apiClient.DELETE('/v1/teams/{id}/members/{userId}', {
      params: { path: { id: teamId.value, userId: removeMemberId.value.trim() } },
    })
    if (err) {
      setMessages('', getErrorMessage(err, 'Failed to remove member'))
      return
    }
    setMessages('Member removed')
    removeMemberId.value = ''
  } catch (e) {
    setMessages('', e instanceof Error ? e.message : 'Failed to remove member')
  } finally {
    actionLoading.value = false
  }
}

onMounted(async () => {
  setHeader({ title: 'Team Settings', backRoute: `/teams/${teamId.value}` })
  try {
    const { data: sportsData, error: sportsError } = await apiClient.GET('/v1/sports')
    if (sportsError) throw new Error(getErrorMessage(sportsError, 'Failed to load sports'))
    sports.value = sportsData
  } catch {
    // Non-critical
  }
  loadTeam()
})
</script>

<template>
  <PageLayout>
    <div v-if="loading" class="flex justify-center p-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
    </div>

    <div v-else-if="error && !isCaptain" class="p-5">
      <UAlert color="error" :title="error" icon="i-lucide-circle-alert" />
    </div>

    <section v-else class="flex flex-col gap-5 px-5 py-6">
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

      <div class="grid gap-5 xl:grid-cols-2">
        <!-- Edit Team -->
        <UCard class="bg-white/5">
          <div class="flex flex-col gap-5">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">Team Settings</p>
              <p class="text-sm text-white/60">Update your team's information.</p>
            </div>

            <UFormField label="Team Name">
              <UInput v-model="editForm.name" placeholder="Team name" />
            </UFormField>

            <UFormField label="Description">
              <UTextarea
                v-model="editForm.description"
                placeholder="Description"
                :rows="4"
                autoresize
              />
            </UFormField>

            <UFormField label="Sport">
              <div class="flex flex-wrap gap-2">
                <UBadge v-if="editSelectedSport" color="primary" variant="soft" class="gap-1.5">
                  {{ editSelectedSport.icon }} {{ editSelectedSport.name }}
                </UBadge>
                <UButton
                  size="sm"
                  variant="outline"
                  color="neutral"
                  icon="i-lucide-plus"
                  @click="editSportsPickerOpen = true"
                >
                  {{ editSelectedSport ? 'Change Sport' : 'Select Sport' }}
                </UButton>
              </div>
            </UFormField>

            <div class="flex justify-end">
              <UButton color="primary" :loading="savingTeam" @click="saveTeam">
                Save Changes
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Invite Users -->
        <UCard class="bg-white/5">
          <div class="flex flex-col gap-5">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">Invite Users</p>
              <p class="text-sm text-white/60">Search for users to invite to your team.</p>
            </div>

            <div class="flex flex-col gap-2">
              <UInput
                v-model="userSearchQuery"
                placeholder="Search by name or email..."
                icon="i-lucide-search"
                @keyup.enter="searchUsers"
              />
              <UButton size="sm" variant="outline" color="neutral" @click="searchUsers">
                Search
              </UButton>
            </div>

            <div
              v-if="userSearchResults.length > 0"
              class="flex flex-col gap-1 max-h-48 overflow-y-auto"
            >
              <button
                v-for="u in userSearchResults"
                :key="u.id"
                type="button"
                class="flex items-center justify-between rounded-lg border border-white/10 p-3 text-left text-sm hover:bg-white/5 transition"
                @click="inviteUser(u.id)"
              >
                <span>{{ u.name || u.username || u.email || u.id }}</span>
                <UIcon name="i-lucide-user-plus" class="text-primary shrink-0" />
              </button>
            </div>

            <!-- Pending invitations & requests -->
            <div v-if="teamInvitations.length > 0" class="border-t border-white/10 pt-4">
              <p class="text-sm font-medium mb-2">Invitations & Requests</p>
              <div class="flex flex-col gap-2">
                <div
                  v-for="inv in teamInvitations"
                  :key="inv.id"
                  class="flex items-center justify-between rounded-lg border border-white/10 p-3"
                >
                  <div class="min-w-0">
                    <UserLink :user-id="inv.userId" class="text-sm" />
                    <p class="text-xs text-white/50">
                      {{ inv.type === 'INVITE' ? 'Invitation' : 'Join Request' }}
                    </p>
                  </div>
                  <div v-if="inv.status === 'PENDING'" class="flex gap-1 shrink-0">
                    <template v-if="inv.type === 'REQUEST'">
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
                    </template>
                    <UButton
                      v-if="inv.type === 'INVITE'"
                      size="xs"
                      color="error"
                      variant="soft"
                      :loading="actionLoading"
                      @click="cancelInvitation(inv.id)"
                    >
                      Cancel
                    </UButton>
                  </div>
                  <UBadge
                    v-else
                    :color="
                      inv.status === 'ACCEPTED'
                        ? 'success'
                        : inv.status === 'DECLINED'
                          ? 'error'
                          : 'warning'
                    "
                    variant="soft"
                    size="xs"
                  >
                    {{ inv.status }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Remove Member -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Remove Member</p>
            <p class="text-sm text-white/60">
              Remove a member from the team by their user ID through their profile .
            </p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <UInput
              v-model="removeMemberId"
              class="flex-1"
              placeholder="User ID from their profile to remove"
            />
            <UButton color="error" variant="soft" :loading="actionLoading" @click="removeMember">
              Remove Member
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Transfer Captain -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Transfer Captaincy</p>
            <p class="text-sm text-white/60">
              Transfer captain role to another team member. You will lose captain access.
            </p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <USelect
              v-model="captainForm.captainId"
              class="flex-1"
              placeholder="Select a team member"
              :items="
                nonCaptainMembers.map((m) => ({
                  label: m.name || m.username || m.sub,
                  value: m.sub,
                }))
              "
            />
            <UButton
              color="primary"
              :loading="transferringCaptain"
              :disabled="!captainForm.captainId"
              @click="transferCaptain"
            >
              Transfer
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Danger Zone -->
      <UCard class="bg-white/5">
        <div class="rounded-lg border border-red-400/30 bg-red-500/10 p-4">
          <p class="font-medium text-red-100">Danger Zone</p>
          <p class="mt-1 text-sm text-red-100/80">
            Deleting a team cannot be undone. All members will be removed.
          </p>
          <UButton
            class="mt-4"
            color="error"
            variant="soft"
            :loading="deletingTeam"
            @click="deleteTeam"
          >
            Delete Team
          </UButton>
        </div>
      </UCard>
    </section>

    <SportsPickerModal
      v-model:open="editSportsPickerOpen"
      :selected="editSelectedSport ? [editSelectedSport] : []"
      @update="(s: Sport[]) => (editSelectedSport = s[0] ?? null)"
    />
  </PageLayout>
</template>
