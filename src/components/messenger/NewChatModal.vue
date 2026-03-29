<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'
import { useMessengerStore } from '@/stores/messenger'
import { useI18n } from 'vue-i18n'

type UserLookupItem = components['schemas']['UserLookupItemDto']

const { t } = useI18n()
const router = useRouter()
const messengerStore = useMessengerStore()

const open = defineModel<boolean>('open', { default: false })

const searchTerm = ref('')
const selectedUsers = ref<UserLookupItem[]>([])
const searchResults = ref<UserLookupItem[]>([])
const searchLoading = ref(false)
const creating = ref(false)
const error = ref('')

let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchTerm, (term) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!term || term.length < 2) {
    searchResults.value = []
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const { data: lookupData, error: lookupError } = await apiClient.GET('/v1/user/lookup', {
        params: { query: { q: term } },
      })
      if (lookupError) throw new Error(getErrorMessage(lookupError, 'Failed to search users'))
      searchResults.value = lookupData.users
    } catch {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }, 300)
})

function isSelected(user: UserLookupItem) {
  return selectedUsers.value.some((u) => u.id === user.id)
}

function toggleUser(user: UserLookupItem) {
  if (isSelected(user)) {
    selectedUsers.value = selectedUsers.value.filter((u) => u.id !== user.id)
  } else {
    selectedUsers.value = [...selectedUsers.value, user]
  }
}

function removeUser(user: UserLookupItem) {
  selectedUsers.value = selectedUsers.value.filter((u) => u.id !== user.id)
}

const isGroup = computed(() => selectedUsers.value.length > 1)

async function handleCreate() {
  if (selectedUsers.value.length === 0) return
  creating.value = true
  error.value = ''

  try {
    const recipientIds = selectedUsers.value.map((u) => u.id)
    const name = isGroup.value ? 'Group Chat' : undefined
    const chat = await messengerStore.createChat(recipientIds, name)
    open.value = false
    selectedUsers.value = []
    searchResults.value = []
    searchTerm.value = ''
    router.push(`/messenger/${chat.id}`)
  } catch {
    error.value = t('messenger.createerror')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <h2 class="text-lg font-semibold">{{ t('messenger.newchat') }}</h2>

        <UInput
          v-model="searchTerm"
          :placeholder="t('messenger.searchusers')"
          icon="i-lucide-search"
          autofocus
        />

        <!-- Selected users chips -->
        <div v-if="selectedUsers.length" class="flex flex-wrap gap-2">
          <UBadge
            v-for="user in selectedUsers"
            :key="user.id"
            color="primary"
            variant="subtle"
            class="cursor-pointer"
            @click="removeUser(user)"
          >
            {{ user.name || user.username }}
            <UIcon name="i-lucide-x" class="ml-1 size-3" />
          </UBadge>
        </div>

        <!-- Search results -->
        <div class="max-h-60 overflow-y-auto -mx-2">
          <div v-if="searchLoading" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-white/50" />
          </div>
          <template v-else-if="searchResults.length">
            <button
              v-for="user in searchResults"
              :key="user.id"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
              :class="isSelected(user) ? 'bg-primary/15' : 'hover:bg-white/5'"
              @click="toggleUser(user)"
            >
              <UIcon
                :name="isSelected(user) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                class="size-4 shrink-0"
                :class="isSelected(user) ? 'text-primary' : 'text-white/30'"
              />
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-medium truncate">{{ user.name || user.username }}</span>
                <span v-if="user.email" class="text-xs text-white/50 truncate">{{ user.email }}</span>
              </div>
            </button>
          </template>
          <p v-else-if="searchTerm.length >= 2" class="text-center text-sm text-white/40 py-4">
            {{ t('messenger.noresults') }}
          </p>
        </div>

        <p v-if="isGroup" class="text-xs text-white/50">
          {{ t('messenger.groupchatnote') }}
        </p>

        <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

        <UButton
          block
          :loading="creating"
          :disabled="selectedUsers.length === 0"
          @click="handleCreate"
        >
          {{ isGroup ? t('messenger.creategroup') : t('messenger.startchat') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
