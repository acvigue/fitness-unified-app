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
import { useGymPermissions } from '@/composables/useGymPermissions'
import type { components } from '@/types/api'

type GymDetail = components['schemas']['GymWithRulesResponseDto']

useHead({ title: 'Gym' })

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const myTeams = useMyTeamsStore()

const gymId = computed(() => route.params.id as string)
const gym = ref<GymDetail | null>(null)
const loading = ref(false)
const error = ref('')

const { canManage } = useGymPermissions(() => gym.value?.organizationId ?? null)

async function loadGym() {
  if (!gymId.value) return
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/gyms/{id}', {
      params: { path: { id: gymId.value } },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load gym')
      return
    }
    gym.value = data
    setHeader({
      title: data.name,
      backRoute: '/gyms',
      actions: [],
    })
  } catch (e) {
    error.value = getErrorMessage(e, 'Failed to load gym')
  } finally {
    loading.value = false
  }
}

watch(gymId, () => {
  loadGym()
})

onMounted(() => {
  setHeader({ title: 'Gym', backRoute: '/gyms' })
  myTeams.load()
  loadGym()
})
</script>

<template>
  <PageLayout>
    <div v-if="loading && !gym" class="flex justify-center p-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
    </div>

    <div v-else-if="error" class="p-5">
      <UAlert color="error" :title="error" icon="i-lucide-circle-alert" />
    </div>

    <section v-else-if="gym" class="flex flex-col gap-5 px-5 py-6">
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold">{{ gym.name }}</h2>
            <p v-if="gym.location" class="text-sm text-white/60">
              {{ gym.location }}
            </p>
            <p v-if="gym.description" class="mt-2 text-sm text-white/70">
              {{ gym.description }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UButton
              v-if="canManage"
              size="sm"
              variant="outline"
              color="neutral"
              icon="i-lucide-settings"
              @click="router.push(`/gyms/${gym.id}/manage`)"
            >
              Manage
            </UButton>
            <GymSubscribeButton :gym-id="gym.id" />
          </div>
        </div>
      </UCard>

      <GymScheduleGrid
        :gym-id="gym.id"
        :organization-id="gym.organizationId"
        mode="browse"
      />
    </section>
  </PageLayout>
</template>
