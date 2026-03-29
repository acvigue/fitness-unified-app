<template>
  <PageLayout>
    <section class="flex flex-col gap-6 px-5 py-6">
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">
              Team
            </p>
            <p class="text-lg font-medium">Create and manage a team</p>
          </div>

          <UButton
            icon="i-lucide-refresh-cw"
            :loading="loadingTeams"
            @click="loadTeams"
          >
            Refresh Teams
          </UButton>
        </div>
      </UCard>

      <UAlert
        v-if="errorMessage"
        color="error"
        :title="errorMessage"
        icon="i-lucide-circle-alert"
        :close="{
          color: 'error',
          variant: 'link',
          icon: 'i-lucide-x',
        }"
        @close="errorMessage = ''"
      />

      <UAlert
        v-if="successMessage"
        color="success"
        :title="successMessage"
        icon="i-lucide-circle-check"
        :close="{
          color: 'success',
          variant: 'link',
          icon: 'i-lucide-x',
        }"
        @close="successMessage = ''"
      />

      <div class="grid gap-6 xl:grid-cols-3">
        <!-- Create Team -->
        <UCard class="bg-white/5 xl:col-span-1">
          <div class="flex flex-col gap-5">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">
                Team Creation
              </p>
              <p class="text-sm text-white/60">
                Create a new team and become its captain.
              </p>
            </div>

            <UFormField label="Team Name">
              <UInput
                v-model="createForm.name"
                placeholder="Purdue Badminton A"
              />
            </UFormField>

            <UFormField label="Description">
              <UTextarea
                v-model="createForm.description"
                placeholder="Competitive student badminton team"
                :rows="4"
                autoresize
              />
            </UFormField>

            <UFormField label="Sport">
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-if="createSelectedSport"
                  color="primary"
                  variant="soft"
                  class="gap-1.5"
                >
                  {{ createSelectedSport.icon }} {{ createSelectedSport.name }}
                </UBadge>

                <UButton
                  size="sm"
                  variant="outline"
                  color="neutral"
                  icon="i-lucide-plus"
                  @click="createSportsPickerOpen = true"
                >
                  {{ createSelectedSport ? 'Change Sport' : 'Select Sport' }}
                </UButton>
              </div>
            </UFormField>

            <UButton
              color="primary"
              :loading="creatingTeam"
              @click="createTeam"
            >
              Create Team
            </UButton>
          </div>
        </UCard>

        <!-- All Teams -->
        <UCard class="bg-white/5 xl:col-span-2">
          <div class="flex flex-col gap-5">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.3em] text-white/60">
                  Teams
                </p>
                <p class="text-sm text-white/60">
                  Browse teams and select one to view details.
                </p>
              </div>

              <UBadge color="neutral" variant="soft">
                {{ teams.length }} teams
              </UBadge>
            </div>

            <p v-if="loadingTeams" class="text-sm text-white/50">
              Loading teams...
            </p>

            <div
              v-else-if="teams.length === 0"
              class="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/50"
            >
              No teams found yet.
            </div>

            <div v-else class="grid gap-3 md:grid-cols-2">
              <button
                v-for="team in teams"
                :key="team.id"
                type="button"
                class="rounded-lg border p-4 text-left transition"
                :class="
                  selectedTeamId === team.id
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 hover:bg-white/5'
                "
                @click="selectTeam(team.id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-medium">{{ team.name }}</p>
                    <p class="mt-1 text-xs text-white/50 break-all">
                      Sport ID: {{ team.sportId }}
                    </p>
                  </div>

                  <UBadge
                    v-if="team.captainId === currentUserId"
                    color="primary"
                    variant="soft"
                    size="xs"
                  >
                    Captain
                  </UBadge>
                </div>

                <p class="mt-3 line-clamp-3 text-sm text-white/70">
                  {{ team.description || 'No description yet.' }}
                </p>
              </button>
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid gap-6 xl:grid-cols-2">
        <!-- Selected Team -->
        <UCard class="bg-white/5">
          <div class="flex flex-col gap-5">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.3em] text-white/60">
                  Selected Team
                </p>
                <p class="text-sm text-white/60">
                  Public profile style preview.
                </p>
              </div>

              <UButton
                v-if="selectedTeamId"
                size="sm"
                variant="outline"
                color="neutral"
                :loading="loadingSelectedTeam"
                @click="loadSelectedTeam"
              >
                Reload
              </UButton>
            </div>

            <div
              v-if="!selectedTeam"
              class="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/50"
            >
              Select a team from the list above.
            </div>

            <template v-else>
              <div>
                <p class="text-lg font-medium">{{ selectedTeam.name }}</p>
                <p class="mt-1 text-xs text-white/50 break-all">
                  Team ID: {{ selectedTeam.id }}
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-lg border border-white/10 p-4">
                  <p class="text-xs uppercase tracking-wide text-white/50">
                    Sport
                  </p>
                  <div class="mt-2 flex items-center gap-2">
                    <span v-if="selectedSportBadge">
                      {{ selectedSportBadge.icon }}
                    </span>
                    <span class="text-sm">
                      {{ selectedSportBadge?.name || selectedTeam.sportId }}
                    </span>
                  </div>
                </div>

                <div class="rounded-lg border border-white/10 p-4">
                  <p class="text-xs uppercase tracking-wide text-white/50">
                    Captain ID
                  </p>
                  <p class="mt-2 text-sm break-all">
                    {{ selectedTeam.captainId }}
                  </p>
                </div>
              </div>

              <div class="rounded-lg border border-white/10 p-4">
                <p class="text-xs uppercase tracking-wide text-white/50">
                  Description
                </p>
                <p class="mt-2 text-sm text-white/80">
                  {{ selectedTeam.description || 'No description yet.' }}
                </p>
              </div>
            </template>
          </div>
        </UCard>

        <!-- My Team Management -->
        <UCard class="bg-white/5">
          <div class="flex flex-col gap-5">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">
                Team Management
              </p>
              <p class="text-sm text-white/60">
                Captain-only actions for the selected team.
              </p>
            </div>

            <div
              v-if="!selectedTeam"
              class="rounded-lg border border-dashed border-white/10 p-4 text-sm text-white/50"
            >
              Select a team first.
            </div>

            <div
              v-else-if="!isCaptainOfSelectedTeam"
              class="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100"
            >
              You are not the captain of this team.
            </div>

            <template v-else>
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
                  <UBadge
                    v-if="editSelectedSport"
                    color="primary"
                    variant="soft"
                    class="gap-1.5"
                  >
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
                <UButton
                  color="primary"
                  :loading="savingTeam"
                  @click="updateSelectedTeam"
                >
                  Save Team Settings
                </UButton>
              </div>

              <div class="rounded-lg border border-white/10 p-4">
                <p class="font-medium">Transfer Captain</p>
                <p class="mt-1 text-sm text-white/60">
                  Enter the user ID of the new captain.
                </p>

                <div class="mt-4 flex flex-col gap-3 sm:flex-row">
                  <UInput
                    v-model="captainForm.captainId"
                    class="flex-1"
                    placeholder="New captain user ID"
                  />
                  <UButton
                    color="primary"
                    :loading="transferringCaptain"
                    @click="transferCaptain"
                  >
                    Transfer
                  </UButton>
                </div>
              </div>

              <div class="rounded-lg border border-red-400/30 bg-red-500/10 p-4">
                <p class="font-medium text-red-100">Danger Zone</p>
                <p class="mt-1 text-sm text-red-100/80">
                  Deleting a team cannot be undone.
                </p>

                <UButton
                  class="mt-4"
                  color="error"
                  variant="soft"
                  :loading="deletingTeam"
                  @click="deleteSelectedTeam"
                >
                  Delete Team
                </UButton>
              </div>
            </template>
          </div>
        </UCard>
      </div>
    </section>

    <SportsPickerModal
      v-model:open="createSportsPickerOpen"
      :selected="createSelectedSport ? [createSelectedSport] : []"
      @update="onCreateSportsUpdated"
    />

    <SportsPickerModal
      v-model:open="editSportsPickerOpen"
      :selected="editSelectedSport ? [editSelectedSport] : []"
      @update="onEditSportsUpdated"
    />
  </PageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import SportsPickerModal from '@/components/SportsPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import type { Sport } from '@/stores/api/sports'

type Team = {
  id: string
  name: string
  description: string
  captainId: string
  sportId: string
}

useHead({
  title: 'Team',
  meta: [{ name: 'description', content: 'Create and manage your team' }],
})

const { setHeader } = usePageHeader()
const authStore = useAuthStore()

/**
 * Change this if your frontend proxy/base path is different.
 * If this points to the frontend app instead of the backend,
 * you will get HTML back and the helper below will show a readable error.
 */
const API_BASE = '/api/v1/teams'

const currentUserId = computed(() => {
  const user = (authStore as any).user
  return user?.sub || user?.id || ''
})

const teams = ref<Team[]>([])
const selectedTeam = ref<Team | null>(null)
const selectedTeamId = ref('')

const loadingTeams = ref(false)
const loadingSelectedTeam = ref(false)
const creatingTeam = ref(false)
const savingTeam = ref(false)
const transferringCaptain = ref(false)
const deletingTeam = ref(false)

const errorMessage = ref('')
const successMessage = ref('')

const createSportsPickerOpen = ref(false)
const editSportsPickerOpen = ref(false)

const createSelectedSport = ref<Sport | null>(null)
const editSelectedSport = ref<Sport | null>(null)

const createForm = reactive({
  name: '',
  description: '',
})

const editForm = reactive({
  name: '',
  description: '',
})

const captainForm = reactive({
  captainId: '',
})

const isCaptainOfSelectedTeam = computed(() => {
  return !!selectedTeam.value && selectedTeam.value.captainId === currentUserId.value
})

const selectedSportBadge = computed(() => {
  if (!selectedTeam.value) return null

  if (editSelectedSport.value?.id === selectedTeam.value.sportId) {
    return editSelectedSport.value
  }

  if (createSelectedSport.value?.id === selectedTeam.value.sportId) {
    return createSelectedSport.value
  }

  return null
})

function setMessages(success = '', error = '') {
  successMessage.value = success
  errorMessage.value = error
}

async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    credentials: 'include',
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (!response.ok) {
    let message = `Request failed (${response.status})`

    if (isJson) {
      try {
        const data = await response.json()
        message = data.message || data.error || message
      } catch {
        //
      }
    } else {
      const text = await response.text()
      if (text.includes('<!doctype') || text.includes('<html')) {
        message = 'Received HTML instead of JSON. Check your API base URL or frontend proxy.'
      }
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  if (!isJson) {
    const text = await response.text()
    if (text.includes('<!doctype') || text.includes('<html')) {
      throw new Error('Received HTML instead of JSON. Check your API base URL or frontend proxy.')
    }
    throw new Error('Response was not JSON')
  }

  return response.json() as Promise<T>
}

function onCreateSportsUpdated(sports: Sport[]) {
  createSelectedSport.value = sports[0] ?? null
}

function onEditSportsUpdated(sports: Sport[]) {
  editSelectedSport.value = sports[0] ?? null
}

function fillEditForm(team: Team) {
  editForm.name = team.name
  editForm.description = team.description ?? ''

  if (editSelectedSport.value?.id !== team.sportId) {
    editSelectedSport.value = null
  }
}

async function loadTeams() {
  loadingTeams.value = true
  setMessages()

  try {
    const data = await api<Team[]>(API_BASE)
    teams.value = data

    if (selectedTeamId.value) {
      const exists = data.find((team) => team.id === selectedTeamId.value)
      if (exists) {
        await loadSelectedTeam()
      } else {
        selectedTeamId.value = ''
        selectedTeam.value = null
      }
    }
  } catch (error) {
    setMessages('', error instanceof Error ? error.message : 'Failed to load teams')
  } finally {
    loadingTeams.value = false
  }
}

async function loadSelectedTeam() {
  if (!selectedTeamId.value) return

  loadingSelectedTeam.value = true
  setMessages()

  try {
    const team = await api<Team>(`${API_BASE}/${selectedTeamId.value}`)
    selectedTeam.value = team
    fillEditForm(team)
  } catch (error) {
    setMessages('', error instanceof Error ? error.message : 'Failed to load team')
  } finally {
    loadingSelectedTeam.value = false
  }
}

async function selectTeam(id: string) {
  selectedTeamId.value = id
  await loadSelectedTeam()
}

async function createTeam() {
  if (!createForm.name.trim() || !createSelectedSport.value) {
    setMessages('', 'Team name and sport are required')
    return
  }

  creatingTeam.value = true
  setMessages()

  try {
    const team = await api<Team>(API_BASE, {
      method: 'POST',
      body: JSON.stringify({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        sportId: createSelectedSport.value.id,
      }),
    })

    createForm.name = ''
    createForm.description = ''
    createSelectedSport.value = null

    await loadTeams()
    selectedTeamId.value = team.id
    selectedTeam.value = team
    fillEditForm(team)

    setMessages('Team created successfully')
  } catch (error) {
    setMessages('', error instanceof Error ? error.message : 'Failed to create team')
  } finally {
    creatingTeam.value = false
  }
}

async function updateSelectedTeam() {
  if (!selectedTeam.value) return

  if (!editForm.name.trim() || !editSelectedSport.value) {
    setMessages('', 'Team name and sport are required')
    return
  }

  savingTeam.value = true
  setMessages()

  try {
    const updated = await api<Team>(`${API_BASE}/${selectedTeam.value.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        sportId: editSelectedSport.value.id,
      }),
    })

    selectedTeam.value = updated
    await loadTeams()
    setMessages('Team settings updated')
  } catch (error) {
    setMessages('', error instanceof Error ? error.message : 'Failed to update team')
  } finally {
    savingTeam.value = false
  }
}

async function transferCaptain() {
  if (!selectedTeam.value) return

  if (!captainForm.captainId.trim()) {
    setMessages('', 'New captain ID is required')
    return
  }

  transferringCaptain.value = true
  setMessages()

  try {
    const updated = await api<Team>(`${API_BASE}/${selectedTeam.value.id}/captain`, {
      method: 'PATCH',
      body: JSON.stringify({
        captainId: captainForm.captainId.trim(),
      }),
    })

    selectedTeam.value = updated
    captainForm.captainId = ''

    await loadTeams()
    setMessages('Captain transferred successfully')
  } catch (error) {
    setMessages('', error instanceof Error ? error.message : 'Failed to transfer captain')
  } finally {
    transferringCaptain.value = false
  }
}

async function deleteSelectedTeam() {
  if (!selectedTeam.value) return

  const confirmed = window.confirm(`Delete "${selectedTeam.value.name}"? This cannot be undone.`)
  if (!confirmed) return

  deletingTeam.value = true
  setMessages()

  try {
    const deletedName = selectedTeam.value.name

    await api<void>(`${API_BASE}/${selectedTeam.value.id}`, {
      method: 'DELETE',
    })

    selectedTeamId.value = ''
    selectedTeam.value = null
    editSelectedSport.value = null

    await loadTeams()
    setMessages(`Team "${deletedName}" deleted`)
  } catch (error) {
    setMessages('', error instanceof Error ? error.message : 'Failed to delete team')
  } finally {
    deletingTeam.value = false
  }
}

onMounted(async () => {
  setHeader({
    title: 'Team',
  })

  await loadTeams()
})
</script>