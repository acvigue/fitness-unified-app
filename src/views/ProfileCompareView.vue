<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {useRoute, useRouter} from "vue-router";
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type UserAchievement = components['schemas']['UserAchievementResponseDto']
type UserTournaments = components['schemas']['TournamentResponseDto']

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()

const profile = ref<any>(null)
const profile2 = ref<any>(null)
const loading = ref(true)
const error = ref('')
const userId = computed(() => route.params.userId as string)
const displayName = computed(() => {
  const p = profile2.value
  if (p?.firstName || p?.lastName) return [p.firstName, p.lastName].filter(Boolean).join(' ')
  return 'User'
})

// Featured achievements editing
const earnedAchievements = ref<UserAchievement[]>([])
const tournamentHistory = ref<UserTournaments[]>([])
const editingFeatured = ref(false)
const selectedFeaturedIds = ref<string[]>([])
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
    const { data: profileData2, error: profileErr2 } = await apiClient.GET(
      '/v1/users/{userId}/profile',
      {
        params: { path: { userId: userId.value } },
      },
    )
    if (profileErr2) throw new Error(getErrorMessage(profileErr2, 'Failed to load profile'))
    profile2.value = profileData2
  } catch (err) {
    error.value = 'Failed to load profile'
    console.error(err)
  } finally {
    loading.value = false
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


function toggleFeatured(id: string) {
  const idx = selectedFeaturedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedFeaturedIds.value.splice(idx, 1)
  } else if (selectedFeaturedIds.value.length < 5) {
    selectedFeaturedIds.value.push(id)
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
    <div v-else class="flex flex-col md:flex-row gap-10 px-5 py-6">
      <div class="flex flex-col md:w-1/2 gap-6 px-5 py-6">
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
          <p class="text-white">{{ profile.bio || t('profile.noBio') }}</p>
        </div>

        <!-- Favorite Sports -->
        <div class="bg-white/5 p-4 rounded-lg">
          <p class="text-white/70 text-sm mb-2">Favorite Sports</p>
          <div class="flex flex-wrap gap-2">
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
          <div v-if="tournamentHistory.length > 0">
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
            </div>
          </template>
        </div>

      </div>
      <div class="flex flex-col md:w-1/2 gap-6 px-5 py-6">
        <!-- Profile Picture -->
        <div class="flex justify-center">
          <UAvatar :src="primaryPicture" alt="Profile" size="3xl" />
        </div>

        <!-- Full Name -->
        <div class="text-center">
          <p class="text-white text-lg font-medium">
            {{ displayName }}
          </p>
        </div>

        <!-- Bio -->
        <div class="bg-white/5 p-4 rounded-lg">
          <p class="text-white/70 text-sm mb-1">{{ t('profile.bio') }}</p>
          <p class="text-white">{{ profile2?.bio || t('profile.noBio') }}</p>
        </div>

        <!-- Favorite Sports -->
        <div class="bg-white/5 p-4 rounded-lg">
          <p class="text-white/70 text-sm mb-2">{{ t('profile.favoriteSports') }}</p>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="sport in profile2?.favoriteSports"
              :key="sport.id"
              color="primary"
              variant="soft"
            >
              {{ sport.icon }} {{ sport.name }}
            </UBadge>
            <p v-if="!profile2?.favoriteSports?.length" class="text-white/50 text-sm">
              {{ t('profile.noSports') }}
            </p>
          </div>
        </div>

        <!-- Tournaments -->
        <div class="bg-white/5 p-4 rounded-lg">
          <p class="text-white/70 text-sm">{{ t('profile.tournaments') }}</p>
          <p class="text-white/50">{{ t('profile.nonePlayed') }}</p>
        </div>

        <!-- Featured Achievements -->
        <div class="bg-white/5 p-4 rounded-lg">
          <p class="text-white/70 text-sm mb-2">Featured Achievements</p>
          <div v-if="profile2?.featuredAchievements?.length" class="grid gap-2 sm:grid-cols-2">
            <div
              v-for="ua in profile2.featuredAchievements"
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
          <p v-else class="text-white/50 text-sm">No featured achievements.</p>
        </div>
      </div>
    </div>
  </PageLayout>
</template>
