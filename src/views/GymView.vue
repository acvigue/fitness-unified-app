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

type TimeSlot = {
  id: string
  time: string
  available: boolean
  availableCourts: number
  totalCourts: number
}

type GymLocation = {
  id: string
  name: string
  building: string
  description: string
  openHours: string
  slots: TimeSlot[]
}

const gymLocations = ref<GymLocation[]>([
  {
    id: 'corec-main',
    name: 'Corec Main Gym',
    building: 'CoRec',
    description: 'Main basketball and volleyball court area.',
    openHours: '8:00 AM - 10:00 PM',
    slots: [

    ],
  },
  {
    id: 'north-rec',
    name: 'North Rec Court',
    building: 'North Recreation Center',
    description: 'Indoor multi-purpose court for casual play and practice.',
    openHours: '9:00 AM - 9:00 PM',
    slots: [


    ],
  },
  {
    id: 'south-fitness',
    name: 'South Fitness Gym',
    building: 'South Fitness Center',
    description: 'Smaller gym mainly for practice sessions and reservations.',
    openHours: '7:00 AM - 8:00 PM',
    slots: [


    ],
  },
])

const selectedGymId = ref(gymLocations.value[0]?.id ?? '')

const selectedGym = computed(() => {
  return gymLocations.value.find((gym) => gym.id === selectedGymId.value) ?? null
})

function getAvailabilityColor(slot: TimeSlot) {
  if (!slot.available) return 'error'
  if (slot.availableCourts === slot.totalCourts) return 'success'
  if (slot.availableCourts >= 1) return 'warning'
  return 'neutral'
}

function getAvailabilityLabel(slot: TimeSlot) {
  if (!slot.available) return 'Full'
  if (slot.availableCourts === slot.totalCourts) return 'Open'
  return 'Limited'
}
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6">
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

      <div v-if="selectedGym" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="slot in selectedGym.slots"
          :key="slot.id"
          class="rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium">{{ slot.time }}</p>
            <UBadge :color="getAvailabilityColor(slot)" variant="soft" size="xs">
              {{ getAvailabilityLabel(slot) }}
            </UBadge>
          </div>

          <div class="mt-3 flex items-center gap-2 text-sm text-white/60">
            <UIcon name="i-lucide-clock-3" class="text-xs" />
            <span>{{ slot.time }}</span>
          </div>

          <div class="mt-1.5 flex items-center gap-2 text-sm text-white/60">
            <UIcon name="i-lucide-map-pin" class="text-xs" />
            <span>{{ selectedGym.name }}</span>
          </div>

          <div class="mt-3 flex items-center gap-2">
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full rounded-full bg-primary transition-all"
                :style="{
                  width: `${(slot.availableCourts / slot.totalCourts) * 100}%`,
                }"
              />
            </div>
            <span class="text-xs text-white/50">
              {{ slot.availableCourts }}/{{ slot.totalCourts }} open
            </span>
          </div>
        </div>
      </div>
    </section>
  </PageLayout>
</template>