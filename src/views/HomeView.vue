<template>
  <PageLayout>
    <section class="flex flex-col gap-6 px-5 py-6">
      <!-- Coming up -->
      <div class="rounded-lg border border-white/10 bg-white/5 p-5 flex flex-col gap-4">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-calendar-clock" class="size-5 text-primary-400" />
            <h2 class="text-base font-semibold">Coming up</h2>
          </div>
          <UButton
            v-if="comingUpItems.length > 0"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-compass"
            @click="openGuide"
          >
            Guide
          </UButton>
        </div>

        <div v-if="comingUpLoading" class="flex flex-col gap-2">
          <div class="h-12 rounded-md border border-white/10 bg-white/5 animate-pulse" />
          <div class="h-12 rounded-md border border-white/10 bg-white/5 animate-pulse" />
        </div>

        <div
          v-else-if="comingUpItems.length === 0"
          class="flex flex-col items-center gap-2 text-center"
        >
          <UIcon name="i-lucide-coffee" class="size-7 text-white/40" />
          <p class="text-sm font-medium">Nothing on your plate</p>
          <p class="text-xs text-white/60 max-w-sm">
            Join a team or browse tournaments to get going.
          </p>
          <div class="flex gap-2 pt-1">
            <UButton size="sm" variant="soft" icon="i-lucide-trophy" @click="goToTournaments">
              Tournaments
            </UButton>
            <UButton size="sm" variant="soft" icon="i-lucide-compass" @click="openGuide">
              Guide
            </UButton>
          </div>
        </div>

        <ul v-else class="flex flex-col divide-y divide-white/5">
          <li
            v-for="item in comingUpItems"
            :key="item.key"
            class="flex items-center gap-3 py-2 cursor-pointer rounded-md transition hover:bg-white/5 px-2 -mx-2"
            role="button"
            tabindex="0"
            @click="item.go()"
            @keydown.enter="item.go()"
            @keydown.space.prevent="item.go()"
          >
            <UIcon :name="item.icon" class="size-5 shrink-0" :class="item.iconClass" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ item.title }}</p>
              <p class="text-xs text-white/60 truncate">{{ item.subtitle }}</p>
            </div>
            <UBadge v-if="item.badge" :color="item.badgeColor" variant="soft" size="xs">
              {{ item.badge }}
            </UBadge>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-white/30 shrink-0" />
          </li>
        </ul>
      </div>

      <!-- Activity feed empty state -->
      <div
        class="rounded-lg border border-white/10 bg-white/5 p-8 text-center flex flex-col items-center gap-3"
      >
        <UIcon name="i-lucide-activity" class="size-8 text-white/40" />
        <p class="text-sm font-medium">No activity yet</p>
        <p class="text-xs text-white/60 max-w-sm">
          Follow friends or join a team to see their workouts and tournaments here.
        </p>
      </div>

      <!-- Workouts empty state -->
      <div
        class="rounded-lg border border-white/10 bg-white/5 p-8 text-center flex flex-col items-center gap-3"
      >
        <UIcon name="i-lucide-dumbbell" class="size-8 text-white/40" />
        <p class="text-sm font-medium">No workouts logged</p>
        <p class="text-xs text-white/60 max-w-sm">Log your first workout to get started.</p>
        <UButton
          size="sm"
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          @click="openWorkouts"
        >
          Go to workouts
        </UButton>
      </div>
    </section>
  </PageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useHomeTour } from '@/composables/useHomeTour'
import { apiClient } from '@/lib/api/client'
import type { components } from '@/types/api'

import { useI18n } from 'vue-i18n'
const { t } = useI18n()

type Tournament = components['schemas']['TournamentResponseDto']
type TeamInvitation = components['schemas']['TeamInvitationResponseDto']

type ComingUpItem = {
  key: string
  icon: string
  iconClass: string
  title: string
  subtitle: string
  sortAt: number
  badge?: string
  badgeColor?: 'primary' | 'info' | 'success' | 'warning' | 'neutral'
  go: () => void
}

const homeTour = useHomeTour()

useHead({
  title: t('home.home'),
})

const router = useRouter()
const { setHeader } = usePageHeader()

const upcomingTournaments = ref<Tournament[]>([])
const openTournamentsList = ref<Tournament[]>([])
const teamInvitations = ref<TeamInvitation[]>([])
const comingUpLoading = ref(true)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

const comingUpItems = computed<ComingUpItem[]>(() => {
  const items: ComingUpItem[] = []

  for (const inv of teamInvitations.value) {
    if (inv.status !== 'PENDING' || inv.type !== 'INVITE') continue
    items.push({
      key: `invite-${inv.id}`,
      icon: 'i-lucide-mail',
      iconClass: 'text-primary-400',
      title: 'Team invitation',
      subtitle: 'Tap to review and respond',
      sortAt: new Date(inv.createdAt).getTime(),
      badge: 'Action',
      badgeColor: 'primary',
      go: () => router.push(`/teams/${inv.teamId}`),
    })
  }

  const seen = new Set<string>()
  for (const tournament of [...upcomingTournaments.value, ...openTournamentsList.value]) {
    if (seen.has(tournament.id)) continue
    seen.add(tournament.id)
    const isOpen = tournament.status === 'OPEN'
    items.push({
      key: `tournament-${tournament.id}`,
      icon: 'i-lucide-trophy',
      iconClass: isOpen ? 'text-emerald-400' : 'text-info-400',
      title: tournament.name,
      subtitle: `${tournament.sport?.name ?? 'Tournament'} • ${formatDate(tournament.startDate)}`,
      sortAt: new Date(tournament.startDate).getTime(),
      badge: isOpen ? 'Open' : 'Upcoming',
      badgeColor: isOpen ? 'success' : 'info',
      go: () => router.push(`/tournaments/${tournament.id}`),
    })
  }

  return items.sort((a, b) => a.sortAt - b.sortAt).slice(0, 6)
})

async function loadComingUp() {
  comingUpLoading.value = true
  const [invitesRes, upcomingRes, openRes] = await Promise.all([
    apiClient.GET('/v1/teams/invitations/mine'),
    apiClient.GET('/v1/tournaments', { params: { query: { status: 'UPCOMING', per_page: 5 } } }),
    apiClient.GET('/v1/tournaments', { params: { query: { status: 'OPEN', per_page: 5 } } }),
  ])
  if (invitesRes.data) teamInvitations.value = invitesRes.data
  if (upcomingRes.data) upcomingTournaments.value = upcomingRes.data.data
  if (openRes.data) openTournamentsList.value = openRes.data.data
  comingUpLoading.value = false
}

const openWorkouts = () => {
  router.push('/workouts')
}
const goToTournaments = () => {
  router.push('/tournaments')
}
const openGuide = () => {
  homeTour.start()
}

onMounted(() => {
  setHeader({
    title: 'Home',
  })

  loadComingUp()
})
</script>
