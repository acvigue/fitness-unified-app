<script setup lang="ts">
import { computed } from 'vue'
import { Time } from '@internationalized/date'
import { hmToTime, timeToHm } from '@/utils/datetime'

defineProps<{
  disabled?: boolean
  ariaLabel?: string
  hourCycle?: 12 | 24
}>()

const model = defineModel<string>({ default: '' })

const timeValue = computed<Time | null>({
  get: () => (model.value ? hmToTime(model.value) : null),
  set: (value) => {
    model.value = value ? timeToHm(value) : ''
  },
})
</script>

<template>
  <UInputTime
    v-model="timeValue"
    :disabled="disabled"
    :hour-cycle="hourCycle ?? 24"
    granularity="minute"
    :aria-label="ariaLabel ?? 'Select time'"
    icon="i-lucide-clock"
  />
</template>
