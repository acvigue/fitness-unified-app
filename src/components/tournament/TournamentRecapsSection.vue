<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth/auth'
import UserLink from '@/components/UserLink.vue'
import type { components } from '@/types/api'

type Recap = components['schemas']['TournamentRecapResponseDto']
type Video = components['schemas']['VideoResponseDto']

const props = defineProps<{
  tournamentId: string
  isCompleted: boolean
  canManage: boolean
}>()

const router = useRouter()
const toast = useToastStore()
const authStore = useAuthStore()

const recaps = ref<Recap[]>([])
const loading = ref(true)
const error = ref('')

// Video picker
const pickerOpen = ref(false)
const myVideos = ref<Video[]>([])
const videosLoading = ref(false)
const videoSearch = ref('')
const selectedVideoId = ref<string | null>(null)
const linking = ref(false)

// Remove confirmation
const removeModalOpen = ref(false)
const pendingRemoveId = ref<string | null>(null)
const removing = ref(false)

const currentUserId = computed(() => {
  const user = authStore.user as { sub?: string; id?: string } | null | undefined
  return user?.sub || user?.id || ''
})

const linkedVideoIds = computed(() => new Set(recaps.value.map((r) => r.video.id)))

const availableVideos = computed(() =>
  myVideos.value.filter((v) => !linkedVideoIds.value.has(v.id)),
)

const filteredVideos = computed(() => {
  const q = videoSearch.value.trim().toLowerCase()
  if (!q) return availableVideos.value
  return availableVideos.value.filter((v) => {
    const name = (v.name || '').toLowerCase()
    const desc = (v.description || '').toLowerCase()
    return name.includes(q) || desc.includes(q)
  })
})

const selectedVideo = computed(
  () => myVideos.value.find((v) => v.id === selectedVideoId.value) ?? null,
)

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
  } catch (e) {
    error.value = getErrorMessage(e, 'Failed to load recaps')
  } finally {
    loading.value = false
  }
}

async function loadMyVideos() {
  if (!props.canManage) return
  videosLoading.value = true
  try {
    const { data, error: err } = await apiClient.GET('/v1/videos', {
      params: { query: { per_page: 100 } },
    })
    if (err) {
      toast.error('Could not load videos', getErrorMessage(err, 'Failed to load videos'))
      return
    }
    const all = data.data ?? []
    myVideos.value = currentUserId.value
      ? all.filter((v) => v.uploaderId === currentUserId.value)
      : all
  } catch (e) {
    toast.error('Could not load videos', getErrorMessage(e, 'Failed to load videos'))
  } finally {
    videosLoading.value = false
  }
}

function openPicker() {
  videoSearch.value = ''
  selectedVideoId.value = null
  pickerOpen.value = true
}

async function linkRecap() {
  if (!selectedVideoId.value) return
  linking.value = true
  try {
    const { error: err } = await apiClient.POST('/v1/tournaments/{id}/recaps', {
      params: { path: { id: props.tournamentId } },
      body: { videoId: selectedVideoId.value },
    })
    if (err) {
      toast.error('Could not link recap', getErrorMessage(err, 'Failed to link recap'))
      return
    }
    toast.success('Recap linked')
    pickerOpen.value = false
    selectedVideoId.value = null
    videoSearch.value = ''
    await load()
  } catch (e) {
    toast.error('Could not link recap', getErrorMessage(e, 'Failed to link recap'))
  } finally {
    linking.value = false
  }
}

function confirmRemove(recapId: string) {
  pendingRemoveId.value = recapId
  removeModalOpen.value = true
}

async function removeRecap() {
  if (!pendingRemoveId.value) return
  removing.value = true
  const recapId = pendingRemoveId.value
  try {
    const { error: err } = await apiClient.DELETE('/v1/tournaments/{id}/recaps/{recapId}', {
      params: { path: { id: props.tournamentId, recapId } },
    })
    if (err) {
      toast.error('Could not remove recap', getErrorMessage(err, 'Failed to remove recap'))
      return
    }
    recaps.value = recaps.value.filter((r) => r.id !== recapId)
    toast.success('Recap removed')
    removeModalOpen.value = false
    pendingRemoveId.value = null
  } catch (e) {
    toast.error('Could not remove recap', getErrorMessage(e, 'Failed to remove recap'))
  } finally {
    removing.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

onMounted(() => {
  load()
  loadMyVideos()
})
watch(
  () => props.tournamentId,
  () => {
    load()
  },
)
</script>

<template>
  <UCard class="bg-white/5">
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">Recap videos</p>
          <p class="text-sm text-white/60">Highlights from this tournament.</p>
        </div>
        <UButton
          v-if="canManage && isCompleted"
          size="xs"
          color="primary"
          variant="soft"
          icon="i-lucide-link"
          @click="openPicker"
        >
          Link video
        </UButton>
      </div>

      <div v-if="loading" class="flex justify-center p-4">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
      </div>

      <UAlert v-else-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <div
        v-else-if="recaps.length === 0"
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-white/50"
      >
        <UIcon name="i-lucide-video" class="size-6 text-white/30" />
        <p>No recap videos yet.</p>
        <p v-if="canManage && !isCompleted" class="text-xs text-white/40">
          Recaps can be linked once the tournament is completed.
        </p>
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
          <div class="mt-2 flex items-center justify-between gap-2 text-xs text-white/50">
            <div class="flex items-center gap-1 min-w-0">
              <span class="shrink-0">By</span>
              <UserLink :user-id="recap.uploadedById" />
            </div>
            <span class="shrink-0">{{ formatDate(recap.createdAt) }}</span>
          </div>
          <UButton
            v-if="canManage"
            size="xs"
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            aria-label="Remove recap"
            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
            @click="confirmRemove(recap.id)"
          />
        </div>
      </div>

      <p
        v-if="canManage && !isCompleted && recaps.length > 0"
        class="text-xs text-white/40 text-center"
      >
        Recaps can be linked after the tournament is completed.
      </p>
    </div>

    <UModal v-model:open="pickerOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-video" class="size-5 text-primary" />
            <h2 class="text-lg font-semibold">Link a video</h2>
          </div>
          <p class="text-sm text-white/60">
            Pick one of your uploaded videos to feature as a tournament recap.
          </p>

          <UFormField label="Search videos">
            <UInput
              v-model="videoSearch"
              placeholder="Search by name or description..."
              icon="i-lucide-search"
              aria-label="Search videos"
              class="w-full"
            />
          </UFormField>

          <div
            v-if="videosLoading"
            class="flex items-center justify-center p-6 text-sm text-white/50"
          >
            <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
            Loading your videos...
          </div>

          <div
            v-else-if="myVideos.length === 0"
            class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-white/60"
          >
            <UIcon name="i-lucide-video-off" class="size-6 text-white/30" />
            <span>You have no uploaded videos yet.</span>
            <UButton
              size="xs"
              variant="soft"
              color="primary"
              icon="i-lucide-upload"
              @click="
                () => {
                  pickerOpen = false
                  router.push('/videos/create')
                }
              "
            >
              Upload a video
            </UButton>
          </div>

          <div
            v-else-if="availableVideos.length === 0"
            class="rounded-lg border border-dashed border-white/10 p-4 text-sm text-center text-white/60"
          >
            All of your videos are already linked.
          </div>

          <div
            v-else-if="filteredVideos.length === 0"
            class="rounded-lg border border-dashed border-white/10 p-4 text-sm text-center text-white/60"
          >
            No videos match your search.
          </div>

          <div v-else class="max-h-72 overflow-y-auto flex flex-col gap-2" role="listbox">
            <button
              v-for="video in filteredVideos"
              :key="video.id"
              type="button"
              role="option"
              :aria-selected="selectedVideoId === video.id"
              class="flex items-start gap-3 rounded-lg border p-3 text-left transition"
              :class="
                selectedVideoId === video.id
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              "
              @click="selectedVideoId = video.id"
            >
              <UIcon
                :name="selectedVideoId === video.id ? 'i-lucide-circle-check' : 'i-lucide-video'"
                :class="selectedVideoId === video.id ? 'text-primary' : 'text-white/40'"
                class="mt-0.5 shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ video.name || 'Untitled video' }}</p>
                <p v-if="video.description" class="text-xs text-white/50 line-clamp-2">
                  {{ video.description }}
                </p>
              </div>
            </button>
          </div>

          <div class="flex justify-end gap-3">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="linking"
              @click="pickerOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              icon="i-lucide-link"
              :loading="linking"
              :disabled="!selectedVideo"
              @click="linkRecap"
            >
              Link recap
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="removeModalOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-trash-2" class="size-5 text-red-400" />
            <h2 class="text-lg font-semibold">Remove recap?</h2>
          </div>
          <p class="text-sm text-white/70">
            This will unlink the video from the tournament. The video itself won't be deleted.
          </p>
          <div class="flex justify-end gap-3">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="removing"
              @click="removeModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton color="error" :loading="removing" @click="removeRecap">Remove</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
