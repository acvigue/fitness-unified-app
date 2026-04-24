<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useAuthStore } from '@/stores/auth/auth'
import type { components } from '@/types/api'

type Comparison = components['schemas']['ProfileComparisonResponseDto']
type Profile = components['schemas']['UserProfileResponseDto']

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()

const comparison = ref<Comparison | null>(null)
const loading = ref(true)
const error = ref('')

const otherUserId = computed(() => route.params.userId as string)
const myUserId = computed(() => authStore.user?.sub ?? '')

function displayName(p: Profile | null | undefined) {
  if (!p) return 'User'
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ')
  return name || 'User'
}

function primaryPicture(p: Profile | null | undefined) {
  return p?.pictures?.find((pic) => pic.isPrimary)?.url ?? ''
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function load() {
  if (!myUserId.value || !otherUserId.value) return
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/users/compare', {
      params: { query: { a: myUserId.value, b: otherUserId.value } },
    })
    if (err) throw new Error(getErrorMessage(err, 'Failed to load comparison'))
    comparison.value = data
  } catch (e) {
    error.value = (e as Error).message
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  setHeader({
    title: t('profile.profile'),
    actions: [{ icon: 'i-lucide-trophy', onClick: () => router.push('/achievements') }],
  })
  load()
})

watch(otherUserId, load)
</script>

<template>
  <PageLayout>
    <div v-if="loading" class="flex justify-center p-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
    </div>
    <div v-else-if="error" class="text-red-500 p-4">
      {{ error }}
    </div>
    <div v-else-if="comparison" class="flex flex-col md:flex-row gap-10 px-5 py-6">
      <template v-for="side in ['a', 'b'] as const" :key="side">
        <div class="flex flex-col md:w-1/2 gap-6">
          <div class="flex justify-center">
            <UAvatar :src="primaryPicture(comparison[side].profile)" alt="Profile" size="3xl" />
          </div>

          <div class="text-center">
            <p class="text-white text-lg font-medium">
              {{ displayName(comparison[side].profile) }}
            </p>
            <p class="text-xs text-white/50">{{ side === 'a' ? 'You' : 'Them' }}</p>
          </div>

          <div class="grid grid-cols-4 gap-2 text-center">
            <div class="rounded-lg bg-white/5 p-3">
              <p class="text-white/60 text-xs">Tournaments</p>
              <p class="text-white font-semibold">{{ comparison[side].stats.tournamentCount }}</p>
            </div>
            <div class="rounded-lg bg-white/5 p-3">
              <p class="text-white/60 text-xs">Achievements</p>
              <p class="text-white font-semibold">{{ comparison[side].stats.achievementCount }}</p>
            </div>
            <div class="rounded-lg bg-white/5 p-3">
              <p class="text-white/60 text-xs">Featured</p>
              <p class="text-white font-semibold">
                {{ comparison[side].stats.featuredAchievementCount }}
              </p>
            </div>
            <div class="rounded-lg bg-white/5 p-3">
              <p class="text-white/60 text-xs">Sports</p>
              <p class="text-white font-semibold">
                {{ comparison[side].stats.favoriteSportsCount }}
              </p>
            </div>
          </div>

          <div class="bg-white/5 p-4 rounded-lg">
            <p class="text-white/70 text-sm mb-1">{{ t('profile.bio') }}</p>
            <p v-if="comparison[side].profile.bio === null" class="text-white/50 italic">
              Bio is hidden
            </p>
            <p v-else class="text-white">
              {{ comparison[side].profile.bio || t('profile.noBio') }}
            </p>
          </div>

          <div class="bg-white/5 p-4 rounded-lg">
            <p class="text-white/70 text-sm mb-2">{{ t('profile.favoriteSports') }}</p>
            <p
              v-if="
                comparison[side].profile.favoriteSports.length === 0 &&
                comparison[side].stats.favoriteSportsCount === 0 &&
                side === 'b'
              "
              class="text-white/50 italic"
            >
              Favorite sports may be hidden
            </p>
            <div v-else class="flex flex-wrap gap-2">
              <UBadge
                v-for="sport in comparison[side].profile.favoriteSports"
                :key="sport.id"
                color="primary"
                variant="soft"
              >
                {{ sport.icon }} {{ sport.name }}
              </UBadge>
              <p
                v-if="!comparison[side].profile.favoriteSports?.length"
                class="text-white/50 text-sm"
              >
                {{ t('profile.noSports') }}
              </p>
            </div>
          </div>

          <div class="bg-white/5 p-4 rounded-lg">
            <p class="text-white/70 text-sm">{{ t('profile.tournaments') }}</p>
            <div
              v-if="comparison[side].profile.tournaments.length > 0"
              class="grid gap-3 mt-2 sm:grid-cols-2"
            >
              <button
                v-for="tournament in comparison[side].profile.tournaments"
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
              </button>
            </div>
            <p v-else class="text-white/50 text-sm mt-2">None played yet.</p>
          </div>

          <div class="bg-white/5 p-4 rounded-lg">
            <p class="text-white/70 text-sm mb-2">Featured Achievements</p>
            <div
              v-if="comparison[side].profile.featuredAchievements?.length"
              class="grid gap-2 sm:grid-cols-2"
            >
              <div
                v-for="ua in comparison[side].profile.featuredAchievements"
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
            <p v-else class="text-white/50 text-sm">No featured achievements.</p>
          </div>
        </div>
      </template>
    </div>
  </PageLayout>
</template>
