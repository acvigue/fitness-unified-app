<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
import { userApi } from '@/stores/api/user'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()

const userId = computed(() => route.params.userId as string)
const profile = ref<any>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  setHeader({ title: t('profile.userProfile') })
  try {
    profile.value = await userApi.getUserProfile(userId.value)
  } catch (err) {
    console.error('Failed to load profile. userId:', userId.value, 'Error:', err)
    error.value = err.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
})

const primaryPicture = computed(() => {
  return profile.value?.pictures?.find((p: any) => p.isPrimary)?.url || ''
})
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
        <UAvatar
          :src="primaryPicture"
          alt="Profile"
          size="3xl"
        />
      </div>

      <!-- Full Name -->
      <div class="text-center">
        <p class="text-white/70 text-sm">{{ t('profile.name') }}</p>
        <p class="text-white text-lg font-medium">
          {{ profile?.firstName }} {{ profile?.lastName }}
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

      <!-- Achievements -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm">{{ t('profile.achievements') }}</p>
        <p class="text-white/50">{{ t('profile.noneEarned') }}</p>
      </div>
    </div>
  </PageLayout>
</template>