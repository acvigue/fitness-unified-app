import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCurrentUserStore } from '@/stores/currentUser'

export interface NavigationItem {
  label: string
  icon: string
  to: string
  /** Show in the mobile bottom tab bar. The bar shows up to 3 primary items + "More". */
  primary?: boolean
  /** Only visible to system moderators (DEPT_MANAGER / ADMIN). */
  modOnly?: boolean
}

const ALL_ITEMS: NavigationItem[] = [
  { label: 'Home', icon: 'i-lucide-home', to: '/', primary: true },
  { label: 'Team', icon: 'i-lucide-users', to: '/team', primary: true },
  { label: 'Messenger', icon: 'i-lucide-message-circle', to: '/messenger', primary: true },
  { label: 'Tournaments', icon: 'i-lucide-trophy', to: '/tournaments' },
  { label: 'Achievements', icon: 'i-lucide-award', to: '/achievements' },
  { label: 'Profile', icon: 'i-lucide-user', to: '/profile' },
  { label: 'Videos', icon: 'i-lucide-list-video', to: '/videos' },
  { label: 'Gym', icon: 'i-lucide-dumbbell', to: '/gyms' },
  { label: 'Moderation', icon: 'i-lucide-shield', to: '/moderation/messages', modOnly: true },
]

export function useNavigationItems() {
  const route = useRoute()
  const currentUserStore = useCurrentUserStore()

  const items = computed(() =>
    ALL_ITEMS.filter((item) => !item.modOnly || currentUserStore.isModerator),
  )

  const primaryItems = computed(() => items.value.filter((i) => i.primary))
  const secondaryItems = computed(() => items.value.filter((i) => !i.primary))

  const sidebarItems = computed(() =>
    items.value.map((item) => ({
      label: item.label,
      icon: item.icon,
      to: item.to,
      active: isActive(item.to),
    })),
  )

  function isActive(path: string): boolean {
    if (path === '/') return route.path === '/'
    return route.path === path || route.path.startsWith(path + '/')
  }

  return { items, primaryItems, secondaryItems, sidebarItems, isActive }
}
