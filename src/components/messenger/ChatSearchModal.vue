<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type SearchMessageHit = components['schemas']['SearchMessageHitDto']

const props = defineProps<{
  chatId: string
}>()

const emit = defineEmits<{
  select: [hit: SearchMessageHit]
}>()

const { t } = useI18n()
const toast = useToastStore()
const open = defineModel<boolean>('open', { default: false })

const searchTerm = ref('')
const results = ref<SearchMessageHit[]>([])
const total = ref(0)
const loading = ref(false)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchTerm, (term) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!term || term.length < 2) {
    results.value = []
    total.value = 0
    loading.value = false
    return
  }
  loading.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const { data: searchData, error: searchError } = await apiClient.GET(
        '/v1/chats/search/{chatId}',
        {
          params: {
            path: { chatId: props.chatId },
            query: { q: term, per_page: 50, limit: 20 },
          },
        },
      )
      if (searchError) throw new Error(getErrorMessage(searchError, 'Failed to search messages'))
      results.value = searchData.hits
      total.value = searchData.total
    } catch (e) {
      results.value = []
      total.value = 0
      toast.error('Search failed', getErrorMessage(e, 'Failed to search messages'))
    } finally {
      loading.value = false
    }
  }, 300)
})

watch(open, (isOpen) => {
  if (!isOpen) {
    searchTerm.value = ''
    results.value = []
    total.value = 0
  }
})

function selectHit(hit: SearchMessageHit) {
  emit('select', hit)
  open.value = false
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function highlightMatch(content: string, query: string) {
  if (!query) return content
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return content.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="bg-primary/30 text-inherit rounded-sm px-0.5">$1</mark>',
  )
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <h2 class="text-lg font-semibold">{{ t('messenger.searchmessages') }}</h2>

        <UInput
          v-model="searchTerm"
          :placeholder="t('messenger.searchplaceholder')"
          icon="i-lucide-search"
          autofocus
          aria-label="Search messages"
        />

        <div class="max-h-80 overflow-y-auto -mx-2" role="listbox" aria-label="Search results">
          <div v-if="loading" class="flex justify-center py-4">
            <UIcon
              name="i-lucide-loader-2"
              class="size-5 animate-spin text-white/50"
              aria-label="Searching"
            />
          </div>

          <template v-else-if="results.length">
            <p class="px-3 pb-2 text-xs text-white/40">
              {{ total }} {{ total === 1 ? 'result' : 'results' }}
            </p>
            <button
              v-for="hit in results"
              :key="hit.id"
              type="button"
              role="option"
              class="w-full flex flex-col gap-0.5 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/5 focus:bg-white/5 focus:outline-none"
              @click="selectHit(hit)"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-medium text-white/60 truncate">{{ hit.senderName }}</span>
                <span class="text-xs text-white/30 shrink-0">{{ formatTime(hit.createdAt) }}</span>
              </div>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <p
                class="text-sm text-white/80 line-clamp-2"
                v-html="highlightMatch(hit.content, searchTerm)"
              />
            </button>
          </template>

          <div
            v-else-if="searchTerm.length >= 2 && !loading"
            class="flex flex-col items-center gap-2 py-6 text-white/40"
          >
            <UIcon name="i-lucide-search-x" class="size-6" aria-hidden="true" />
            <p class="text-sm">{{ t('messenger.nosearchresults') }}</p>
          </div>
          <div v-else-if="!searchTerm" class="flex flex-col items-center gap-2 py-6 text-white/40">
            <UIcon name="i-lucide-search" class="size-6" aria-hidden="true" />
            <p class="text-sm">Type at least 2 characters to search.</p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
