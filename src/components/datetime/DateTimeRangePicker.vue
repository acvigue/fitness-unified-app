<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import { combineYmdAndHm, isoToHm, isoToYmd } from '@/utils/datetime'

type RangeValue = { startsAt: string; endsAt: string }

const props = defineProps<{
  min?: string
  max?: string
  disabled?: boolean
}>()

const model = defineModel<RangeValue>({
  default: () => ({ startsAt: '', endsAt: '' }),
})

const datePart = ref('')
const startTime = ref('')
const endTime = ref('')

watch(
  () => [model.value.startsAt, model.value.endsAt] as const,
  ([startsAt, endsAt]) => {
    const date = startsAt ? isoToYmd(startsAt) : endsAt ? isoToYmd(endsAt) : ''
    if (date !== datePart.value) datePart.value = date
    const sHm = startsAt ? isoToHm(startsAt) : ''
    if (sHm !== startTime.value) startTime.value = sHm
    const eHm = endsAt ? isoToHm(endsAt) : ''
    if (eHm !== endTime.value) endTime.value = eHm
  },
  { immediate: true },
)

function recombine() {
  const startsAt =
    datePart.value && startTime.value ? combineYmdAndHm(datePart.value, startTime.value) : ''
  const endsAt =
    datePart.value && endTime.value ? combineYmdAndHm(datePart.value, endTime.value) : ''
  if (startsAt !== model.value.startsAt || endsAt !== model.value.endsAt) {
    model.value = { startsAt, endsAt }
  }
}

watch([datePart, startTime, endTime], recombine)

const minDate = computed(() => (props.min ? isoToYmd(props.min) : undefined))
const maxDate = computed(() => (props.max ? isoToYmd(props.max) : undefined))
</script>

<template>
  <div class="flex flex-col gap-3">
    <UFormField label="Date" required>
      <DatePicker v-model="datePart" :min="minDate" :max="maxDate" :disabled="disabled" />
    </UFormField>
    <div class="grid grid-cols-2 gap-2">
      <UFormField label="Start time" required>
        <TimePicker v-model="startTime" :disabled="disabled" aria-label="Start time" />
      </UFormField>
      <UFormField label="End time" required>
        <TimePicker v-model="endTime" :disabled="disabled" aria-label="End time" />
      </UFormField>
    </div>
  </div>
</template>
