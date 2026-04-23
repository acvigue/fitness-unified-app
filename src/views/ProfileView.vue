<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import router from '@/router'
import type { components } from '@/types/api'

type UserAchievement = components['schemas']['UserAchievementResponseDto']
type UserTournaments = components['schemas']['TournamentResponseDto']

const { t } = useI18n()
const { setHeader } = usePageHeader()

const profile = ref<any>(null)
const loading = ref(true)
const error = ref('')

const hidingBio = ref(false)
const hidingSports = ref(false)
const hidingTournaments = ref(false)
const hidingAchievements = ref(false)


// Featured achievements editing
const earnedAchievements = ref<UserAchievement[]>([])
const tournamentHistory = ref<UserTournaments[]>([])
const editingFeatured = ref(false)
const selectedFeaturedIds = ref<string[]>([])
const savingFeatured = ref(false)
const featuredMessage = ref('')


onMounted(async () => {
  setHeader({
    title: t('profile.profile'),
    actions: [{ icon: 'i-lucide-trophy', onClick: () => router.push('/achievements') }],
  })
  try {
    const { data: profileData, error: profileErr } = await apiClient.GET('/v1/user/profile')
    if (profileErr) throw new Error(getErrorMessage(profileErr, 'Failed to load profile'))
    profile.value = profileData
    selectedFeaturedIds.value = (profile.value?.featuredAchievements ?? []).map((a: any) => a.id)
    tournamentHistory.value = profile.value.tournaments
    console.log(tournamentHistory.value)
  } catch (err) {
    error.value = 'Failed to load profile'
    console.error(err)
  } finally {
    loading.value = false
  }
  try {
    const { data: profileData, error: profileErr } = await apiClient.GET('/v1/user/profile/privacy')
    if (profileErr ) throw new Error(getErrorMessage(profileErr, 'Failed to load profile'))
    hidingBio.value = profileData.privateBio
    hidingSports.value = profileData.privateSports
    hidingTournaments.value = profileData.privateTournaments
    hidingAchievements.value = profileData.privateAchievements
    console.log(hidingBio.value,hidingSports.value,hidingTournaments.value,hidingAchievements.value)
  } catch (err) {
    error.value = 'Failed to load profile'
    console.error(err)
  }
})

const moveToReportsPage = () => {
  router.push('/report')
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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

const primaryPicture = computed(() => {
  return profile.value?.pictures?.find((p: any) => p.isPrimary)?.url || ''
})

async function startEditFeatured() {
  editingFeatured.value = true
  try {
    const { data } = await apiClient.GET('/v1/achievements/me/earned')
    earnedAchievements.value = data ?? []
  } catch {
    // Non-critical
  }
}

function toggleFeatured(id: string) {
  const idx = selectedFeaturedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedFeaturedIds.value.splice(idx, 1)
  } else if (selectedFeaturedIds.value.length < 5) {
    selectedFeaturedIds.value.push(id)
  }
}

async function saveFeatured() {
  savingFeatured.value = true
  featuredMessage.value = ''
  try {
    const { error: updateErr } = await apiClient.PATCH('/v1/user/profile', {
      body: { featuredAchievementIds: selectedFeaturedIds.value } as any,
    })
    if (updateErr) throw new Error(getErrorMessage(updateErr, 'Failed to update profile'))
    const { data: refreshedProfile, error: refreshErr } = await apiClient.GET('/v1/user/profile')
    if (refreshErr) throw new Error(getErrorMessage(refreshErr, 'Failed to load profile'))
    profile.value = refreshedProfile
    editingFeatured.value = false
    featuredMessage.value = 'Featured achievements updated'
  } catch (e) {
    featuredMessage.value = e instanceof Error ? e.message : 'Failed to save'
  } finally {
    savingFeatured.value = false
  }
}
</script>

<template>
  <PageLayout>
    <div v-if="loading" class="flex justify-center p-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
    </div>
    <div v-else-if="error" class="text-red-500 p-4">
      {{ error }}
    </div>
    <div v-else class="flex flex-col gap-6 px-5 py-6">
      <!-- Profile Picture -->
      <div class="flex justify-center">
        <UAvatar :src="primaryPicture" alt="Profile" size="3xl" />
      </div>

      <!-- Name -->
      <div class="text-center">
        <p class="text-white text-lg font-medium">
          {{
            profile?.firstName || profile?.lastName
              ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
              : 'User'
          }}
        </p>
      </div>

      <!-- Bio -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-1">Bio</p>
        <p v-if="hidingBio" class="text-white">Bio is Hidden</p>
        <p v-else class="text-white">{{ profile.bio || 'no bio' }}</p>
      </div>

      <!-- Favorite Sports -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-2">Favorite Sports</p>
        <p v-if="hidingSports" class="text-white">Tournament History is Hidden</p>
        <div v-else class="flex flex-wrap gap-2">
          <UBadge
            v-for="sport in profile.favoriteSports"
            :key="sport.id"
            color="primary"
            variant="soft"
          >
            {{ sport.icon }} {{ sport.name }}
          </UBadge>
          <p v-if="!profile.favoriteSports?.length" class="text-white/50 text-sm">
            No favorite sports added.
          </p>
        </div>
      </div>

      <!-- Tournaments -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm">Tournaments</p>
        <p v-if="hidingTournaments" class="text-white">Tournament History is Hidden</p>
        <div v-else-if="tournamentHistory.length > 0">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <button
              v-for="tournament in tournamentHistory"
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
          </div>        </div>
        <div v-else>
          <p class="text-white/50">None played yet.</p>
        </div>
      </div>

      <!-- Featured Achievements -->
      <div class="bg-white/5 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <p class="text-white/70 text-sm">Featured Achievements</p>
          <p v-if="hidingSports" class="text-white">Tournament History is Hidden</p>
          <UButton v-else size="xs" variant="ghost" color="neutral" @click="startEditFeatured">
            {{ editingFeatured ? 'Cancel' : 'Edit' }}
          </UButton>
        </div>

        <UAlert
          v-if="featuredMessage"
          color="success"
          :title="featuredMessage"
          class="mb-2"
          :close="{ color: 'success', variant: 'link', icon: 'i-lucide-x' }"
          @close="featuredMessage = ''"
        />

        <!-- Display mode -->
        <template v-if="!editingFeatured">
          <div v-if="profile?.featuredAchievements?.length" class="grid gap-2 sm:grid-cols-2">
            <div
              v-for="ua in profile.featuredAchievements"
              :key="ua.id"
              class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3"
            >
              <UIcon name="i-lucide-award" class="text-primary" />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ ua.achievement.name }}</p>
                <p class="text-xs text-white/50">{{ ua.achievement.description }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-white/50 text-sm">
            No featured achievements. Tap Edit to select up to 5.
          </p>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <p class="text-xs text-white/50 mb-2">
            Select up to 5 earned achievements to feature on your profile.
          </p>
          <div v-if="earnedAchievements.length === 0" class="text-sm text-white/50">
            No earned achievements yet. Participate in tournaments to earn them!
          </div>
          <div v-else class="flex flex-col gap-2">
            <button
              v-for="ua in earnedAchievements"
              :key="ua.id"
              type="button"
              class="flex items-center gap-2 rounded-lg border p-3 text-left transition"
              :class="
                selectedFeaturedIds.includes(ua.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:bg-white/5'
              "
              @click="toggleFeatured(ua.id)"
            >
              <UIcon
                name="i-lucide-award"
                :class="selectedFeaturedIds.includes(ua.id) ? 'text-primary' : 'text-white/40'"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">{{ ua.achievement.name }}</p>
                <p class="text-xs text-white/50">{{ ua.achievement.description }}</p>
              </div>
              <UIcon
                v-if="selectedFeaturedIds.includes(ua.id)"
                name="i-lucide-check"
                class="text-primary"
              />
            </button>
          </div>
          <div class="flex justify-end mt-3 gap-2">
            <UButton size="sm" variant="outline" color="neutral" @click="editingFeatured = false"
              >Cancel</UButton
            >
            <UButton size="sm" color="primary" :loading="savingFeatured" @click="saveFeatured"
              >Save</UButton
            >
          </div>
        </template>
      </div>

      <!-- My Reports Button -->
      <div class="flex justify-center">
        <UButton @click="moveToReportsPage" color="primary" variant="soft"> Report Users </UButton>
      </div>
    </div>
  </PageLayout>
</template>
