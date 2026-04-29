<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import UserBlockButton from '@/components/user/UserBlockButton.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useAuthStore } from '@/stores/auth/auth'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()
const toast = useToastStore()

type UserTournaments = components['schemas']['TournamentResponseDto']
type UserProfile = components['schemas']['UserProfileResponseDto'] & {
  firstName?: string
  lastName?: string
}

const userId = computed(() => route.params.userId as string)
const currentUserId = computed(() => authStore.user?.sub ?? '')
const isSelf = computed(() => !!currentUserId.value && currentUserId.value === userId.value)

const profile = ref<UserProfile | null>(null)
const loading = ref(true)
const notFound = ref(false)
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

const avatarAlt = computed(() => `${displayName.value} profile picture`)

onMounted(async () => {
  setHeader({ title: t('profile.userProfile') })

  // If user is viewing their own profile, redirect to /profile.
  if (isSelf.value) {
    router.replace('/profile')
    return
  }

  try {
    const {
      data: profileData,
      error: profileErr,
      response,
    } = await apiClient.GET('/v1/users/{userId}/profile', {
      params: { path: { userId: userId.value } },
    })
    if (profileErr) {
      if (response?.status === 404) {
        notFound.value = true
        return
      }
      throw new Error(getErrorMessage(profileErr, 'Failed to load profile'))
    }
    profile.value = profileData
    tournamentHistory.value = profile.value?.tournaments ?? []
    hidingBio.value = profileData?.privateBio ?? false
    hidingSports.value = profileData?.privateSports ?? false
    hidingTournaments.value = profileData?.privateTournaments ?? false
    hidingAchievements.value = profileData?.privateAchievements ?? false
  } catch (err: unknown) {
    console.error('Failed to load profile. userId:', userId.value, 'Error:', err)
    const msg = getErrorMessage(err, 'Failed to load profile')
    error.value = msg
    toast.error('Failed to load profile', msg)
  } finally {
    loading.value = false
  }
})

const primaryPicture = computed(() => {
  return profile.value?.pictures?.find((p) => p.isPrimary)?.url || ''
})

const moveToComparePage = () => {
  router.push(`/profile/compare/${userId.value}`)
}

function moveToReport() {
  router.push(`/report?userId=${userId.value}`)
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
    <!-- Loading skeleton -->
    <div v-if="loading" class="flex flex-col gap-6 px-5 py-6">
      <div class="flex justify-center">
        <div class="size-24 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div class="flex flex-col items-center gap-2">
        <div class="h-3 w-16 rounded bg-white/5 animate-pulse" />
        <div class="h-5 w-40 rounded bg-white/10 animate-pulse" />
      </div>
      <div v-for="n in 3" :key="n" class="bg-white/5 p-4 rounded-lg flex flex-col gap-3">
        <div class="h-3 w-24 rounded bg-white/10 animate-pulse" />
        <div class="h-4 w-full rounded bg-white/5 animate-pulse" />
        <div class="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
      </div>
    </div>

    <!-- 404 state -->
    <div
      v-else-if="notFound"
      class="flex flex-col items-center justify-center text-center px-6 py-16 gap-4"
    >
      <div class="size-16 rounded-full bg-white/5 flex items-center justify-center">
        <UIcon name="i-lucide-user-x" class="size-8 text-white/40" />
      </div>
      <div>
        <p class="text-white text-lg font-medium">User not found</p>
        <p class="text-white/50 text-sm mt-1">
          This profile may have been removed or the link is incorrect.
        </p>
      </div>
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="soft" @click="router.back()">
        Go back
      </UButton>
    </div>

    <!-- Hard error -->
    <div
      v-else-if="error && !profile"
      class="flex flex-col items-center justify-center text-center px-6 py-16 gap-4"
    >
      <div class="size-16 rounded-full bg-rose-500/15 flex items-center justify-center">
        <UIcon name="i-lucide-triangle-alert" class="size-8 text-rose-400" />
      </div>
      <div>
        <p class="text-white text-lg font-medium">Something went wrong</p>
        <p class="text-white/60 text-sm mt-1">{{ error }}</p>
      </div>
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="soft" @click="router.back()">
        Go back
      </UButton>
    </div>

    <div v-else-if="profile" class="flex flex-col gap-6 px-5 py-6">
      <!-- Profile Picture -->
      <div class="flex justify-center">
        <UAvatar :src="primaryPicture" :alt="avatarAlt" size="3xl" />
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
        <p v-if="hidingBio" class="text-white/50 italic">Bio is hidden</p>
        <p v-else-if="profile?.bio" class="text-white">{{ profile.bio }}</p>
        <p v-else class="text-white/50 text-sm italic">No bio yet.</p>
      </div>

      <!-- Favorite Sports -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-2">{{ t('profile.favoriteSports') }}</p>
        <p v-if="hidingSports" class="text-white/50 italic">Favorite sports are hidden</p>
        <div v-else class="flex flex-wrap gap-2">
          <UBadge
            v-for="sport in profile?.favoriteSports"
            :key="sport.id"
            color="primary"
            variant="soft"
          >
            {{ sport.icon }} {{ sport.name }}
          </UBadge>
          <p v-if="!profile?.favoriteSports?.length" class="text-white/50 text-sm italic">
            {{ t('profile.noSports') }}
          </p>
        </div>
      </div>

      <!-- Tournaments -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-2">{{ t('profile.tournaments') }}</p>
        <p v-if="hidingTournaments" class="text-white/50 italic">Tournament history is hidden</p>
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
                <span>
                  {{ tournament.sport?.icon || '' }}
                  {{ tournament.sport?.name || 'Unknown' }}
                </span>
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
          </div>
        </div>
        <p v-else class="text-white/50 text-sm italic">No tournaments played yet.</p>
      </div>

      <!-- Featured Achievements -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-2">Featured Achievements</p>
        <p v-if="hidingAchievements" class="text-white/50 italic">
          Featured achievements are hidden
        </p>
        <div v-else-if="profile?.featuredAchievements?.length" class="grid gap-2 sm:grid-cols-2">
          <div
            v-for="ua in profile.featuredAchievements"
            :key="ua.id ?? ua.achievement.id"
            class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3"
          >
            <UIcon name="i-lucide-award" class="text-primary" />
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ ua.achievement.name }}</p>
              <p class="text-xs text-white/50">{{ ua.achievement.description }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-white/50 text-sm italic">No featured achievements yet.</p>
      </div>

      <!-- Actions: Compare / Report / Block (hidden on self) -->
      <div v-if="!isSelf" class="flex justify-center gap-3 flex-wrap">
        <UButton
          icon="i-lucide-git-compare"
          color="primary"
          variant="soft"
          @click="moveToComparePage"
        >
          Compare Profiles
        </UButton>
        <UButton icon="i-lucide-flag" color="warning" variant="soft" @click="moveToReport">
          Report
        </UButton>
        <UserBlockButton v-if="userId" :user-id="userId" />
      </div>
    </div>
  </PageLayout>
</template>
