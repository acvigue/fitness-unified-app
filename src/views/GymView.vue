<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'

useHead({
  title: 'Gyms',
})

const { setHeader } = usePageHeader()

setHeader({
  title: 'Gyms',
})

type SlotStatus = 'closed' | 'open' | 'empty' | 'occupied'

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

type CalendarEvent = {
  id: string
  day: DayKey
  startHour: number
  endHour: number
  status: SlotStatus
  title: string
  subtitle?: string
}

type GymLocation = {
  id: string
  name: string
  building: string
  description: string
  openHours: string
  events: CalendarEvent[]
}

const days: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
]

const startHour = 6
const endHour = 22
const hourHeight = 72
const totalHours = endHour - startHour
const calendarHeight = totalHours * hourHeight

const timeLabels = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i)

const gymLocations = ref<GymLocation[]>([
  {
    id: 'corec-main',
    name: 'Corec Main Gym',
    building: 'CoRec',
    description: 'Main basketball and volleyball court area.',
    openHours: '6:00 AM - 10:00 PM',
    events: [


      { id: 'su4', day: 'sunday', startHour: 18, endHour: 22, status: 'closed', title: 'Closed' },
    ],
  },
  {
    id: 'north-rec',
    name: 'North Rec Court',
    building: 'North Recreation Center',
    description: 'Indoor multi-purpose court for casual play and practice.',
    openHours: '7:00 AM - 9:00 PM',
    events: [

      { id: 'n12', day: 'thursday', startHour: 13, endHour: 18, status: 'open', title: 'Open Court' },

    ],
  },
])

const selectedGymId = ref(gymLocations.value[0]?.id ?? '')

const selectedGym = computed(() => {
  return gymLocations.value.find((gym) => gym.id === selectedGymId.value) ?? null
})

function getEventsForDay(day: DayKey) {
  return selectedGym.value?.events.filter((event) => event.day === day) ?? []
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalized = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${normalized}:00 ${suffix}`
}

function getEventStyle(event: CalendarEvent) {
  const top = (event.startHour - startHour) * hourHeight
  const height = (event.endHour - event.startHour) * hourHeight - 6

  return {
    top: `${top + 3}px`,
    height: `${height}px`,
  }
}

function getEventClasses(status: SlotStatus) {
  switch (status) {
    case 'closed':
      return 'bg-white/5 border-white/10 text-white/40'
    case 'open':
      return 'bg-green-500/15 border-green-400/30 text-green-100'
    case 'empty':
      return 'bg-blue-500/15 border-blue-400/30 text-blue-100'
    case 'occupied':
      return 'bg-orange-500/15 border-orange-400/30 text-orange-100'
    default:
      return 'bg-white/5 border-white/10 text-white/70'
  }
}
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
      <!-- Top block -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <UFormField label="Location" class="flex-1">
            <USelect
              v-model="selectedGymId"
              :items="
                gymLocations.map((gym) => ({
                  label: `${gym.name} · ${gym.building}`,
                  value: gym.id,
                }))
              "
            />
          </UFormField>
        </div>
      </UCard>

      <!-- Second block -->
      <div
        v-if="selectedGym"
        class="rounded-lg border border-white/10 bg-white/5 p-5"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold">{{ selectedGym.name }}</h2>
            <p class="text-sm text-white/60">{{ selectedGym.building }}</p>
            <p class="mt-2 text-sm text-white/70">{{ selectedGym.description }}</p>
          </div>

          <UBadge color="info" variant="soft" size="sm">
            {{ selectedGym.openHours }}
          </UBadge>
        </div>
      </div>

      <!-- Google-calendar-style weekly schedule -->
      <div
        v-if="selectedGym"
        class="rounded-lg border border-white/10 bg-white/5 p-4"
      >
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <UBadge color="neutral" variant="soft">Closed</UBadge>
          <UBadge color="success" variant="soft">Open</UBadge>
          <UBadge color="info" variant="soft">Empty</UBadge>
          <UBadge color="warning" variant="soft">Occupied</UBadge>
        </div>

        <div class="overflow-x-auto">
          <div class="min-w-[1100px]">
            <!-- Header -->
            <div
              class="grid border-b border-white/10"
              style="grid-template-columns: 80px repeat(7, minmax(140px, 1fr));"
            >
              <div class="h-14" />
              <div
                v-for="day in days"
                :key="day.key"
                class="flex h-14 items-center justify-center border-l border-white/10 text-sm font-medium text-white/70"
              >
                {{ day.label }}
              </div>
            </div>

            <!-- Calendar body -->
            <div
              class="grid"
              :style="{
                gridTemplateColumns: '80px repeat(7, minmax(140px, 1fr))',
                height: `${calendarHeight}px`,
              }"
            >
              <!-- Time labels -->
              <div class="relative">
                <div
                  v-for="hour in timeLabels"
                  :key="hour"
                  class="absolute left-0 right-0 -translate-y-1/2 text-xs text-white/40"
                  :style="{ top: `${(hour - startHour) * hourHeight}px` }"
                >
                  {{ formatHour(hour) }}
                </div>
              </div>

              <!-- Day columns -->
              <div
                v-for="day in days"
                :key="day.key"
                class="relative border-l border-white/10"
              >
                <!-- Hour lines -->
                <div
                  v-for="hour in totalHours"
                  :key="hour"
                  class="absolute left-0 right-0 border-t border-white/10"
                  :style="{ top: `${(hour - 1) * hourHeight}px` }"
                />

                <!-- Events -->
                <div
                  v-for="event in getEventsForDay(day.key)"
                  :key="event.id"
                  class="absolute left-2 right-2 rounded-xl border p-3 shadow-sm"
                  :class="getEventClasses(event.status)"
                  :style="getEventStyle(event)"
                >
                  <p class="text-sm font-semibold leading-tight">{{ event.title }}</p>
                  <p class="mt-1 text-xs opacity-80">
                    {{ formatHour(event.startHour) }} - {{ formatHour(event.endHour) }}
                  </p>
                  <p v-if="event.subtitle" class="mt-1 text-xs opacity-70">
                    {{ event.subtitle }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </PageLayout>
</template>