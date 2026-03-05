/**
 * Maps schema icon names to Lucide Iconify icon names.
 * Schema icons use camelCase naming (e.g., "cloud", "sun", "mapLocationDot").
 * We map these to the Lucide icon pack in Iconify format.
 */

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Get the Iconify icon name for a schema icon.
 * Returns the full Iconify icon identifier (e.g., "i-lucide-cloud").
 *
 * @param schemaIcon - The icon name from the schema (camelCase)
 * @returns The Iconify icon identifier for use with UIcon
 */
export function getSchemaIconName(schemaIcon: string | undefined): string | undefined {
  if (!schemaIcon) return undefined

  // Convert camelCase to kebab-case for Iconify
  const kebabName = toKebabCase(schemaIcon)

  return `i-lucide-${kebabName}`
}
