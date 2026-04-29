<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import TeamChatSearchModal from '@/components/team-chat/TeamChatSearchModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useTeamChatStore } from '@/stores/teamChat'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Team = components['schemas']['TeamResponseDto']

useHead({ title: 'Team Conversations' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const teamChatStore = useTeamChatStore()

const teamId = computed(() => route.params.id as string)
const team = ref<Team | null>(null)
const teamNamesById = ref<Map<string, string>>(new Map())
const loadError = ref('')
const actionError = ref('')
const pickerOpen = ref(false)

const chats = computed(() => teamChatStore.chatsByTeam.get(teamId.value) ?? [])

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

async function loadAllTeamNames() {
  const { data, error } = await apiClient.GET('/v1/teams')
  if (error) return
  for (const t of data?.data ?? []) {
    teamNamesById.value.set(t.id, t.name)
  }
}

function otherTeamId(chat: components['schemas']['TeamChatResponseDto']) {
  return chat.team1Id === teamId.value ? chat.team2Id : chat.team1Id
}

function otherTeamName(chat: components['schemas']['TeamChatResponseDto']) {
  const id = otherTeamId(chat)
  return teamNamesById.value.get(id) ?? 'Other Team'
}

async function loadChats() {
  try {
    await teamChatStore.fetchForTeam(teamId.value)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load team chats'
  }
}

onMounted(async () => {
  setHeader({ title: 'Team Conversations', backRoute: `/teams/${teamId.value}` })
  await Promise.all([loadTeam(), loadAllTeamNames(), loadChats()])
  if (team.value) {
    setHeader({
      title: `${team.value.name} Chats`,
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

      <div class="flex items-start justify-between gap-3">
        <p class="text-sm text-white/60">
          Conversations between {{ team?.name || 'your team' }} and other teams.
        </p>
        <UButton icon="i-lucide-plus" size="sm" @click="pickerOpen = true">Message Team</UButton>
      </div>

      <div v-if="teamChatStore.loading && !chats.length" class="flex justify-center p-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
      </div>

      <div
        v-else-if="!chats.length"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        No team conversations yet. Tap "Message Team" to start one.
      </div>

      <UCard v-else class="bg-white/5">
        <div class="flex flex-col gap-2">
          <button
            v-for="chat in chats"
            :key="chat.id"
            type="button"
            class="flex items-center gap-3 rounded-lg border border-white/10 p-3 text-left transition hover:bg-white/5"
            @click="router.push(`/teams/${teamId}/chats/${chat.id}`)"
          >
            <UAvatar icon="i-lucide-users" size="md" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ otherTeamName(chat) }}</p>
              <p class="text-xs text-white/50">{{ chat.members.length }} members</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="text-white/30 size-4" />
          </button>
        </div>
      </UCard>
    </section>

    <TeamChatSearchModal
      v-model:open="pickerOpen"
      :from-team-id="teamId"
      :exclude-team-ids="chats.map(otherTeamId)"
      @error="(msg) => (actionError = msg)"
    />
  </PageLayout>
</template>
