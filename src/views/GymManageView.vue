<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import { useMyTeamsStore } from '@/stores/myTeams'
import { useGymPermissions } from '@/composables/useGymPermissions'
import GymScheduleGrid from '@/components/gym/GymScheduleGrid.vue'
import GymExceptionsEditor from '@/components/gym/GymExceptionsEditor.vue'
import WeeklyRulesEditor, { type WeeklyRulePayload } from '@/components/gym/WeeklyRulesEditor.vue'
import type { components } from '@/types/api'

type GymDetail = components['schemas']['GymDetailResponseDto']

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const toast = useToastStore()
const myTeams = useMyTeamsStore()

const gymId = computed(() => String(route.params.id))
const gym = ref<GymDetail | null>(null)
const loading = ref(false)
const loadError = ref('')
const tab = ref<'schedule' | 'rules' | 'exceptions'>('schedule')

const { canManage } = useGymPermissions(() => gym.value?.organizationId ?? null)

useHead({ title: () => (gym.value ? `Manage · ${gym.value.name}` : 'Manage gym') })

const draftRules = ref<WeeklyRulePayload[]>([])
const savingRules = ref(false)
const rulesError = ref('')

async function loadGym() {
  loading.value = true
  loadError.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/gyms/{id}', {
      params: { path: { id: gymId.value } },
    })
    if (err) {
      loadError.value = getErrorMessage(err, 'Failed to load gym')
      return
    }
    gym.value = data ?? null
    draftRules.value = (gym.value?.availabilityRules ?? []).map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      isOpen: r.isOpen,
    }))
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await myTeams.load()
  await loadGym()
  if (gym.value && !canManage.value) {
    toast.error('Not authorized', 'You must be staff or admin of this gym’s organization.')
    router.replace('/gyms')
    return
  }
  setHeader({
    title: gym.value?.name ?? 'Manage gym',
    backRoute: '/gyms',
  })
})

async function saveRules() {
  if (!gym.value) return
  savingRules.value = true
  rulesError.value = ''
  try {
    const { error: err } = await apiClient.PUT('/v1/gyms/{id}/rules', {
      params: { path: { id: gym.value.id } },
      body: { rules: draftRules.value },
    })
    if (err) {
      const message = getErrorMessage(err, 'Failed to save rules')
      rulesError.value = message
      toast.error('Could not save schedule', message)
      return
    }
    toast.success('Schedule saved')
    await loadGym()
  } finally {
    savingRules.value = false
  }
}

const deleteOpen = ref(false)
const deleteLoading = ref(false)

async function confirmDelete() {
  if (!gym.value) return
  deleteLoading.value = true
  try {
    const { error: err } = await apiClient.DELETE('/v1/gyms/{id}', {
      params: { path: { id: gym.value.id } },
    })
    if (err) {
      toast.error('Could not delete gym', getErrorMessage(err, 'Failed to delete'))
      return
    }
    toast.success('Gym deleted')
    router.replace('/gyms')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <PageLayout>
    <section class="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-6">
      <UAlert v-if="loadError" color="error" :title="loadError" icon="i-lucide-circle-alert" />

      <div v-if="loading && !gym" class="flex flex-col gap-3">
        <div class="h-16 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
        <div class="h-32 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
      </div>

      <template v-else-if="gym">
        <UCard class="bg-white/5">
          <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 class="text-xl font-semibold text-white">{{ gym.name }}</h1>
              <p v-if="gym.location" class="text-sm text-white/60">{{ gym.location }}</p>
              <p v-if="gym.description" class="mt-2 text-sm text-white/70">{{ gym.description }}</p>
            </div>
            <UBadge :color="gym.isActive ? 'success' : 'neutral'" variant="soft">
              {{ gym.isActive ? 'Active' : 'Inactive' }}
            </UBadge>
          </div>
        </UCard>

        <UTabs
          v-model="tab"
          :items="[
            { label: 'Today', value: 'schedule', icon: 'i-lucide-calendar' },
            { label: 'Weekly schedule', value: 'rules', icon: 'i-lucide-calendar-clock' },
            { label: 'Exceptions', value: 'exceptions', icon: 'i-lucide-calendar-off' },
          ]"
        />

        <div v-if="tab === 'schedule'">
          <GymScheduleGrid :gym-id="gym.id" :organization-id="gym.organizationId" mode="manage" />
        </div>

        <div v-else-if="tab === 'rules'" class="flex flex-col gap-4">
          <UCard class="bg-white/5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-white">Weekly schedule</h2>
                <p class="text-sm text-white/60">
                  Paint the windows when this gym is open every week. Existing reservations are
                  kept.
                </p>
              </div>
              <UButton
                icon="i-lucide-save"
                :loading="savingRules"
                :disabled="savingRules"
                @click="saveRules"
              >
                Save schedule
              </UButton>
            </div>
          </UCard>

          <UAlert
            v-if="rulesError"
            color="error"
            :title="rulesError"
            icon="i-lucide-circle-alert"
          />

          <UCard class="bg-white/5">
            <WeeklyRulesEditor v-model="draftRules" />
          </UCard>
        </div>

        <div v-else-if="tab === 'exceptions'">
          <UCard class="bg-white/5">
            <GymExceptionsEditor :gym-id="gym.id" />
          </UCard>
        </div>

        <UCard class="border-error/30 bg-error/5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-error">Danger zone</h2>
              <p class="text-sm text-white/60">
                Deleting a gym removes all rules, exceptions, and reservations.
              </p>
            </div>
            <UButton
              color="error"
              variant="outline"
              icon="i-lucide-trash-2"
              @click="deleteOpen = true"
            >
              Delete gym
            </UButton>
          </div>
        </UCard>

        <UModal v-model:open="deleteOpen" :dismissible="!deleteLoading">
          <template #content>
            <div class="p-6 flex flex-col gap-4">
              <div class="flex items-start gap-3">
                <div class="rounded-full bg-error/10 p-2 shrink-0">
                  <UIcon name="i-lucide-trash-2" class="size-5 text-error" />
                </div>
                <div class="flex flex-col gap-1">
                  <h2 class="text-lg font-semibold">Delete this gym?</h2>
                  <p class="text-sm text-white/60">
                    This cannot be undone. All schedule data and reservations will be removed.
                  </p>
                </div>
              </div>
              <div class="flex gap-2 justify-end">
                <UButton
                  variant="ghost"
                  color="neutral"
                  :disabled="deleteLoading"
                  @click="deleteOpen = false"
                >
                  Cancel
                </UButton>
                <UButton color="error" :loading="deleteLoading" @click="confirmDelete">
                  Delete gym
                </UButton>
              </div>
            </div>
          </template>
        </UModal>
      </template>
    </section>
  </PageLayout>
</template>
