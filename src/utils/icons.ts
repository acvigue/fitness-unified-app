/**
 * Icon utilities for Lucide icons.
 *
 * This app uses Lucide icons via Iconify.
 * Icons are bundled locally from @iconify-json/lucide.
 *
 * Format: i-lucide-{icon-name}
 */

/**
 * Lucide icon names used throughout the app.
 * Use these constants instead of hardcoding icon strings.
 */
export const icons = {
  // Navigation
  arrowLeft: 'i-lucide-arrow-left',
  arrowRight: 'i-lucide-arrow-right',
  arrowDown: 'i-lucide-arrow-down',
  arrowUp: 'i-lucide-arrow-up',
  chevronLeft: 'i-lucide-chevron-left',
  chevronRight: 'i-lucide-chevron-right',
  chevronDown: 'i-lucide-chevron-down',
  chevronUp: 'i-lucide-chevron-up',
  externalLink: 'i-lucide-external-link',

  // Actions
  check: 'i-lucide-check',
  close: 'i-lucide-x',
  plus: 'i-lucide-plus',
  minus: 'i-lucide-minus',
  search: 'i-lucide-search',
  trash: 'i-lucide-trash-2',
  edit: 'i-lucide-pen',
  copy: 'i-lucide-copy',
  upload: 'i-lucide-upload',
  download: 'i-lucide-download',
  play: 'i-lucide-play',
  stop: 'i-lucide-square',
  refresh: 'i-lucide-refresh-cw',
  settings: 'i-lucide-settings',
  sliders: 'i-lucide-sliders-horizontal',
  gripVertical: 'i-lucide-grip-vertical',
  ellipsisVertical: 'i-lucide-ellipsis-vertical',
  link: 'i-lucide-link',
  pin: 'i-lucide-pin',

  // Status
  spinner: 'i-lucide-loader-2',
  circleCheck: 'i-lucide-circle-check',
  circleXmark: 'i-lucide-circle-x',
  circleExclamation: 'i-lucide-circle-alert',
  circleInfo: 'i-lucide-info',
  triangleExclamation: 'i-lucide-triangle-alert',

  // UI Elements
  info: 'i-lucide-info',
  eye: 'i-lucide-eye',
  eyeSlash: 'i-lucide-eye-off',
  image: 'i-lucide-image',
  imageSlash: 'i-lucide-image-off',
  sun: 'i-lucide-sun',
  moon: 'i-lucide-moon',

  // Users
  user: 'i-lucide-user',
  userPlus: 'i-lucide-user-plus',
  userMinus: 'i-lucide-user-minus',
  userGear: 'i-lucide-user-cog',

  // Communication
  envelope: 'i-lucide-mail',

  // Devices & Tech
  wifi: 'i-lucide-wifi',
  wifiSlash: 'i-lucide-wifi-off',
  bluetooth: 'i-lucide-bluetooth',
  microchip: 'i-lucide-cpu',
  desktop: 'i-lucide-monitor',
  power: 'i-lucide-power',
  key: 'i-lucide-key-round',
  lock: 'i-lucide-lock',
  shield: 'i-lucide-shield',
  shieldCheck: 'i-lucide-shield-check',
  radar: 'i-lucide-radar',
  locationDot: 'i-lucide-map-pin',
  creditCard: 'i-lucide-credit-card',
  clock: 'i-lucide-clock',
  lifeRing: 'i-lucide-life-buoy',
  signOut: 'i-lucide-log-out',
  signIn: 'i-lucide-log-in',
  hand: 'i-lucide-hand',
  sparkles: 'i-lucide-sparkles',
  sortAZ: 'i-lucide-arrow-down-a-z',
  sortZA: 'i-lucide-arrow-down-z-a',
  boxOpen: 'i-lucide-package-open',

  // Circuit/Device specific
  circuitBoard: 'i-lucide-circuit-board',
} as const

export type IconName = keyof typeof icons

/**
 * Get a Lucide icon name.
 * This is a simple passthrough but provides type safety.
 */
export function getIcon(name: IconName): string {
  return icons[name]
}
