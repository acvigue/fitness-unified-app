<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDate } from '@internationalized/date'
import { calendarDateToYmd, ymdToCalendarDate } from '@/utils/datetime'

const props = defineProps<{
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}>()

const model = defineModel<string>({ default: '' })

const open = ref(false)

const calendarValue = computed<CalendarDate | undefined>({
  get: () => (model.value ? ymdToCalendarDate(model.value) : undefined),
  set: (value) => {
    if (value) {
      model.value = calendarDateToYmd(value)
      open.value = false
    }
  },
})

const minValue = computed(() => (props.min ? ymdToCalendarDate(props.min) : undefined))
const maxValue = computed(() => (props.max ? ymdToCalendarDate(props.max) : undefined))

const formatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const label = computed(() => {
  if (!model.value) return props.placeholder ?? 'Pick a date'
  const [y, m, d] = model.value.split('-').map(Number)
  return formatter.format(new Date(y, m - 1, d))
})
</script>

<template>
  <UPopover v-model:open="open" :disabled="disabled">
    <UButton
      color="neutral"
      variant="outline"
      class="w-full justify-start"
      icon="i-lucide-calendar"
      :disabled="disabled"
      :aria-label="ariaLabel ?? 'Select date'"
    >
      <span :class="model ? '' : 'text-white/40'">{{ label }}</span>
    </UButton>
    <template #content>
      <UCalendar v-model="calendarValue" :min-value="minValue" :max-value="maxValue" class="p-2" />
    </template>
  </UPopover>
</template>
