<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
import { userApi } from '@/stores/api/user'
import { useAuthStore } from '@/stores/auth/auth'
import router from '@/router'

const { t } = useI18n()
const { setHeader } = usePageHeader()
const authStore = useAuthStore()

const profile = ref<any>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  setHeader({ title: t('profile.profile') })
  try {
    profile.value = await userApi.getProfile()
  } catch (err) {
    error.value = 'Failed to load profile'
    console.error(err)
  } finally {
    loading.value = false
  }
})

const moveToReportsPage = () => {
  router.push('/user/report')
}

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
        <img src="./icon.png" id="profile-picture" alt="bruh">
      </div>

      <!-- Username -->
      <div class="text-center">
        <p class="text-white/70 text-sm">Username</p>
        <p class="text-white text-lg font-medium">
          {{ authStore.user?.given_name && authStore.user?.family_name 
          ? `${authStore.user.given_name} ${authStore.user.family_name}` 
          : authStore.user?.name || 'User' }}
          </p>
      </div>

      <!-- Bio -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-1">Bio</p>
        <p class="text-white">{{ profile.bio || 'no bio' }}</p>
      </div>

      <!-- Favorite Sports -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm mb-2">Favorite Sports</p>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="sport in profile.favoriteSports"
            :key="sport.id"
            color="primary"
            variant="soft"
          >
            {{ sport.icon }} {{ sport.name }}
          </UBadge>
          <p v-if="!profile.favoriteSports?.length" class="text-white/50 text-sm">
            No favorite sports added.
          </p>
        </div>
      </div>

      <!-- Tournaments -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm">Tournaments</p>
        <p class="text-white/50">None played yet.</p>
      </div>

      <!-- Achievements -->
      <div class="bg-white/5 p-4 rounded-lg">
        <p class="text-white/70 text-sm">Achievements</p>
        <p class="text-white/50">None earned yet.</p>
      </div>

      <!-- My Reports Button -->
      <div class="flex justify-center">
        <UButton @click="moveToReportsPage" color="primary" variant="soft">
        My Reports
        </UButton>
      </div>
    </div>
  </PageLayout>
</template>

