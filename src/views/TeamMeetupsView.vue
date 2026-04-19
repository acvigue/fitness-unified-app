<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import MeetupCard from '@/components/meetup/MeetupCard.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import { useMeetupStore } from '@/stores/meetup'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Team = components['schemas']['TeamResponseDto']
type MeetupStatus = components['schemas']['MeetupResponseDto']['status']

useHead({ title: 'Meetups' })

const route = useRoute()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()
const meetupStore = useMeetupStore()

const teamId = computed(() => route.params.id as string)
const team = ref<Team | null>(null)
const loadError = ref('')
const actionMessage = ref('')
const actionError = ref('')

const statusFilter = ref<'ALL' | MeetupStatus>('ALL')
const directionFilter = ref<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL')

const currentUserId = computed(() => {
  const user = authStore.user as { sub?: string } | null
  return user?.sub ?? ''
})
const isCaptain = computed(() => team.value?.captainId === currentUserId.value)

const meetups = computed(() => meetupStore.meetupsByTeam.get(teamId.value) ?? [])

const filtered = computed(() => {
  let list = meetups.value
  if (statusFilter.value !== 'ALL') {
    list = list.filter((m) => m.status === statusFilter.value)
  }
  if (directionFilter.value === 'INCOMING') {
    list = list.filter((m) => m.receivingTeamId === teamId.value)
  } else if (directionFilter.value === 'OUTGOING') {
    list = list.filter((m) => m.proposingTeamId === teamId.value)
  }
  return [...list].sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
  )
})

const statusOptions = [
  { label: 'All', value: 'ALL' as const },
  { label: 'Pending', value: 'PENDING' as const },
  { label: 'Accepted', value: 'ACCEPTED' as const },
  { label: 'Declined', value: 'DECLINED' as const },
  { label: 'Cancelled', value: 'CANCELLED' as const },
]

const directionOptions = [
  { label: 'All', value: 'ALL' as const },
  { label: 'Incoming', value: 'INCOMING' as const },
  { label: 'Outgoing', value: 'OUTGOING' as const },
]

async function loadTeam() {
  const { data, error } = await apiClient.GET('/v1/teams/{id}', {
    params: { path: { id: teamId.value } },
  })
  if (error) {
    loadError.value = getErrorMessage(error, 'Failed to load team')
    return
  }
  team.value = data
}

async function loadMeetups() {
  try {
    await meetupStore.fetchForTeam(teamId.value)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load meetups'
  }
}

onMounted(async () => {
  setHeader({ title: 'Meetups', backRoute: `/teams/${teamId.value}` })
  await Promise.all([loadTeam(), loadMeetups()])
  if (team.value) {
    setHeader({
      title: `${team.value.name} Meetups`,
      backRoute: `/teams/${teamId.value}`,
    })
  }
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
      <UAlert
        v-if="loadError"
        color="error"
        :title="loadError"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="loadError = ''"
      />
      <UAlert
        v-if="actionError"
        color="error"
        :title="actionError"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="actionError = ''"
      />
      <UAlert
        v-if="actionMessage"
        color="success"
        :title="actionMessage"
        icon="i-lucide-circle-check"
        :close="{ color: 'success', variant: 'link', icon: 'i-lucide-x' }"
        @close="actionMessage = ''"
      />

      <div class="flex flex-wrap gap-2 items-center">
        <USelectMenu
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          class="min-w-32"
        />
        <USelectMenu
          v-model="directionFilter"
          :items="directionOptions"
          value-key="value"
          class="min-w-32"
        />
        <p v-if="!isCaptain" class="text-xs text-white/50 ml-auto">
          <UIcon name="i-lucide-info" class="size-3 align-text-bottom" />
          Only captains can respond to proposals.
        </p>
      </div>

      <div v-if="meetupStore.loading && !meetups.length" class="flex justify-center p-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
      </div>

      <div
        v-else-if="!filtered.length"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        No meetups matching your filters.
      </div>

      <div v-else class="flex flex-col gap-3">
        <MeetupCard
          v-for="m in filtered"
          :key="m.id"
          :meetup="m"
          :team-id="teamId"
          :is-captain="isCaptain"
          @success="(msg) => (actionMessage = msg)"
          @error="(msg) => (actionError = msg)"
        />
      </div>
    </section>
  </PageLayout>
</template>
