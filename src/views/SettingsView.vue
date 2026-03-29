<template>
  <PageLayout>
    <section class="flex flex-col gap-6 px-5 py-6">
      <!-- Account Section -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">
              {{ t('settings.account') }}
            </p>
            <p class="text-lg font-medium">{{ accountLabel }}</p>
          </div>
          <UButton
            color="primary"
            variant="ghost"
            icon="i-lucide-log-out"
            @click="handleLogout"
          >
            {{ t('settings.logout') }}
          </UButton>
        </div>
      </UCard>

      <!--  Profile Section  -->
      <UAlert
        v-if="profileError"
        color="error"
        :title="profileError"
        icon="i-lucide-circle-alert"
        :close="{
          color: 'error',
          variant: 'link',
          icon: 'i-lucide-x',
        }"
        @close="profileError = ''"
      />
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-5">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">
            {{ t('settings.profile') }}
          </p>

          <!-- Name -->
          <div class="flex gap-3">
            <UFormField :label="t('settings.firstName')" class="flex-1">
              <UInput v-model="nameForm.firstName" :placeholder="t('settings.firstName')" />
            </UFormField>
            <UFormField :label="t('settings.lastName')" class="flex-1">
              <UInput v-model="nameForm.lastName" :placeholder="t('settings.lastName')" />
            </UFormField>
          </div>
          <div class="flex items-center gap-3">
            <UButton
              color="primary"
              variant="soft"
              size="sm"
              :loading="savingName"
              :disabled="!nameChanged"
              @click="saveName"
            >
              {{ t('settings.saveName') }}
            </UButton>
            <p v-if="nameSuccess" class="text-green-500 text-sm">{{ t('settings.nameSaved') }}</p>
          </div>

          <!-- Profile Pictures -->
          <UFormField :label="t('settings.profilePictures')">
            <div class="flex gap-3 items-center overflow-x-auto p-1">
              <button
                v-for="pic in profile.pictures"
                :key="pic.id"
                class="relative shrink-0 rounded-full transition-all"
                :class="pic.isPrimary ? 'ring-3 ring-primary ring-offset-2 ring-offset-neutral-900' : 'opacity-60 hover:opacity-100'"
                @click="setPrimaryPicture(pic.id)"
              >
                <UAvatar
                  :src="pic.url"
                  :alt="(pic.alt as unknown as string) || ''"
                  size="3xl"
                />
              </button>
              <button
                class="shrink-0 size-13 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors"
                :disabled="uploading"
                @click="($refs.fileInput as HTMLInputElement).click()"
              >
                <UIcon
                  v-if="uploading"
                  name="i-lucide-loader-2"
                  class="size-5 animate-spin text-white/40"
                />
                <UIcon v-else name="i-lucide-plus" class="size-5 text-white/40" />
              </button>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onFileInputChange"
              />
            </div>
          </UFormField>

          <!-- Bio -->
          <UFormField :label="t('settings.bio')">
            <UTextarea
              v-model="profileForm.bio"
              :placeholder="t('settings.bioPlaceholder')"
              :rows="3"
              autoresize
            />
          </UFormField>

          <!-- Favorite Sports -->
          <UFormField :label="t('settings.favoriteSports')">
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="sport in profileForm.favoriteSports"
                :key="sport.id"
                color="primary"
                variant="soft"
                class="gap-1.5 pr-1.5"
              >
                {{ sport.icon }} {{ sport.name }}
                <UButton
                  color="primary"
                  variant="link"
                  size="2xs"
                  icon="i-lucide-x"
                  @click="removeSport(sport.id)"
                />
              </UBadge>
              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                icon="i-lucide-plus"
                @click="sportsPickerOpen = true"
              >
                {{ t('settings.addSport') }}
              </UButton>
            </div>
          </UFormField>

          <!-- Status messages -->
          <p v-if="showSaveSuccess" class="text-green-500 text-sm mt-2">
            Saved profile
          </p>
          <p v-if="showSaveInfo" class="text-red-500 text-sm mt-2">
            • Need to change the profile
          </p>
          
          <!-- Save Button -->
          <div class="flex justify-end">
            <UButton color="primary" :loading="saving" @click="saveProfile">
              {{ t('settings.saveProfile') }}
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Language Section -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">
              {{ t('settings.language') }}
            </p>
            <p class="text-sm text-white/60">{{ t('settings.languageDesc') }}</p>
          </div>
          <USelectMenu
            v-model="selectedLocale"
            :items="localeOptions"
            value-key="value"
            :searchable="false"
            @update:model-value="changeLocale"
          />
        </div>
      </UCard>

      <!-- Light Section -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">
              {{ t('settings.theme') }}
            </p>
            <p class="text-sm text-white/60">{{ t('settings.themeDesc') }}</p>
          </div>
          <USelectMenu
            v-model="currentTheme"
            :items="themeOptions"
            value-key="value"
            :searchable="false"
            @update:model-value="changeTheme"
          />
        </div>
      </UCard>


      <!-- Sessions Section -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">
              {{ t('settings.sessions') }}
            </p>
            <p class="text-sm text-white/60">{{ t('settings.sessionsDesc') }}</p>
          </div>

          <p v-if="sessionsLoading" class="text-sm text-white/50">
            {{ t('settings.loadingSessions') }}
          </p>
          <p v-else-if="sessions.length === 0" class="text-sm text-white/50">
            {{ t('settings.noSessions') }}
          </p>
          <div v-else class="flex flex-col gap-3">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"
            >
              <div class="flex flex-col gap-1 min-w-0">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-monitor" class="text-white/50 shrink-0" />
                  <span class="text-sm font-medium truncate">{{ session.ipAddress }}</span>
                  <UBadge v-if="(session as any).thisSession" color="primary" variant="soft" size="xs">
                    {{ t('settings.thisSession') }}
                  </UBadge>
                  <UBadge v-if="session.rememberMe" color="primary" variant="soft" size="xs">
                    {{ t('settings.rememberMe') }}
                  </UBadge>
                </div>
                <span class="text-xs text-white/50">
                  {{ t('settings.startedAt') }} {{ new Date(session.startedAt).toLocaleString() }}
                </span>
                <span class="text-xs text-white/50">
                  {{ t('settings.lastAccessed') }}
                  {{ new Date(session.lastAccessedAt).toLocaleString() }}
                </span>
              </div>
              <UButton
                v-if="session.revocable"
                color="red"
                variant="soft"
                size="xs"
                :loading="revokingSessionId === session.id"
                @click="revokeSession(session.id)"
              >
                {{ t('settings.revokeSession') }}
              </UButton>
            </div>
          </div>

          <div v-if="sessions.length > 1" class="flex justify-end">
            <UButton
              color="red"
              variant="ghost"
              icon="i-lucide-log-out"
              :loading="revokingAll"
              @click="revokeAllSessions"
            >
              {{ t('settings.revokeAllSessions') }}
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Danger Zone Section -->
      <UCard class="bg-red-900/10 border-red-900/20">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs uppercase font-medium tracking-[0.3em] text-red-400">
              {{ t('settings.danger') }}
            </p>
            <p class="text-sm text-white/60">{{ t('settings.manageordel') }}</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <UButton color="orange" variant="soft" @click="openDeactivateModal">
              {{ t('settings.deactivate') }}
            </UButton>
            <UButton color="red" variant="soft" @click="openDeleteModal">
              {{ t('settings.delete') }}
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- About Section  -->
      <UCard class="bg-white/5">
        <div class="space-y-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">
              {{ t('settings.about') }}
            </p>
            <p class="text-lg font-medium">{{ appName }}</p>
          </div>
          <ul class="space-y-2 text-sm text-white/70">
            <li class="flex items-center justify-between">
              <span>{{ t('settings.version') }}</span>
              <span>{{ appVersion }}</span>
            </li>
            <li class="flex items-center justify-between">
              <span>{{ t('settings.buildchannel') }}</span>
              <span class="capitalize">{{ appChannel }}</span>
            </li>
          </ul>
        </div>
      </UCard>
    </section>

    <!-- Confirm Account Action Modal -->
    <UModal v-model:open="confirmModal.isOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <UIcon
              :name="confirmModal.isDelete ? 'i-lucide-trash-2' : 'i-lucide-user-minus'"
              class="size-5"
              :class="confirmModal.isDelete ? 'text-red-500' : 'text-orange-500'"
            />
            <h2 class="text-lg font-semibold">{{ confirmModal.title }}</h2>
          </div>

          <p class="text-sm text-white/70">{{ confirmModal.description }}</p>

          <p v-if="confirmModal.error" class="text-xs text-red-400">{{ confirmModal.error }}</p>

          <div class="flex justify-end gap-3">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="confirmModal.loading"
              @click="confirmModal.isOpen = false"
            >
              {{ t('settings.cancel') }}
            </UButton>
            <UButton
              :color="confirmModal.isDelete ? 'error' : 'warning'"
              :loading="confirmModal.loading"
              @click="handleAccountAction"
            >
              {{ t('settings.confirm') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Sports Picker Modal -->
    <SportsPickerModal
      v-model:open="sportsPickerOpen"
      :selected="profileForm.favoriteSports"
      @update="onSportsUpdated"
    />
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import SportsPickerModal from '@/components/SportsPickerModal.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import { ENV } from '@/config/environment'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type UserProfile = components['schemas']['UserProfileResponseDto']
type Session = components['schemas']['KeycloakSessionResponseDto']
type MediaUploadResponse = components['schemas']['MediaUploadResponseDto']
type Sport = components['schemas']['SportResponseDto']
import { useI18n } from 'vue-i18n'
import { SUPPORT_LOCALES } from '@/i18n'
const { t, locale } = useI18n()

useHead({
  title: t('settings.settings'),
  meta: [{ name: 'description', content: t('settings.manage') }],
})

const authStore = useAuthStore()
const router = useRouter()
const { setHeader } = usePageHeader()

const accountLabel = computed(() =>
  authStore.isLoggedIn ? t('settings.signedin') : t('settings.nsignedin'),
)

const appName = 'FitTime'
const appVersion = ENV.appVersion
const appChannel = ENV.appChannel

const profileError = ref('')
const showSaveSuccess = ref(false)
const showSaveInfo = ref(false)

// Theme
const themeOptions = computed(() => [
  { label: t('settings.light'), value: 'light' },
  { label: t('settings.dark'), value: 'dark' },
])

const currentTheme = ref(localStorage.getItem('theme') || 'dark')


onMounted(() => {
  setHeader({
    title: t('settings.settings'),
    backRoute: '/',
  })
  // Apply saved theme
  if (currentTheme.value === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})

const handleLogout = async () => {
  await authStore.logout()
  router.replace('/login')
}

// Modal state
const confirmModal = ref({
  isOpen: false,
  isDelete: false,
  title: '',
  description: '',
  error: '',
  loading: false,
})

const openDeactivateModal = () => {
  confirmModal.value = {
    isOpen: true,
    isDelete: false,
    title: t('settings.deactivate?'),
    description: t('settings.profilehidden'),
    error: '',
    loading: false,
  }
}

const openDeleteModal = () => {
  confirmModal.value = {
    isOpen: true,
    isDelete: true,
    title: t('settings.delete?'),
    description: t('settings.grace'),
    error: '',
    loading: false,
  }
}

const handleAccountAction = async () => {
  confirmModal.value.loading = true
  confirmModal.value.error = ''

  try {
    if (confirmModal.value.isDelete) {
      const { error: deleteErr } = await apiClient.DELETE('/v1/user/me')
      if (deleteErr) throw new Error(getErrorMessage(deleteErr, 'Failed to delete account'))
    } else {
      const { error: deactivateErr } = await apiClient.POST('/v1/user/me/deactivate')
      if (deactivateErr) throw new Error(getErrorMessage(deactivateErr, 'Failed to deactivate account'))
    }

    confirmModal.value.isOpen = false
    await authStore.logout()
    router.replace('/login')
  } catch (err: any) {
    console.error('Action failed', err)
    confirmModal.value.error = err.message || t('settings.actionFailed')
    confirmModal.value.loading = false
  }
}

// Profile
const profile = ref<UserProfile>({ userId: '', bio: '', favoriteSports: [], pictures: [] })
const profileForm = reactive({ bio: '', favoriteSports: [] as Sport[] })
const saving = ref(false)
const originalProfile = ref('')

// Name
const nameForm = reactive({ firstName: '', lastName: '' })
const originalName = ref({ firstName: '', lastName: '' })
const savingName = ref(false)
const nameSuccess = ref(false)
const nameChanged = computed(() =>
  nameForm.firstName !== originalName.value.firstName || nameForm.lastName !== originalName.value.lastName,
)

async function saveName() {
  savingName.value = true
  nameSuccess.value = false
  try {
    const { error: nameErr } = await apiClient.PATCH('/v1/user/me/name', {
      body: { firstName: nameForm.firstName, lastName: nameForm.lastName },
    })
    if (nameErr) throw new Error(getErrorMessage(nameErr, 'Failed to update name'))
    originalName.value = { firstName: nameForm.firstName, lastName: nameForm.lastName }
    nameSuccess.value = true
  } catch (err: any) {
    profileError.value = err.message || 'Failed to update name'
  } finally {
    savingName.value = false
  }
}

// Sports picker
const sportsPickerOpen = ref(false)

function onSportsUpdated(sports: Sport[]) {
  profileForm.favoriteSports = sports
}

function removeSport(sportId: string) {
  profileForm.favoriteSports = profileForm.favoriteSports.filter((s) => s.id !== sportId)
}

// Profile pictures
const uploading = ref(false)
const pendingPictureIds = ref<string[]>([])

function setPrimaryPicture(picId: string) {
  profile.value.pictures = profile.value.pictures.map((p) => ({
    ...p,
    isPrimary: p.id === picId,
  }))
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  uploadFile(file)
}

async function uploadFile(file: File) {
  uploading.value = true
  profileError.value = ''
  try {
    const token = await authStore.getAccessToken()
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${ENV.apiBaseUrl}/v1/utils/media-upload`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(getErrorMessage(body, 'Failed to upload media'))
    }
    const media: MediaUploadResponse = await response.json()
    pendingPictureIds.value.push(media.id)
    // Add to display immediately
    profile.value.pictures.push({
      id: media.id,
      url: media.url,
      isPrimary: profile.value.pictures.length === 0,
    })
  } catch (error: any) {
    console.error('Upload failed', error)
    profileError.value = error.message || t('settings.uploadFailed')
  } finally {
    uploading.value = false
  }
}

function serializeForm() {
  const primaryId = profile.value.pictures.find((p) => p.isPrimary)?.id || ''
  return JSON.stringify({
    bio: profileForm.bio,
    sportIds: profileForm.favoriteSports.map((s) => s.id).sort(),
    pictureIds: profile.value.pictures.map((p) => p.id),
    primaryPictureId: primaryId,
  })
}

onMounted(async () => {
  setHeader({ title: t('settings.settings'), backRoute: '/' })
  loadSessions()
  try {
    const { data: profileData, error: profileLoadErr } = await apiClient.GET('/v1/user/profile')
    if (profileLoadErr) throw new Error(getErrorMessage(profileLoadErr, 'Failed to load profile'))
    profile.value = profileData
    profileForm.bio = (profileData.bio as unknown as string) || ''
    profileForm.favoriteSports = [...profileData.favoriteSports]
    nameForm.firstName = profileData.firstName || ''
    nameForm.lastName = profileData.lastName || ''
    originalName.value = { firstName: nameForm.firstName, lastName: nameForm.lastName }
    originalProfile.value = serializeForm()
  } catch (error) {
    console.error('Failed to load profile', error)
  }
})

const hasChanges = computed(() => {
  return serializeForm() !== originalProfile.value
})

// Language
const localeLabels: Record<string, string> = {
  en: 'English',
  es: 'Español',
}
const localeOptions = SUPPORT_LOCALES.map((l) => ({ label: localeLabels[l] || l, value: l }))
const selectedLocale = ref(localeOptions.find((o) => o.value === locale.value) || localeOptions[0])

function changeLocale(value: string) {
  locale.value = value
  document.querySelector('html')?.setAttribute('lang', value)
  setHeader({ title: t('settings.settings'), backRoute: '/' })
}

// Sessions
const sessions = ref<Session[]>([])
const sessionsLoading = ref(false)
const revokingSessionId = ref<string | null>(null)
const revokingAll = ref(false)

async function loadSessions() {
  sessionsLoading.value = true
  try {
    const { data: sessionsData, error: sessionsErr } = await apiClient.GET('/v1/user/sessions')
    if (sessionsErr) throw new Error(getErrorMessage(sessionsErr, 'Failed to load sessions'))
    sessions.value = sessionsData
  } catch (error) {
    console.error('Failed to load sessions', error)
  } finally {
    sessionsLoading.value = false
  }
}

async function revokeSession(id: string) {
  const session = sessions.value.find((s) => s.id === id)
  revokingSessionId.value = id
  try {
    const { error: revokeErr } = await apiClient.DELETE('/v1/user/sessions/{id}', {
      params: { path: { id } },
    })
    if (revokeErr) throw new Error(getErrorMessage(revokeErr, 'Failed to revoke session'))
    if ((session as any)?.thisSession) {
      await authStore.clearLocalSession()
      window.location.reload()
      return
    }
    sessions.value = sessions.value.filter((s) => s.id !== id)
  } catch (error) {
    console.error('Failed to revoke session', error)
  } finally {
    revokingSessionId.value = null
  }
}

async function revokeAllSessions() {
  revokingAll.value = true
  try {
    const { error: revokeAllErr } = await apiClient.POST('/v1/user/sessions/logout')
    if (revokeAllErr) throw new Error(getErrorMessage(revokeAllErr, 'Failed to revoke all sessions'))
    sessions.value = []
  } catch (error) {
    console.error('Failed to revoke all sessions', error)
  } finally {
    revokingAll.value = false
  }
}

async function saveProfile() {
  profileError.value = '' 
  showSaveSuccess.value = false
  showSaveInfo.value = false
  
  if (!hasChanges.value) {
    showSaveInfo.value = true
    return
  }

  saving.value = true 
  try {
    // Send primary picture first (API treats first as primary)
    const sorted = [...profile.value.pictures].sort((a, b) =>
      a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1,
    )
    const allPictureIds = sorted.map((p) => p.id)

    const { data: updatedProfile, error: updateErr } = await apiClient.PATCH('/v1/user/profile', {
      body: {
        bio: profileForm.bio,
        favoriteSportIds: profileForm.favoriteSports.map((s) => s.id),
        pictureIds: allPictureIds,
      },
    })
    if (updateErr) throw new Error(getErrorMessage(updateErr, 'Failed to update profile'))
    profile.value = updatedProfile
    profileForm.favoriteSports = [...updatedProfile.favoriteSports]
    pendingPictureIds.value = []
    originalProfile.value = serializeForm()
    showSaveSuccess.value = true
  } catch (error: any) {
    console.error('Update failed', error)
    profileError.value = error.message || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

function changeTheme(value: string) {
  currentTheme.value = value
  localStorage.setItem('theme', value)
  if (value === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

</script>
