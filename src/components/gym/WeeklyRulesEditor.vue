<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

type CellState = 'open' | 'closed'
type PaintMode = 'open' | 'closed'

export type WeeklyRulePayload = {
  dayOfWeek: number
  startTime: string
  endTime: string
  isOpen: boolean
}

const props = defineProps<{
  modelValue?: WeeklyRulePayload[]
  startHour?: number
  endHour?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [rules: WeeklyRulePayload[]]
}>()

const days = [
  { key: 'monday', label: 'Monday', short: 'Mon', dayOfWeek: 0 },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue', dayOfWeek: 1 },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed', dayOfWeek: 2 },
  { key: 'thursday', label: 'Thursday', short: 'Thu', dayOfWeek: 3 },
  { key: 'friday', label: 'Friday', short: 'Fri', dayOfWeek: 4 },
  { key: 'saturday', label: 'Saturday', short: 'Sat', dayOfWeek: 5 },
  { key: 'sunday', label: 'Sunday', short: 'Sun', dayOfWeek: 6 },
] as const

const startHour = computed(() => props.startHour ?? 6)
const endHour = computed(() => props.endHour ?? 22)
const stepMinutes = 30

const timeSlots = computed(() => {
  const slots: string[] = []
  for (let hour = startHour.value; hour < endHour.value; hour++) {
    for (const minute of [0, 30]) {
      slots.push(toTimeString(hour, minute))
    }
  }
  return slots
})

const scheduleGrid = reactive<Record<number, Record<string, CellState>>>({})
const paintMode = ref<PaintMode>('open')
const isPainting = ref(false)

function toTimeString(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function toDisplayTime(value: string) {
  const [hourRaw, minuteRaw] = value.split(':').map(Number)
  const suffix = hourRaw >= 12 ? 'PM' : 'AM'
  const hour12 = hourRaw === 0 ? 12 : hourRaw > 12 ? hourRaw - 12 : hourRaw
  return `${hour12}:${String(minuteRaw).padStart(2, '0')} ${suffix}`
}

function addMinutes(value: string, minutesToAdd: number) {
  const [hour, minute] = value.split(':').map(Number)
  const total = hour * 60 + minute + minutesToAdd
  const newHour = Math.floor(total / 60)
  const newMinute = total % 60
  return `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`
}

function resetGrid(initial: WeeklyRulePayload[]) {
  for (const day of days) {
    scheduleGrid[day.dayOfWeek] = {}
    for (const slot of timeSlots.value) {
      scheduleGrid[day.dayOfWeek][slot] = 'closed'
    }
  }
  for (const rule of initial) {
    if (!scheduleGrid[rule.dayOfWeek]) continue
    for (const slot of timeSlots.value) {
      if (slot >= rule.startTime && slot < rule.endTime) {
        scheduleGrid[rule.dayOfWeek][slot] = rule.isOpen ? 'open' : 'closed'
      }
    }
  }
}

function buildMergedRules(): WeeklyRulePayload[] {
  const rules: WeeklyRulePayload[] = []
  for (const day of days) {
    const slots = timeSlots.value
    if (slots.length === 0) continue

    let currentState = scheduleGrid[day.dayOfWeek][slots[0]]
    let rangeStart = slots[0]

    for (let i = 1; i <= slots.length; i++) {
      const currentSlot = slots[i]
      const stateAtCurrent = currentSlot ? scheduleGrid[day.dayOfWeek][currentSlot] : null

      if (stateAtCurrent !== currentState) {
        const previousSlot = slots[i - 1]
        const endTime = addMinutes(previousSlot, stepMinutes)

        if (currentState === 'open') {
          rules.push({
            dayOfWeek: day.dayOfWeek,
            startTime: rangeStart,
            endTime,
            isOpen: true,
          })
        }

        if (currentSlot) {
          rangeStart = currentSlot
          currentState = stateAtCurrent as CellState
        }
      }
    }
  }
  return rules
}

resetGrid(props.modelValue ?? [])

watch(
  () => props.modelValue,
  (next) => {
    if (!next) return
    resetGrid(next)
  },
  { deep: false },
)

watch(
  scheduleGrid,
  () => {
    emit('update:modelValue', buildMergedRules())
  },
  { deep: true },
)

function paintCell(dayOfWeek: number, time: string) {
  scheduleGrid[dayOfWeek][time] = paintMode.value
}

function onCellMouseDown(dayOfWeek: number, time: string) {
  isPainting.value = true
  paintCell(dayOfWeek, time)
}

function onCellMouseEnter(dayOfWeek: number, time: string) {
  if (!isPainting.value) return
  paintCell(dayOfWeek, time)
}

function stopPainting() {
  isPainting.value = false
}

function getCellClass(dayOfWeek: number, time: string) {
  const value = scheduleGrid[dayOfWeek][time]
  if (value === 'open') {
    return 'bg-green-500/20 border-green-400/35 hover:bg-green-500/25'
  }
  return 'bg-white/5 border-white/10 hover:bg-white/10'
}

function clearAll() {
  for (const day of days) {
    for (const slot of timeSlots.value) {
      scheduleGrid[day.dayOfWeek][slot] = 'closed'
    }
  }
}

function fillAllOpen() {
  for (const day of days) {
    for (const slot of timeSlots.value) {
      scheduleGrid[day.dayOfWeek][slot] = 'open'
    }
  }
}

function applyBusinessHours() {
  clearAll()
  for (const day of days) {
    const isWeekend = day.dayOfWeek >= 5
    const start = isWeekend ? '09:00' : '08:00'
    const end = isWeekend ? '18:00' : '22:00'
    for (const slot of timeSlots.value) {
      if (slot >= start && slot < end) {
        scheduleGrid[day.dayOfWeek][slot] = 'open'
      }
    }
  }
}

function copyMondayToWeekdays() {
  const monday = { ...scheduleGrid[0] }
  for (const day of days) {
    if (day.dayOfWeek >= 1 && day.dayOfWeek <= 4) {
      for (const slot of timeSlots.value) {
        scheduleGrid[day.dayOfWeek][slot] = monday[slot]
      }
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 select-none" @mouseup="stopPainting" @mouseleave="stopPainting">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <p class="text-sm text-white/60">
        Click and drag to paint cells. Switch the tool to paint closed sections within a day.
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          :variant="paintMode === 'open' ? 'solid' : 'outline'"
          color="success"
          size="sm"
          @click="paintMode = 'open'"
        >
          Paint Open
        </UButton>
        <UButton
          :variant="paintMode === 'closed' ? 'solid' : 'outline'"
          color="neutral"
          size="sm"
          @click="paintMode = 'closed'"
        >
          Paint Closed
        </UButton>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton color="neutral" variant="outline" size="xs" @click="clearAll">Clear All</UButton>
      <UButton color="neutral" variant="outline" size="xs" @click="fillAllOpen"
        >Fill All Open</UButton
      >
      <UButton color="neutral" variant="outline" size="xs" @click="applyBusinessHours">
        Business Hours Preset
      </UButton>
      <UButton color="neutral" variant="outline" size="xs" @click="copyMondayToWeekdays">
        Copy Monday to Weekdays
      </UButton>
    </div>

    <div class="overflow-x-auto">
      <div class="min-w-[1100px]">
        <div
          class="grid gap-2"
          :style="{ gridTemplateColumns: '110px repeat(7, minmax(120px, 1fr))' }"
        >
          <div
            class="sticky top-0 z-10 rounded-lg border border-white/10 bg-black/20 p-3 text-sm font-medium text-white/60 backdrop-blur"
          >
            Time
          </div>
          <div
            v-for="day in days"
            :key="day.key"
            class="sticky top-0 z-10 rounded-lg border border-white/10 bg-black/20 p-3 text-center backdrop-blur"
          >
            <p class="text-sm font-semibold text-white">{{ day.short }}</p>
            <p class="text-xs text-white/50">{{ day.label }}</p>
          </div>

          <template v-for="slot in timeSlots" :key="slot">
            <div
              class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/65"
            >
              {{ toDisplayTime(slot) }}
            </div>
            <button
              v-for="day in days"
              :key="`${day.key}-${slot}`"
              type="button"
              class="h-12 rounded-lg border transition"
              :class="getCellClass(day.dayOfWeek, slot)"
              @mousedown.prevent="onCellMouseDown(day.dayOfWeek, slot)"
              @mouseenter="onCellMouseEnter(day.dayOfWeek, slot)"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
