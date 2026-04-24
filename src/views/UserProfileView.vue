<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type {components} from "@/types/api";

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { setHeader} = usePageHeader()

type UserTournaments = components['schemas']['TournamentResponseDto']

const userId = computed(() => route.params.userId as string)
const profile = ref<any>(null)
const loading = ref(true)
const error = ref('')
const tournamentHistory = ref<UserTournaments[]>([])

const hidingBio = ref(false)
const hidingSports = ref(false)
const hidingTournaments = ref(false)
const hidingAchievements = ref(false)

const displayName = computed(() => {
  const p = profile.value
  if (p?.firstName || p?.lastName) return [p.firstName, p.lastName].filter(Boolean).join(' ')
  return 'User'
})

onMounted(async () => {
  setHeader({ title: t('profile.userProfile') })
  try {
    const { data: profileData, error: profileErr } = await apiClient.GET(
      '/v1/users/{userId}/profile',
      {
        params: { path: { userId: userId.value } },
      },
    )
    if (profileErr) throw new Error(getErrorMessage(profileErr, 'Failed to load profile'))
    profile.value = profileData
    tournamentHistory.value = profile.value.tournaments
  } catch (err: any) {
    console.error('Failed to load profile. userId:', userId.value, 'Error:', err)
    error.value = err.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
  try {
    const { data: profileData, error: profileErr } = await apiClient.PATCH('/v1/user/profile/user/privacy', {
      body: {q: userId.value},
    })
    if (profileErr ) throw new Error(getErrorMessage(profileErr, 'Failed to load profile'))
    console.log(profileData)
    hidingBio.value = profileData.privateBio
    hidingSports.value = profileData.privateSports
    hidingTournaments.value = profileData.privateTournaments
    hidingAchievements.value = profileData.privateAchievements
  } catch (err) {
    error.value = 'Failed to load profile'
    console.error(err)
  }
})

const primaryPicture = computed(() => {
  return profile.value?.pictures?.find((p: any) => p.isPrimary)?.url || ''
})

const moveToComparePage = () => {
  router.push(`/profile/compare/${userId.value}`)
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

      <!-- Full Name -->
      <div class="text-center">
        <p class="text-white/70 text-sm">{{ t('profile.name') }}</p>
        <p class="text-white text-lg font-medium">
          {{ displayName }}
        </p>
      </div>

      <!-- Bio -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-1">{{ t('profile.bio') }}</p>
        <p v-if="hidingBio" class="text-white">Bio is Hidden</p>
        <p v-else class="text-white">{{ profile.bio || 'no bio' }}</p>
      </div>

      <!-- Favorite Sports -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-2">{{ t('profile.favoriteSports') }}</p>
        <p v-if="hidingSports" class="text-white">Favorite Sports is Hidden</p>
        <div v-else class="flex flex-wrap gap-2">
          <UBadge
            v-for="sport in profile?.favoriteSports"
            :key="sport.id"
            color="primary"
            variant="soft"
          >
            {{ sport.icon }} {{ sport.name }}
          </UBadge>
          <p v-if="!profile?.favoriteSports?.length" class="text-white/50 text-sm">
            {{ t('profile.noSports') }}
          </p>
        </div>
      </div>

      <!-- Tournaments -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm">{{ t('profile.tournaments') }}</p>
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
        <p class="text-white/70 text-sm mb-2">Featured Achievements</p>
        <p v-if="hidingSports" class="text-white">Featured Achievements is Hidden</p>
        <div v-else-if="profile?.featuredAchievements?.length" class="grid gap-2 sm:grid-cols-2">
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
        <p v-else class="text-white/50 text-sm">No featured achievements.</p>
      </div>
      <div class="flex justify-center">
        <UButton @click="moveToComparePage" color="primary" variant="soft"> Compare Profiles </UButton>
      </div>
    </div>
  </PageLayout>
</template>
