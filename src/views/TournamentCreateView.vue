<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import SportsPickerModal from '@/components/SportsPickerModal.vue'
import DateTimePicker from '@/components/datetime/DateTimePicker.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useOrganizationStore } from '@/stores/organization'
import { useToastStore } from '@/stores/toast'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

useHead({ title: 'Create Tournament' })

const router = useRouter()
const { setHeader } = usePageHeader()
const orgStore = useOrganizationStore()
const toast = useToastStore()

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
const touched = reactive({
  name: false,
  sport: false,
  startDate: false,
  maxTeams: false,
})

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

// --- Validation (inline) ---
const nameError = computed(() => {
  if (!touched.name) return ''
  if (!form.name.trim()) return 'Tournament name is required'
  if (form.name.trim().length > 120) return 'Name must be 120 characters or fewer'
  return ''
})

const sportError = computed(() => {
  if (!touched.sport) return ''
  if (!selectedSport.value) return 'Please choose a sport'
  return ''
})

const startDateError = computed(() => {
  if (!touched.startDate) return ''
  if (!form.startDate) return 'Start date is required'
  const parsed = new Date(form.startDate)
  if (isNaN(parsed.getTime())) return 'Invalid date'
  if (parsed.getTime() < Date.now() - 60_000) return 'Start date cannot be in the past'
  return ''
})

const maxTeamsError = computed(() => {
  if (!touched.maxTeams) return ''
  if (!Number.isInteger(form.maxTeams) || form.maxTeams < 2) {
    return 'Max teams must be a positive integer (at least 2)'
  }
  return ''
})

const formValid = computed(
  () =>
    !!form.name.trim() &&
    !!selectedSport.value &&
    !!form.startDate &&
    Number.isInteger(form.maxTeams) &&
    form.maxTeams >= 2 &&
    new Date(form.startDate).getTime() >= Date.now() - 60_000,
)

function markAllTouched() {
  touched.name = true
  touched.sport = true
  touched.startDate = true
  touched.maxTeams = true
}

async function createTournament() {
  markAllTouched()
  if (!formValid.value) {
    error.value = 'Please fix the errors above before continuing.'
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
        sportId: selectedSport.value!.id,
        organizationId: org.organizationId,
        format: form.format,
        maxTeams: form.maxTeams,
        startDate: form.startDate,
      },
    })

    if (err) {
      error.value = getErrorMessage(err, 'Failed to create tournament')
      toast.error('Could not create tournament', error.value)
      return
    }

    toast.success('Tournament created', form.name.trim())
    router.push(`/tournaments/${data.id}`)
  } catch (e) {
    error.value = getErrorMessage(e, 'Failed to create tournament')
    toast.error('Could not create tournament', error.value)
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

          <UFormField label="Tournament Name" required :error="nameError">
            <UInput
              v-model="form.name"
              placeholder="Spring Championship 2026"
              :disabled="creating"
              aria-label="Tournament name"
              @blur="touched.name = true"
            />
          </UFormField>

          <UFormField label="Sport" required :error="sportError">
            <div class="flex flex-wrap gap-2">
              <UBadge v-if="selectedSport" color="primary" variant="soft" class="gap-1.5">
                {{ selectedSport.icon }} {{ selectedSport.name }}
              </UBadge>
              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                icon="i-lucide-plus"
                :disabled="creating"
                :aria-label="selectedSport ? 'Change selected sport' : 'Select a sport'"
                @click="
                  () => {
                    touched.sport = true
                    sportsPickerOpen = true
                  }
                "
              >
                {{ selectedSport ? 'Change Sport' : 'Select Sport' }}
              </UButton>
            </div>
          </UFormField>

          <UFormField label="Format">
            <USelect
              v-model="form.format"
              :items="FORMAT_OPTIONS"
              :disabled="creating"
              aria-label="Tournament format"
            />
          </UFormField>

          <UFormField label="Max Teams" required :error="maxTeamsError">
            <USelect
              v-model="form.maxTeams"
              :items="maxTeamOptions"
              :disabled="creating"
              aria-label="Maximum number of teams"
              @change="touched.maxTeams = true"
            />
          </UFormField>

          <UFormField label="Start Date" required :error="startDateError">
            <DateTimePicker
              v-model="form.startDate"
              :disabled="creating"
              @update:model-value="touched.startDate = true"
            />
          </UFormField>

          <UButton
            color="primary"
            :loading="creating"
            :disabled="creating"
            @click="createTournament"
          >
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
