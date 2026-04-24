<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import SportsPickerModal from '@/components/SportsPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

useHead({ title: 'Create Video' })

const router = useRouter()
const { setHeader } = usePageHeader()
const toast = useToastStore()

const form = reactive({
  name: '',
  description: '',
  url: '',
  mimeType: 'video/mp4',
  size: 0,
})
const selectedSport = ref<Sport | null>(null)
const sportsPickerOpen = ref(false)
const creating = ref(false)
const error = ref('')
const submitted = ref(false)

const nameError = computed(() => (submitted.value && !form.name.trim() ? 'Name is required' : ''))
const descriptionError = computed(() =>
  submitted.value && !form.description.trim() ? 'Description is required' : '',
)
const urlError = computed(() => {
  if (!submitted.value) return ''
  if (!form.url.trim()) return 'URL is required'
  if (!/^https?:\/\/\S+$/i.test(form.url.trim())) return 'URL must start with http:// or https://'
  return ''
})
const sportError = computed(() =>
  submitted.value && !selectedSport.value ? 'Sport is required' : '',
)

async function createVideo() {
  submitted.value = true
  error.value = ''

  if (nameError.value || descriptionError.value || urlError.value || sportError.value) {
    return
  }

  creating.value = true

  try {
    const { data, error: err } = await apiClient.POST('/v1/videos', {
      body: {
        name: form.name.trim(),
        sportId: selectedSport.value!.id,
        description: form.description.trim(),
        url: form.url.trim(),
        mimeType: form.mimeType,
        size: form.size,
      },
    })

    if (err) {
      error.value = getErrorMessage(err, 'Failed to create video')
      toast.error('Failed to create video', error.value)
      return
    }

    toast.success('Video created', form.name.trim())
    router.push(`/videos/${data.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create video'
    toast.error('Failed to create video', error.value)
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  setHeader({ title: 'Create Video', backRoute: '/videos' })
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-5 px-5 py-6 max-w-xl">
      <UAlert
        v-if="error"
        color="error"
        :title="error"
        icon="i-lucide-circle-alert"
        :close="{ color: 'error', variant: 'link', icon: 'i-lucide-x' }"
        @close="error = ''"
      />

      <UCard class="bg-white/5">
        <div class="flex flex-col gap-5">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">New Video</p>
            <p class="text-sm text-white/60">Create a video for your organization.</p>
          </div>

          <UFormField label="Video Name" required :error="nameError">
            <UInput
              v-model="form.name"
              placeholder="Morning run — 5k PR"
              :aria-invalid="!!nameError"
            />
          </UFormField>

          <UFormField label="Video Description" required :error="descriptionError">
            <UInput
              v-model="form.description"
              placeholder="Shot with chest-cam at Pier 39"
              :aria-invalid="!!descriptionError"
            />
          </UFormField>

          <UFormField label="Video URL" required :error="urlError">
            <UInput
              v-model="form.url"
              type="url"
              placeholder="https://cdn.example.com/clip.mp4"
              :aria-invalid="!!urlError"
            />
          </UFormField>

          <UFormField label="Sport" required :error="sportError">
            <div class="flex flex-wrap gap-2">
              <UBadge v-if="selectedSport" color="primary" variant="soft" class="gap-1.5">
                {{ selectedSport.icon }} {{ selectedSport.name }}
              </UBadge>
              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                icon="i-lucide-plus"
                :aria-label="selectedSport ? 'Change sport' : 'Select sport'"
                @click="sportsPickerOpen = true"
              >
                {{ selectedSport ? 'Change Sport' : 'Select Sport' }}
              </UButton>
            </div>
          </UFormField>

          <UButton color="primary" :loading="creating" @click="createVideo"> Create Video </UButton>
        </div>
      </UCard>
    </section>

    <SportsPickerModal
      v-model:open="sportsPickerOpen"
      :selected="selectedSport ? [selectedSport] : []"
      @update="(sports: Sport[]) => (selectedSport = sports[0] ?? null)"
    />
  </PageLayout>
</template>
