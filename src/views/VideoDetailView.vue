<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import UserLink from '@/components/UserLink.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import { useToastStore } from '@/stores/toast'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Video = components['schemas']['VideoResponseDto']
type Progress = components['schemas']['VideoProgressResponseDto']

useHead({ title: 'Video' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()
const toast = useToastStore()

const video = ref<Video | null>(null)
const progress = ref<Progress | null>(null)
const loading = ref(true)
const error = ref('')

const videoPlayer = ref<HTMLVideoElement | null>(null)
const confirmDeleteOpen = ref(false)
const deleting = ref(false)

const videoId = computed(() => route.params.id as string)
const currentUserId = computed(() => authStore.user?.sub ?? '')
const isUploader = computed(
  () => !!video.value && !!currentUserId.value && video.value.uploaderId === currentUserId.value,
)

function applyHeader() {
  const actions = []
  if (isUploader.value && video.value) {
    actions.push({
      icon: 'i-lucide-pencil',
      label: 'Edit video',
      onClick: () => router.push(`/videos/${videoId.value}/edit`),
    })
    actions.push({
      icon: 'i-lucide-trash-2',
      label: 'Delete video',
      onClick: () => (confirmDeleteOpen.value = true),
    })
  }
  setHeader({
    title: video.value?.name ?? 'Video',
    backRoute: '/videos',
    actions,
  })
}

async function loadVideo() {
  loading.value = true
  error.value = ''
  try {
    const [videoRes, progressRes] = await Promise.all([
      apiClient.GET('/v1/videos/{id}', { params: { path: { id: videoId.value } } }),
      apiClient.GET('/v1/videos/{id}/progress', { params: { path: { id: videoId.value } } }),
    ])
    if (videoRes.error) {
      error.value = getErrorMessage(videoRes.error, 'Failed to load video')
      return
    }
    video.value = videoRes.data
    progress.value = progressRes.data ?? null

    applyHeader()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load video'
  } finally {
    loading.value = false
  }
}

async function deleteVideo() {
  if (!video.value) return
  deleting.value = true
  try {
    const { error: err } = await apiClient.DELETE('/v1/videos/{id}', {
      params: { path: { id: videoId.value } },
    })
    if (err) {
      toast.error('Failed to delete video', getErrorMessage(err, 'Please try again'))
      return
    }
    toast.success('Video deleted')
    confirmDeleteOpen.value = false
    router.push('/videos')
  } catch (e) {
    toast.error('Failed to delete video', e instanceof Error ? e.message : 'Please try again')
  } finally {
    deleting.value = false
  }
}

// Throttle progress updates
let lastSent = 0
const THROTTLE_MS = 10_000

async function reportProgress(positionSeconds: number, completed = false) {
  try {
    const { data } = await apiClient.POST('/v1/videos/{id}/progress', {
      params: { path: { id: videoId.value } },
      body: { positionSeconds: Math.floor(positionSeconds), completed },
    })
    if (data) progress.value = data
  } catch (e) {
    console.warn('Failed to update video progress', e)
  }
}

function onTimeUpdate() {
  const el = videoPlayer.value
  if (!el) return
  const now = Date.now()
  if (now - lastSent < THROTTLE_MS) return
  lastSent = now
  reportProgress(el.currentTime)
}

function onEnded() {
  const el = videoPlayer.value
  if (!el) return
  reportProgress(el.currentTime, true)
}

function onLoadedMetadata() {
  const el = videoPlayer.value
  if (!el || !progress.value?.positionSeconds) return
  if (progress.value.completed) return
  el.currentTime = progress.value.positionSeconds
}

onMounted(() => {
  setHeader({ title: 'Video', backRoute: '/videos' })
  loadVideo()
})

onUnmounted(() => {
  const el = videoPlayer.value
  if (el && el.currentTime > 0) {
    reportProgress(el.currentTime).catch(() => undefined)
  }
})
</script>

<template>
  <PageLayout>
    <div v-if="loading" class="flex justify-center p-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
    </div>

    <div v-else-if="error" class="p-5">
      <UAlert color="error" :title="error" icon="i-lucide-circle-alert" />
    </div>

    <section v-else-if="video" class="flex flex-col gap-5 px-5 py-6">
      <div class="overflow-hidden rounded-lg border border-white/10 bg-black">
        <video
          ref="videoPlayer"
          :src="video.url"
          controls
          class="w-full"
          :aria-label="`Video player for ${video.name}`"
          @timeupdate="onTimeUpdate"
          @ended="onEnded"
          @loadedmetadata="onLoadedMetadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Video</p>
            <p class="text-lg font-medium">{{ video.name }}</p>
            <p v-if="video.description" class="mt-2 text-sm text-white/70">
              {{ video.description }}
            </p>
            <div class="mt-3 flex items-center gap-2 text-sm text-white/60">
              <UIcon name="i-lucide-user" class="size-4" />
              <span>Uploaded by</span>
              <UserLink :user-id="video.uploaderId" class="text-white/80" />
            </div>
          </div>

          <div v-if="progress" class="rounded-lg border border-white/10 p-3">
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-xs uppercase tracking-wide text-white/50">Playback progress</p>
              <UBadge
                v-if="progress.completed"
                color="success"
                variant="soft"
                size="xs"
                icon="i-lucide-check"
              >
                Completed
              </UBadge>
            </div>
            <p class="text-sm text-white/70">
              Last at {{ Math.floor(progress.positionSeconds / 60) }}m
              {{ progress.positionSeconds % 60 }}s
            </p>
          </div>
        </div>
      </UCard>
    </section>

    <UModal v-model:open="confirmDeleteOpen" title="Delete video?">
      <template #body>
        <p class="text-sm text-white/70">
          This will permanently remove
          <span class="font-medium text-white">{{ video?.name }}</span> and its playback history.
          This cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            variant="ghost"
            color="neutral"
            :disabled="deleting"
            @click="confirmDeleteOpen = false"
          >
            Cancel
          </UButton>
          <UButton color="error" icon="i-lucide-trash-2" :loading="deleting" @click="deleteVideo">
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
