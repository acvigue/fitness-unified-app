<template>
  <PageLayout>
    <section class="flex flex-col gap-6 px-5 py-6">
      <!-- Account Section -->
      <UCard class="bg-white/5">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">{{t('settings.account')}}</p>
            <p class="text-lg font-medium">{{ accountLabel }}</p>
          </div>
          <UButton
            color="primary"
            variant="ghost"
            icon="i-fa6-solid:right-from-bracket"
            @click="handleLogout"
          >
            {{t('settings.logout')}}
          </UButton>
        </div>
      </UCard>

      <!-- Danger Zone Section -->
      <UCard class="bg-red-900/10 border-red-900/20">
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-xs uppercase font-medium tracking-[0.3em] text-red-400">{{t('settings.danger')}}</p>
            <p class="text-sm text-white/60">{{t('settings.manageordel')}}</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <UButton color="orange" variant="soft" @click="openDeactivateModal">
              {{t('settings.deactivate')}}
            </UButton>
            <UButton color="red" variant="soft" @click="openDeleteModal">
              {{t('settings.delete')}}
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- About Section  -->
      <UCard class="bg-white/5">
        <div class="space-y-3">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">{{t('settings.about')}}</p>
            <p class="text-lg font-medium">{{ appName }}</p>
          </div>
          <ul class="space-y-2 text-sm text-white/70">
            <li class="flex items-center justify-between">
              <span>{{t('settings.version')}}</span>
              <span>{{ appVersion }}</span>
            </li>
            <li class="flex items-center justify-between">
              <span>{{t('settings.buildchannel')}}</span>
              <span class="capitalize">{{ appChannel }}</span>
            </li>
          </ul>
        </div>
      </UCard>
    </section>

    <!-- Custom Modal -->
    <Teleport to="body">
      <div v-if="confirmModal.isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeModal"></div>
        
        <UCard class="relative w-full max-w-md mx-4 shadow-xl" :ui="{ divide: 'divide-y divide-white/10' }">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon 
                  :name="confirmModal.isDelete ? 'i-heroicons-trash' : 'i-heroicons-user-minus'" 
                  :class="confirmModal.isDelete ? 'text-red-500' : 'text-orange-500'" 
                />
                <span class="font-bold text-white">{{ confirmModal.title }}</span>
              </div>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-x-mark"
                @click="closeModal"
                :disabled="confirmModal.loading"
              />
            </div>
          </template>
          <div class="p-4 space-y-4">
            <p class="text-sm text-white/70">{{ confirmModal.description }}</p>
            
            <div class="space-y-2">
              <label class="text-xs text-white/50 uppercase tracking-wider">{{t('settings.confirmpw')}}</label>
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
                Cancel
              </UButton>
              <UButton 
                :color="confirmModal.isDelete ? 'red' : 'orange'" 
                :loading="confirmModal.loading"
                :disabled="!confirmModal.password || confirmModal.loading"
                @click="handleAccountAction"
              >
                Confirm
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </Teleport>

  </PageLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth/auth'
import { ENV } from '@/config/environment'
import { userApi } from '@/stores/api/user'

import { useI18n } from 'vue-i18n'
const { t } = useI18n()

useHead({
  title: t('settings.settings'),
  meta: [{ name: 'description', content: t('settings.manage') }],
})

const authStore = useAuthStore()
const router = useRouter()
const { setHeader } = usePageHeader()

const accountLabel = computed(() => (authStore.isLoggedIn ? t('settings.signedin') : t('settings.nsignedin')))

const appName = 'My App'
const appVersion = ENV.appVersion
const appChannel = ENV.appChannel

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
  loading: false
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
    loading: false
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
    loading: false
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
</script>