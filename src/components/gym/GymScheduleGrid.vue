<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import { useGymPermissions } from '@/composables/useGymPermissions'
import { useMyTeamsStore } from '@/stores/myTeams'
import ReserveSlotModal from './ReserveSlotModal.vue'
import CloseSlotModal from './CloseSlotModal.vue'
import type { components } from '@/types/api'

type EffectiveSlot = components['schemas']['EffectiveSlotDto']

const props = defineProps<{
  gymId: string
  organizationId: string | null
  mode?: 'browse' | 'manage'
}>()

const mode = computed(() => props.mode ?? 'browse')
const toast = useToastStore()
const myTeams = useMyTeamsStore()
const { canManage, canReserve } = useGymPermissions(() => props.organizationId)

const segments = ref<EffectiveSlot[]>([])
const loading = ref(false)
const error = ref('')

function toDateInputValue(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const selectedDate = ref(toDateInputValue(new Date()))

const windowFrom = computed(() => {
  const [y, m, day] = selectedDate.value.split('-').map(Number)
  const d = new Date()
  d.setFullYear(y, (m ?? 1) - 1, day ?? 1)
  d.setHours(0, 0, 0, 0)
  return d
})

const windowTo = computed(() => {
  const d = new Date(windowFrom.value)
  d.setDate(d.getDate() + 1)
  return d
})

function shiftDay(delta: number) {
  const d = new Date(windowFrom.value)
  d.setDate(d.getDate() + delta)
  selectedDate.value = toDateInputValue(d)
}
function goToday() {
  selectedDate.value = toDateInputValue(new Date())
}

const rangeLabel = computed(() =>
  windowFrom.value.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/gyms/{id}/effective-availability', {
      params: {
        path: { id: props.gymId },
        query: {
          from: windowFrom.value.toISOString(),
          to: windowTo.value.toISOString(),
        },
      },
    })
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load availability')
      return
    }
    segments.value = data ?? []
  } finally {
    loading.value = false
  }
}

watch(() => [props.gymId, selectedDate.value] as const, load, { immediate: true })

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function teamLabel(teamId: string | null | undefined) {
  if (!teamId) return null
  return myTeams.teams.find((t) => t.id === teamId)?.name ?? null
}

function statusTone(status: EffectiveSlot['status']) {
  switch (status) {
    case 'AVAILABLE':
      return 'success'
    case 'RESERVED':
      return 'warning'
    case 'CLOSED':
      return 'neutral'
  }
}

function isMyReservation(seg: EffectiveSlot) {
  if (seg.status !== 'RESERVED' || !seg.reservedByTeamId) return false
  return myTeams.captainTeams.some((t) => t.id === seg.reservedByTeamId)
}

const reserveOpen = ref(false)
const closeOpen = ref(false)
const activeWindow = ref<{ start: string; end: string } | null>(null)

function openReserveFor(seg: EffectiveSlot) {
  activeWindow.value = { start: seg.startsAt, end: seg.endsAt }
  reserveOpen.value = true
}

function openCloseFor(seg: EffectiveSlot) {
  activeWindow.value = { start: seg.startsAt, end: seg.endsAt }
  closeOpen.value = true
}

const cancelConfirmOpen = ref(false)
const cancelTarget = ref<EffectiveSlot | null>(null)
const cancelLoading = ref(false)

function askCancel(seg: EffectiveSlot) {
  cancelTarget.value = seg
  cancelConfirmOpen.value = true
}

async function confirmCancel() {
  if (!cancelTarget.value?.slotId) return
  cancelLoading.value = true
  try {
    const { error: err } = await apiClient.DELETE('/v1/gyms/{id}/reservations/{slotId}', {
      params: { path: { id: props.gymId, slotId: cancelTarget.value.slotId } },
    })
    if (err) {
      toast.error(
        'Could not cancel reservation',
        getErrorMessage(err, 'Failed to cancel reservation'),
      )
      return
    }
    toast.success('Reservation cancelled')
    cancelConfirmOpen.value = false
    cancelTarget.value = null
    await load()
  } finally {
    cancelLoading.value = false
  }
}

async function reopenClosure(seg: EffectiveSlot) {
  if (!seg.slotId) return
  const { error: err } = await apiClient.DELETE('/v1/gyms/{id}/closures/{slotId}', {
    params: { path: { id: props.gymId, slotId: seg.slotId } },
  })
  if (err) {
    toast.error('Could not reopen window', getErrorMessage(err, 'Failed to reopen'))
    return
  }
  toast.success('Window reopened')
  await load()
}
</script>

<template>
  <UCard class="bg-white/5">
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">Schedule</p>
          <p class="text-sm text-white/60">{{ rangeLabel }}</p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            icon="i-lucide-chevron-left"
            aria-label="Previous day"
            @click="shiftDay(-1)"
          />
          <UButton size="xs" variant="outline" color="neutral" @click="goToday">Today</UButton>
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            icon="i-lucide-chevron-right"
            aria-label="Next day"
            @click="shiftDay(1)"
          />
        </div>
      </div>

      <UFormField label="Date">
        <UInput v-model="selectedDate" type="date" icon="i-lucide-calendar" />
      </UFormField>

      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <div v-if="loading" class="flex flex-col gap-2">
        <div
          v-for="n in 4"
          :key="n"
          class="h-12 rounded-lg border border-white/10 bg-white/5 animate-pulse"
        />
      </div>

      <div
        v-else-if="segments.length === 0"
        class="flex flex-col items-center gap-1 rounded-lg border border-dashed border-white/10 p-6 text-center"
      >
        <UIcon name="i-lucide-calendar-x" class="size-6 text-white/40" />
        <p class="text-sm text-white/60">Closed all day.</p>
        <p v-if="mode === 'manage'" class="text-xs text-white/40">
          Edit the weekly schedule or add an exception to open hours.
        </p>
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="(seg, idx) in segments"
          :key="`${seg.startsAt}-${seg.endsAt}-${seg.slotId ?? idx}`"
          class="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"
          :class="{
            'bg-success/5 border-success/20': seg.status === 'AVAILABLE',
            'bg-warning/5 border-warning/20': seg.status === 'RESERVED',
            'bg-white/5': seg.status === 'CLOSED',
          }"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium">
              {{ formatTime(seg.startsAt) }} – {{ formatTime(seg.endsAt) }}
            </p>
            <p
              v-if="seg.status === 'RESERVED' && teamLabel(seg.reservedByTeamId)"
              class="text-xs text-white/60"
            >
              {{ teamLabel(seg.reservedByTeamId) }}
            </p>
            <p v-if="seg.note" class="text-xs text-white/50 truncate">{{ seg.note }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UBadge :color="statusTone(seg.status)" variant="soft" size="xs">
              {{ seg.status }}
            </UBadge>

            <UButton
              v-if="seg.status === 'AVAILABLE' && canReserve"
              size="xs"
              icon="i-lucide-calendar-plus"
              @click="openReserveFor(seg)"
            >
              Reserve
            </UButton>

            <UButton
              v-if="seg.status === 'AVAILABLE' && mode === 'manage' && canManage"
              size="xs"
              variant="outline"
              color="neutral"
              icon="i-lucide-ban"
              @click="openCloseFor(seg)"
            >
              Close
            </UButton>

            <UButton
              v-if="
                seg.status === 'RESERVED' &&
                (isMyReservation(seg) || (mode === 'manage' && canManage))
              "
              size="xs"
              variant="outline"
              color="error"
              icon="i-lucide-x"
              @click="askCancel(seg)"
            >
              Cancel
            </UButton>

            <UButton
              v-if="seg.status === 'CLOSED' && mode === 'manage' && canManage"
              size="xs"
              variant="outline"
              color="neutral"
              icon="i-lucide-undo-2"
              @click="reopenClosure(seg)"
            >
              Reopen
            </UButton>
          </div>
        </li>
      </ul>
    </div>

    <ReserveSlotModal
      v-if="activeWindow"
      v-model:open="reserveOpen"
      :gym-id="props.gymId"
      :window-start="activeWindow.start"
      :window-end="activeWindow.end"
      @reserved="load"
    />

    <CloseSlotModal
      v-if="activeWindow"
      v-model:open="closeOpen"
      :gym-id="props.gymId"
      :window-start="activeWindow.start"
      :window-end="activeWindow.end"
      @closed="load"
    />

    <UModal v-model:open="cancelConfirmOpen" :dismissible="!cancelLoading">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-start gap-3">
            <div class="rounded-full bg-error/10 p-2 shrink-0">
              <UIcon name="i-lucide-x" class="size-5 text-error" />
            </div>
            <div class="flex flex-col gap-1">
              <h2 class="text-lg font-semibold">Cancel this reservation?</h2>
              <p class="text-sm text-white/60">
                The window will become available again. Watchers will be notified.
              </p>
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="cancelLoading"
              @click="cancelConfirmOpen = false"
            >
              Keep
            </UButton>
            <UButton color="error" :loading="cancelLoading" @click="confirmCancel">
              Cancel reservation
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
