<script setup lang="ts">
import { computed } from 'vue'

type Role = 'MEMBER' | 'STAFF' | 'ADMIN'

const props = defineProps<{
  modelValue: Role
  /** True when this member is the only ADMIN — demotion is blocked. */
  isLastAdmin?: boolean
  /** True if the current viewer can edit roles (i.e. is themselves an ADMIN). */
  canEdit?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [role: Role]
}>()

const items = computed(() => [
  { label: 'Member', value: 'MEMBER' as Role },
  { label: 'Staff', value: 'STAFF' as Role },
  { label: 'Admin', value: 'ADMIN' as Role },
])

const disabled = computed(() => !props.canEdit || props.isLastAdmin)
const tooltip = computed(() => {
  if (!props.canEdit) return 'Only admins can change roles.'
  if (props.isLastAdmin) return 'Promote another member to admin first.'
  return undefined
})
</script>

<template>
  <USelect
    :model-value="modelValue"
    :items="items"
    :disabled="disabled"
    :title="tooltip"
    size="sm"
    @update:model-value="(v) => emit('update:modelValue', v as Role)"
  />
</template>
