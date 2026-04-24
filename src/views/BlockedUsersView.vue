<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import UserLink from '@/components/UserLink.vue'
import UserPickerModal from '@/components/user/UserPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useUserBlockStore } from '@/stores/userBlocks'
import { useToastStore } from '@/stores/toast'
import { getErrorMessage } from '@/lib/api/errors'

useHead({ title: 'Blocked users' })

const { setHeader } = usePageHeader()
const blockStore = useUserBlockStore()
const toast = useToastStore()

const confirmUnblockOpen = ref(false)
const pendingUnblockId = ref<string | null>(null)
const busy = ref(false)

const pickerOpen = ref(false)
const pickerLoading = ref(false)

function askUnblock(userId: string) {
  pendingUnblockId.value = userId
  confirmUnblockOpen.value = true
}

async function confirmUnblock() {
  if (!pendingUnblockId.value) return
  busy.value = true
  try {
    await blockStore.unblock(pendingUnblockId.value)
    toast.info('User unblocked')
  } catch (e) {
    toast.error('Could not unblock user', getErrorMessage(e))
  } finally {
    busy.value = false
    confirmUnblockOpen.value = false
    pendingUnblockId.value = null
  }
}

async function handlePick(user: { id: string }) {
  pickerLoading.value = true
  try {
    await blockStore.block(user.id)
    toast.success('User blocked')
    pickerOpen.value = false
  } catch (e) {
    toast.error('Could not block user', getErrorMessage(e))
  } finally {
    pickerLoading.value = false
  }
}

async function loadBlocks() {
  try {
    await blockStore.load()
  } catch (e) {
    toast.error('Could not load blocked users', getErrorMessage(e))
  }
}

onMounted(() => {
  setHeader({ title: 'Blocked users', backRoute: '/settings' })
  loadBlocks()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <p class="text-sm text-white/60">
        Blocked users can't message you, invite you to teams, or view your profile.
      </p>

      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-user-x"
        class="self-start"
        @click="pickerOpen = true"
      >
        Block a user
      </UButton>

      <div v-if="blockStore.loading" class="flex flex-col gap-2">
        <div
          v-for="i in 3"
          :key="i"
          class="h-14 rounded-lg border border-white/10 bg-white/5 animate-pulse"
        />
      </div>

      <div
        v-else-if="blockStore.blocks.length === 0"
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        <UIcon name="i-lucide-shield-off" class="size-8 text-white/40" />
        <p>You haven't blocked anyone</p>
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="b in blockStore.blocks"
          :key="b.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">
              <UserLink :user-id="b.blockedId" />
            </p>
            <p class="text-xs text-white/50">
              Blocked {{ new Date(b.createdAt).toLocaleString() }}
            </p>
          </div>
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-user-check"
            :aria-label="`Unblock user`"
            @click="askUnblock(b.blockedId)"
          >
            Unblock
          </UButton>
        </li>
      </ul>
    </section>

    <UserPickerModal
      v-model:open="pickerOpen"
      title="Block a user"
      description="Search for a user to block. They won't be able to message you, invite you to teams, or view your profile."
      placeholder="Search by name, username, or email"
      confirm-label="Block user"
      :loading="pickerLoading"
      :exclude-user-ids="blockStore.blocks.map((b) => b.blockedId)"
      @select="handlePick"
    />

    <UModal v-model:open="confirmUnblockOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div>
            <h2 class="text-lg font-semibold">Unblock this user?</h2>
            <p class="text-sm text-white/60 mt-1">
              They will be able to message you, invite you to teams, and view your profile again.
            </p>
          </div>
          <div class="flex gap-2 justify-end">
            <UButton variant="ghost" color="neutral" @click="confirmUnblockOpen = false">
              Cancel
            </UButton>
            <UButton color="error" :loading="busy" @click="confirmUnblock">Unblock</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
