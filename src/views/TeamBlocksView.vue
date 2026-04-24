<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import TeamPickerModal from '@/components/team-block/TeamPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import { useTeamBlockStore } from '@/stores/teamBlock'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Team = components['schemas']['TeamResponseDto']

useHead({ title: 'Blocked Teams' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()
const blockStore = useTeamBlockStore()

const teamId = computed(() => route.params.id as string)
const team = ref<Team | null>(null)
const loadError = ref('')
const actionMessage = ref('')
const actionError = ref('')
const pickerOpen = ref(false)
const pendingBlockId = ref<string | null>(null)

const currentUserId = computed(() => {
  const user = authStore.user as { sub?: string } | null
  return user?.sub ?? ''
})

const blocks = computed(() => blockStore.blocksByTeam.get(teamId.value) ?? [])
const blockedTeamIdSet = computed(() => blocks.value.map((b) => b.blockedTeamId))

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

async function loadTeam() {
  const { data, error } = await apiClient.GET('/v1/teams/{id}', {
    params: { path: { id: teamId.value } },
  })
  if (error) {
    loadError.value = getErrorMessage(error, 'Failed to load team')
    return
  }
  team.value = data
  if (data.captainId !== currentUserId.value) {
    loadError.value = 'Only the team captain can manage blocked teams.'
  }
}

async function loadBlocks() {
  try {
    await blockStore.fetchForTeam(teamId.value)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load blocked teams'
  }
}

async function handleBlock(selected: Team) {
  pickerOpen.value = false
  pendingBlockId.value = selected.id
  actionError.value = ''
  actionMessage.value = ''
  try {
    await blockStore.block(teamId.value, selected.id)
    actionMessage.value = `${selected.name} has been blocked.`
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Failed to block team'
  } finally {
    pendingBlockId.value = null
  }
}

async function handleUnblock(blockedTeamId: string, name: string) {
  if (!window.confirm(`Unblock ${name}? They will be able to message your team again.`)) return
  pendingBlockId.value = blockedTeamId
  actionError.value = ''
  actionMessage.value = ''
  try {
    await blockStore.unblock(teamId.value, blockedTeamId)
    actionMessage.value = `${name} has been unblocked.`
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Failed to unblock team'
  } finally {
    pendingBlockId.value = null
  }
}

onMounted(async () => {
  setHeader({ title: 'Blocked Teams', backRoute: `/teams/${teamId.value}` })
  await loadTeam()
  if (!loadError.value) {
    await loadBlocks()
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

      <div class="flex items-start justify-between gap-3">
        <p class="text-sm text-white/60">
          Blocked teams cannot start new chats with {{ team?.name || 'your team' }} or send
          messages.
        </p>
        <UButton icon="i-lucide-shield-ban" size="sm" @click="pickerOpen = true">
          Block Team
        </UButton>
      </div>

      <div v-if="blockStore.loading && !blocks.length" class="flex justify-center p-8">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
      </div>

      <div
        v-else-if="!blocks.length"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        No teams are currently blocked.
      </div>

      <UCard v-else class="bg-white/5">
        <div class="flex flex-col gap-2">
          <div
            v-for="b in blocks"
            :key="b.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"
          >
            <div class="min-w-0">
              <button
                class="text-sm font-medium truncate hover:text-primary transition-colors"
                @click="router.push(`/teams/${b.blockedTeamId}`)"
              >
                {{ b.blockedTeamName }}
              </button>
              <p class="text-xs text-white/50">Blocked {{ formatRelative(b.createdAt) }}</p>
            </div>
            <UButton
              size="xs"
              color="error"
              variant="soft"
              :loading="pendingBlockId === b.blockedTeamId"
              :disabled="!!pendingBlockId"
              @click="handleUnblock(b.blockedTeamId, b.blockedTeamName)"
            >
              Unblock
            </UButton>
          </div>
        </div>
      </UCard>
    </section>

    <TeamPickerModal
      v-model:open="pickerOpen"
      title="Block a Team"
      confirm-label="Block"
      :exclude-team-ids="[teamId, ...blockedTeamIdSet]"
      @select="handleBlock"
    />
  </PageLayout>
</template>
