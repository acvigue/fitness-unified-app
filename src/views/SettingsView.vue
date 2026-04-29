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
            aria-label="Log out"
            @click="logoutConfirmOpen = true"
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
                type="button"
                :aria-label="pic.isPrimary ? 'Primary profile picture' : 'Set as primary picture'"
                :aria-pressed="pic.isPrimary"
                class="relative shrink-0 rounded-full transition-all"
                :class="
                  pic.isPrimary
                    ? 'ring-3 ring-primary ring-offset-2 ring-offset-neutral-900'
                    : 'opacity-60 hover:opacity-100'
                "
                @click="setPrimaryPicture(pic.id)"
              >
                <UAvatar :src="pic.url" :alt="(pic.alt as unknown as string) || ''" size="3xl" />
              </button>
              <button
                type="button"
                aria-label="Upload profile picture"
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
          <p v-if="showSaveSuccess" class="text-green-500 text-sm mt-2">Saved profile</p>
          <p v-if="showSaveInfo" class="text-amber-500 text-sm mt-2">You have unsaved changes</p>

          <!-- Save Button -->
          <div class="flex justify-end">
            <UButton color="primary" :loading="saving" @click="saveProfile">
              {{ t('settings.saveProfile') }}
            </UButton>
          </div>
        </div>
      </UCard>
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-5">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">Profile Privacy</p>
          <p class="text-sm mt-2">Hide Bio From Other Users</p>
          <URadioGroup v-model="value1" :items="items" />
          <p class="text-sm mt-2">Hide Favorite Sports From Other Users</p>
          <URadioGroup v-model="value2" :items="items" />
          <p class="text-sm mt-2">Hide Tournament History From Other Users</p>
          <URadioGroup v-model="value3" :items="items" />
          <p class="text-sm mt-2">Hide Featured Achievements From Other Users</p>
          <URadioGroup v-model="value4" :items="items" />
          <div class="flex justify-end">
            <UButton color="primary" :loading="saving2" @click="savePrivacy">
              Save Privacy
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
                  <UBadge
                    v-if="(session as Session & { thisSession?: boolean }).thisSession"
                    color="primary"
                    variant="soft"
                    size="xs"
                  >
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

      <!-- Preferences shortcuts  -->
      <UCard class="bg-white/5">
        <div class="space-y-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Preferences</p>
            <p class="text-sm text-white/60">Manage reminders, subscriptions, and blocks.</p>
          </div>
          <div class="flex flex-col gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-clock"
              trailing-icon="i-lucide-chevron-right"
              block
              class="justify-between"
              :to="{ name: 'reminder-preferences' }"
            >
              Tournament reminders
            </UButton>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-bell"
              trailing-icon="i-lucide-chevron-right"
              block
              class="justify-between"
              :to="{ name: 'gym-subscriptions' }"
            >
              Watched gyms
            </UButton>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-user-x"
              trailing-icon="i-lucide-chevron-right"
              block
              class="justify-between"
              :to="{ name: 'blocked-users' }"
            >
              Blocked users
            </UButton>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-flag"
              trailing-icon="i-lucide-chevron-right"
              block
              class="justify-between"
              :to="{ name: 'my-reports' }"
            >
              My reports
            </UButton>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-mail"
              trailing-icon="i-lucide-chevron-right"
              block
              class="justify-between"
              :to="{ name: 'organization-invitations' }"
            >
              Organization invitations
            </UButton>
          </div>
        </div>
      </UCard>

      <UCard v-if="organizationsForAdmin.length > 0" class="bg-white/5">
        <div class="space-y-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Organizations</p>
            <p class="text-sm text-white/60">Manage members and roles in your organizations.</p>
          </div>
          <div class="flex flex-col gap-2">
            <UButton
              v-for="org in organizationsForAdmin"
              :key="org.organizationId"
              variant="ghost"
              color="neutral"
              icon="i-lucide-users"
              trailing-icon="i-lucide-chevron-right"
              block
              class="justify-between"
              :to="`/organizations/${org.organizationId}/members`"
            >
              {{ org.organizationName ?? 'Organization' }} ·
              {{ org.role }}
            </UButton>
          </div>
        </div>
      </UCard>

      <UCard class="bg-white/5">
        <div class="space-y-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Moderation</p>
            <p class="text-sm text-white/60">
              Department-manager tools. Access is server-enforced.
            </p>
          </div>
          <div class="flex flex-col gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-messages-square"
              trailing-icon="i-lucide-chevron-right"
              block
              class="justify-between"
              :to="{ name: 'moderation-messages' }"
            >
              Manage messages
            </UButton>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-shield"
              trailing-icon="i-lucide-chevron-right"
              block
              class="justify-between"
              :to="{ name: 'moderation-users' }"
            >
              Manage users
            </UButton>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-shield-check"
              trailing-icon="i-lucide-chevron-right"
              block
              class="justify-between"
              :to="{ name: 'moderation-appeals' }"
            >
              Suspension appeals
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

    <!-- Logout Confirm Modal -->
    <UModal v-model:open="logoutConfirmOpen">
      <template #content>
        <div class="p-6 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-log-out" class="size-5 text-primary-400" />
            <h2 class="text-lg font-semibold">{{ t('settings.logout') }}</h2>
          </div>
          <p class="text-sm text-white/70">
            You will need to sign in again to access your account.
          </p>
          <div class="flex justify-end gap-3">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="loggingOut"
              @click="logoutConfirmOpen = false"
            >
              {{ t('settings.cancel') }}
            </UButton>
            <UButton color="primary" :loading="loggingOut" @click="handleLogout">
              {{ t('settings.logout') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
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
import { useToastStore } from '@/stores/toast'
import { useOrganizationStore } from '@/stores/organization'
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
const toast = useToastStore()
const orgStore = useOrganizationStore()
const organizationsForAdmin = computed(() =>
  orgStore.memberships.filter((m) => m.role === 'STAFF' || m.role === 'ADMIN'),
)

const logoutConfirmOpen = ref(false)
const loggingOut = ref(false)

const accountLabel = computed(() =>
  authStore.isLoggedIn ? t('settings.signedin') : t('settings.nsignedin'),
)

const appName = 'FitTime'
const appVersion = ENV.appVersion
const appChannel = ENV.appChannel

const profileError = ref('')
const showSaveSuccess = ref(false)
const showSaveInfo = ref(false)
const items = ref(['Yes', 'No'])
const value1 = ref('No')
const value2 = ref('No')
const value3 = ref('No')
const value4 = ref('No')

onMounted(async () => {
  setHeader({
    title: t('settings.settings'),
    backRoute: '/',
  })
  try {
    const { data: privacyData, error: profileErr } = await apiClient.GET('/v1/user/profile/privacy')
    if (profileErr) throw new Error(getErrorMessage(profileErr, 'Failed to update name'))
    if (privacyData.privateBio === true) {
      value1.value = 'Yes'
    }
    if (privacyData.privateSports === true) {
      value2.value = 'Yes'
    }
    if (privacyData.privateTournaments === true) {
      value3.value = 'Yes'
    }
    if (privacyData.privateAchievements === true) {
      value4.value = 'Yes'
    }
  } catch (err: unknown) {
    profileError.value = err instanceof Error ? err.message : 'Failed to update name'
  }
})

const handleLogout = async () => {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await authStore.logout()
    logoutConfirmOpen.value = false
    router.replace('/login')
  } catch (error: unknown) {
    toast.error('Logout failed', getErrorMessage(error, 'Please try again.'))
  } finally {
    loggingOut.value = false
  }
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
      if (deactivateErr)
        throw new Error(getErrorMessage(deactivateErr, 'Failed to deactivate account'))
    }

    confirmModal.value.isOpen = false
    await authStore.logout()
    router.replace('/login')
  } catch (err: unknown) {
    console.error('Action failed', err)
    const msg = err instanceof Error ? err.message : t('settings.actionFailed')
    confirmModal.value.error = msg
    confirmModal.value.loading = false
    toast.error(confirmModal.value.title, msg)
  }
}

// Profile
const profile = ref<UserProfile>({
  userId: '',
  bio: '',
  favoriteSports: [],
  pictures: [],
  featuredAchievements: [],
  tournaments: [],
  privateBio: false,
  privateSports: false,
  privateTournaments: false,
  privateAchievements: false,
})
const profileForm = reactive({ bio: '', favoriteSports: [] as Sport[] })
const saving = ref(false)
const saving2 = ref(false)
const originalProfile = ref('')

// Name
const nameForm = reactive({ firstName: '', lastName: '' })
const originalName = ref({ firstName: '', lastName: '' })
const savingName = ref(false)
const nameSuccess = ref(false)
const nameChanged = computed(
  () =>
    nameForm.firstName !== originalName.value.firstName ||
    nameForm.lastName !== originalName.value.lastName,
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
    toast.success(t('settings.nameSaved'))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update name'
    profileError.value = msg
    toast.error('Failed to update name', msg)
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
  } catch (error: unknown) {
    console.error('Upload failed', error)
    profileError.value = error instanceof Error ? error.message : t('settings.uploadFailed')
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
const selectedLocale = ref(locale.value)

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
    if ((session as (Session & { thisSession?: boolean }) | undefined)?.thisSession) {
      await authStore.clearLocalSession()
      window.location.reload()
      return
    }
    sessions.value = sessions.value.filter((s) => s.id !== id)
    toast.success('Session revoked')
  } catch (error) {
    console.error('Failed to revoke session', error)
    toast.error('Failed to revoke session', getErrorMessage(error, 'Please try again.'))
  } finally {
    revokingSessionId.value = null
  }
}

async function revokeAllSessions() {
  revokingAll.value = true
  try {
    const { error: revokeAllErr } = await apiClient.POST('/v1/user/sessions/logout')
    if (revokeAllErr)
      throw new Error(getErrorMessage(revokeAllErr, 'Failed to revoke all sessions'))
    sessions.value = []
    toast.success('All sessions revoked')
  } catch (error) {
    console.error('Failed to revoke all sessions', error)
    toast.error('Failed to revoke all sessions', getErrorMessage(error, 'Please try again.'))
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
    toast.success('Profile saved')
  } catch (error: unknown) {
    console.error('Update failed', error)
    const msg = error instanceof Error ? error.message : 'Failed to update profile'
    profileError.value = msg
    toast.error('Failed to update profile', msg)
  } finally {
    saving.value = false
  }
}

async function savePrivacy() {
  profileError.value = ''
  showSaveSuccess.value = false
  showSaveInfo.value = false

  saving2.value = true
  const bio = value1.value !== 'No'
  const sports = value2.value !== 'No'
  const tournaments = value3.value !== 'No'
  const achievements = value4.value !== 'No'

  try {
    const { error: updateErr } = await apiClient.PATCH('/v1/user/profile/privacy', {
      headers: { 'Content-Type': 'application/json' },
      body: {
        privateBio: bio,
        privateSports: sports,
        privateTournaments: tournaments,
        privateAchievements: achievements,
      },
    })
    if (updateErr) throw new Error(getErrorMessage(updateErr, 'Failed to update privacy'))
    toast.success('Privacy saved')
  } catch (error: unknown) {
    console.error('Update failed', error)
    const msg = error instanceof Error ? error.message : 'Failed to update privacy'
    profileError.value = msg
    toast.error('Failed to update privacy', msg)
  } finally {
    saving2.value = false
  }
}
</script>
