<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Team = components['schemas']['TeamResponseDto']

const props = defineProps<{
  title?: string
  confirmLabel?: string
  excludeTeamIds?: string[]
}>()

const emit = defineEmits<{
  (e: 'select', team: Team): void
}>()

const open = defineModel<boolean>('open', { default: false })

const allTeams = ref<Team[]>([])
const searchTerm = ref('')
const loading = ref(false)
const loadError = ref('')

async function loadTeams() {
  loading.value = true
  loadError.value = ''
  try {
    const { data, error } = await apiClient.GET('/v1/teams')
    if (error) {
      loadError.value = getErrorMessage(error, 'Failed to load teams')
      return
    }
    allTeams.value = data ?? []
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load teams'
  } finally {
    loading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    searchTerm.value = ''
    loadTeams()
  }
})

const excludeSet = computed(() => new Set(props.excludeTeamIds ?? []))
const filtered = computed(() => {
  const q = searchTerm.value.trim().toLowerCase()
  return allTeams.value
    .filter((t) => !excludeSet.value.has(t.id))
    .filter((t) => !q || t.name.toLowerCase().includes(q))
})

function handleSelect(team: Team) {
  emit('select', team)
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <h2 class="text-lg font-semibold">{{ title ?? 'Select a Team' }}</h2>

        <UInput v-model="searchTerm" placeholder="Search teams..." icon="i-lucide-search" />

        <UAlert v-if="loadError" color="error" :title="loadError" icon="i-lucide-circle-alert" />

        <div class="max-h-80 overflow-y-auto -mx-2">
          <div v-if="loading" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-white/50" />
          </div>
          <template v-else-if="filtered.length">
            <button
              v-for="team in filtered"
              :key="team.id"
              class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors"
              @click="handleSelect(team)"
            >
              <span class="text-sm font-medium truncate">{{ team.name }}</span>
              <UButton size="xs" variant="ghost" color="primary" class="shrink-0">
                {{ confirmLabel ?? 'Select' }}
              </UButton>
            </button>
          </template>
          <p v-else class="text-center text-sm text-white/40 py-6">No teams found.</p>
        </div>
      </div>
    </template>
  </UModal>
</template>
