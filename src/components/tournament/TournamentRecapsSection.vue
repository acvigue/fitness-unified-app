<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type Recap = components['schemas']['TournamentRecapResponseDto']

const props = defineProps<{
  tournamentId: string
  isCompleted: boolean
  canManage: boolean
}>()

const router = useRouter()
const toast = useToastStore()

const recaps = ref<Recap[]>([])
const loading = ref(true)
const error = ref('')
const videoId = ref('')
const linking = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/tournaments/{id}/recaps', {
      params: { path: { id: props.tournamentId } },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load recaps')
      return
    }
    recaps.value = data
  } finally {
    loading.value = false
  }
}

async function addRecap() {
  if (!videoId.value.trim()) return
  linking.value = true
  try {
    const { error: err } = await apiClient.POST('/v1/tournaments/{id}/recaps', {
      params: { path: { id: props.tournamentId } },
      body: { videoId: videoId.value.trim() },
    })
    if (err) {
      toast.error('Could not link recap', getErrorMessage(err, 'Failed to link recap'))
      return
    }
    videoId.value = ''
    toast.success('Recap linked')
    await load()
  } finally {
    linking.value = false
  }
}

async function removeRecap(recapId: string) {
  const { error: err } = await apiClient.DELETE('/v1/tournaments/{id}/recaps/{recapId}', {
    params: { path: { id: props.tournamentId, recapId } },
  })
  if (err) {
    toast.error('Could not remove recap', getErrorMessage(err, 'Failed to remove recap'))
    return
  }
  recaps.value = recaps.value.filter((r) => r.id !== recapId)
}

onMounted(load)
watch(() => props.tournamentId, load)
</script>

<template>
  <UCard class="bg-white/5">
    <div class="flex flex-col gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-white/60">Recap videos</p>
        <p class="text-sm text-white/60">Highlights from this tournament.</p>
      </div>

      <div v-if="loading" class="flex justify-center p-4">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
      </div>

      <UAlert v-else-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <div
        v-else-if="recaps.length === 0"
        class="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-white/50"
      >
        No recap videos available yet.
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="recap in recaps"
          :key="recap.id"
          class="group relative rounded-lg border border-white/10 bg-white/5 p-3"
        >
          <button
            type="button"
            class="flex w-full flex-col gap-2 text-left"
            @click="router.push(`/videos/${recap.video.id}`)"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-video" class="text-primary" />
              <p class="text-sm font-medium truncate">{{ recap.video.name }}</p>
            </div>
            <p v-if="recap.video.description" class="text-xs text-white/50 line-clamp-2">
              {{ recap.video.description }}
            </p>
          </button>
          <UButton
            v-if="canManage"
            size="xs"
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
            @click="removeRecap(recap.id)"
          />
        </div>
      </div>

      <div
        v-if="canManage && isCompleted"
        class="flex flex-col gap-2 sm:flex-row sm:items-end rounded-lg border border-white/10 p-3"
      >
        <UFormField label="Link existing video" class="flex-1">
          <UInput v-model="videoId" placeholder="Video ID" />
        </UFormField>
        <UButton
          icon="i-lucide-link"
          :loading="linking"
          :disabled="!videoId.trim()"
          @click="addRecap"
        >
          Link recap
        </UButton>
      </div>

      <p
        v-else-if="canManage && !isCompleted"
        class="text-xs text-white/40 text-center"
      >
        Recaps can be linked after the tournament is completed.
      </p>
    </div>
  </UCard>
</template>
