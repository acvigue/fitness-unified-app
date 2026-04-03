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
import UserReportView from "@/views/UserReportView.vue"
import UserProfileView from '@/views/UserProfileView.vue'
import TeamView from '@/views/TeamView.vue'
import TournamentsView from '@/views/TournamentsView.vue'
import TournamentDetailView from '@/views/TournamentDetailView.vue'
import TournamentCreateView from '@/views/TournamentCreateView.vue'
import TournamentEditView from '@/views/TournamentEditView.vue'
import TournamentManageView from '@/views/TournamentManageView.vue'
import AchievementsView from '@/views/AchievementsView.vue'
import TeamDetailView from '@/views/TeamDetailView.vue'
import TeamSettingsView from '@/views/TeamSettingsView.vue'
import NotificationsView from '@/views/NotificationsView.vue'
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
      path: '/team',
      name: 'team',
      component: TeamView,
    },
    {
      path: '/teams/:id',
      name: 'team-detail',
      component: TeamDetailView,
    },
    {
      path: '/teams/:id/settings',
      name: 'team-settings',
      component: TeamSettingsView,
    },
    {
      path: '/tournaments',
      name: 'tournaments',
      component: TournamentsView,
    },
    {
      path: '/tournaments/create',
      name: 'tournament-create',
      component: TournamentCreateView,
    },
    {
      path: '/tournaments/:id',
      name: 'tournament-detail',
      component: TournamentDetailView,
    },
    {
      path: '/tournaments/:id/edit',
      name: 'tournament-edit',
      component: TournamentEditView,
    },
    {
      path: '/tournaments/:id/manage',
      name: 'tournament-manage',
      component: TournamentManageView,
    },
    {
      path: '/achievements',
      name: 'achievements',
      component: AchievementsView,
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: NotificationsView,
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
