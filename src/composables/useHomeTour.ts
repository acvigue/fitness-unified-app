import { useGuideStore, type GuideStep } from '@/stores/guide'

function isMobileViewport() {
  if (typeof window === 'undefined') return false
  return !window.matchMedia('(min-width: 1024px)').matches
}

export function useHomeTour() {
  const guide = useGuideStore()

  function buildSteps(): GuideStep[] {
    const mobile = isMobileViewport()

    const sel = {
      home: '[data-guide="nav-home"], [data-guide="sidebar"] a[href="/"]',
      team: '[data-guide="nav-team"], [data-guide="sidebar"] a[href="/team"]',
      messenger: '[data-guide="nav-messenger"], [data-guide="sidebar"] a[href="/messenger"]',
      tournaments: '[data-guide="sidebar"] a[href="/tournaments"]',
      profile: '[data-guide="sidebar"] a[href="/profile"]',
      settings: '[data-guide="sidebar"] a[href="/settings"]',
      more: '[data-guide="nav-more"]',
      nav: '[data-guide="bottom-bar"], [data-guide="sidebar"]',
    }

    const steps: GuideStep[] = [
      {
        id: 'welcome',
        title: 'Welcome to FitTime',
        body: "Let's take a quick tour so you know your way around.",
      },
      {
        id: 'nav',
        title: mobile ? 'Bottom navigation' : 'Sidebar navigation',
        body: mobile
          ? 'Use the tabs at the bottom to jump between the main sections of the app.'
          : 'Use the sidebar on the left to jump between the main sections of the app.',
        target: sel.nav,
      },
      {
        id: 'home',
        title: 'Home',
        body: 'See upcoming tournaments, team invitations, and your activity feed.',
        target: sel.home,
      },
      {
        id: 'team',
        title: 'Team',
        body: 'Manage your team — roster, schedule, and stats.',
        target: sel.team,
      },
      {
        id: 'messenger',
        title: 'Messenger',
        body: 'Chat with friends, teammates, and group threads.',
        target: sel.messenger,
      },
    ]

    if (mobile) {
      steps.push({
        id: 'more',
        title: 'More',
        body: 'Tap More for tournaments, your profile, achievements, and settings.',
        target: sel.more,
      })
    } else {
      steps.push(
        {
          id: 'tournaments',
          title: 'Tournaments',
          body: 'Browse, join, and track tournaments.',
          target: sel.tournaments,
        },
        {
          id: 'profile',
          title: 'Profile',
          body: 'Your public profile — what others see about you.',
          target: sel.profile,
        },
        {
          id: 'settings',
          title: 'Settings',
          body: 'Account preferences, privacy, and app settings.',
          target: sel.settings,
        },
      )
    }

    steps.push({
      id: 'done',
      title: "You're all set",
      body: 'You can re-open this guide any time from the Home screen.',
    })

    return steps
  }

  function start() {
    guide.start(buildSteps())
  }

  return { start }
}
