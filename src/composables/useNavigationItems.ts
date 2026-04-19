import { computed } from 'vue'
import { useRoute } from 'vue-router'

export interface NavigationItem {
  label: string
  icon: string
  to: string
}

export function useNavigationItems() {
  const route = useRoute()

  const items: NavigationItem[] = [
    { label: 'Home', icon: 'i-lucide-home', to: '/' },
    { label: 'Tournaments', icon: 'i-lucide-trophy', to: '/tournaments' },
    { label: 'Team', icon: 'i-lucide-users', to: '/team' },
    { label: 'Achievements', icon: 'i-lucide-award', to: '/achievements' },
    { label: 'Messenger', icon: 'i-lucide-message-circle', to: '/messenger' },
    { label: 'Profile', icon: 'i-lucide-user', to: '/profile' },
	{ label: 'Videos', icon: 'i-lucide-list-video', to: '/videos' },
  ]

  const sidebarItems = computed(() =>
    items.map((item) => ({
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

  return { items, sidebarItems, isActive }
}
