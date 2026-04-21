<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()

const userId = computed(() => route.params.userId as string)
const profile = ref<any>(null)
const loading = ref(true)
const error = ref('')
const displayName = computed(() => {
  const p = profile.value
  if (p?.firstName || p?.lastName) return [p.firstName, p.lastName].filter(Boolean).join(' ')
  return 'User'
})

onMounted(async () => {
  setHeader({ title: t('profile.userProfile') })
  try {
    const { data: profileData, error: profileErr } = await apiClient.GET(
      '/v1/users/{userId}/profile',
      {
        params: { path: { userId: userId.value } },
      },
    )
    if (profileErr) throw new Error(getErrorMessage(profileErr, 'Failed to load profile'))
    profile.value = profileData
  } catch (err: any) {
    console.error('Failed to load profile. userId:', userId.value, 'Error:', err)
    error.value = err.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
})

const primaryPicture = computed(() => {
  return profile.value?.pictures?.find((p: any) => p.isPrimary)?.url || ''
})

const moveToComparePage = () => {
  router.push(`/profile/compare/${userId.value}`)
}
</script>

<template>
  <PageLayout>
    <div v-if="loading" class="flex justify-center p-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-white/50 size-8" />
    </div>
    <div v-else-if="error" class="text-red-500 p-4">
      {{ error }}
    </div>
    <div v-else class="flex flex-col gap-6 px-5 py-6">
      <!-- Profile Picture -->
      <div class="flex justify-center">
        <UAvatar :src="primaryPicture" alt="Profile" size="3xl" />
      </div>

      <!-- Full Name -->
      <div class="text-center">
        <p class="text-white/70 text-sm">{{ t('profile.name') }}</p>
        <p class="text-white text-lg font-medium">
          {{ displayName }}
        </p>
      </div>

      <!-- Bio -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-1">{{ t('profile.bio') }}</p>
        <p class="text-white">{{ profile?.bio || t('profile.noBio') }}</p>
      </div>

      <!-- Favorite Sports -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-2">{{ t('profile.favoriteSports') }}</p>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="sport in profile?.favoriteSports"
            :key="sport.id"
            color="primary"
            variant="soft"
          >
            {{ sport.icon }} {{ sport.name }}
          </UBadge>
          <p v-if="!profile?.favoriteSports?.length" class="text-white/50 text-sm">
            {{ t('profile.noSports') }}
          </p>
        </div>
      </div>

      <!-- Tournaments -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm">{{ t('profile.tournaments') }}</p>
        <p class="text-white/50">{{ t('profile.nonePlayed') }}</p>
      </div>

      <!-- Featured Achievements -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-2">Featured Achievements</p>
        <div v-if="profile?.featuredAchievements?.length" class="grid gap-2 sm:grid-cols-2">
          <div
            v-for="ua in profile.featuredAchievements"
            :key="ua.id"
            class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3"
          >
            <UIcon name="i-lucide-award" class="text-primary" />
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ ua.achievement.name }}</p>
              <p class="text-xs text-white/50">{{ ua.achievement.description }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-white/50 text-sm">No featured achievements.</p>
      </div>
      <div class="flex justify-center">
        <UButton @click="moveToComparePage" color="primary" variant="soft"> Compare Profiles </UButton>
      </div>
    </div>
  </PageLayout>
</template>
