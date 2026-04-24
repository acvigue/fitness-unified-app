<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import SportsPickerModal from '@/components/SportsPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Sport = components['schemas']['SportResponseDto']

useHead({ title: 'Create Video' })

const router = useRouter()
const { setHeader } = usePageHeader()

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

async function createVideo() {
  if (!form.name.trim() || !selectedSport.value || !form.description || !form.url) {
    error.value = 'Name, description, url, and sport are required'
    return
  }

  creating.value = true
  error.value = ''

  try {
    const { data, error: err } = await apiClient.POST('/v1/videos', {
      body: {
        name: form.name.trim(),
        sportId: selectedSport.value.id,
        description: form.description,
        url: form.url,
        mimeType: form.mimeType,
        size: form.size,
      },
    })

    if (err) {
      error.value = getErrorMessage(err, 'Failed to create video')
      return
    }

    router.push(`/videos/${data.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create video'
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

          <UFormField label="Video Name">
            <UInput v-model="form.name" placeholder="Cool Video" />
          </UFormField>
		  
		  <UFormField label="Video Description">
            <UInput v-model="form.description" placeholder="Stuff happens." />
          </UFormField>
		  
		  <UFormField label="Video URL">
            <UInput v-model="form.url" placeholder="123.123.123" />
          </UFormField>

          <UFormField label="Sport">
            <div class="flex flex-wrap gap-2">
              <UBadge v-if="selectedSport" color="primary" variant="soft" class="gap-1.5">
                {{ selectedSport.icon }} {{ selectedSport.name }}
              </UBadge>
              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                icon="i-lucide-plus"
                @click="sportsPickerOpen = true"
              >
                {{ selectedSport ? 'Change Sport' : 'Select Sport' }}
              </UButton>
            </div>
          </UFormField>

          <UButton color="primary" :loading="creating" @click="createVideo">
            Create Video
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
