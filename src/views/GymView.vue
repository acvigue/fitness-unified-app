<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import GymSlotPanel from '@/components/gym/GymSlotPanel.vue'
import GymSubscribeButton from '@/components/gym/GymSubscribeButton.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'

interface GymSummary {
  id: string
  name: string
  description: string | null
  location: string | null
  organizationId: string
}

useHead({ title: 'Gyms' })

const router = useRouter()
const { setHeader } = usePageHeader()

const gyms = ref<GymSummary[]>([])
const loading = ref(false)
const error = ref('')
const selectedGymId = ref<string>('')

const selectedGym = computed(() => gyms.value.find((g) => g.id === selectedGymId.value) ?? null)

async function loadGyms() {
  loading.value = true
  error.value = ''
  try {
    const response = await (
      apiClient as unknown as {
        GET: (path: string) => Promise<{ data?: unknown; error?: unknown }>
      }
    ).GET('/v1/gyms')
    const { data, error: err } = response
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load gyms')
      return
    }
    gyms.value = (data as GymSummary[]) ?? []
    if (gyms.value.length > 0 && !selectedGymId.value) {
      selectedGymId.value = gyms.value[0].id
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  setHeader({
    title: 'Gyms',
    actions: [
      {
        icon: 'i-lucide-plus',
        label: 'Create gym',
        onClick: () => router.push('/gyms/create'),
      },
    ],
  })
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
        <p class="text-xs text-white/50">Be the first to add a gym for your organization.</p>
        <UButton class="mt-2" icon="i-lucide-plus" size="sm" @click="router.push('/gyms/create')">
          Create a gym
        </UButton>
      </div>

      <template v-else>
        <UCard class="bg-white/5">
          <UFormField label="Location">
            <USelect
              v-model="selectedGymId"
              :items="
                gyms.map((gym) => ({
                  label: gym.name + (gym.location ? ` · ${gym.location}` : ''),
                  value: gym.id,
                }))
              "
            />
          </UFormField>
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
            <GymSubscribeButton :gym-id="selectedGym.id" />
          </div>
        </UCard>

        <GymSlotPanel v-if="selectedGymId" :gym-id="selectedGymId" />
      </template>
    </section>
  </PageLayout>
</template>
