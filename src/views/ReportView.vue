<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { ReportApi, type Report } from '@/stores/api/report'
import { chatApi, type UserLookupItem } from '@/stores/api/chat'
import { useAuthStore } from '@/stores/auth/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const { setHeader } = usePageHeader()

// Reports list
const reports = ref<Report[]>([])
const reportsLoading = ref(false)

async function loadReports() {
  reportsLoading.value = true
  try {
    reports.value = await ReportApi.getReportsForUser()
  } catch {
    reports.value = []
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
const searchTerm = ref('')
const searchResults = ref<UserLookupItem[]>([])
const searchLoading = ref(false)
const selectedUser = ref<UserLookupItem | null>(null)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchTerm, (term) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!term || term.length < 2) {
    searchResults.value = []
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  searchTimeout = setTimeout(async () => {
    try {
      searchResults.value = await chatApi.lookupUsers(term)
    } catch {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }, 300)
})

function selectUser(user: UserLookupItem) {
  selectedUser.value = user
  userPickerOpen.value = false
  searchTerm.value = ''
  searchResults.value = []
}

function clearUser() {
  selectedUser.value = null
}

// Report form
const reason = ref('')
const submitting = ref(false)
const error = ref('')
const showSuccess = ref(false)

const canSubmit = computed(() => selectedUser.value !== null && reason.value.trim().length > 0)

async function submitReport() {
  if (!canSubmit.value || !selectedUser.value) return
  submitting.value = true
  error.value = ''
  showSuccess.value = false

  try {
    const reporterId = authStore.user?.sub ?? ''
    await ReportApi.submitReport(reporterId, selectedUser.value.id, reason.value.trim())
    showSuccess.value = true
    selectedUser.value = null
    reason.value = ''
    loadReports()
  } catch (err: any) {
    error.value = err.message || t('report.error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PageLayout>
    <section class="flex flex-col gap-6 px-5 py-6">
      <UAlert
        v-if="showSuccess"
        color="success"
        :title="t('report.success')"
        icon="i-lucide-circle-check"
        :close="{ color: 'success', variant: 'link', icon: 'i-lucide-x' }"
        @close="showSuccess = false"
      />

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
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">
            {{ t('report.report') }}
          </p>

          <!-- User Selection -->
          <UFormField :label="t('report.whichuser')">
            <div v-if="selectedUser" class="flex items-center gap-3">
              <UBadge color="primary" variant="subtle" class="gap-1.5 pr-1.5">
                {{ selectedUser.name || selectedUser.username }}
                <UButton
                  color="primary"
                  variant="link"
                  size="2xs"
                  icon="i-lucide-x"
                  @click="clearUser"
                />
              </UBadge>
            </div>
            <UButton
              v-else
              variant="outline"
              color="neutral"
              icon="i-lucide-search"
              @click="userPickerOpen = true"
            >
              {{ t('report.selectuser') }}
            </UButton>
          </UFormField>

          <!-- Reason -->
          <UFormField :label="t('report.whyreporting')">
            <UTextarea
              v-model="reason"
              :placeholder="t('report.reasonplaceholder')"
              :rows="4"
              autoresize
            />
          </UFormField>

          <!-- Submit -->
          <div class="flex justify-end">
            <UButton
              color="primary"
              :loading="submitting"
              :disabled="!canSubmit"
              @click="submitReport"
            >
              {{ t('report.submit') }}
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Reports List -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">
            {{ t('report.yourreports') }}
          </p>

          <p v-if="reportsLoading" class="text-sm text-white/50">
            {{ t('report.loading') }}
          </p>
          <p v-else-if="reports.length === 0" class="text-sm text-white/50">
            {{ t('report.noreports') }}
          </p>
          <div v-else class="flex flex-col gap-3">
            <div
              v-for="(report, index) in reports"
              :key="index"
              class="flex items-start justify-between gap-3 rounded-lg border border-white/10 p-3"
            >
              <div class="flex flex-col gap-1 min-w-0">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-flag" class="text-white/50 shrink-0" />
                  <span class="text-sm font-medium truncate">{{ report.reportedId }}</span>
                  <UBadge
                    :color="report.status === 'PENDING' ? 'warning' : report.status === 'RESOLVED' ? 'success' : 'neutral'"
                    variant="soft"
                    size="xs"
                  >
                    {{ report.status }}
                  </UBadge>
                </div>
                <p class="text-sm text-white/70 line-clamp-2">{{ report.reason }}</p>
                <span class="text-xs text-white/50">
                  {{ new Date(report.createdAt).toLocaleString() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </section>

    <!-- User Picker Modal -->
    <UModal v-model:open="userPickerOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <h2 class="text-lg font-semibold">{{ t('report.selectuser') }}</h2>

          <UInput
            v-model="searchTerm"
            :placeholder="t('report.searchusers')"
            icon="i-lucide-search"
            autofocus
          />

          <div class="max-h-60 overflow-y-auto -mx-2">
            <div v-if="searchLoading" class="flex justify-center py-4">
              <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-white/50" />
            </div>
            <template v-else-if="searchResults.length">
              <button
                v-for="user in searchResults"
                :key="user.id"
                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/5"
                @click="selectUser(user)"
              >
                <div class="flex flex-col min-w-0">
                  <span class="text-sm font-medium truncate">{{ user.name || user.username }}</span>
                  <span v-if="user.email" class="text-xs text-white/50 truncate">{{ user.email }}</span>
                </div>
              </button>
            </template>
            <p v-else-if="searchTerm.length >= 2" class="text-center text-sm text-white/40 py-4">
              {{ t('report.noresults') }}
            </p>
          </div>
        </div>
      </template>
    </UModal>
  </PageLayout>
</template>
