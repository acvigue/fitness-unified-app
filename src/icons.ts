/**
 * Icon registration - must be imported FIRST before any UI components.
 * This registers Lucide icon collection with @iconify/vue for offline use.
 *
 * Icon naming convention for Nuxt UI:
 * - Use "i-lucide-icon-name" format (hyphen-separated)
 * - The "i-" prefix is stripped by UIcon, resulting in "lucide:icon-name"
 * - Iconify then looks up the icon using the prefix "lucide" and name "icon-name"
 */
import { addCollection } from '@iconify/vue'

// Import Lucide icon collection
import lucide from '@iconify-json/lucide/icons.json'

// Register collection before any component renders
addCollection(lucide)

console.log('[Icons] Registered Lucide icon collection for offline use')
