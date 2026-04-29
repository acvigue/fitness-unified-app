<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useOrganizationMembersStore } from '@/stores/organizationMembers'
import { useOrganizationStore } from '@/stores/organization'
import { useToastStore } from '@/stores/toast'
import { getErrorMessage } from '@/lib/api/errors'

useHead({ title: 'Organization invitations' })

const { setHeader } = usePageHeader()
const store = useOrganizationMembersStore()
const orgStore = useOrganizationStore()
const toast = useToastStore()

const acceptingId = ref<string | null>(null)
const decliningId = ref<string | null>(null)

onMounted(async () => {
  setHeader({ title: 'Organization invitations', backRoute: '/settings' })
  await store.loadMyInvitations()
})

async function accept(id: string) {
  acceptingId.value = id
  try {
    await store.acceptMyInvitation(id)
    await orgStore.fetchMemberships()
    toast.success('Joined organization')
  } catch (e) {
    toast.error('Could not accept', getErrorMessage(e, 'Failed to accept invitation'))
  } finally {
    acceptingId.value = null
  }
}

async function decline(id: string) {
  decliningId.value = id
  try {
    await store.declineMyInvitation(id)
    toast.info('Invitation declined')
  } catch (e) {
    toast.error('Could not decline', getErrorMessage(e, 'Failed to decline invitation'))
  } finally {
    decliningId.value = null
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <p class="text-sm text-white/60">
        Pending invitations to organizations. Accepting joins you with the proposed role.
      </p>

      <div
        v-if="store.myInvitations.length === 0"
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-8 text-center"
      >
        <UIcon name="i-lucide-mail" class="size-8 text-white/40" />
        <p class="text-sm font-medium text-white/70">No pending invitations</p>
      </div>

      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="inv in store.myInvitations"
          :key="inv.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium">
              {{ inv.organizationName ?? 'Organization' }}
            </p>
            <p class="text-xs text-white/60">
              Proposed role: <span class="font-medium">{{ inv.role }}</span>
            </p>
            <p class="text-xs text-white/50">Sent {{ formatDate(inv.createdAt) }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UButton
              size="xs"
              variant="outline"
              color="neutral"
              :disabled="!!decliningId"
              :loading="decliningId === inv.id"
              @click="decline(inv.id)"
            >
              Decline
            </UButton>
            <UButton
              size="xs"
              :disabled="!!acceptingId"
              :loading="acceptingId === inv.id"
              @click="accept(inv.id)"
            >
              Accept
            </UButton>
          </div>
        </li>
      </ul>
    </section>
  </PageLayout>
</template>
