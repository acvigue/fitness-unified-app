<template>
  <PageLayout>
    <section class="flex flex-col gap-6 px-5 py-6">
      <div class="rounded-lg border border-dashed border-white/20 p-12 text-center">
        <div class="mx-auto max-w-3xl space-y-4">
          <h2 class="text-2xl font-semibold">Your Active Sessions</h2>
          <p class="text-white/70">
            View all devices and sessions where your account is currently active. You can revoke any
            session below.
          </p>

          <div v-if="loading" class="text-white/50">Loading sessions...</div>
          <div v-else-if="error" class="text-red-400">{{ error }}</div>

          <ul v-else class="space-y-4">
            <li
              v-for="session in sessions"
              :key="session.id"
              class="flex flex-col sm:flex-row sm:justify-between sm:items-center border border-white/10 rounded p-4"
            >
              <div class="text-left">
                <p><strong>ID:</strong> {{ session.id }}</p>
                <p><strong>Created:</strong> {{ formatDate(session.createdAt) }}</p>
                <p><strong>Last Activity:</strong> {{ formatDate(session.updatedAt) }}</p>
              </div>
              <button
                @click="revoke(session.id)"
                class="mt-2 sm:mt-0 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Revoke
              </button>
            </li>
          </ul>

          <div v-if="sessions.length === 0 && !loading" class="text-white/50">
            No sessions found.
          </div>
        </div>
      </div>
    </section>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { SessionsApi } from '@/stores/api/sessions'
import { getErrorMessage } from '@/lib/api/errors'

interface Session {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
}

const sessions = ref<Session[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const { setHeader } = usePageHeader()

// Format ISO dates
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString()
}

// Fetch sessions from backend
async function fetchSessions() {
  loading.value = true
  error.value = null
  try {
    sessions.value = await SessionsApi.getSessions()
  } catch (err: any) {
    error.value = getErrorMessage(err, 'Failed to load sessions')
  } finally {
    loading.value = false
  }
}

// Revoke a session
async function revoke(id: string) {
  try {
    await SessionsApi.revokeSession(id)
    sessions.value = sessions.value.filter((s) => s.id !== id)
  } catch (err: any) {
    alert(getErrorMessage(err, 'Failed to revoke session'))
  }
}

// Set page header and load sessions on mount
onMounted(() => {
  setHeader({ title: 'Sessions' })
  fetchSessions()
})
</script>

<style scoped></style>
