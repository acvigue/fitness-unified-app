<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import UserPickerModal from '@/components/user/UserPickerModal.vue'
import UserLink from '@/components/UserLink.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useAuthStore } from '@/stores/auth/auth'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type Comparison = components['schemas']['ProfileComparisonResponseDto']
type Profile = components['schemas']['UserProfileResponseDto']

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()
const toast = useToastStore()

const comparison = ref<Comparison | null>(null)
const loading = ref(false)
const error = ref('')
const notFound = ref(false)
const pickerOpen = ref(false)

const otherUserId = computed(() => (route.params.userId as string) || '')
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
  notFound.value = false
  try {
    const {
      data,
      error: err,
      response,
    } = await apiClient.GET('/v1/users/compare', {
      params: { query: { a: myUserId.value, b: otherUserId.value } },
    })
    if (err) {
      if (response?.status === 404) {
        notFound.value = true
        return
      }
      throw new Error(getErrorMessage(err, 'Failed to load comparison'))
    }
    comparison.value = data
  } catch (e) {
    const msg = getErrorMessage(e, 'Failed to load comparison')
    error.value = msg
    toast.error('Failed to load comparison', msg)
    console.error(e)
  } finally {
    loading.value = false
  }
}

function onUserSelected(user: { id: string }) {
  pickerOpen.value = false
  router.replace(`/profile/compare/${user.id}`)
}

onMounted(() => {
  setHeader({
    title: t('profile.profile'),
    actions: [
      {
        icon: 'i-lucide-user-search',
        onClick: () => (pickerOpen.value = true),
      },
    ],
  })
  if (otherUserId.value) {
    load()
  } else {
    // No user to compare with yet — open picker.
    pickerOpen.value = true
  }
})

watch(otherUserId, (v) => {
  if (v) load()
})
</script>

<template>
  <PageLayout>
    <!-- No user selected yet -->
    <div
      v-if="!otherUserId"
      class="flex flex-col items-center justify-center text-center px-6 py-16 gap-4"
    >
      <div class="size-16 rounded-full bg-white/5 flex items-center justify-center">
        <UIcon name="i-lucide-git-compare" class="size-8 text-white/40" />
      </div>
      <div>
        <p class="text-white text-lg font-medium">Compare profiles</p>
        <p class="text-white/50 text-sm mt-1 max-w-sm">
          Pick a user to see how your stats, tournaments, and achievements stack up against theirs.
        </p>
      </div>
      <UButton
        icon="i-lucide-user-search"
        color="primary"
        variant="soft"
        @click="pickerOpen = true"
      >
        Choose a user
      </UButton>
    </div>

    <!-- Loading skeletons -->
    <div v-else-if="loading" class="flex flex-col md:flex-row gap-10 px-5 py-6">
      <div v-for="side in 2" :key="side" class="flex flex-col md:w-1/2 gap-6">
        <div class="flex justify-center">
          <div class="size-24 rounded-full bg-white/5 animate-pulse" />
        </div>
        <div class="flex justify-center">
          <div class="h-5 w-32 rounded bg-white/10 animate-pulse" />
        </div>
        <div class="grid grid-cols-4 gap-2">
          <div v-for="n in 4" :key="n" class="h-14 rounded-lg bg-white/5 animate-pulse" />
        </div>
        <div v-for="n in 3" :key="n" class="h-24 rounded-lg bg-white/5 animate-pulse" />
      </div>
    </div>

    <!-- 404 for the other user -->
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
          We couldn't find the user you tried to compare with.
        </p>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-arrow-left" color="neutral" variant="soft" @click="router.back()">
          Go back
        </UButton>
        <UButton
          icon="i-lucide-user-search"
          color="primary"
          variant="soft"
          @click="pickerOpen = true"
        >
          Pick another
        </UButton>
      </div>
    </div>

    <!-- Hard error -->
    <div
      v-else-if="error && !comparison"
      class="flex flex-col items-center justify-center text-center px-6 py-16 gap-4"
    >
      <div class="size-16 rounded-full bg-rose-500/15 flex items-center justify-center">
        <UIcon name="i-lucide-triangle-alert" class="size-8 text-rose-400" />
      </div>
      <div>
        <p class="text-white text-lg font-medium">Something went wrong</p>
        <p class="text-white/60 text-sm mt-1">{{ error }}</p>
      </div>
      <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="load">
        Try again
      </UButton>
    </div>

    <!-- Comparison -->
    <div v-else-if="comparison" class="flex flex-col gap-4 px-5 py-6">
      <!-- Swap / change target -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <p class="text-white/60 text-sm">
          Comparing with
          <UserLink :user-id="otherUserId" />
        </p>
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          icon="i-lucide-user-search"
          @click="pickerOpen = true"
        >
          Change user
        </UButton>
      </div>

      <div class="flex flex-col md:flex-row gap-10">
        <template v-for="side in ['a', 'b'] as const" :key="side">
          <div class="flex flex-col md:w-1/2 gap-6">
            <div class="flex justify-center">
              <UAvatar
                :src="primaryPicture(comparison[side].profile)"
                :alt="`${displayName(comparison[side].profile)} profile picture`"
                size="3xl"
              />
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
                <p class="text-white font-semibold">
                  {{ comparison[side].stats.tournamentCount }}
                </p>
              </div>
              <div class="rounded-lg bg-white/5 p-3">
                <p class="text-white/60 text-xs">Achievements</p>
                <p class="text-white font-semibold">
                  {{ comparison[side].stats.achievementCount }}
                </p>
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
              <p v-else-if="comparison[side].profile.bio" class="text-white">
                {{ comparison[side].profile.bio }}
              </p>
              <p v-else class="text-white/50 text-sm italic">No bio yet.</p>
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
                  class="text-white/50 text-sm italic"
                >
                  {{ t('profile.noSports') }}
                </p>
              </div>
            </div>

            <div class="bg-white/5 p-4 rounded-lg">
              <p class="text-white/70 text-sm mb-2">{{ t('profile.tournaments') }}</p>
              <div
                v-if="comparison[side].profile.tournaments.length > 0"
                class="grid gap-3 sm:grid-cols-2"
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
              <p v-else class="text-white/50 text-sm italic">No tournaments played yet.</p>
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
              <p v-else class="text-white/50 text-sm italic">No featured achievements yet.</p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <UserPickerModal
      v-model:open="pickerOpen"
      title="Compare with..."
      description="Pick a user to compare your stats, tournaments, and achievements against."
      confirm-label="Compare"
      :exclude-user-ids="myUserId ? [myUserId] : []"
      @select="onUserSelected"
    />
  </PageLayout>
</template>
