<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import UserLink from '@/components/UserLink.vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'

type Report = components['schemas']['ReportResponseDto']

useHead({ title: 'My reports' })

const { setHeader } = usePageHeader()
const toast = useToastStore()
const router = useRouter()

const reports = ref<Report[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await apiClient.GET('/v1/report/user')
    if (err) {
      const message = getErrorMessage(err, 'Failed to load reports')
      error.value = message
      toast.error('Could not load reports', message)
      return
    }
    reports.value = data?.data ?? []
  } catch (e) {
    const message = getErrorMessage(e, 'Failed to load reports')
    error.value = message
    toast.error('Could not load reports', message)
  } finally {
    loading.value = false
  }
}

function statusColor(status: string): 'warning' | 'info' | 'success' | 'neutral' {
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

function statusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'Pending review'
    case 'REVIEWED':
      return 'Reviewed'
    case 'RESOLVED':
      return 'Resolved'
    case 'DISMISSED':
      return 'Dismissed'
    default:
      return status
  }
}

function goToReport() {
  router.push('/report')
}

onMounted(() => {
  setHeader({ title: 'My reports', backRoute: '/settings' })
  load()
})
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-4 px-5 py-6">
      <div class="flex items-center justify-between">
        <h1 class="text-sm uppercase tracking-[0.3em] text-white/60">My reports</h1>
        <UButton
          v-if="!loading"
          type="button"
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-refresh-cw"
          aria-label="Refresh reports"
          @click="load"
        />
      </div>

      <div
        v-if="error && !loading"
        class="flex flex-col items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3"
        role="alert"
      >
        <div class="flex items-center gap-2 text-sm text-rose-300">
          <UIcon name="i-lucide-circle-alert" class="size-4" />
          {{ error }}
        </div>
        <UButton
          type="button"
          size="xs"
          variant="soft"
          color="error"
          icon="i-lucide-refresh-cw"
          @click="load"
        >
          Try again
        </UButton>
      </div>

      <div v-if="loading" class="flex flex-col gap-2" aria-busy="true">
        <div
          v-for="i in 3"
          :key="i"
          class="h-16 rounded-lg border border-white/10 bg-white/5 animate-pulse"
        />
      </div>

      <div
        v-else-if="reports.length === 0 && !error"
        class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-white/10 p-8 text-center"
      >
        <UIcon name="i-lucide-flag" class="size-8 text-white/30" />
        <p class="text-sm text-white/70">No reports submitted yet — great!</p>
        <p class="text-xs text-white/40">
          If you see something that breaks the rules, let our team know.
        </p>
        <UButton
          type="button"
          color="primary"
          variant="soft"
          icon="i-lucide-flag"
          class="mt-1"
          @click="goToReport"
        >
          File a report
        </UButton>
      </div>

      <div v-else-if="reports.length > 0" class="flex flex-col gap-3">
        <div
          v-for="report in reports"
          :key="report.id"
          class="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/5 p-3"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <UIcon name="i-lucide-flag" class="text-white/50" />
            <span class="text-xs text-white/50">Reported</span>
            <UserLink :user-id="report.reportedId" class="text-sm font-medium" />
            <UBadge v-if="report.messageId" variant="subtle" color="neutral" size="xs">
              Message report
            </UBadge>
            <UBadge :color="statusColor(report.status)" variant="soft" size="xs">
              {{ statusLabel(report.status) }}
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
