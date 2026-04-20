<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'

useHead({
  title: 'Create Gym',
})

const router = useRouter()
const { setHeader } = usePageHeader()

setHeader({
  title: 'Create Gym',
})

const form = reactive({
  name: '',
  building: '',
  description: '',
  locationDetails: '',
  openTime: '08:00',
  closeTime: '22:00',
  notes: '',
})

const isValid = computed(() => {
  return form.name.trim() !== '' && form.building.trim() !== ''
})

function onCancel() {
  router.push('/gyms')
}

function onCreateGym() {
  if (!isValid.value) return

  // Frontend-only for now
  console.log('Create gym payload:', {
    ...form,
  })

  router.push('/gyms')
}
</script>

<template>
  <PageLayout>
    <section class="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-6">
      <!-- Intro card -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-2">
          <h1 class="text-xl font-semibold text-white">Create a gym</h1>
          <p class="text-sm text-white/60">
            Add a new gym location and set up its basic information.
          </p>
        </div>
      </UCard>

      <!-- Main form -->
      <UCard class="bg-white/5">
        <div class="grid gap-5">
          <UFormField label="Gym name" required>
            <UInput
              v-model="form.name"
              placeholder="Corec Main Gym"
              size="lg"
            />
          </UFormField>

          <UFormField label="Building" required>
            <UInput
              v-model="form.building"
              placeholder="CoRec"
              size="lg"
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="form.description"
              :rows="4"
              placeholder="Main basketball and volleyball court area."
            />
          </UFormField>

          <UFormField label="Location details">
            <UInput
              v-model="form.locationDetails"
              placeholder="Floor 1, West Wing"
              size="lg"
            />
          </UFormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Open time">
              <UInput
                v-model="form.openTime"
                type="time"
                size="lg"
              />
            </UFormField>

            <UFormField label="Close time">
              <UInput
                v-model="form.closeTime"
                type="time"
                size="lg"
              />
            </UFormField>
          </div>

          <UFormField label="Notes">
            <UTextarea
              v-model="form.notes"
              :rows="4"
              placeholder="Optional notes about this gym."
            />
          </UFormField>
        </div>
      </UCard>

      <!-- Preview card -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-3">
          <p class="text-sm font-medium text-white/80">Preview</p>

          <div class="rounded-lg border border-white/10 bg-white/5 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-white">
                  {{ form.name || 'Gym name' }}
                </h2>
                <p class="text-sm text-white/60">
                  {{ form.building || 'Building' }}
                </p>
                <p class="mt-2 text-sm text-white/70">
                  {{ form.description || 'Gym description will appear here.' }}
                </p>
                <p v-if="form.locationDetails" class="mt-2 text-xs text-white/50">
                  {{ form.locationDetails }}
                </p>
              </div>

              <UBadge color="info" variant="soft" size="sm">
                {{ form.openTime }} - {{ form.closeTime }}
              </UBadge>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3">
        <UButton
          color="neutral"
          variant="outline"
          @click="onCancel"
        >
          Cancel
        </UButton>

        <UButton
          icon="i-lucide-plus"
          :disabled="!isValid"
          @click="onCreateGym"
        >
          Create Gym
        </UButton>
      </div>
    </section>
  </PageLayout>
</template>