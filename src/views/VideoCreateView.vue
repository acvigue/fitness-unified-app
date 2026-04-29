<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import * as UpChunk from '@mux/upchunk'
import PageLayout from '@/layouts/PageLayout.vue'
import SportsPickerModal from '@/components/SportsPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

useHead({ title: 'Upload Video' })

const router = useRouter()
const { setHeader } = usePageHeader()
const toast = useToastStore()

const form = reactive({
  name: '',
  description: '',
})
const selectedSport = ref<Sport | null>(null)
const sportsPickerOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)

const submitted = ref(false)
const submitting = ref(false)
const uploadProgress = ref(0) // 0..100
const phase = ref<'idle' | 'creating' | 'uploading' | 'finishing'>('idle')
const error = ref('')

let activeUpload: UpChunk.UpChunk | null = null

const nameError = computed(() => (submitted.value && !form.name.trim() ? 'Name is required' : ''))
const descriptionError = computed(() =>
  submitted.value && !form.description.trim() ? 'Description is required' : '',
)
const sportError = computed(() =>
  submitted.value && !selectedSport.value ? 'Sport is required' : '',
)
const fileError = computed(() => {
  if (!submitted.value) return ''
  if (!file.value) return 'Video file is required'
  if (!file.value.type.startsWith('video/')) return 'File must be a video'
  return ''
})

const fileSizeLabel = computed(() => {
  if (!file.value) return ''
  const mb = file.value.size / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`
})

const submitLabel = computed(() => {
  switch (phase.value) {
    case 'creating':
      return 'Preparing upload…'
    case 'uploading':
      return `Uploading… ${uploadProgress.value}%`
    case 'finishing':
      return 'Finalizing…'
    default:
      return 'Upload Video'
  }
})

function pickFile() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  file.value = f
  if (f && !form.name.trim()) {
    form.name = f.name.replace(/\.[^.]+$/, '')
  }
}

async function submit() {
  submitted.value = true
  error.value = ''

  if (nameError.value || descriptionError.value || sportError.value || fileError.value) {
    return
  }

  submitting.value = true
  phase.value = 'creating'

  try {
    const { data, error: err } = await apiClient.POST('/v1/videos', {
      body: {
        name: form.name.trim(),
        sportId: selectedSport.value!.id,
        description: form.description.trim(),
      },
    })

    if (err || !data) {
      error.value = getErrorMessage(err, 'Failed to create video')
      toast.error('Upload failed', error.value)
      phase.value = 'idle'
      submitting.value = false
      return
    }

    phase.value = 'uploading'
    uploadProgress.value = 0

    await uploadFileToMux(data.uploadUrl, file.value!)

    phase.value = 'finishing'
    toast.success('Upload complete', 'Mux is processing your video.')
    router.push(`/videos/${data.video.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to upload video'
    toast.error('Upload failed', error.value)
    phase.value = 'idle'
  } finally {
    submitting.value = false
  }
}

function uploadFileToMux(endpoint: string, fileToUpload: File): Promise<void> {
  return new Promise((resolve, reject) => {
    activeUpload = UpChunk.createUpload({
      endpoint,
      file: fileToUpload,
      chunkSize: 30720, // 30 MB chunks
    })

    activeUpload.on('error', (err: { detail: unknown }) => {
      const message = err.detail instanceof Error ? err.detail.message : String(err.detail)
      reject(new Error(message))
    })

    activeUpload.on('progress', (event: { detail: number }) => {
      uploadProgress.value = Math.round(event.detail)
    })

    activeUpload.on('success', () => {
      uploadProgress.value = 100
      resolve()
    })
  })
}

onMounted(() => {
  setHeader({ title: 'Upload Video', backRoute: '/videos' })
})

onBeforeUnmount(() => {
  if (activeUpload && phase.value === 'uploading') {
    activeUpload.abort()
  }
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
            <p class="text-sm text-white/60">Upload a video to your library.</p>
          </div>

          <UFormField label="Video file" required :error="fileError">
            <input
              ref="fileInput"
              type="file"
              accept="video/*"
              class="hidden"
              @change="onFileChange"
            />
            <div class="flex flex-col gap-2">
              <UButton
                variant="outline"
                color="neutral"
                icon="i-lucide-upload"
                :disabled="submitting"
                @click="pickFile"
              >
                {{ file ? 'Choose a different file' : 'Choose video file' }}
              </UButton>
              <p v-if="file" class="text-xs text-white/60">{{ file.name }} · {{ fileSizeLabel }}</p>
            </div>
          </UFormField>

          <UFormField label="Video Name" required :error="nameError">
            <UInput
              v-model="form.name"
              placeholder="Morning run — 5k PR"
              :aria-invalid="!!nameError"
              :disabled="submitting"
            />
          </UFormField>

          <UFormField label="Video Description" required :error="descriptionError">
            <UInput
              v-model="form.description"
              placeholder="Shot with chest-cam at Pier 39"
              :aria-invalid="!!descriptionError"
              :disabled="submitting"
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
                :disabled="submitting"
                :aria-label="selectedSport ? 'Change sport' : 'Select sport'"
                @click="sportsPickerOpen = true"
              >
                {{ selectedSport ? 'Change Sport' : 'Select Sport' }}
              </UButton>
            </div>
          </UFormField>

          <div v-if="phase === 'uploading'" class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-xs text-white/60">
              <span>Uploading to Mux</span>
              <span>{{ uploadProgress }}%</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded bg-white/10">
              <div
                class="h-full bg-primary transition-[width] duration-150"
                :style="{ width: `${uploadProgress}%` }"
              />
            </div>
          </div>

          <UButton color="primary" :loading="submitting" :disabled="submitting" @click="submit">
            {{ submitLabel }}
          </UButton>
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
