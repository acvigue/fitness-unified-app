<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useUserBlockStore } from '@/stores/userBlocks'
import { useToastStore } from '@/stores/toast'

useHead({ title: 'Blocked users' })

const { setHeader } = usePageHeader()
const blockStore = useUserBlockStore()
const toast = useToastStore()

async function unblock(userId: string) {
  try {
    await blockStore.unblock(userId)
    toast.info('User unblocked')
  } catch (e) {
    toast.error('Could not unblock user', (e as Error).message)
  }
}

onMounted(() => {
  setHeader({ title: 'Blocked users', backRoute: '/settings' })
  blockStore.load()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <p class="text-sm text-white/60">
        Blocked users can't message you, invite you to teams, or view your profile.
      </p>

      <div v-if="blockStore.loading" class="flex justify-center p-4">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
      </div>

      <div
        v-else-if="blockStore.blocks.length === 0"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        You haven't blocked anyone.
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="b in blockStore.blocks"
          :key="b.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{{ b.blockedId }}</p>
            <p class="text-xs text-white/50">
              Blocked {{ new Date(b.createdAt).toLocaleDateString() }}
            </p>
          </div>
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-user-check"
            @click="unblock(b.blockedId)"
          >
            Unblock
          </UButton>
        </li>
      </ul>
    </section>
  </PageLayout>
</template>
