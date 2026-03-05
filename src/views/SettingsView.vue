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

          <!-- Profile Pictures -->
          <UFormField :label="t('settings.profilePictures')">
            <div class="flex gap-3 items-center overflow-x-auto pb-2">
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
              <UFileUpload
                accept="image/*"
                @update:model-value="handleFileUpload"
              >
                <template #actions="{ open }">
                  <button
                    class="shrink-0 size-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/40 transition-colors"
                    :disabled="uploading"
                    @click="open()"
                  >
                    <UIcon
                      v-if="uploading"
                      name="i-lucide-loader-2"
                      class="size-5 animate-spin text-white/40"
                    />
                    <UIcon v-else name="i-lucide-plus" class="size-5 text-white/40" />
                  </button>
                </template>
              </UFileUpload>
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

          <!-- Save Button -->
          <div class="flex justify-end">
            <UButton color="primary" :loading="saving" :disabled="!hasChanges" @click="saveProfile">
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

    <!-- Confirm Modal -->
    <Teleport to="body">
      <div v-if="confirmModal.isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeModal"></div>

        <UCard
          class="relative w-full max-w-md mx-4 shadow-xl"
          :ui="{ divide: 'divide-y divide-white/10' }"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon
                  :name="confirmModal.isDelete ? 'i-lucide-trash-2' : 'i-lucide-user-minus'"
                  :class="confirmModal.isDelete ? 'text-red-500' : 'text-orange-500'"
                />
                <span class="font-bold text-white">{{ confirmModal.title }}</span>
              </div>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-lucide-x"
                @click="closeModal"
                :disabled="confirmModal.loading"
              />
            </div>
          </template>
          <div class="p-4 space-y-4">
            <p class="text-sm text-white/70">{{ confirmModal.description }}</p>

            <div class="space-y-2">
              <label class="text-xs text-white/50 uppercase tracking-wider">{{
                t('settings.confirmpw')
              }}</label>
              <UInput
                v-model="confirmModal.password"
                type="password"
                placeholder="{{t('settings.enterpw')}}"
                :class="{ 'border-red-500': passwordError }"
                autofocus
                @keyup.enter="handleAccountAction"
              />
              <p v-if="passwordError" class="text-xs text-red-400">{{ passwordError }}</p>
            </div>
          </div>
          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="ghost"
                color="gray"
                @click="closeModal"
                :disabled="confirmModal.loading"
              >
                {{ t('settings.cancel') }}
              </UButton>
              <UButton
                :color="confirmModal.isDelete ? 'red' : 'orange'"
                :loading="confirmModal.loading"
                :disabled="!confirmModal.password || confirmModal.loading"
                @click="handleAccountAction"
              >
                {{ t('settings.confirm') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </Teleport>

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
import { userApi, type Session } from '@/stores/api/user'
import type { UserProfile } from '@/stores/api/user'
import type { Sport } from '@/stores/api/sports'
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

onMounted(() => {
  setHeader({
    title: t('settings.settings'),
    backRoute: '/',
  })
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
  password: '',
  loading: false,
})
const passwordError = ref('')

const openDeactivateModal = () => {
  passwordError.value = ''
  confirmModal.value = {
    isOpen: true,
    isDelete: false,
    title: t('settings.deactivate?'),
    description: t('settings.profilehidden'),
    password: '',
    loading: false,
  }
}

const openDeleteModal = () => {
  passwordError.value = ''
  confirmModal.value = {
    isOpen: true,
    isDelete: true,
    title: t('settings.delete?'),
    description: t('settings.grace'),
    password: '',
    loading: false,
  }
}

const closeModal = () => {
  confirmModal.value.isOpen = false
  confirmModal.value.password = ''
  passwordError.value = ''
}

const handleAccountAction = async () => {
  if (!confirmModal.value.password) {
    passwordError.value = t('settings.pwrequired')
    return
  }

  confirmModal.value.loading = true
  passwordError.value = ''

  try {
    if (confirmModal.value.isDelete) {
      await userApi.deleteAccount(confirmModal.value.password)
    } else {
      await userApi.deactivateAccount(confirmModal.value.password)
    }

    // Success: logout and redirect to login
    await authStore.logout()
    closeModal()
    router.replace('/login')
  } catch (err: any) {
    console.error('Action failed', err)
    passwordError.value = err.message || t('settings.pwincorrect')
    confirmModal.value.loading = false
    // Keep modal open so user can retry
  }
}

// Profile
const profile = ref<UserProfile>({ userId: '', bio: '', favoriteSports: [], pictures: [] })
const profileForm = reactive({ bio: '', favoriteSports: [] as Sport[] })
const saving = ref(false)
const originalProfile = ref('')

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

async function handleFileUpload(value: File | null | undefined) {
  if (!value) return
  const file = value

  uploading.value = true
  profileError.value = ''
  try {
    const media = await userApi.uploadMedia(file)
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
    const data = await userApi.getProfile()
    profile.value = data
    profileForm.bio = (data.bio as unknown as string) || ''
    profileForm.favoriteSports = [...data.favoriteSports]
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
    sessions.value = await userApi.getSessions()
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
    await userApi.revokeSession(id)
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
    await userApi.revokeAllSessions()
    sessions.value = []
  } catch (error) {
    console.error('Failed to revoke all sessions', error)
  } finally {
    revokingAll.value = false
  }
}

async function saveProfile() {
  saving.value = true
  profileError.value = ''
  try {
    // Send primary picture first (API treats first as primary)
    const sorted = [...profile.value.pictures].sort((a, b) =>
      a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1,
    )
    const allPictureIds = sorted.map((p) => p.id)

    const updated = await userApi.updateProfile({
      bio: profileForm.bio,
      favoriteSportIds: profileForm.favoriteSports.map((s) => s.id),
      pictureIds: allPictureIds,
    })
    profile.value = updated
    profileForm.favoriteSports = [...updated.favoriteSports]
    pendingPictureIds.value = []
    originalProfile.value = serializeForm()
  } catch (error: any) {
    console.error('Update failed', error)
    profileError.value = error.message || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}
</script>
