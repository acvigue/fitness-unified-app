<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useMyTeamsStore } from '@/stores/myTeams'
import { useHasStaffRoleAnywhere } from '@/composables/useGymPermissions'
import type { components } from '@/types/api'

type GymSummary = components['schemas']['GymWithRulesResponseDto']

useHead({ title: 'Gyms' })

const router = useRouter()
const { setHeader } = usePageHeader()
const myTeams = useMyTeamsStore()
const hasStaffAnywhere = useHasStaffRoleAnywhere()

const gyms = ref<GymSummary[]>([])
const loading = ref(false)
const error = ref('')
const searchTerm = ref('')

const filteredGyms = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const sorted = gyms.value.slice().sort((a, b) => a.name.localeCompare(b.name))
  if (!term) return sorted
  return sorted.filter(
    (g) =>
      g.name.toLowerCase().includes(term) || (g.location?.toLowerCase().includes(term) ?? false),
  )
})

async function loadGyms() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/gyms')
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load gyms')
      return
    }
    gyms.value = data ?? []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  setHeader({
    title: 'Gyms',
    actions: hasStaffAnywhere.value
      ? [
          {
            icon: 'i-lucide-plus',
            label: 'Create gym',
            onClick: () => router.push('/gyms/create'),
          },
        ]
      : [],
  })
  myTeams.load()
  loadGyms()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <div>
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">All Gyms</p>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-refresh-cw"
            aria-label="Refresh gyms"
            :loading="loading"
            @click="loadGyms"
          />
        </div>

        <UInput
          v-model="searchTerm"
          icon="i-lucide-search"
          placeholder="Search by name or location"
          class="mb-3 w-full"
        />

        <div v-if="loading" class="flex flex-col gap-3">
          <div class="h-24 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
          <div class="h-24 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
          <div class="h-24 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
        </div>

        <div
          v-else-if="gyms.length === 0"
          class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-8 text-center"
        >
          <UIcon name="i-lucide-dumbbell" class="size-8 text-white/40" />
          <p class="text-sm font-medium text-white/70">No gyms found</p>
          <p v-if="hasStaffAnywhere" class="text-xs text-white/50">
            Add a gym for your organization.
          </p>
          <UButton
            v-if="hasStaffAnywhere"
            class="mt-2"
            icon="i-lucide-plus"
            size="sm"
            @click="router.push('/gyms/create')"
          >
            Create a gym
          </UButton>
        </div>

        <div
          v-else-if="filteredGyms.length === 0"
          class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-6 text-center"
        >
          <UIcon name="i-lucide-search-x" class="size-6 text-white/30" />
          <p class="text-sm text-white/50">No gyms match your search.</p>
        </div>

        <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="gym in filteredGyms"
            :key="gym.id"
            type="button"
            class="rounded-lg border border-white/10 p-4 text-left transition hover:bg-white/5"
            @click="router.push(`/gyms/${gym.id}`)"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium truncate">{{ gym.name }}</p>
              <UBadge v-if="!gym.isActive" color="neutral" variant="soft" size="xs">
                Inactive
              </UBadge>
            </div>
            <p v-if="gym.location" class="mt-1 text-xs text-white/50 truncate">
              <UIcon name="i-lucide-map-pin" class="inline size-3 mr-1 align-[-2px]" />
              {{ gym.location }}
            </p>
            <p class="mt-2 line-clamp-2 text-sm text-white/60">
              {{ gym.description || 'No description.' }}
            </p>
          </button>
        </div>
      </div>
    </section>
  </PageLayout>
</template>
