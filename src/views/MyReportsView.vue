<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import UserLink from '@/components/UserLink.vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type Report = components['schemas']['ReportResponseDto']

useHead({ title: 'My reports' })

const { setHeader } = usePageHeader()

const reports = ref<Report[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/report/user')
    if (err) {
      error.value = getErrorMessage(err, 'Failed to load reports')
      return
    }
    reports.value = Array.isArray(data) ? data : data ? [data] : []
  } finally {
    loading.value = false
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'PENDING':
      return 'warning'
    case 'REVIEWED':
      return 'info'
    case 'RESOLVED':
      return 'success'
    case 'DISMISSED':
      return 'neutral'
    default:
      return 'neutral'
  }
}

onMounted(() => {
  setHeader({ title: 'My reports', backRoute: '/settings' })
  load()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-circle-alert" />

      <div v-if="loading" class="flex justify-center p-4">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-white/40 size-6" />
      </div>

      <div
        v-else-if="reports.length === 0"
        class="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        You haven't submitted any reports.
      </div>

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="report in reports"
          :key="report.id"
          class="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/5 p-3"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <UIcon name="i-lucide-flag" class="text-white/50" />
            <UserLink :user-id="report.reportedId" class="text-sm font-medium" />
            <UBadge v-if="report.messageId" variant="subtle" color="neutral" size="xs">
              Message report
            </UBadge>
            <UBadge :color="statusColor(report.status)" variant="soft" size="xs">
              {{ report.status }}
            </UBadge>
          </div>
          <p v-if="report.reason" class="text-sm text-white/70">{{ report.reason }}</p>
          <p class="text-xs text-white/50">
            {{ new Date(report.createdAt).toLocaleString() }}
          </p>
        </div>
      </div>
    </section>
  </PageLayout>
</template>
