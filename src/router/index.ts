import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import LoginCallbackView from '@/views/LoginCallbackView.vue'
import SettingsView from '@/views/SettingsView.vue'
import OAuthCallbackView from '@/views/OAuthCallbackView.vue'
import MessengerView from '@/views/messenger/MessengerView.vue'
import WorkoutsView from '@/views/WorkoutsView.vue'
import ReportView from '@/views/ReportView.vue'
import ProfileView from '@/views/ProfileView.vue'
import UserReportView from '@/views/UserReportView.vue'
import SessionsView from '@/views/SessionView.vue'
import { useAuthStore } from '@/stores/auth/auth'
import { useOrganizationStore } from '@/stores/organization'

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
      path: '/messenger',
      name: 'messenger',
      component: MessengerView,
      children: [
        {
          path: ':id',
          name: 'messenger-chat',
          component: () => import('@/views/messenger/MessengerChatView.vue'),
        },
      ],
    },
    {
      path: '/workouts',
      name: 'workouts',
      component: WorkoutsView,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
    },
    {
      path: '/report',
      name: 'report',
      component: ReportView,
    },
    {
      path: '/user/report',
      name: 'UserReport',
      component: UserReportView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
    {
      path: '/sessions',
      name: 'sessions',
      component: SessionsView,
    },
  ],
})

const PUBLIC_PATHS = new Set(['/login', '/login/callback', '/oauth/callback'])
let authInitialized = false

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

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

  // Fetch organization memberships if not yet loaded
  const orgStore = useOrganizationStore()
  if (!orgStore.initialized) {
    await orgStore.fetchMemberships()
  }

  return true
})

export default router
