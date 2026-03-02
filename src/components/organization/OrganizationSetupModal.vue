<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/lib/api/client'
import { useOrganizationStore } from '@/stores/organization'
import type { components } from '@/types/api'

type OrganizationResponseDto = components['schemas']['OrganizationResponseDto']

const orgStore = useOrganizationStore()

const activeTab = ref<'create' | 'join'>('create')

// Create tab state
const newOrgName = ref('')
const createLoading = ref(false)
const createError = ref('')

// Join tab state
const organizations = ref<OrganizationResponseDto[]>([])
const orgsLoading = ref(false)
const joiningId = ref<string | null>(null)
const joinError = ref('')

async function loadOrganizations() {
  orgsLoading.value = true
  try {
    const { data, error } = await apiClient.GET('/v1/organizations', {
      params: { query: { per_page: 50, page: 1 } },
    })
    if (error) {
      console.error('Failed to load organizations:', error)
      return
    }
    organizations.value = data.data ?? []
  } finally {
    orgsLoading.value = false
  }
}

async function handleCreate() {
  if (!newOrgName.value.trim()) return
  createLoading.value = true
  createError.value = ''
  try {
    await orgStore.createOrganization(newOrgName.value.trim())
  } catch (e) {
    createError.value = 'Failed to create organization. Please try again.'
  } finally {
    createLoading.value = false
  }
}

async function handleJoin(id: string) {
  joiningId.value = id
  joinError.value = ''
  try {
    await orgStore.joinOrganization(id)
  } catch (e) {
    joinError.value = 'Failed to join organization. Please try again.'
  } finally {
    joiningId.value = null
  }
}

onMounted(() => {
  loadOrganizations()
})
</script>

<template>
  <UModal :open="true" :dismissible="false">
    <template #content>
      <div class="p-6">
        <div class="text-center mb-6">
          <UIcon name="i-fa6-solid:building" class="text-3xl text-[var(--ui-color-primary-500)] mb-2" />
          <h2 class="text-lg font-semibold">Welcome to FitTime</h2>
          <p class="text-sm text-white/50 mt-1">Join or create an organization to get started.</p>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 mb-5 rounded-lg bg-white/5 p-1">
          <button
            class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'create' ? 'bg-[var(--ui-color-primary-500)] text-white' : 'text-white/60 hover:text-white'"
            @click="activeTab = 'create'"
          >
            Create New
          </button>
          <button
            class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'join' ? 'bg-[var(--ui-color-primary-500)] text-white' : 'text-white/60 hover:text-white'"
            @click="activeTab = 'join'"
          >
            Join Existing
          </button>
        </div>

        <!-- Create tab -->
        <div v-if="activeTab === 'create'" class="space-y-4">
          <UFormField label="Organization name">
            <UInput
              v-model="newOrgName"
              placeholder="e.g. Downtown Fitness Club"
              @keydown.enter="handleCreate"
            />
          </UFormField>
          <p v-if="createError" class="text-xs text-red-400">{{ createError }}</p>
          <UButton
            block
            :loading="createLoading"
            :disabled="!newOrgName.trim()"
            @click="handleCreate"
          >
            Create Organization
          </UButton>
        </div>

        <!-- Join tab -->
        <div v-else class="space-y-3">
          <div v-if="orgsLoading" class="flex justify-center py-8">
            <UIcon name="i-fa6-solid:spinner" class="text-xl text-white/40 animate-spin" />
          </div>

          <div v-else-if="organizations.length === 0" class="text-center py-8 text-white/40 text-sm">
            No organizations available to join.
          </div>

          <div v-else class="max-h-64 overflow-y-auto space-y-2">
            <div
              v-for="org in organizations"
              :key="org.id"
              class="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ org.name }}</p>
                <p class="text-xs text-white/40">{{ org.memberCount }} {{ org.memberCount === 1 ? 'member' : 'members' }}</p>
              </div>
              <UButton
                size="sm"
                :loading="joiningId === org.id"
                :disabled="joiningId !== null"
                @click="handleJoin(org.id)"
              >
                Join
              </UButton>
            </div>
          </div>

          <p v-if="joinError" class="text-xs text-red-400">{{ joinError }}</p>
        </div>
      </div>
    </template>
  </UModal>
</template>
