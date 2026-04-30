<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import { combineYmdAndHm, isoToHm, isoToYmd } from '@/utils/datetime'

const props = defineProps<{
  min?: string
  max?: string
  disabled?: boolean
}>()

const model = defineModel<string>({ default: '' })

const datePart = ref('')
const timePart = ref('')

watch(
  model,
  (iso) => {
    if (!iso) {
      datePart.value = ''
      timePart.value = ''
      return
    }
    const ymd = isoToYmd(iso)
    const hm = isoToHm(iso)
    if (ymd !== datePart.value) datePart.value = ymd
    if (hm !== timePart.value) timePart.value = hm
  },
  { immediate: true },
)

function recombine() {
  if (datePart.value && timePart.value) {
    const next = combineYmdAndHm(datePart.value, timePart.value)
    if (next !== model.value) model.value = next
  } else if (model.value) {
    model.value = ''
  }
}

watch([datePart, timePart], recombine)

const minDate = computed(() => (props.min ? isoToYmd(props.min) : undefined))
const maxDate = computed(() => (props.max ? isoToYmd(props.max) : undefined))
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
    <DatePicker v-model="datePart" :min="minDate" :max="maxDate" :disabled="disabled" />
    <TimePicker v-model="timePart" :disabled="disabled" />
  </div>
</template>
