<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { useToastStore } from '@/stores/toast'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Appeal = components['schemas']['SuspensionAppealResponseDto']
type Decision = 'APPROVED' | 'DENIED'

useHead({ title: 'Suspension appeals' })

const { setHeader } = usePageHeader()
const toast = useToastStore()

const appeals = ref<Appeal[]>([])
const loading = ref(false)
const error = ref('')

const decisionOpen = ref(false)
const target = ref<Appeal | null>(null)
const decision = ref<Decision>('APPROVED')
const reason = ref('')
const submitting = ref(false)

onMounted(async () => {
  setHeader({ title: 'Suspension appeals', backRoute: '/settings' })
  await load()
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/moderation/suspension-appeals')
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load appeals')
      return
    }
    appeals.value = data ?? []
  } finally {
    loading.value = false
  }
}

function startDecision(appeal: Appeal, initialDecision: Decision) {
  target.value = appeal
  decision.value = initialDecision
  reason.value = ''
  decisionOpen.value = true
}

async function submitDecision() {
  if (!target.value || submitting.value) return
  submitting.value = true
  try {
    const { error: err } = await apiClient.POST(
      '/v1/moderation/suspension-appeals/{id}/decide',
      {
        params: { path: { id: target.value.id } },
        body: { decision: decision.value, reason: reason.value.trim() || undefined },
      },
    )
    if (err) {
      toast.error('Could not record decision', getErrorMessage(err, 'Failed'))
      return
    }
    toast.success(`Appeal ${decision.value.toLowerCase()}`)
    decisionOpen.value = false
    target.value = null
    await load()
  } finally {
    submitting.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <p class="text-sm text-white/60">
        Pending suspension appeals from suspended users. Approving an appeal lifts the suspension
        immediately.
      </p>

      <div v-if="loading && appeals.length === 0" class="flex flex-col gap-2">
        <div
          v-for="n in 3"
          :key="n"
          class="h-20 rounded-lg border border-white/10 bg-white/5 animate-pulse"
        />
      </div>

      <div
        v-else-if="appeals.length === 0"
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-8 text-center"
      >
        <UIcon name="i-lucide-shield-check" class="size-8 text-white/40" />
        <p class="text-sm font-medium text-white/70">No pending appeals</p>
      </div>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="a in appeals"
          :key="a.id"
          class="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-medium">User {{ a.userId.slice(0, 8) }}</p>
              <p class="text-xs text-white/50">Submitted {{ formatDate(a.createdAt) }}</p>
            </div>
            <UBadge color="warning" variant="soft" size="xs">PENDING</UBadge>
          </div>
          <p class="text-sm text-white/80 whitespace-pre-wrap">{{ a.message }}</p>
          <div class="flex gap-2 justify-end">
            <UButton
              size="xs"
              variant="outline"
              color="error"
              icon="i-lucide-x"
              @click="startDecision(a, 'DENIED')"
            >
              Deny
            </UButton>
            <UButton size="xs" icon="i-lucide-check" @click="startDecision(a, 'APPROVED')">
              Approve
            </UButton>
          </div>
        </li>
      </ul>
    </section>

    <UModal v-model:open="decisionOpen" :dismissible="!submitting">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <h2 class="text-lg font-semibold">
              {{ decision === 'APPROVED' ? 'Approve' : 'Deny' }} appeal?
            </h2>
            <p class="text-sm text-white/60">
              {{
                decision === 'APPROVED'
                  ? 'The suspension will be lifted immediately.'
                  : 'The suspension stays in place. Optionally include a reason.'
              }}
            </p>
          </div>

          <UFormField label="Reason (optional)">
            <UTextarea v-model="reason" :rows="3" maxlength="1000" />
          </UFormField>

          <div class="flex gap-2 justify-end">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="submitting"
              @click="decisionOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              :color="decision === 'APPROVED' ? 'primary' : 'error'"
              :loading="submitting"
              @click="submitDecision"
            >
              {{ decision === 'APPROVED' ? 'Approve appeal' : 'Deny appeal' }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
