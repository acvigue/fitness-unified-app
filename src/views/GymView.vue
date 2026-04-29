<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import GymScheduleGrid from '@/components/gym/GymScheduleGrid.vue'
import GymSubscribeButton from '@/components/gym/GymSubscribeButton.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useMyTeamsStore } from '@/stores/myTeams'
import { useGymPermissions, useHasStaffRoleAnywhere } from '@/composables/useGymPermissions'
import type { components } from '@/types/api'

type GymSummary = components['schemas']['GymWithRulesResponseDto']

useHead({ title: 'Gyms' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const myTeams = useMyTeamsStore()
const hasStaffAnywhere = useHasStaffRoleAnywhere()

const gyms = ref<GymSummary[]>([])
const loading = ref(false)
const error = ref('')
const selectedGymId = ref<string>('')
const searchTerm = ref('')

const filteredGyms = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return gyms.value.slice().sort((a, b) => a.name.localeCompare(b.name))
  return gyms.value
    .filter(
      (g) =>
        g.name.toLowerCase().includes(term) || (g.location?.toLowerCase().includes(term) ?? false),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
})

const selectedGym = computed(() => gyms.value.find((g) => g.id === selectedGymId.value) ?? null)

const { canManage } = useGymPermissions(() => selectedGym.value?.organizationId ?? null)

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

    const queryGymId = typeof route.query.gymId === 'string' ? route.query.gymId : null
    if (queryGymId && gyms.value.some((g) => g.id === queryGymId)) {
      selectedGymId.value = queryGymId
    } else if (gyms.value.length > 0 && !selectedGymId.value) {
      selectedGymId.value = gyms.value[0].id
    }
  } finally {
    loading.value = false
  }
}

watch(filteredGyms, (list) => {
  if (list.length === 0) {
    selectedGymId.value = ''
    return
  }
  if (!list.some((g) => g.id === selectedGymId.value)) {
    selectedGymId.value = list[0].id
  }
})

watch(
  () => route.query.gymId,
  (next) => {
    if (typeof next === 'string' && gyms.value.some((g) => g.id === next)) {
      selectedGymId.value = next
    }
  },
)

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

      <div v-if="loading" class="flex flex-col gap-3">
        <div class="h-16 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
        <div class="h-28 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
        <div class="h-40 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
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

      <template v-else>
        <UCard class="bg-white/5">
          <div class="flex flex-col gap-3">
            <UInput
              v-model="searchTerm"
              icon="i-lucide-search"
              placeholder="Search by name or location"
            />
            <UFormField label="Gym">
              <USelect
                v-model="selectedGymId"
                :items="
                  filteredGyms.map((gym) => ({
                    label: gym.name + (gym.location ? ` · ${gym.location}` : ''),
                    value: gym.id,
                  }))
                "
              />
            </UFormField>
            <p v-if="filteredGyms.length === 0" class="text-xs text-white/50">
              No gyms match this search.
            </p>
          </div>
        </UCard>

        <UCard v-if="selectedGym" class="bg-white/5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold">{{ selectedGym.name }}</h2>
              <p v-if="selectedGym.location" class="text-sm text-white/60">
                {{ selectedGym.location }}
              </p>
              <p v-if="selectedGym.description" class="mt-2 text-sm text-white/70">
                {{ selectedGym.description }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UButton
                v-if="canManage"
                size="sm"
                variant="outline"
                color="neutral"
                icon="i-lucide-settings"
                @click="router.push(`/gyms/${selectedGym.id}/manage`)"
              >
                Manage
              </UButton>
              <GymSubscribeButton :gym-id="selectedGym.id" />
            </div>
          </div>
        </UCard>

        <GymScheduleGrid
          v-if="selectedGym"
          :gym-id="selectedGym.id"
          :organization-id="selectedGym.organizationId"
          mode="browse"
        />
      </template>
    </section>
  </PageLayout>
</template>
