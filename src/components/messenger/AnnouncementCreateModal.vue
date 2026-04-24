<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useOrganizationStore } from '@/stores/organization'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type OrgRole = 'MEMBER' | 'STAFF' | 'ADMIN'
type ChatResponse = components['schemas']['ChatResponseDto']

const emit = defineEmits<{
  (e: 'created', chat: ChatResponse): void
}>()

const open = defineModel<boolean>('open', { default: false })

const router = useRouter()
const orgStore = useOrganizationStore()
const toast = useToastStore()

const form = reactive({
  organizationId: '',
  name: '',
  writeRoles: ['STAFF', 'ADMIN'] as OrgRole[],
})
const submitting = ref(false)
const error = ref('')

const adminOrStaffMemberships = computed(() =>
  orgStore.memberships.filter((m) => m.role === 'STAFF' || m.role === 'ADMIN'),
)

const orgOptions = computed(() =>
  adminOrStaffMemberships.value.map((m) => ({
    label: (m.organizationName as unknown as string) ?? m.organizationId,
    value: m.organizationId,
  })),
)

const roleOptions: { label: string; value: OrgRole }[] = [
  { label: 'Admins', value: 'ADMIN' },
  { label: 'Staff', value: 'STAFF' },
  { label: 'Members', value: 'MEMBER' },
]

watch(open, (isOpen) => {
  if (isOpen) {
    error.value = ''
    form.name = ''
    form.writeRoles = ['STAFF', 'ADMIN']
    form.organizationId = adminOrStaffMemberships.value[0]?.organizationId ?? ''
  }
})

const canSubmit = computed(
  () => !!form.organizationId && !!form.name.trim() && form.writeRoles.length > 0,
)

function toggleRole(role: OrgRole) {
  if (form.writeRoles.includes(role)) {
    form.writeRoles = form.writeRoles.filter((r) => r !== role)
  } else {
    form.writeRoles = [...form.writeRoles, role]
  }
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  error.value = ''
  try {
    const { data, error: apiError } = await apiClient.POST('/v1/chats/announcements', {
      body: {
        organizationId: form.organizationId,
        name: form.name.trim(),
        writeRoles: form.writeRoles,
      },
    })
    if (apiError) {
      const msg = getErrorMessage(apiError, 'Failed to create announcement channel')
      error.value = msg
      toast.error('Create failed', msg)
      return
    }
    emit('created', data)
    toast.success('Announcement channel created')
    open.value = false
    router.push(`/messenger/${data.id}`)
  } catch (e) {
    const msg = getErrorMessage(e, 'Failed to create announcement channel')
    error.value = msg
    toast.error('Create failed', msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 flex flex-col gap-4">
        <h2 class="text-lg font-semibold">New Announcement Channel</h2>

        <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

        <UAlert
          v-if="!adminOrStaffMemberships.length"
          color="warning"
          icon="i-lucide-info"
          title="No eligible organization"
          description="You must be an ADMIN or STAFF of an organization to create an announcement channel."
        />

        <template v-else>
          <UFormField label="Organization">
            <USelectMenu
              v-model="form.organizationId"
              :items="orgOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Channel name">
            <UInput v-model="form.name" placeholder="General Announcements" autofocus />
          </UFormField>

          <UFormField label="Who can post?">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="r in roleOptions"
                :key="r.value"
                size="sm"
                :variant="form.writeRoles.includes(r.value) ? 'solid' : 'outline'"
                :color="form.writeRoles.includes(r.value) ? 'primary' : 'neutral'"
                :aria-pressed="form.writeRoles.includes(r.value)"
                @click="toggleRole(r.value)"
              >
                {{ r.label }}
              </UButton>
            </div>
            <p class="text-xs text-white/50 mt-1">
              Non-posters will see the channel in read-only mode.
            </p>
          </UFormField>

          <UButton
            block
            color="primary"
            :loading="submitting"
            :disabled="!canSubmit"
            @click="submit"
          >
            Create Channel
          </UButton>
        </template>
      </div>
    </template>
  </UModal>
</template>
