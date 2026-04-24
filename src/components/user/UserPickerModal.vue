<script setup lang="ts">
import { ref, watch } from 'vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type UserLookupItem = components['schemas']['UserLookupItemDto']

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    placeholder?: string
    confirmLabel?: string
    loading?: boolean
    excludeUserIds?: string[]
  }>(),
  {
    title: 'Select a user',
    description: '',
    placeholder: 'Search by name, username, or email',
    confirmLabel: 'Confirm',
    loading: false,
    excludeUserIds: () => [],
  },
)

const emit = defineEmits<{
  select: [user: UserLookupItem]
}>()

const open = defineModel<boolean>('open', { default: false })

const searchTerm = ref('')
const selected = ref<UserLookupItem | null>(null)
const results = ref<UserLookupItem[]>([])
const searchLoading = ref(false)
const searchError = ref('')

let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(
  () => open.value,
  (isOpen) => {
    if (!isOpen) {
      searchTerm.value = ''
      selected.value = null
      results.value = []
      searchError.value = ''
    }
  },
)

watch(searchTerm, (term) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchError.value = ''
  if (!term || term.trim().length < 2) {
    results.value = []
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const { data, error } = await apiClient.GET('/v1/user/lookup', {
        params: { query: { q: term.trim() } },
      })
      if (error) throw new Error(getErrorMessage(error, 'Failed to search users'))
      const excluded = new Set(props.excludeUserIds)
      results.value = (data?.users ?? []).filter((u) => !excluded.has(u.id))
    } catch (e) {
      results.value = []
      searchError.value = getErrorMessage(e, 'Failed to search users')
    } finally {
      searchLoading.value = false
    }
  }, 300)
})

function displayName(u: UserLookupItem) {
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ')
  return full || u.name || u.username || u.email || 'Unknown user'
}

function pick(user: UserLookupItem) {
  selected.value = user
}

function confirm() {
  if (!selected.value) return
  emit('select', selected.value)
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <div>
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <p v-if="description" class="text-sm text-white/60 mt-1">{{ description }}</p>
        </div>

        <UInput
          v-model="searchTerm"
          :placeholder="placeholder"
          icon="i-lucide-search"
          autofocus
          aria-label="Search users"
        />

        <div class="max-h-72 overflow-y-auto -mx-2" role="listbox" aria-label="Search results">
          <div v-if="searchLoading" class="flex justify-center py-6">
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-white/50" />
          </div>
          <template v-else-if="results.length">
            <button
              v-for="user in results"
              :key="user.id"
              type="button"
              role="option"
              :aria-selected="selected?.id === user.id"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
              :class="selected?.id === user.id ? 'bg-primary/15' : 'hover:bg-white/5'"
              @click="pick(user)"
            >
              <UIcon
                :name="selected?.id === user.id ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                class="size-4 shrink-0"
                :class="selected?.id === user.id ? 'text-primary' : 'text-white/30'"
              />
              <div class="flex flex-col min-w-0 flex-1">
                <span class="text-sm font-medium truncate">{{ displayName(user) }}</span>
                <span v-if="user.username" class="text-xs text-white/50 truncate">
                  @{{ user.username }}<span v-if="user.email"> · {{ user.email }}</span>
                </span>
                <span v-else-if="user.email" class="text-xs text-white/50 truncate">
                  {{ user.email }}
                </span>
              </div>
            </button>
          </template>
          <p
            v-else-if="searchTerm.trim().length >= 2 && !searchError"
            class="text-center text-sm text-white/40 py-6"
          >
            No users found
          </p>
          <p v-else-if="!searchTerm" class="text-center text-sm text-white/40 py-6">
            Start typing to search
          </p>
        </div>

        <p v-if="searchError" class="text-xs text-rose-400">{{ searchError }}</p>

        <div class="flex gap-2 justify-end">
          <UButton variant="ghost" color="neutral" @click="open = false">Cancel</UButton>
          <UButton :disabled="!selected" :loading="loading" @click="confirm">
            {{ confirmLabel }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
