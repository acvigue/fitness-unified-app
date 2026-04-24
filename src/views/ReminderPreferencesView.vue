<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type Preference = components['schemas']['ReminderPreferenceResponseDto']

useHead({ title: 'Reminders' })

const { setHeader } = usePageHeader()
const toast = useToastStore()

const preferences = ref<Preference[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const INTERVAL_CHOICES = [
  { label: '24 hours before', value: 1440 },
  { label: '3 hours before', value: 180 },
  { label: '1 hour before', value: 60 },
  { label: '15 minutes before', value: 15 },
]

const DEFAULT_INTERVALS = [1440, 60]

const globalPreference = ref<number[]>([...DEFAULT_INTERVALS])

function hydrate() {
  const globalPref = preferences.value.find((p) => !p.tournamentId)
  if (globalPref) {
    globalPreference.value = [...globalPref.intervalsMinutes].sort((a, b) => b - a)
  } else {
    globalPreference.value = [...DEFAULT_INTERVALS]
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/reminders/preferences')
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load preferences')
      return
    }
    preferences.value = data ?? []
    hydrate()
  } finally {
    loading.value = false
  }
}

async function saveGlobal() {
  saving.value = true
  try {
    const { error: err } = await apiClient.PUT('/v1/reminders/preferences', {
      body: { intervalsMinutes: globalPreference.value },
    })
    if (err) {
      toast.error('Could not save reminders', getErrorMessage(err, 'Save failed'))
      return
    }
    toast.success('Reminder preferences saved')
    await load()
  } finally {
    saving.value = false
  }
}

function toggleInterval(minutes: number) {
  const idx = globalPreference.value.indexOf(minutes)
  if (idx === -1) {
    globalPreference.value = [...globalPreference.value, minutes].sort((a, b) => b - a)
  } else {
    globalPreference.value = globalPreference.value.filter((m) => m !== minutes)
  }
}

onMounted(() => {
  setHeader({ title: 'Reminders', backRoute: '/settings' })
  load()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Default reminders</p>
            <p class="text-sm text-white/60">
              Applied to every tournament you register for. Choose when to be reminded.
            </p>
          </div>

          <div v-if="loading" class="flex justify-center p-4">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
          </div>

          <div v-else class="flex flex-col gap-2">
            <label
              v-for="choice in INTERVAL_CHOICES"
              :key="choice.value"
              class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer hover:bg-white/10"
            >
              <span class="text-sm">{{ choice.label }}</span>
              <USwitch
                :model-value="globalPreference.includes(choice.value)"
                @update:model-value="toggleInterval(choice.value)"
              />
            </label>

            <p v-if="globalPreference.length === 0" class="text-xs text-amber-300">
              You've disabled all reminders. You won't be notified of upcoming tournaments.
            </p>
          </div>

          <UButton color="primary" :loading="saving" :disabled="loading" @click="saveGlobal">
            Save preferences
          </UButton>
        </div>
      </UCard>

      <UCard v-if="preferences.some((p) => p.tournamentId)" class="bg-white/5">
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Per-tournament overrides</p>
            <p class="text-sm text-white/60">Custom intervals for specific tournaments.</p>
          </div>
          <ul class="flex flex-col gap-2">
            <li
              v-for="p in preferences.filter((x) => !!x.tournamentId)"
              :key="p.id"
              class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <p class="text-white/70 truncate">Tournament: {{ p.tournamentId }}</p>
              <p class="text-xs text-white/50">{{ p.intervalsMinutes.join(' min, ') }} min</p>
            </li>
          </ul>
        </div>
      </UCard>
    </section>
  </PageLayout>
</template>
