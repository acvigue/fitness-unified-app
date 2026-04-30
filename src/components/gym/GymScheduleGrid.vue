<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import { useGymPermissions } from '@/composables/useGymPermissions'
import { useMyTeamsStore } from '@/stores/myTeams'
import ReserveSlotModal from './ReserveSlotModal.vue'
import CloseSlotModal from './CloseSlotModal.vue'
import DatePicker from '@/components/datetime/DatePicker.vue'
import { dateToYmd, ymdToDate } from '@/utils/datetime'
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

// 1 column on mobile via CSS, 3 columns on sm+ — always fetch 3 days.
const VISIBLE_DAYS = 3
const FALLBACK_START_HOUR = 6
const FALLBACK_END_HOUR = 22
const HOUR_PX = 56 // visual scale: 56px per hour

const segments = ref<EffectiveSlot[]>([])
const loading = ref(false)
const error = ref('')

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const selectedDate = ref(dateToYmd(new Date()))

const windowFrom = computed(() => ymdToDate(selectedDate.value))
const windowTo = computed(() => addDays(windowFrom.value, VISIBLE_DAYS))

function shiftDay(delta: number) {
  selectedDate.value = dateToYmd(addDays(windowFrom.value, delta))
}
function goToday() {
  selectedDate.value = dateToYmd(new Date())
}

interface DayBucket {
  date: Date
  midnightMs: number
  label: string
  shortLabel: string
  isToday: boolean
  segments: EffectiveSlot[]
}

const todayMs = computed(() => startOfDay(new Date()).getTime())

const days = computed<DayBucket[]>(() => {
  const out: DayBucket[] = []
  for (let i = 0; i < VISIBLE_DAYS; i++) {
    const d = addDays(windowFrom.value, i)
    const midnight = startOfDay(d).getTime()
    const dayEnd = midnight + 24 * 60 * 60 * 1000
    out.push({
      date: d,
      midnightMs: midnight,
      label: d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      shortLabel: d.toLocaleDateString(undefined, { weekday: 'short' }),
      isToday: midnight === todayMs.value,
      segments: segments.value.filter((s) => {
        const start = new Date(s.startsAt).getTime()
        return start >= midnight && start < dayEnd
      }),
    })
  }
  return out
})

const visibleHours = computed(() => {
  if (segments.value.length === 0) {
    return { start: FALLBACK_START_HOUR, end: FALLBACK_END_HOUR }
  }
  let earliest = Infinity
  let latest = -Infinity
  for (const seg of segments.value) {
    const s = new Date(seg.startsAt)
    const e = new Date(seg.endsAt)
    const sMin = s.getHours() * 60 + s.getMinutes()
    let eMin = e.getHours() * 60 + e.getMinutes()
    // Treat 0:00 end as midnight of next day.
    if (eMin === 0 && e.getTime() > s.getTime()) eMin = 24 * 60
    earliest = Math.min(earliest, sMin)
    latest = Math.max(latest, eMin)
  }
  let startHour = Math.max(0, Math.floor(earliest / 60))
  let endHour = Math.min(24, Math.ceil(latest / 60))
  // Always show at least 6 hours of vertical context
  if (endHour - startHour < 6) {
    endHour = Math.min(24, startHour + 6)
  }
  return { start: startHour, end: endHour }
})

const totalHours = computed(() => visibleHours.value.end - visibleHours.value.start)
const totalMinutes = computed(() => totalHours.value * 60)
const trackHeightPx = computed(() => totalHours.value * HOUR_PX)

const hourMarks = computed(() => {
  const out: number[] = []
  for (let h = visibleHours.value.start; h <= visibleHours.value.end; h++) out.push(h)
  return out
})

function hourLabel(h: number): string {
  const d = new Date()
  d.setHours(h % 24, 0, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric' })
}

function blockStyle(seg: EffectiveSlot, midnightMs: number) {
  const startMin = (new Date(seg.startsAt).getTime() - midnightMs) / 60000
  // Clamp end at midnight so cross-day slots clip cleanly into this column.
  const endMin = Math.min((new Date(seg.endsAt).getTime() - midnightMs) / 60000, 24 * 60)
  const windowStartMin = visibleHours.value.start * 60
  const total = totalMinutes.value
  const top = Math.max(0, ((startMin - windowStartMin) / total) * 100)
  const heightPct = Math.max(0, ((endMin - Math.max(startMin, windowStartMin)) / total) * 100)
  return {
    top: `${top}%`,
    height: `${heightPct}%`,
    minHeight: '28px',
  }
}

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
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function teamLabel(teamId: string | null | undefined) {
  if (!teamId) return null
  return myTeams.teams.find((t) => t.id === teamId)?.name ?? null
}

function isMyReservation(seg: EffectiveSlot) {
  if (seg.status !== 'RESERVED' || !seg.reservedByTeamId) return false
  return myTeams.captainTeams.some((t) => t.id === seg.reservedByTeamId)
}

function isActionable(seg: EffectiveSlot): boolean {
  if (seg.status === 'AVAILABLE') {
    return canReserve.value || (mode.value === 'manage' && canManage.value)
  }
  if (seg.status === 'RESERVED') {
    return isMyReservation(seg) || (mode.value === 'manage' && canManage.value)
  }
  if (seg.status === 'CLOSED') {
    return mode.value === 'manage' && canManage.value
  }
  return false
}

function actionLabel(seg: EffectiveSlot): string {
  if (!isActionable(seg)) return ''
  if (seg.status === 'AVAILABLE') {
    return mode.value === 'manage' ? '. Tap to close' : '. Tap to reserve'
  }
  if (seg.status === 'RESERVED') return '. Tap to cancel'
  if (seg.status === 'CLOSED') return '. Tap to reopen'
  return ''
}

function ariaLabel(seg: EffectiveSlot, day: DayBucket): string {
  const range = `${formatTime(seg.startsAt)} to ${formatTime(seg.endsAt)}`
  const team = teamLabel(seg.reservedByTeamId)
  const teamPart = team ? `, reserved by ${team}` : ''
  return `${day.shortLabel} ${range}, ${seg.status.toLowerCase()}${teamPart}${actionLabel(seg)}`
}

const reserveOpen = ref(false)
const closeOpen = ref(false)
const activeWindow = ref<{ start: string; end: string } | null>(null)

function onBlockAction(seg: EffectiveSlot) {
  if (!isActionable(seg)) return
  if (seg.status === 'AVAILABLE' && canReserve.value) {
    activeWindow.value = { start: seg.startsAt, end: seg.endsAt }
    reserveOpen.value = true
    return
  }
  if (seg.status === 'AVAILABLE' && mode.value === 'manage' && canManage.value) {
    activeWindow.value = { start: seg.startsAt, end: seg.endsAt }
    closeOpen.value = true
    return
  }
  if (seg.status === 'RESERVED') {
    askCancel(seg)
    return
  }
  if (seg.status === 'CLOSED') {
    reopenClosure(seg)
  }
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

interface BlockTone {
  bg: string
  border: string
  text: string
}

function blockTone(seg: EffectiveSlot, mine: boolean): BlockTone {
  if (seg.status === 'CLOSED') {
    return {
      bg: 'bg-white/[0.04]',
      border: 'border-white/10 border-dashed',
      text: 'text-white/40',
    }
  }
  if (seg.status === 'RESERVED' && mine) {
    return {
      bg: 'bg-blue-500/15',
      border: 'border-blue-400/40',
      text: 'text-blue-100',
    }
  }
  if (seg.status === 'RESERVED') {
    return {
      bg: 'bg-amber-500/15',
      border: 'border-amber-400/40',
      text: 'text-amber-100',
    }
  }
  return {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-400/40',
    text: 'text-emerald-100',
  }
}
</script>

<template>
  <UCard class="bg-white/5">
    <div class="flex flex-col gap-4">
      <!-- Header: range label + day stepper -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">Schedule</p>
          <p class="text-sm text-white/60">
            <span class="sm:hidden">{{ days[0]?.label }}</span>
            <span class="hidden sm:inline">
              {{ days[0]?.label }} — {{ days[VISIBLE_DAYS - 1]?.label }}
            </span>
          </p>
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
        <DatePicker v-model="selectedDate" />
      </UFormField>

      <!-- Legend -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <div class="flex items-center gap-1.5">
          <span class="size-3 rounded-sm bg-emerald-500/30 border border-emerald-400/40" />
          <span class="text-white/60">Available</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="size-3 rounded-sm bg-blue-500/30 border border-blue-400/40" />
          <span class="text-white/60">Your team</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="size-3 rounded-sm bg-amber-500/30 border border-amber-400/40" />
          <span class="text-white/60">Reserved</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="size-3 rounded-sm bg-white/[0.04] border border-dashed border-white/15" />
          <span class="text-white/60">Closed</span>
        </div>
      </div>

      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col gap-2">
        <div
          v-for="n in 4"
          :key="n"
          class="h-12 rounded-lg border border-white/10 bg-white/5 animate-pulse"
        />
      </div>

      <!-- Time grid -->
      <div v-else class="overflow-y-auto" style="max-height: 70vh">
        <div class="flex gap-1 sm:gap-2">
          <!-- Hour axis -->
          <div class="shrink-0 w-10 sm:w-14 pt-7">
            <div class="relative" :style="{ height: `${trackHeightPx}px` }">
              <div
                v-for="h in hourMarks"
                :key="h"
                class="absolute right-1 -translate-y-1/2 text-[10px] sm:text-xs text-white/40 tabular-nums whitespace-nowrap"
                :style="{
                  top: `${((h - visibleHours.start) / totalHours) * 100}%`,
                }"
              >
                {{ hourLabel(h) }}
              </div>
            </div>
          </div>

          <!-- Day columns -->
          <div class="flex-1 grid gap-1 sm:gap-2 grid-cols-1 sm:grid-cols-3">
            <div
              v-for="(day, idx) in days"
              :key="day.midnightMs"
              class="flex flex-col"
              :class="{ 'hidden sm:flex': idx > 0 }"
            >
              <div
                class="flex items-baseline justify-between px-2 py-1 mb-1 rounded text-xs"
                :class="day.isToday ? 'bg-primary/15 text-primary' : 'text-white/60'"
              >
                <span class="font-semibold">{{ day.shortLabel }}</span>
                <span class="tabular-nums">{{ day.date.getDate() }}</span>
              </div>
              <div
                class="relative rounded-lg border border-white/10 bg-white/[0.02]"
                :style="{ height: `${trackHeightPx}px` }"
              >
                <!-- Hour gridlines -->
                <div
                  v-for="h in hourMarks"
                  :key="h"
                  class="absolute inset-x-0 border-t border-white/5 pointer-events-none"
                  :style="{
                    top: `${((h - visibleHours.start) / totalHours) * 100}%`,
                  }"
                />

                <!-- Empty state -->
                <div
                  v-if="day.segments.length === 0"
                  class="absolute inset-0 flex flex-col items-center justify-center text-center text-white/30 gap-1"
                >
                  <UIcon name="i-lucide-calendar-x" class="size-4" />
                  <span class="text-[10px] sm:text-xs">Closed</span>
                </div>

                <!-- Segment blocks -->
                <button
                  v-for="(seg, segIdx) in day.segments"
                  :key="`${seg.startsAt}-${seg.endsAt}-${seg.slotId ?? segIdx}`"
                  type="button"
                  :aria-label="ariaLabel(seg, day)"
                  :disabled="!isActionable(seg)"
                  class="absolute left-1 right-1 rounded-md border px-2 py-1 text-left transition-all overflow-hidden"
                  :class="[
                    blockTone(seg, isMyReservation(seg)).bg,
                    blockTone(seg, isMyReservation(seg)).border,
                    blockTone(seg, isMyReservation(seg)).text,
                    isActionable(seg)
                      ? 'cursor-pointer hover:brightness-125 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                      : 'cursor-default',
                  ]"
                  :style="blockStyle(seg, day.midnightMs)"
                  @click="onBlockAction(seg)"
                >
                  <div class="flex items-start justify-between gap-1">
                    <div class="min-w-0 flex-1">
                      <div
                        class="text-[10px] sm:text-xs font-semibold leading-tight tabular-nums truncate"
                      >
                        {{ formatTime(seg.startsAt) }}
                        <span class="hidden sm:inline opacity-70"
                          >– {{ formatTime(seg.endsAt) }}</span
                        >
                      </div>
                      <div
                        v-if="seg.status === 'RESERVED' && teamLabel(seg.reservedByTeamId)"
                        class="text-[9px] sm:text-[10px] opacity-80 truncate mt-0.5"
                      >
                        {{ teamLabel(seg.reservedByTeamId) }}
                      </div>
                    </div>
                    <UIcon
                      v-if="isMyReservation(seg)"
                      name="i-lucide-check"
                      class="size-3 sm:size-3.5 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mode-specific footnote -->
      <p
        v-if="mode === 'browse' && !canReserve && !loading && segments.length > 0"
        class="text-xs text-white/40"
      >
        Only team captains can reserve. Ask your captain to book a slot for the team.
      </p>
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
