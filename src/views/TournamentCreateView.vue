<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import SportsPickerModal from '@/components/SportsPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useOrganizationStore } from '@/stores/organization'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

useHead({ title: 'Create Tournament' })

const router = useRouter()
const { setHeader } = usePageHeader()
const orgStore = useOrganizationStore()

const form = reactive({
  name: '',
  format: 'SINGLE_ELIMINATION' as 'SINGLE_ELIMINATION' | 'ROUND_ROBIN',
  maxTeams: 8,
  startDate: '',
})
const selectedSport = ref<Sport | null>(null)
const sportsPickerOpen = ref(false)
const creating = ref(false)
const error = ref('')

const FORMAT_OPTIONS = [
  { label: 'Single Elimination', value: 'SINGLE_ELIMINATION' },
  { label: 'Round Robin', value: 'ROUND_ROBIN' },
]

const POWER_OF_2_OPTIONS = [2, 4, 8, 16, 32, 64].map((n) => ({
  label: `${n} teams`,
  value: n,
}))

const GENERAL_TEAM_OPTIONS = Array.from({ length: 63 }, (_, i) => ({
  label: `${i + 2} teams`,
  value: i + 2,
}))

const maxTeamOptions = computed(() =>
  form.format === 'SINGLE_ELIMINATION' ? POWER_OF_2_OPTIONS : GENERAL_TEAM_OPTIONS,
)

watch(
  () => form.format,
  () => {
    // Reset to a valid default when switching formats
    const validValues = maxTeamOptions.value.map((o) => o.value)
    if (!validValues.includes(form.maxTeams)) {
      form.maxTeams = form.format === 'SINGLE_ELIMINATION' ? 8 : 4
    }
  },
)

async function createTournament() {
  if (!form.name.trim() || !selectedSport.value || !form.startDate) {
    error.value = 'Name, sport, and start date are required'
    return
  }

  const org = orgStore.currentOrganization
  if (!org) {
    error.value = 'You must belong to an organization to create tournaments'
    return
  }

  creating.value = true
  error.value = ''

  try {
    const { data, error: err } = await apiClient.POST('/v1/tournaments', {
      body: {
        name: form.name.trim(),
        sportId: selectedSport.value.id,
        organizationId: org.id,
        format: form.format,
        maxTeams: form.maxTeams,
        startDate: new Date(form.startDate).toISOString(),
      },
    })

    if (err) {
      error.value = getErrorMessage(err, 'Failed to create tournament')
      return
    }

    router.push(`/tournaments/${data.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create tournament'
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  setHeader({ title: 'Create Tournament', backRoute: '/tournaments' })
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6 max-w-xl">
      <UAlert
        v-if="error"
        color="error"
        :title="error"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="error = ''"
      />

      <UCard class="bg-white/5">
        <div class="flex flex-col gap-5">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">New Tournament</p>
            <p class="text-sm text-white/60">Create a tournament for your organization.</p>
          </div>

          <UFormField label="Tournament Name">
            <UInput v-model="form.name" placeholder="Spring Championship 2026" />
          </UFormField>

          <UFormField label="Sport">
            <div class="flex flex-wrap gap-2">
              <UBadge v-if="selectedSport" color="primary" variant="soft" class="gap-1.5">
                {{ selectedSport.icon }} {{ selectedSport.name }}
              </UBadge>
              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                icon="i-lucide-plus"
                @click="sportsPickerOpen = true"
              >
                {{ selectedSport ? 'Change Sport' : 'Select Sport' }}
              </UButton>
            </div>
          </UFormField>

          <UFormField label="Format">
            <USelect v-model="form.format" :items="FORMAT_OPTIONS" />
          </UFormField>

          <UFormField label="Max Teams">
            <USelect v-model="form.maxTeams" :items="maxTeamOptions" />
          </UFormField>

          <UFormField label="Start Date">
            <UInput v-model="form.startDate" type="datetime-local" />
          </UFormField>

          <UButton color="primary" :loading="creating" @click="createTournament">
            Create Tournament
          </UButton>
        </div>
      </UCard>
    </section>

    <SportsPickerModal
      v-model:open="sportsPickerOpen"
      :selected="selectedSport ? [selectedSport] : []"
      @update="(sports: Sport[]) => (selectedSport = sports[0] ?? null)"
    />
  </PageLayout>
</template>
