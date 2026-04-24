<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type UserLookupItem = components['schemas']['UserLookupItemDto']

useHead({ title: 'Moderation · Users' })

const { setHeader } = usePageHeader()
const toast = useToastStore()

const query = ref('')
const results = ref<UserLookupItem[]>([])
const searching = ref(false)
let debounce: ReturnType<typeof setTimeout> | null = null

const action = ref<
  | null
  | {
      kind: 'suspend'
      userId: string
      hours: number
      reason: string
    }
  | {
      kind: 'ban'
      userId: string
      reason: string
    }
  | {
      kind: 'restrict'
      userId: string
      actions: ('MESSAGING' | 'TEAM_JOIN' | 'TOURNAMENT_REGISTER')[]
      hours: number
      reason: string
    }
>(null)

function onSearch() {
  if (debounce) clearTimeout(debounce)
  if (!query.value.trim() || query.value.trim().length < 2) {
    results.value = []
    return
  }
  searching.value = true
  debounce = setTimeout(async () => {
    try {
      const { data, error: err } = await apiClient.GET('/v1/user/lookup', {
        params: { query: { q: query.value.trim() } },
      })
      if (err) {
        toast.error('Lookup failed', getErrorMessage(err, 'Failed to search'))
        return
      }
      results.value = data?.users ?? []
    } finally {
      searching.value = false
    }
  }, 300)
}

function openSuspend(userId: string) {
  action.value = { kind: 'suspend', userId, hours: 24, reason: '' }
}
function openBan(userId: string) {
  action.value = { kind: 'ban', userId, reason: '' }
}
function openRestrict(userId: string) {
  action.value = { kind: 'restrict', userId, actions: ['MESSAGING'], hours: 24, reason: '' }
}
function cancel() {
  action.value = null
}

async function suspend(): Promise<void> {
  if (!action.value || action.value.kind !== 'suspend') return
  const { userId, hours, reason } = action.value
  if (!reason.trim()) {
    toast.warning('Reason required')
    return
  }
  const { error: err } = await apiClient.POST('/v1/moderation/users/{userId}/suspend', {
    params: { path: { userId } },
    body: { durationHours: hours, reason: reason.trim() },
  })
  if (err) {
    toast.error('Could not suspend user', getErrorMessage(err, 'Suspend failed'))
    return
  }
  toast.success('User suspended')
  action.value = null
}

async function ban(): Promise<void> {
  if (!action.value || action.value.kind !== 'ban') return
  const { userId, reason } = action.value
  if (!reason.trim()) {
    toast.warning('Reason required')
    return
  }
  if (!confirm('Ban is permanent until revoked. Proceed?')) return
  const { error: err } = await apiClient.POST('/v1/moderation/users/{userId}/ban', {
    params: { path: { userId } },
    body: { reason: reason.trim() },
  })
  if (err) {
    toast.error('Could not ban user', getErrorMessage(err, 'Ban failed'))
    return
  }
  toast.success('User banned')
  action.value = null
}

async function restrict(): Promise<void> {
  if (!action.value || action.value.kind !== 'restrict') return
  const { userId, actions, hours, reason } = action.value
  if (!reason.trim()) {
    toast.warning('Reason required')
    return
  }
  if (actions.length === 0) {
    toast.warning('Select at least one action')
    return
  }
  const { error: err } = await apiClient.POST('/v1/moderation/users/{userId}/restrict', {
    params: { path: { userId } },
    body: { actions, durationHours: hours, reason: reason.trim() },
  })
  if (err) {
    toast.error('Could not restrict user', getErrorMessage(err, 'Restrict failed'))
    return
  }
  toast.success('User restrictions applied')
  action.value = null
}

function toggleRestrictionAction(
  value: 'MESSAGING' | 'TEAM_JOIN' | 'TOURNAMENT_REGISTER'
) {
  if (!action.value || action.value.kind !== 'restrict') return
  const idx = action.value.actions.indexOf(value)
  if (idx === -1) {
    action.value.actions = [...action.value.actions, value]
  } else {
    action.value.actions = action.value.actions.filter((a) => a !== value)
  }
}

onMounted(() => {
  setHeader({ title: 'Moderation · Users', backRoute: '/settings' })
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <UCard class="bg-white/5">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="Search users by name, email, or username"
          @update:model-value="onSearch"
        />
      </UCard>

      <div v-if="searching" class="flex justify-center p-4">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
      </div>

      <ul v-else-if="results.length > 0" class="flex flex-col gap-2">
        <li
          v-for="u in results"
          :key="u.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{{ u.name || u.username || u.id }}</p>
            <p class="text-xs text-white/50 truncate">{{ u.email }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              variant="outline"
              color="warning"
              icon="i-lucide-shield-alert"
              @click="openRestrict(u.id)"
            >
              Restrict
            </UButton>
            <UButton
              size="xs"
              variant="outline"
              color="warning"
              icon="i-lucide-pause-circle"
              @click="openSuspend(u.id)"
            >
              Suspend
            </UButton>
            <UButton
              size="xs"
              variant="outline"
              color="error"
              icon="i-lucide-ban"
              @click="openBan(u.id)"
            >
              Ban
            </UButton>
          </div>
        </li>
      </ul>

      <p
        v-else-if="query.length >= 2"
        class="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-white/50"
      >
        No users match.
      </p>
    </section>

    <!-- Suspend modal -->
    <UModal :open="action?.kind === 'suspend'" @update:open="cancel">
      <template #content>
        <div v-if="action && action.kind === 'suspend'" class="p-6 flex flex-col gap-3">
          <h3 class="text-lg font-semibold">Suspend user</h3>
          <UFormField label="Duration (hours)">
            <UInput v-model.number="action.hours" type="number" min="1" />
          </UFormField>
          <UFormField label="Reason">
            <UTextarea v-model="action.reason" :rows="3" autofocus />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="cancel">Cancel</UButton>
            <UButton color="warning" @click="suspend">Suspend</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Ban modal -->
    <UModal :open="action?.kind === 'ban'" @update:open="cancel">
      <template #content>
        <div v-if="action && action.kind === 'ban'" class="p-6 flex flex-col gap-3">
          <h3 class="text-lg font-semibold">Ban user</h3>
          <p class="text-sm text-rose-300">
            Bans are permanent until explicitly revoked. The user will be signed out immediately.
          </p>
          <UFormField label="Reason">
            <UTextarea v-model="action.reason" :rows="3" autofocus />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="cancel">Cancel</UButton>
            <UButton color="error" @click="ban">Ban</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Restrict modal -->
    <UModal :open="action?.kind === 'restrict'" @update:open="cancel">
      <template #content>
        <div v-if="action && action.kind === 'restrict'" class="p-6 flex flex-col gap-3">
          <h3 class="text-lg font-semibold">Restrict actions</h3>

          <UFormField label="Actions to restrict">
            <div class="flex flex-col gap-2">
              <label
                v-for="a in ['MESSAGING', 'TEAM_JOIN', 'TOURNAMENT_REGISTER'] as const"
                :key="a"
                class="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 cursor-pointer"
              >
                <UCheckbox
                  :model-value="action.actions.includes(a)"
                  @update:model-value="toggleRestrictionAction(a)"
                />
                <span class="text-sm">{{ a }}</span>
              </label>
            </div>
          </UFormField>

          <UFormField label="Duration (hours)">
            <UInput v-model.number="action.hours" type="number" min="1" />
          </UFormField>

          <UFormField label="Reason">
            <UTextarea v-model="action.reason" :rows="3" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="cancel">Cancel</UButton>
            <UButton color="warning" @click="restrict">Apply</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
