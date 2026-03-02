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
    { label: 'Home', icon: 'i-fa6-solid:house', to: '/' },
    { label: 'Messenger', icon: 'i-fa6-solid:comments', to: '/messenger' },
    { label: 'Workouts', icon: 'i-fa6-solid:dumbbell', to: '/workouts' },
    { label: 'Profile', icon: 'i-fa6-solid:user', to: '/profile' },
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
