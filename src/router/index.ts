import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import LoginCallbackView from '@/views/LoginCallbackView.vue'
import SettingsView from '@/views/SettingsView.vue'
import OAuthCallbackView from '@/views/OAuthCallbackView.vue'
import { useAuthStore } from '@/stores/auth/auth'
import { SUPPORT_LOCALES, setupI18n, setI18nLanguage, loadLocaleMessages } from '@/i18n.ts'
import { i18n } from '@/main.ts'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/login/callback',
      name: 'login-callback',
      component: LoginCallbackView,
    },
    {
      path: '/oauth/callback',
      name: 'oauth-callback',
      component: OAuthCallbackView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
  ],
})

const PUBLIC_PATHS = new Set(['/login', '/login/callback', '/oauth/callback'])
let authInitialized = false

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const paramsLocale = to.params.locale
  let finalLocale = 'en';
  if (!SUPPORT_LOCALES.includes(paramsLocale)) {
	finalLocale = 'en'
  }
  else {
	finalLocale = paramsLocale
  }


  // load locale messages
  if (!i18n.global.availableLocales.includes(paramsLocale)) {
    await loadLocaleMessages(i18n, finalLocale)
  }
  
  // set i18n language
  setI18nLanguage(i18n, finalLocale)
  
  if (!authInitialized) {
    await authStore.initialize()
    authInitialized = true
  }

  if (PUBLIC_PATHS.has(to.path)) {
    return true
  }

  if (!authStore.isLoggedIn) {
    return {
      path: '/login',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
    }
  }

  return true
})

export default router
