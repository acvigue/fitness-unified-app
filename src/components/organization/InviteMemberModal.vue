<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useToastStore } from '@/stores/toast'
import { useOrganizationMembersStore } from '@/stores/organizationMembers'
import { getErrorMessage } from '@/lib/api/errors'
import UserPickerModal from '@/components/user/UserPickerModal.vue'
import type { components } from '@/types/api'

type Role = components['schemas']['OrganizationMemberListItemDto']['role']

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  invited: []
}>()

const toast = useToastStore()
const store = useOrganizationMembersStore()

type SelectedUser = { sub: string; name?: string | null; username?: string | null }
const selectedUser = ref<SelectedUser | null>(null)
const role = ref<Role>('MEMBER')
const submitting = ref(false)
const error = ref('')
const pickerOpen = ref(false)

const roleItems = [
  { label: 'Member', value: 'MEMBER' as Role },
  { label: 'Staff', value: 'STAFF' as Role },
  { label: 'Admin', value: 'ADMIN' as Role },
]

const excludeUserIds = computed(() => store.members.map((m) => m.userId))

watch(
  () => props.open,
  (v) => {
    if (!v) return
    selectedUser.value = null
    role.value = 'MEMBER'
    error.value = ''
  },
)

function onUserSelected(user: { sub: string; name?: string | null; username?: string | null }) {
  selectedUser.value = user
  pickerOpen.value = false
}

async function submit() {
  if (!selectedUser.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    await store.invite(selectedUser.value.sub, role.value)
    toast.success('Invitation sent')
    emit('invited')
    emit('update:open', false)
  } catch (e) {
    error.value = getErrorMessage(e, 'Failed to send invitation')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    :open="props.open"
    :dismissible="!submitting"
    @update:open="(v) => emit('update:open', v)"
  >
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="text-lg font-semibold">Invite a member</h2>
          <p class="text-sm text-white/60">
            The user will receive an in-app notification and can accept or decline.
          </p>
        </div>

        <UFormField label="User" required>
          <div class="flex items-center gap-2">
            <UButton
              size="sm"
              variant="outline"
              color="neutral"
              icon="i-lucide-user-search"
              @click="pickerOpen = true"
            >
              {{
                selectedUser
                  ? (selectedUser.name ?? selectedUser.username ?? 'Selected user')
                  : 'Pick a user'
              }}
            </UButton>
            <UButton
              v-if="selectedUser"
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-x"
              @click="selectedUser = null"
            />
          </div>
        </UFormField>

        <UFormField label="Role" required>
          <USelect v-model="role" :items="roleItems" />
        </UFormField>

        <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

        <div class="flex gap-2 justify-end">
          <UButton
            variant="ghost"
            color="neutral"
            :disabled="submitting"
            @click="emit('update:open', false)"
          >
            Cancel
          </UButton>
          <UButton :loading="submitting" :disabled="!selectedUser" @click="submit">
            Send invitation
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <UserPickerModal
    v-model:open="pickerOpen"
    title="Invite a user"
    description="Pick someone to invite to this organization."
    confirm-label="Pick"
    :exclude-user-ids="excludeUserIds"
    @select="onUserSelected"
  />
</template>
