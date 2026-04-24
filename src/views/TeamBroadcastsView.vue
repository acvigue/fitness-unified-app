<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useBroadcastStore } from '@/stores/broadcasts'
import { useAuthStore } from '@/stores/auth/auth'
import { useToastStore } from '@/stores/toast'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Team = components['schemas']['TeamResponseDto']

useHead({ title: 'Broadcasts' })

const route = useRoute()
const { setHeader } = usePageHeader()
const broadcastStore = useBroadcastStore()
const authStore = useAuthStore()
const toast = useToastStore()

const teamId = computed(() => route.params.id as string)
const team = ref<Team | null>(null)
const composing = ref(false)
const composeBody = ref('')
const sending = ref(false)

const broadcasts = computed(() => broadcastStore.byTeam.get(teamId.value) ?? [])
const isCaptain = computed(() => !!team.value && team.value.captainId === authStore.user?.sub)

async function loadTeam() {
  const { data, error: err } = await apiClient.GET('/v1/teams/{id}', {
    params: { path: { id: teamId.value } },
  })
  if (err) {
    toast.error('Could not load team', getErrorMessage(err, 'Failed to load team'))
    return
  }
  team.value = data
}

async function load() {
  await Promise.all([loadTeam(), broadcastStore.loadForTeam(teamId.value)])
  // Mark broadcasts as read as the user views them
  for (const b of broadcasts.value) {
    broadcastStore.markRead(b.id).catch(() => undefined)
  }
}

async function send() {
  if (!composeBody.value.trim()) return
  sending.value = true
  try {
    await broadcastStore.send(teamId.value, composeBody.value.trim())
    toast.success('Broadcast sent')
    composeBody.value = ''
    composing.value = false
  } catch (e) {
    toast.error('Could not send broadcast', (e as Error).message)
  } finally {
    sending.value = false
  }
}

async function refreshStats(broadcastId: string) {
  await broadcastStore.loadStats(broadcastId)
}

onMounted(() => {
  setHeader({ title: 'Broadcasts', backRoute: `/teams/${teamId.value}` })
  load()
})
watch(teamId, load)
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
      <UCard v-if="isCaptain" class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">Send broadcast</p>
              <p class="text-sm text-white/60">Reaches every team member as a notification.</p>
            </div>
            <UButton
              v-if="!composing"
              size="sm"
              color="primary"
              icon="i-lucide-megaphone"
              @click="composing = true"
            >
              Compose
            </UButton>
          </div>

          <template v-if="composing">
            <UTextarea
              v-model="composeBody"
              placeholder="Practice at 6pm tonight!"
              :rows="4"
              :maxlength="2000"
              autoresize
            />
            <div class="flex items-center justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="composing = false">
                Cancel
              </UButton>
              <UButton
                color="primary"
                :loading="sending"
                :disabled="!composeBody.trim()"
                @click="send"
              >
                Send
              </UButton>
            </div>
          </template>
        </div>
      </UCard>

      <div v-if="broadcastStore.loading" class="flex justify-center p-6">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
      </div>

      <div
        v-else-if="broadcasts.length === 0"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        No broadcasts yet.
      </div>

      <div v-else class="flex flex-col gap-3">
        <article
          v-for="b in broadcasts"
          :key="b.id"
          class="rounded-lg border border-white/10 bg-white/5 p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <p class="whitespace-pre-wrap text-sm">{{ b.content }}</p>
              <p class="mt-2 text-xs text-white/50">
                {{ new Date(b.createdAt).toLocaleString() }}
              </p>
            </div>
          </div>

          <div v-if="isCaptain" class="mt-3 flex items-center gap-2">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-bar-chart-3"
              @click="refreshStats(b.id)"
            >
              Read stats
            </UButton>
            <span v-if="broadcastStore.stats.get(b.id)" class="text-xs text-white/60">
              {{ broadcastStore.stats.get(b.id)!.read }} /
              {{ broadcastStore.stats.get(b.id)!.total }} read
            </span>
          </div>
        </article>
      </div>
    </section>
  </PageLayout>
</template>
