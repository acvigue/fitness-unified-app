<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type Slot = components['schemas']['GymSlotResponseDto']

const props = defineProps<{
  gymId: string
}>()

const toast = useToastStore()

const slots = ref<Slot[]>([])
const loading = ref(false)
const error = ref('')
const statusFilter = ref<'ALL' | 'AVAILABLE' | 'RESERVED' | 'CLOSED'>('ALL')
const dayOffset = ref(0)

const windowFrom = computed(() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + dayOffset.value)
  return d
})

const windowTo = computed(() => {
  const d = new Date(windowFrom.value)
  d.setDate(d.getDate() + 1)
  return d
})

const rangeLabel = computed(() =>
  windowFrom.value.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/gyms/availability', {
      params: {
        query: {
          gymId: props.gymId,
          from: windowFrom.value.toISOString(),
          to: windowTo.value.toISOString(),
          ...(statusFilter.value !== 'ALL' ? { status: statusFilter.value } : {}),
        },
      },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load availability')
      return
    }
    slots.value = data ?? []
  } finally {
    loading.value = false
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function statusTone(status: Slot['status']) {
  switch (status) {
    case 'AVAILABLE':
      return 'success'
    case 'RESERVED':
      return 'warning'
    case 'CLOSED':
      return 'neutral'
    default:
      return 'neutral'
  }
}

async function updateStatus(slot: Slot, newStatus: 'AVAILABLE' | 'RESERVED' | 'CLOSED') {
  const { error: err } = await apiClient.PATCH('/v1/gyms/{id}/slots/{slotId}/status', {
    params: { path: { id: props.gymId, slotId: slot.id } },
    body: { status: newStatus },
  })
  if (err) {
    toast.error('Could not update slot', getErrorMessage(err, 'Failed to update slot'))
    return
  }
  toast.success('Slot updated', 'Watchers will be notified.')
  await load()
}

watch(
  () => [props.gymId, statusFilter.value, dayOffset.value] as const,
  () => load(),
  { immediate: true }
)
</script>

<template>
  <UCard class="bg-white/5">
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">Slots</p>
          <p class="text-sm text-white/60">{{ rangeLabel }}</p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            icon="i-lucide-chevron-left"
            @click="dayOffset -= 1"
          />
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            @click="dayOffset = 0"
          >
            Today
          </UButton>
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            icon="i-lucide-chevron-right"
            @click="dayOffset += 1"
          />
        </div>
      </div>

      <UFormField label="Status">
        <USelect
          v-model="statusFilter"
          :items="[
            { label: 'All', value: 'ALL' },
            { label: 'Available', value: 'AVAILABLE' },
            { label: 'Reserved', value: 'RESERVED' },
            { label: 'Closed', value: 'CLOSED' },
          ]"
        />
      </UFormField>

      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <div v-if="loading" class="flex justify-center p-4">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
      </div>

      <div
        v-else-if="slots.length === 0"
        class="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-white/50"
      >
        No slots for this window.
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="slot in slots"
          :key="slot.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
        >
          <div>
            <p class="text-sm font-medium">
              {{ formatTime(slot.startsAt) }} – {{ formatTime(slot.endsAt) }}
            </p>
            <p v-if="slot.note" class="text-xs text-white/50">{{ slot.note }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="statusTone(slot.status)" variant="soft" size="xs">
              {{ slot.status }}
            </UBadge>
            <UDropdown
              :items="[
                [
                  { label: 'Mark available', icon: 'i-lucide-check', click: () => updateStatus(slot, 'AVAILABLE') },
                  { label: 'Mark reserved', icon: 'i-lucide-lock', click: () => updateStatus(slot, 'RESERVED') },
                  { label: 'Mark closed', icon: 'i-lucide-ban', click: () => updateStatus(slot, 'CLOSED') },
                ],
              ]"
            >
              <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-more-horizontal" />
            </UDropdown>
          </div>
        </li>
      </ul>
    </div>
  </UCard>
</template>
