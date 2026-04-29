<script setup lang="ts">
import { computed, h, onMounted, ref, resolveComponent } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useOrganizationMembersStore } from '@/stores/organizationMembers'
import { useOrganizationStore } from '@/stores/organization'
import { useCurrentUserStore } from '@/stores/currentUser'
import { useToastStore } from '@/stores/toast'
import { getErrorMessage } from '@/lib/api/errors'
import MemberRoleSelect from '@/components/organization/MemberRoleSelect.vue'
import InviteMemberModal from '@/components/organization/InviteMemberModal.vue'
import type { components } from '@/types/api'

type Member = components['schemas']['OrganizationMemberListItemDto']
type Invitation = components['schemas']['OrganizationInvitationResponseDto']
type Role = Member['role']

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()
const store = useOrganizationMembersStore()
const orgStore = useOrganizationStore()
const currentUser = useCurrentUserStore()
const toast = useToastStore()

const orgId = computed(() => String(route.params.id))
const tab = ref<'members' | 'invitations'>('members')
const search = ref('')
const roleFilter = ref<Role | 'ALL'>('ALL')
const inviteOpen = ref(false)
const removeTarget = ref<Member | null>(null)
const removeLoading = ref(false)
const revokeTarget = ref<Invitation | null>(null)
const revokeLoading = ref(false)

const myMembership = computed(() =>
  orgStore.memberships.find((m) => m.organizationId === orgId.value),
)
const myRole = computed<Role | null>(() => myMembership.value?.role ?? null)
const isAdmin = computed(() => myRole.value === 'ADMIN')
const canViewInvitations = computed(() => myRole.value === 'STAFF' || myRole.value === 'ADMIN')

useHead({ title: 'Organization members' })

const orgName = computed(() => myMembership.value?.organizationName ?? 'Organization members')

onMounted(async () => {
  if (!orgStore.initialized) await orgStore.fetchMemberships()
  if (!myMembership.value) {
    toast.error('Not authorized', 'You are not a member of this organization.')
    router.replace('/settings')
    return
  }
  setHeader({ title: orgName.value, backRoute: '/settings' })
  await store.loadFor(orgId.value)
})

const filteredMembers = computed(() => {
  const term = search.value.trim().toLowerCase()
  return store.members.filter((m) => {
    if (roleFilter.value !== 'ALL' && m.role !== roleFilter.value) return false
    if (!term) return true
    return (
      (m.name?.toLowerCase().includes(term) ?? false) ||
      (m.username?.toLowerCase().includes(term) ?? false) ||
      (m.email?.toLowerCase().includes(term) ?? false)
    )
  })
})

const isOnlyAdmin = (m: Member) => m.role === 'ADMIN' && store.adminCount <= 1

async function handleRoleChange(member: Member, nextRole: Role) {
  if (nextRole === member.role) return
  try {
    await store.updateRole(member.userId, nextRole)
    toast.success('Role updated')
  } catch (e) {
    toast.error('Could not update role', getErrorMessage(e, 'Failed to update role'))
  }
}

async function confirmRemove() {
  if (!removeTarget.value) return
  removeLoading.value = true
  try {
    await store.removeMember(removeTarget.value.userId)
    toast.success('Member removed')
    removeTarget.value = null
  } catch (e) {
    toast.error('Could not remove member', getErrorMessage(e, 'Failed to remove'))
  } finally {
    removeLoading.value = false
  }
}

async function confirmRevoke() {
  if (!revokeTarget.value) return
  revokeLoading.value = true
  try {
    await store.revokeInvitation(revokeTarget.value.id)
    toast.success('Invitation revoked')
    revokeTarget.value = null
  } catch (e) {
    toast.error('Could not revoke invitation', getErrorMessage(e, 'Failed to revoke'))
  } finally {
    revokeLoading.value = false
  }
}

const UBadge = resolveComponent('UBadge')

const memberColumns = [
  {
    accessorKey: 'name',
    header: 'Member',
  },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'joinedAt', header: 'Joined' },
  { accessorKey: 'actions', header: '' },
]

const invitationColumns = [
  { accessorKey: 'invitedUserName', header: 'Invitee' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'createdAt', header: 'Sent' },
  { accessorKey: 'actions', header: '' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function roleColor(role: Role) {
  if (role === 'ADMIN') return 'primary'
  if (role === 'STAFF') return 'info'
  return 'neutral'
}

function memberDisplay(m: Member): string {
  return m.name ?? m.username ?? m.email ?? m.userId.slice(0, 8)
}

function inviteeDisplay(i: Invitation): string {
  return i.invitedUserName ?? i.invitedUserUsername ?? i.invitedUserId.slice(0, 8)
}

// h() helpers for table cells
const renderRoleBadge = (role: Role) =>
  h(UBadge, { color: roleColor(role), variant: 'soft', size: 'xs' }, () => role)
</script>

<template>
  <PageLayout>
    <section class="mx-auto flex w-full max-w-[1300px] flex-col gap-5 px-4 py-6">
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-2">
          <h1 class="text-xl font-semibold text-white">{{ orgName }}</h1>
          <p class="text-sm text-white/60">
            <template v-if="isAdmin">
              You can change roles, remove members, and invite new members.
            </template>
            <template v-else-if="canViewInvitations">
              You can view membership and pending invitations. Only admins can edit.
            </template>
            <template v-else>You can view members of this organization.</template>
          </p>
        </div>
      </UCard>

      <UTabs
        v-model="tab"
        :items="[
          { label: 'Members', value: 'members', icon: 'i-lucide-users' },
          ...(canViewInvitations
            ? [{ label: 'Invitations', value: 'invitations', icon: 'i-lucide-mail' }]
            : []),
        ]"
      />

      <template v-if="tab === 'members'">
        <UCard class="bg-white/5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <UInput
                v-model="search"
                placeholder="Search members"
                icon="i-lucide-search"
                size="sm"
                class="sm:w-64"
              />
              <USelect
                v-model="roleFilter"
                :items="[
                  { label: 'All roles', value: 'ALL' },
                  { label: 'Admin', value: 'ADMIN' },
                  { label: 'Staff', value: 'STAFF' },
                  { label: 'Member', value: 'MEMBER' },
                ]"
                size="sm"
              />
            </div>
            <UButton v-if="isAdmin" icon="i-lucide-user-plus" size="sm" @click="inviteOpen = true">
              Invite member
            </UButton>
          </div>
        </UCard>

        <UCard class="bg-white/5 p-0">
          <UTable :data="filteredMembers" :columns="memberColumns">
            <template #name-cell="{ row }">
              <div class="flex flex-col">
                <span class="font-medium text-white">{{ memberDisplay(row.original) }}</span>
                <span v-if="row.original.username" class="text-xs text-white/50">
                  @{{ row.original.username }}
                </span>
              </div>
            </template>
            <template #email-cell="{ row }">
              <span class="text-white/70 text-sm">{{ row.original.email ?? '—' }}</span>
            </template>
            <template #role-cell="{ row }">
              <div v-if="!isAdmin || row.original.userId === currentUser.user?.sub">
                <component :is="renderRoleBadge(row.original.role)" />
              </div>
              <MemberRoleSelect
                v-else
                :model-value="row.original.role"
                :is-last-admin="isOnlyAdmin(row.original)"
                :can-edit="isAdmin"
                @update:model-value="(r) => handleRoleChange(row.original, r)"
              />
            </template>
            <template #joinedAt-cell="{ row }">
              <span class="text-white/60 text-xs">{{ formatDate(row.original.joinedAt) }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UButton
                  v-if="isAdmin && row.original.userId !== currentUser.user?.sub"
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-lucide-user-minus"
                  :disabled="isOnlyAdmin(row.original)"
                  :title="isOnlyAdmin(row.original) ? 'Cannot remove the last admin' : 'Remove'"
                  @click="removeTarget = row.original"
                >
                  Remove
                </UButton>
              </div>
            </template>
            <template #empty>
              <div class="flex flex-col items-center gap-1 p-8 text-center">
                <UIcon name="i-lucide-users" class="size-6 text-white/40" />
                <p class="text-sm text-white/60">No members match this filter.</p>
              </div>
            </template>
          </UTable>
        </UCard>
      </template>

      <template v-else-if="tab === 'invitations'">
        <UCard class="bg-white/5 p-0">
          <UTable :data="store.invitations" :columns="invitationColumns">
            <template #invitedUserName-cell="{ row }">
              <div class="flex flex-col">
                <span class="font-medium text-white">{{ inviteeDisplay(row.original) }}</span>
                <span v-if="row.original.invitedUserUsername" class="text-xs text-white/50">
                  @{{ row.original.invitedUserUsername }}
                </span>
              </div>
            </template>
            <template #role-cell="{ row }">
              <component :is="renderRoleBadge(row.original.role)" />
            </template>
            <template #createdAt-cell="{ row }">
              <span class="text-white/60 text-xs">{{ formatDate(row.original.createdAt) }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UButton
                  v-if="isAdmin"
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-lucide-x"
                  @click="revokeTarget = row.original"
                >
                  Revoke
                </UButton>
              </div>
            </template>
            <template #empty>
              <div class="flex flex-col items-center gap-1 p-8 text-center">
                <UIcon name="i-lucide-mail" class="size-6 text-white/40" />
                <p class="text-sm text-white/60">No pending invitations.</p>
              </div>
            </template>
          </UTable>
        </UCard>
      </template>

      <InviteMemberModal v-model:open="inviteOpen" @invited="store.loadFor(orgId)" />

      <UModal
        :open="!!removeTarget"
        :dismissible="!removeLoading"
        @update:open="(v) => !v && (removeTarget = null)"
      >
        <template #content>
          <div class="p-6 flex flex-col gap-4">
            <div class="flex items-start gap-3">
              <div class="rounded-full bg-error/10 p-2 shrink-0">
                <UIcon name="i-lucide-user-minus" class="size-5 text-error" />
              </div>
              <div class="flex flex-col gap-1">
                <h2 class="text-lg font-semibold">Remove this member?</h2>
                <p class="text-sm text-white/60">
                  {{ removeTarget ? memberDisplay(removeTarget) : '' }} will lose access to this
                  organization. They can be invited again later.
                </p>
              </div>
            </div>
            <div class="flex gap-2 justify-end">
              <UButton
                variant="ghost"
                color="neutral"
                :disabled="removeLoading"
                @click="removeTarget = null"
              >
                Keep
              </UButton>
              <UButton color="error" :loading="removeLoading" @click="confirmRemove">
                Remove
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <UModal
        :open="!!revokeTarget"
        :dismissible="!revokeLoading"
        @update:open="(v) => !v && (revokeTarget = null)"
      >
        <template #content>
          <div class="p-6 flex flex-col gap-4">
            <div class="flex items-start gap-3">
              <div class="rounded-full bg-error/10 p-2 shrink-0">
                <UIcon name="i-lucide-x" class="size-5 text-error" />
              </div>
              <div class="flex flex-col gap-1">
                <h2 class="text-lg font-semibold">Revoke this invitation?</h2>
                <p class="text-sm text-white/60">
                  The invitee will no longer be able to accept it.
                </p>
              </div>
            </div>
            <div class="flex gap-2 justify-end">
              <UButton
                variant="ghost"
                color="neutral"
                :disabled="revokeLoading"
                @click="revokeTarget = null"
              >
                Cancel
              </UButton>
              <UButton color="error" :loading="revokeLoading" @click="confirmRevoke">
                Revoke
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </section>
  </PageLayout>
</template>
