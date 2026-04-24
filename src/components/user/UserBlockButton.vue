<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserBlockStore } from '@/stores/userBlocks'
import { useToastStore } from '@/stores/toast'

const props = withDefaults(
  defineProps<{
    userId: string
    size?: 'xs' | 'sm' | 'md'
    variant?: 'solid' | 'outline' | 'ghost'
  }>(),
  { size: 'sm', variant: 'outline' }
)

const store = useUserBlockStore()
const toast = useToastStore()

const isBlocking = computed(() => store.isBlocking(props.userId))

async function toggle() {
  try {
    if (isBlocking.value) {
      await store.unblock(props.userId)
      toast.info('User unblocked')
    } else {
      if (!confirm('Block this user? They will no longer be able to message or invite you.')) {
        return
      }
      await store.block(props.userId)
      toast.info('User blocked')
    }
  } catch (e) {
    toast.error('Could not change block status', (e as Error).message)
  }
}

onMounted(() => {
  if (!store.initialized) store.load()
})
</script>

<template>
  <UButton
    :icon="isBlocking ? 'i-lucide-user-check' : 'i-lucide-user-x'"
    :color="isBlocking ? 'neutral' : 'error'"
    :size="props.size"
    :variant="props.variant"
    @click="toggle"
  >
    {{ isBlocking ? 'Unblock' : 'Block user' }}
  </UButton>
</template>
