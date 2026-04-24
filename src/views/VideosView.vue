<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

type Video = components['schemas']['VideoResponseDto']
type PaginationMeta = components['schemas']['PaginationMetaDto']

useHead({
  title: 'Videos',
})

const router = useRouter()
const { setHeader } = usePageHeader()

const videos = ref<Video[]>([])
const meta = ref<PaginationMeta | null>(null)
const loading = ref(false)
const error = ref('')
const sports = ref<Sport[]>([])

const filterSportId = ref('all')
const page = ref(1)

async function loadVideos() {
  loading.value = true
  error.value = ''
  try {
    type VideosQuery = { page?: number; per_page?: number; sportId?: string }
    const query: VideosQuery = {
      page: page.value,
      per_page: 12,
    }
    if (filterSportId.value && filterSportId.value !== 'all') query.sportId = filterSportId.value

    const { data, error: err } = await apiClient.GET('/v1/videos', {
      params: { query },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load videos')
      return
    }
    videos.value = data.data
    meta.value = data.meta
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load videos'
  } finally {
    loading.value = false
  }
}

async function loadSports() {
  try {
    const { data: sportsData, error: sportsError } = await apiClient.GET('/v1/sports')
    if (sportsError) throw new Error(getErrorMessage(sportsError, 'Failed to load sports'))
    sports.value = sportsData
  } catch {
    // Sports filter optional
  }
}

function applyFilters() {
  page.value = 1
  loadVideos()
}

function goToPage(p: number) {
  page.value = p
  loadVideos()
}

function sportLabel(sportId: string) {
  const sport = sports.value.find((s) => s.id === sportId)
  if (!sport) return 'Unknown'
  return `${sport.icon || ''} ${sport.name}`.trim()
}

onMounted(() => {
  setHeader({
    title: 'Videos',
    actions: [
      {
        icon: 'i-lucide-plus',
        label: 'Upload video',
        onClick: () => router.push('/videos/create'),
      },
    ],
  })
  loadSports()
  loadVideos()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
      <!-- Filters -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <UFormField label="Sport" class="flex-1">
            <USelect
              v-model="filterSportId"
              :items="[
                { label: 'All Sports', value: 'all' },
                ...sports.map((s) => ({ label: `${s.icon || ''} ${s.name}`.trim(), value: s.id })),
              ]"
              @update:model-value="applyFilters"
            />
          </UFormField>
          <UButton
            icon="i-lucide-search"
            :loading="loading"
            aria-label="Apply filters"
            @click="applyFilters"
          >
            Search
          </UButton>
        </div>
      </UCard>

      <!-- Error -->
      <UAlert
        v-if="error"
        color="error"
        :title="error"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="error = ''"
      />

      <!-- Loading -->
      <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        <div
          v-for="n in 6"
          :key="n"
          class="rounded-lg border border-white/10 bg-white/5 p-4 animate-pulse"
        >
          <div class="h-4 w-3/4 rounded bg-white/10" />
          <div class="mt-2 h-3 w-full rounded bg-white/10" />
          <div class="mt-1 h-3 w-2/3 rounded bg-white/10" />
          <div class="mt-3 h-3 w-1/3 rounded bg-white/10" />
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="videos.length === 0"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        <UIcon name="i-lucide-video-off" class="size-8 mx-auto mb-2 text-white/30" />
        <p>
          {{
            filterSportId !== 'all'
              ? 'No videos match this sport filter.'
              : 'No videos uploaded yet — share your first highlight!'
          }}
        </p>
      </div>

      <!-- Video Cards -->
      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="video in videos"
          :key="video.id"
          type="button"
          class="rounded-lg border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
          @click="router.push(`/videos/${video.id}`)"
        >
          <p class="font-medium truncate">{{ video.name }}</p>
          <p v-if="video.description" class="mt-1 text-xs text-white/50 line-clamp-2">
            {{ video.description }}
          </p>

          <div class="mt-3 flex items-center gap-2 text-sm text-white/60">
            <UIcon name="i-lucide-dumbbell" class="text-xs" />
            <span>{{ sportLabel(video.sportId) }}</span>
          </div>
        </button>
      </div>

      <!-- Pagination -->
      <div v-if="meta && meta.total_pages > 1" class="flex items-center justify-center gap-2">
        <UButton
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-lucide-chevron-left"
          :disabled="page <= 1"
          @click="goToPage(page - 1)"
        />
        <span class="text-sm text-white/60"> Page {{ meta.page }} of {{ meta.total_pages }} </span>
        <UButton
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-lucide-chevron-right"
          :disabled="page >= meta.total_pages"
          @click="goToPage(page + 1)"
        />
      </div>
    </section>
  </PageLayout>
</template>
