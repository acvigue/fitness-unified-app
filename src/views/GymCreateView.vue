<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useOrganizationStore } from '@/stores/organization'
import { useToastStore } from '@/stores/toast'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import WeeklyRulesEditor, { type WeeklyRulePayload } from '@/components/gym/WeeklyRulesEditor.vue'

useHead({ title: 'Create Gym' })

const router = useRouter()
const { setHeader } = usePageHeader()
const orgStore = useOrganizationStore()
const toast = useToastStore()

setHeader({ title: 'Create Gym' })

const submitting = ref(false)
const submitError = ref('')
const touched = reactive({ name: false })

const orgOptions = computed(() =>
  orgStore.memberships
    .filter((m) => m.role === 'STAFF' || m.role === 'ADMIN')
    .map((m) => ({
      label: m.organizationName ?? m.organizationId,
      value: m.organizationId,
    })),
)
const hasSingleOrg = computed(() => orgOptions.value.length === 1)
const hasAnyOrg = computed(() => orgOptions.value.length > 0)

onMounted(async () => {
  if (!orgStore.initialized) {
    await orgStore.fetchMemberships()
  }
  if (hasSingleOrg.value) {
    form.organizationId = orgOptions.value[0].value
  }
})

const form = reactive({
  name: '',
  organizationId: '',
  description: '',
  location: '',
  capacity: undefined as number | undefined,
  isActive: true,
})

const weeklyRules = ref<WeeklyRulePayload[]>([])

const isValid = computed(() => form.name.trim() !== '' && form.organizationId.trim() !== '')

const openRuleCount = computed(() => weeklyRules.value.filter((r) => r.isOpen).length)

function onCancel() {
  router.push('/gyms')
}

function buildPayload() {
  return {
    name: form.name.trim(),
    organizationId: form.organizationId.trim(),
    description: form.description.trim() || undefined,
    location: form.location.trim() || undefined,
    capacity: form.capacity,
    isActive: form.isActive,
    weeklyRules: weeklyRules.value,
  }
}

async function onCreateGym() {
  touched.name = true
  if (!isValid.value || submitting.value) return

  submitting.value = true
  submitError.value = ''
  try {
    const { error: err } = await apiClient.POST('/v1/gyms', { body: buildPayload() })
    if (err) {
      const message = getErrorMessage(err, 'Failed to create gym')
      submitError.value = message
      toast.error('Could not create gym', message)
      return
    }
    toast.success('Gym created')
    router.push('/gyms')
  } catch (e) {
    const message = getErrorMessage(e, 'Failed to create gym')
    submitError.value = message
    toast.error('Could not create gym', message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PageLayout>
    <section class="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-6">
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-2">
          <h1 class="text-xl font-semibold text-white">Create a gym</h1>
          <p class="text-sm text-white/60">
            Set the gym details first, then paint the weekly schedule to define default recurring
            availability.
          </p>
        </div>
      </UCard>

      <UCard class="bg-white/5">
        <div class="grid gap-5 lg:grid-cols-2">
          <UFormField
            label="Gym name"
            required
            :error="touched.name && !form.name.trim() ? 'Name is required' : undefined"
          >
            <UInput
              v-model="form.name"
              placeholder="Corec Main Gym"
              size="lg"
              aria-label="Gym name"
              @blur="touched.name = true"
            />
          </UFormField>

          <UFormField
            v-if="!hasSingleOrg"
            label="Organization"
            required
            :error="
              hasAnyOrg && !form.organizationId
                ? 'Organization is required'
                : !hasAnyOrg
                  ? 'You must be staff or admin of an organization to create a gym'
                  : undefined
            "
          >
            <USelect
              v-model="form.organizationId"
              :items="orgOptions"
              :disabled="!hasAnyOrg"
              size="lg"
              placeholder="Select an organization"
              aria-label="Organization"
            />
          </UFormField>

          <UFormField label="Location">
            <UInput v-model="form.location" placeholder="CoRec West Wing" size="lg" />
          </UFormField>

          <UFormField label="Capacity">
            <UInput v-model="form.capacity" type="number" placeholder="120" size="lg" />
          </UFormField>

          <div class="lg:col-span-2">
            <UFormField label="Description">
              <UTextarea
                v-model="form.description"
                :rows="4"
                placeholder="Main basketball and volleyball court area."
              />
            </UFormField>
          </div>

          <div
            class="lg:col-span-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div>
              <p class="text-sm font-medium text-white/80">Gym active</p>
              <p class="text-xs text-white/50">Inactive gyms can be hidden from normal browsing.</p>
            </div>
            <USwitch v-model="form.isActive" />
          </div>
        </div>
      </UCard>

      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-white">Weekly schedule</h2>
              <p class="text-sm text-white/60">
                Paint the windows when this gym is open for reservations.
              </p>
            </div>
            <UBadge color="success" variant="soft">{{ openRuleCount }} open ranges</UBadge>
          </div>
          <WeeklyRulesEditor v-model="weeklyRules" />
        </div>
      </UCard>

      <UAlert v-if="submitError" color="error" :title="submitError" icon="i-lucide-circle-alert" />

      <div class="flex items-center justify-end gap-3">
        <UButton color="neutral" variant="outline" :disabled="submitting" @click="onCancel">
          Cancel
        </UButton>
        <UButton
          icon="i-lucide-plus"
          :disabled="!isValid || submitting"
          :loading="submitting"
          @click="onCreateGym"
        >
          Create Gym
        </UButton>
      </div>
    </section>
  </PageLayout>
</template>
