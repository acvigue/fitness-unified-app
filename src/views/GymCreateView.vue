<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'

useHead({
  title: 'Create Gym',
})

const router = useRouter()
const { setHeader } = usePageHeader()

setHeader({
  title: 'Create Gym',
})

type PaintMode = 'open' | 'closed'
type CellState = 'open' | 'closed'
type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

type DayConfig = {
  key: DayKey
  label: string
  short: string
  dayOfWeek: number
}

type WeeklyRulePayload = {
  dayOfWeek: number
  startTime: string
  endTime: string
  isOpen: boolean
}

const days: DayConfig[] = [
  { key: 'monday', label: 'Monday', short: 'Mon', dayOfWeek: 0 },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue', dayOfWeek: 1 },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed', dayOfWeek: 2 },
  { key: 'thursday', label: 'Thursday', short: 'Thu', dayOfWeek: 3 },
  { key: 'friday', label: 'Friday', short: 'Fri', dayOfWeek: 4 },
  { key: 'saturday', label: 'Saturday', short: 'Sat', dayOfWeek: 5 },
  { key: 'sunday', label: 'Sunday', short: 'Sun', dayOfWeek: 6 },
]

const form = reactive({
  name: '',
  organizationId: '',
  description: '',
  location: '',
  capacity: undefined as number | undefined,
  isActive: true,
})

const paintMode = ref<PaintMode>('open')
const isPainting = ref(false)

const startHour = 6
const endHour = 22
const stepMinutes = 30

const timeSlots = computed(() => {
  const slots: string[] = []
  for (let hour = startHour; hour < endHour; hour++) {
    for (const minute of [0, 30]) {
      slots.push(toTimeString(hour, minute))
    }
  }
  return slots
})

const scheduleGrid = reactive<Record<number, Record<string, CellState>>>(
  Object.fromEntries(
    days.map((day) => [
      day.dayOfWeek,
      Object.fromEntries(timeSlots.value.map((slot) => [slot, 'closed' as CellState])),
    ]),
  ) as Record<number, Record<string, CellState>>,
)

const isValid = computed(() => {
  return form.name.trim() !== '' && form.organizationId.trim() !== ''
})

const mergedWeeklyRules = computed<WeeklyRulePayload[]>(() => {
  return buildMergedRules()
})

const openRuleCount = computed(() => mergedWeeklyRules.value.filter((rule) => rule.isOpen).length)
const closedRuleCount = computed(
  () => mergedWeeklyRules.value.filter((rule) => !rule.isOpen).length,
)

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

function getCellInnerClass(dayOfWeek: number, time: string) {
  const value = scheduleGrid[dayOfWeek][time]

  if (value === 'open') {
    return 'text-green-100'
  }

  return 'text-white/25'
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

function setWeekdaysOpen() {
  for (const day of days) {
    if (day.dayOfWeek <= 4) {
      for (const slot of timeSlots.value) {
        scheduleGrid[day.dayOfWeek][slot] = 'open'
      }
    }
  }
}

function setWeekendsClosed() {
  for (const day of days) {
    if (day.dayOfWeek >= 5) {
      for (const slot of timeSlots.value) {
        scheduleGrid[day.dayOfWeek][slot] = 'closed'
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

        rules.push({
          dayOfWeek: day.dayOfWeek,
          startTime: rangeStart,
          endTime,
          isOpen: currentState === 'open',
        })

        if (currentSlot) {
          rangeStart = currentSlot
          currentState = stateAtCurrent as CellState
        }
      }
    }
  }

  return rules
}

function onCancel() {
  router.push('/gyms')
}

function buildPayload() {
  return {
    name: form.name.trim(),
    organizationId: form.organizationId.trim(),
    description: form.description.trim() || undefined,
    location: form.location.trim() || undefined,
    capacity: form.capacity,
    isActive: form.isActive,
    weeklyRules: mergedWeeklyRules.value,
  }
}

function onCreateGym() {
  if (!isValid.value) return

  const payload = buildPayload()
  console.log('Create gym payload:', payload)

  // Replace this later with your API call
  router.push('/gyms')
}
</script>

<template>
  <PageLayout>
    <section
      class="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-6 select-none"
      @mouseup="stopPainting"
      @mouseleave="stopPainting"
    >
      <!-- Top intro -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-2">
          <h1 class="text-xl font-semibold text-white">Create a gym</h1>
          <p class="text-sm text-white/60">
            Set the gym details first, then paint the weekly schedule to define default recurring
            availability.
          </p>
        </div>
      </UCard>

      <!-- Basic form -->
      <UCard class="bg-white/5">
        <div class="grid gap-5 lg:grid-cols-2">
          <UFormField label="Gym name" required>
            <UInput v-model="form.name" placeholder="Corec Main Gym" size="lg" />
          </UFormField>

          <UFormField label="Organization ID" required>
            <UInput v-model="form.organizationId" placeholder="org_123" size="lg" />
          </UFormField>

          <UFormField label="Location">
            <UInput v-model="form.location" placeholder="CoRec West Wing" size="lg" />
          </UFormField>

          <UFormField label="Capacity">
            <UInput v-model="form.capacity" type="number" placeholder="120" size="lg" />
          </UFormField>

          <div class="lg:col-span-2">
            <UFormField label="Description">
              <UTextarea
                v-model="form.description"
                :rows="4"
                placeholder="Main basketball and volleyball court area."
              />
            </UFormField>
          </div>

          <div
            class="lg:col-span-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div>
              <p class="text-sm font-medium text-white/80">Gym active</p>
              <p class="text-xs text-white/50">Inactive gyms can be hidden from normal browsing.</p>
            </div>
            <USwitch v-model="form.isActive" />
          </div>
        </div>
      </UCard>

      <!-- Paint tools -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-white">Weekly schedule</h2>
              <p class="text-sm text-white/60">
                Everything starts closed. Paint blocks as open, then switch tools if you want to
                close sections again.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UButton
                :variant="paintMode === 'open' ? 'solid' : 'outline'"
                color="success"
                @click="paintMode = 'open'"
              >
                Paint Open
              </UButton>

              <UButton
                :variant="paintMode === 'closed' ? 'solid' : 'outline'"
                color="neutral"
                @click="paintMode = 'closed'"
              >
                Paint Closed
              </UButton>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton color="neutral" variant="outline" size="sm" @click="clearAll">
              Clear All
            </UButton>
            <UButton color="neutral" variant="outline" size="sm" @click="fillAllOpen">
              Fill All Open
            </UButton>
            <UButton color="neutral" variant="outline" size="sm" @click="applyBusinessHours">
              Business Hours Preset
            </UButton>
            <UButton color="neutral" variant="outline" size="sm" @click="setWeekdaysOpen">
              Open Weekdays
            </UButton>
            <UButton color="neutral" variant="outline" size="sm" @click="setWeekendsClosed">
              Close Weekends
            </UButton>
            <UButton color="neutral" variant="outline" size="sm" @click="copyMondayToWeekdays">
              Copy Monday to Weekdays
            </UButton>
          </div>

          <div class="flex flex-wrap items-center gap-3 text-xs text-white/55">
            <div class="flex items-center gap-2">
              <span
                class="inline-block h-3 w-3 rounded-sm border border-green-400/35 bg-green-500/20"
              />
              Open
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-block h-3 w-3 rounded-sm border border-white/10 bg-white/5" />
              Closed
            </div>
            <span>Click and drag to paint.</span>
          </div>
        </div>
      </UCard>

      <!-- Schedule painter -->
      <UCard class="bg-white/5">
        <div class="overflow-x-auto">
          <div class="min-w-[1100px]">
            <div
              class="grid gap-2"
              :style="{
                gridTemplateColumns: '110px repeat(7, minmax(120px, 1fr))',
              }"
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
                >
                  <span
                    class="text-[11px] font-medium"
                    :class="getCellInnerClass(day.dayOfWeek, slot)"
                  >
                    {{ scheduleGrid[day.dayOfWeek][slot] === 'open' ? 'Open' : '' }}
                  </span>
                </button>
              </template>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Preview + payload -->
      <div class="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <UCard class="bg-white/5">
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-white">Gym preview</h2>
                <p class="text-sm text-white/60">
                  This is how the basic gym information will look.
                </p>
              </div>
              <UBadge :color="form.isActive ? 'success' : 'neutral'" variant="soft">
                {{ form.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-white">
                    {{ form.name || 'Gym name' }}
                  </h3>
                  <p class="text-sm text-white/60">
                    {{ form.location || 'Gym location' }}
                  </p>
                  <p class="mt-2 text-sm text-white/70">
                    {{ form.description || 'Gym description will appear here.' }}
                  </p>
                </div>

                <UBadge color="info" variant="soft"> Capacity {{ form.capacity || '—' }} </UBadge>
              </div>
            </div>
          </div>
        </UCard>

        <UCard class="bg-white/5">
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-white">Merged weekly rules</h2>
                <p class="text-sm text-white/60">
                  These are the ranges that should be sent to the backend.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge color="success" variant="soft">{{ openRuleCount }} open</UBadge>
                <UBadge color="neutral" variant="soft">{{ closedRuleCount }} closed</UBadge>
              </div>
            </div>

            <div
              class="max-h-[520px] overflow-auto rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div
                v-for="(rule, index) in mergedWeeklyRules"
                :key="`${rule.dayOfWeek}-${rule.startTime}-${rule.endTime}-${index}`"
                class="mb-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 last:mb-0"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-white">
                      {{ days[rule.dayOfWeek].label }}
                    </p>
                    <p class="text-xs text-white/55">{{ rule.startTime }} - {{ rule.endTime }}</p>
                  </div>

                  <UBadge :color="rule.isOpen ? 'success' : 'neutral'" variant="soft">
                    {{ rule.isOpen ? 'Open' : 'Closed' }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3">
        <UButton color="neutral" variant="outline" @click="onCancel"> Cancel </UButton>

        <UButton icon="i-lucide-plus" :disabled="!isValid" @click="onCreateGym">
          Create Gym
        </UButton>
      </div>
    </section>
  </PageLayout>
</template>
