<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

const { t } = useI18n()

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  selected: Sport[]
}>()

const emit = defineEmits<{
  (e: 'update', sports: Sport[]): void
}>()

const allSports = ref<Sport[]>([])
const loading = ref(false)
const searchTerm = ref('')
const localSelected = ref<Sport[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const { data: sportsData, error: sportsError } = await apiClient.GET('/v1/sports')
    if (sportsError) throw new Error(getErrorMessage(sportsError, 'Failed to load sports'))
    allSports.value = sportsData
  } catch {
    allSports.value = []
  } finally {
    loading.value = false
  }
})

// Sync local selection when modal opens
import { watch } from 'vue'
watch(open, (isOpen) => {
  if (isOpen) {
    localSelected.value = [...props.selected]
    searchTerm.value = ''
  }
})

const filteredSports = computed(() => {
  if (!searchTerm.value) return allSports.value
  const term = searchTerm.value.toLowerCase()
  return allSports.value.filter((s) => s.name.toLowerCase().includes(term))
})

function isSelected(sport: Sport) {
  return localSelected.value.some((s) => s.id === sport.id)
}

function toggleSport(sport: Sport) {
  if (isSelected(sport)) {
    localSelected.value = localSelected.value.filter((s) => s.id !== sport.id)
  } else {
    localSelected.value = [...localSelected.value, sport]
  }
}

function confirm() {
  emit('update', localSelected.value)
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <h2 class="text-lg font-semibold">{{ t('settings.pickSports') }}</h2>

        <UInput
          v-model="searchTerm"
          :placeholder="t('settings.searchSports')"
          icon="i-lucide-search"
          autofocus
        />

        <!-- Selected sports chips -->
        <div v-if="localSelected.length" class="flex flex-wrap gap-2">
          <UBadge
            v-for="sport in localSelected"
            :key="sport.id"
            color="primary"
            variant="subtle"
            class="cursor-pointer"
            @click="toggleSport(sport)"
          >
            {{ sport.icon }} {{ sport.name }}
            <UIcon name="i-lucide-x" class="ml-1 size-3" />
          </UBadge>
        </div>

        <!-- Sports list -->
        <div class="max-h-60 overflow-y-auto -mx-2">
          <div v-if="loading" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-white/50" />
          </div>
          <template v-else-if="filteredSports.length">
            <button
              v-for="sport in filteredSports"
              :key="sport.id"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
              :class="isSelected(sport) ? 'bg-primary/15' : 'hover:bg-white/5'"
              @click="toggleSport(sport)"
            >
              <UIcon
                :name="isSelected(sport) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                class="size-4 shrink-0"
                :class="isSelected(sport) ? 'text-primary' : 'text-white/30'"
              />
              <span class="text-sm font-medium"> {{ sport.icon }} {{ sport.name }} </span>
            </button>
          </template>
          <p v-else-if="searchTerm" class="text-center text-sm text-white/40 py-4">
            {{ t('settings.noSportsFound') }}
          </p>
        </div>

        <UButton block @click="confirm">
          {{ t('settings.confirmSports') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
