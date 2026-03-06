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
    { label: 'Messenger', icon: 'i-lucide-message-circle', to: '/messenger' },
    { label: 'Workouts', icon: 'i-lucide-dumbbell', to: '/workouts' },
    { label: 'Profile', icon: 'i-lucide-user', to: '/profile' },
    { label: 'Report', icon: 'i-lucide-shield-ban', to: '/report' },
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
