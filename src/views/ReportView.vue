<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import UserLink from '@/components/UserLink.vue'
import UserPickerModal from '@/components/user/UserPickerModal.vue'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import { useToastStore } from '@/stores/toast'
import type { components } from '@/types/api'
import { useI18n } from 'vue-i18n'

type Report = components['schemas']['ReportResponseDto']
type UserLookupItem = components['schemas']['UserLookupItemDto']

const { t } = useI18n()
const { setHeader } = usePageHeader()
const toast = useToastStore()

const MIN_DESCRIPTION_LENGTH = 10

const REASON_OPTIONS: { label: string; value: string }[] = [
  { label: 'Harassment or bullying', value: 'harassment' },
  { label: 'Hate speech', value: 'hate_speech' },
  { label: 'Spam or scam', value: 'spam' },
  { label: 'Inappropriate content', value: 'inappropriate' },
  { label: 'Threats or violence', value: 'threats' },
  { label: 'Impersonation', value: 'impersonation' },
  { label: 'Other', value: 'other' },
]

// Reports list
const reports = ref<Report[]>([])
const reportsLoading = ref(false)
const reportsError = ref('')

async function loadReports() {
  reportsLoading.value = true
  reportsError.value = ''
  try {
    const { data: reportsData, error: err } = await apiClient.GET('/v1/report/user')
    if (err) throw new Error(getErrorMessage(err, 'Failed to load reports'))
    reports.value = reportsData?.data ?? []
  } catch (e) {
    reports.value = []
    reportsError.value = getErrorMessage(e, 'Failed to load reports')
  } finally {
    reportsLoading.value = false
  }
}

onMounted(() => {
  setHeader({ title: t('report.report'), backRoute: '/settings' })
  loadReports()
})

// User picker
const userPickerOpen = ref(false)
const selectedUser = ref<UserLookupItem | null>(null)

function displayName(u: UserLookupItem) {
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ')
  return full || u.name || u.username || u.email || 'Unknown user'
}

function onUserSelected(user: UserLookupItem) {
  selectedUser.value = user
  userPickerOpen.value = false
}

function clearUser() {
  selectedUser.value = null
}

// Report form
const reasonCategory = ref<string>('')
const description = ref('')
const submitting = ref(false)
const attemptedSubmit = ref(false)

const userError = computed(() => {
  if (!attemptedSubmit.value) return ''
  if (!selectedUser.value) return 'Please select a user to report'
  return ''
})

const reasonError = computed(() => {
  if (!attemptedSubmit.value) return ''
  if (!reasonCategory.value) return 'Please select a reason'
  return ''
})

const descriptionError = computed(() => {
  if (!attemptedSubmit.value) return ''
  const trimmed = description.value.trim()
  if (!trimmed) return 'Please add a description'
  if (trimmed.length < MIN_DESCRIPTION_LENGTH)
    return `Please describe in at least ${MIN_DESCRIPTION_LENGTH} characters`
  return ''
})

const isValid = computed(
  () =>
    selectedUser.value !== null &&
    reasonCategory.value.length > 0 &&
    description.value.trim().length >= MIN_DESCRIPTION_LENGTH,
)

function selectedReasonLabel() {
  return REASON_OPTIONS.find((r) => r.value === reasonCategory.value)?.label ?? reasonCategory.value
}

async function submitReport() {
  attemptedSubmit.value = true
  if (!isValid.value || !selectedUser.value) return
  submitting.value = true

  try {
    const combinedReason = `${selectedReasonLabel()}: ${description.value.trim()}`
    const { error: submitError } = await apiClient.POST('/v1/report', {
      body: {
        reportedId: selectedUser.value.id,
        reason: combinedReason,
      },
    })
    if (submitError) throw new Error(getErrorMessage(submitError, t('report.error')))
    toast.success(t('report.success'), 'Our team will review it shortly.')
    // Clear form
    selectedUser.value = null
    reasonCategory.value = ''
    description.value = ''
    attemptedSubmit.value = false
    loadReports()
  } catch (err: unknown) {
    toast.error(t('report.error'), getErrorMessage(err, t('report.error')))
  } finally {
    submitting.value = false
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
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-6 px-5 py-6">
      <UCard class="bg-white/5">
        <form class="flex flex-col gap-5" novalidate @submit.prevent="submitReport">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">
            {{ t('report.report') }}
          </p>

          <!-- User Selection -->
          <UFormField :label="t('report.whichuser')" required :error="userError">
            <div v-if="selectedUser" class="flex items-center gap-2">
              <UBadge color="primary" variant="subtle" class="gap-1.5 pr-1.5">
                {{ displayName(selectedUser) }}
                <UButton
                  type="button"
                  color="primary"
                  variant="link"
                  size="2xs"
                  icon="i-lucide-x"
                  aria-label="Clear selected user"
                  @click="clearUser"
                />
              </UBadge>
              <UButton
                type="button"
                variant="ghost"
                color="neutral"
                size="xs"
                aria-label="Change selected user"
                @click="userPickerOpen = true"
              >
                Change
              </UButton>
            </div>
            <UButton
              v-else
              type="button"
              variant="outline"
              color="neutral"
              icon="i-lucide-search"
              :aria-label="t('report.selectuser')"
              @click="userPickerOpen = true"
            >
              {{ t('report.selectuser') }}
            </UButton>
          </UFormField>

          <!-- Reason category -->
          <UFormField :label="t('report.reason')" required :error="reasonError">
            <USelect
              v-model="reasonCategory"
              :items="REASON_OPTIONS"
              value-key="value"
              placeholder="Select a reason"
              :aria-label="t('report.reason')"
              class="w-full"
            />
          </UFormField>

          <!-- Description -->
          <UFormField
            :label="t('report.whyreporting')"
            required
            :error="descriptionError"
            :hint="`At least ${MIN_DESCRIPTION_LENGTH} characters`"
          >
            <UTextarea
              v-model="description"
              :placeholder="t('report.reasonplaceholder')"
              :rows="4"
              autoresize
              :aria-label="t('report.whyreporting')"
            />
          </UFormField>

          <!-- Submit -->
          <div class="flex justify-end">
            <UButton
              type="submit"
              color="primary"
              :loading="submitting"
              :disabled="submitting || (attemptedSubmit && !isValid)"
            >
              {{ t('report.submit') }}
            </UButton>
          </div>
        </form>
      </UCard>

      <!-- Reports List -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">
              {{ t('report.yourreports') }}
            </p>
            <UButton
              v-if="!reportsLoading"
              type="button"
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-refresh-cw"
              aria-label="Refresh reports"
              @click="loadReports"
            />
          </div>

          <div v-if="reportsLoading" class="flex flex-col gap-2" aria-busy="true">
            <div
              v-for="i in 2"
              :key="i"
              class="h-16 rounded-lg border border-white/10 bg-white/5 animate-pulse"
            />
          </div>
          <div
            v-else-if="reportsError"
            class="flex flex-col items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3"
            role="alert"
          >
            <div class="flex items-center gap-2 text-sm text-rose-300">
              <UIcon name="i-lucide-circle-alert" class="size-4" />
              {{ reportsError }}
            </div>
            <UButton
              type="button"
              size="xs"
              variant="soft"
              color="error"
              icon="i-lucide-refresh-cw"
              @click="loadReports"
            >
              Try again
            </UButton>
          </div>
          <p v-else-if="reports.length === 0" class="text-sm text-white/50">
            {{ t('report.noreports') }}
          </p>
          <div v-else class="flex flex-col gap-3">
            <div
              v-for="(report, index) in reports"
              :key="report.id ?? index"
              class="flex items-start justify-between gap-3 rounded-lg border border-white/10 p-3"
            >
              <div class="flex flex-col gap-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <UIcon name="i-lucide-flag" class="text-white/50 shrink-0" />
                  <UserLink :user-id="report.reportedId" class="text-sm font-medium" />
                  <UBadge v-if="report.messageId" variant="subtle" color="neutral" size="xs">
                    Message report
                  </UBadge>
                  <UBadge :color="statusColor(report.status)" variant="soft" size="xs">
                    {{ statusLabel(report.status) }}
                  </UBadge>
                </div>
                <p v-if="report.reason" class="text-sm text-white/70 line-clamp-2">
                  {{ report.reason }}
                </p>
                <span class="text-xs text-white/50">
                  {{ new Date(report.createdAt).toLocaleString() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </section>

    <UserPickerModal
      v-model:open="userPickerOpen"
      :title="t('report.selectuser')"
      :placeholder="t('report.searchusers')"
      confirm-label="Select"
      @select="onUserSelected"
    />
  </PageLayout>
</template>
