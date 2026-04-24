<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useUserBlockStore } from '@/stores/userBlocks'
import { useToastStore } from '@/stores/toast'
import { getErrorMessage } from '@/lib/api/errors'

const props = withDefaults(
  defineProps<{
    userId: string
    size?: 'xs' | 'sm' | 'md'
    variant?: 'solid' | 'outline' | 'ghost'
  }>(),
  { size: 'sm', variant: 'outline' },
)

const store = useUserBlockStore()
const toast = useToastStore()

const isBlocking = computed(() => store.isBlocking(props.userId))
const confirmOpen = ref(false)
const working = ref(false)

async function onClick() {
  if (isBlocking.value) {
    // Unblocking is non-destructive; perform immediately.
    working.value = true
    try {
      await store.unblock(props.userId)
      toast.success('User unblocked')
    } catch (e) {
      toast.error('Could not unblock user', getErrorMessage(e))
    } finally {
      working.value = false
    }
  } else {
    confirmOpen.value = true
  }
}

async function confirmBlock() {
  working.value = true
  try {
    await store.block(props.userId)
    toast.success('User blocked')
    confirmOpen.value = false
  } catch (e) {
    toast.error('Could not block user', getErrorMessage(e))
  } finally {
    working.value = false
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
    :loading="working"
    :aria-label="isBlocking ? 'Unblock user' : 'Block user'"
    @click="onClick"
  >
    {{ isBlocking ? 'Unblock' : 'Block user' }}
  </UButton>

  <UModal v-model:open="confirmOpen">
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <div class="flex items-start gap-3">
          <div
            class="size-10 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0"
          >
            <UIcon name="i-lucide-user-x" class="text-rose-400 size-5" />
          </div>
          <div>
            <h2 class="text-lg font-semibold">Block this user?</h2>
            <p class="text-sm text-white/60 mt-1">
              They will no longer be able to message you, invite you to teams, or interact with your
              profile. You can unblock them later from your block list.
            </p>
          </div>
        </div>

        <div class="flex gap-2 justify-end mt-2">
          <UButton variant="ghost" color="neutral" :disabled="working" @click="confirmOpen = false">
            Cancel
          </UButton>
          <UButton color="error" :loading="working" @click="confirmBlock">Block user</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
