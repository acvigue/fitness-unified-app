<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import { useOrganizationStore } from '@/stores/organization'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Video = components['schemas']['VideoResponseDto']

useHead({ title: 'Video' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()
const orgStore = useOrganizationStore()

const video = ref<Video | null>(null)
const loading = ref(true)
const error = ref('')
const actionLoading = ref(false)
const actionMessage = ref('')
const actionError = ref('')

const videoId = computed(() => route.params.id as string)

const currentUserId = computed(() => {
  const user = (authStore as any).user
  return user?.sub || user?.id || ''
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadVideo() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/videos/{id}', {
      params: { path: { id: videoId.value } },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load video')
      return
    }
    video.value = data
    setHeader({
      title: data.name,
      backRoute: '/videos',
      actions: isOrgManager.value
        ? [
            {
              icon: 'i-lucide-pencil',
              onClick: () => router.push(`/videos/${videoId.value}/edit`),
            },
            {
              icon: 'i-lucide-trash-2',
              onClick: () => router.push(`/videos/${videoId.value}/delete`),
            },
          ]
        : [],
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load video'
  } finally {
    loading.value = false
  }
}


onMounted(() => {
  setHeader({ title: 'Video', backRoute: '/videos' })
  loadVideo()
})

onUnmounted(() => {
  stopBracketPolling()
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
      <!-- Action messages -->
      <UAlert
        v-if="actionMessage"
        color="success"
        :title="actionMessage"
        icon="i-lucide-circle-check"
        :close="{ color: 'success', variant: 'link', icon: 'i-lucide-x' }"
        @close="actionMessage = ''"
      />
      <UAlert
        v-if="actionError"
        color="error"
        :title="actionError"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="actionError = ''"
      />

      <!-- Video Info -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-white/60">Video</p>
              <p class="text-lg font-medium">{{ video.name }}</p>
            </div>
			<div>
              <p class="text-lg font-small">{{ video.description }}</p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div class="rounded-lg border border-white/10 p-3">
              <p class="text-xs uppercase tracking-wide text-white/50">Format</p>
              <p class="mt-1 text-sm">{{ isRoundRobin ? 'Round Robin' : 'Single Elimination' }}</p>
            </div>
            <div class="rounded-lg border border-white/10 p-3">
              <p class="text-xs uppercase tracking-wide text-white/50">Sport</p>
              <p class="mt-1 text-sm">
                {{ video.sport?.icon || '' }} {{ video.sport?.name }}
              </p>
            </div>
            <div class="rounded-lg border border-white/10 p-3">
              <p class="text-xs uppercase tracking-wide text-white/50">Created</p>
              <p class="mt-1 text-sm">{{ formatDate(video.createdAt) }}</p>
            </div>
          </div>
        </div>
      </UCard>

    </section>
  </PageLayout>
</template>
