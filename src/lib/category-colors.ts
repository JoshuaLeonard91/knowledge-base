/**
 * Dynamic Category Color Utilities
 *
 * Provides color mappings for categories with:
 * - Predefined colors for common categories
 * - Dynamic fallback colors using a consistent color palette
 * - Support for custom colors from CMS
 */

export interface CategoryColorSet {
  bg: string;
  text: string;
  border: string;
  gradient: string;
}

// Predefined colors for common category slugs
const predefinedColors: Record<string, CategoryColorSet> = {
  'getting-started': {
    bg: 'bg-[var(--accent-success)]/10',
    text: 'text-[var(--accent-success)]',
    border: 'border-[var(--accent-success)]/20',
    gradient: 'from-[var(--accent-success)]/20 to-transparent'
  },
  'faq': {
    bg: 'bg-[var(--accent-primary)]/10',
    text: 'text-[var(--accent-primary)]',
    border: 'border-[var(--accent-primary)]/20',
    gradient: 'from-[var(--accent-primary)]/20 to-transparent'
  },
  'troubleshooting': {
    bg: 'bg-[var(--accent-warning)]/10',
    text: 'text-[var(--accent-warning)]',
    border: 'border-[var(--accent-warning)]/20',
    gradient: 'from-[var(--accent-warning)]/20 to-transparent'
  },
  'guides': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    gradient: 'from-purple-500/20 to-transparent'
  },
  'tutorials': {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/20',
    gradient: 'from-cyan-500/20 to-transparent'
  },
  'api': {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    gradient: 'from-indigo-500/20 to-transparent'
  },
  'reference': {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20',
    gradient: 'from-slate-500/20 to-transparent'
  },
  'announcements': {
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    border: 'border-pink-500/20',
    gradient: 'from-pink-500/20 to-transparent'
  },
  'updates': {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/20',
    gradient: 'from-sky-500/20 to-transparent'
  },
  'security': {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    gradient: 'from-red-500/20 to-transparent'
  },
  'billing': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    gradient: 'from-emerald-500/20 to-transparent'
  },
  'account': {
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/20',
    gradient: 'from-violet-500/20 to-transparent'
  },
  'integrations': {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
    gradient: 'from-teal-500/20 to-transparent'
  },
};

// Fallback color palette for categories without predefined colors
const fallbackPalette: CategoryColorSet[] = [
  {
    bg: 'bg-[var(--accent-primary)]/10',
    text: 'text-[var(--accent-primary)]',
    border: 'border-[var(--accent-primary)]/20',
    gradient: 'from-[var(--accent-primary)]/20 to-transparent'
  },
  {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    gradient: 'from-blue-500/20 to-transparent'
  },
  {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    gradient: 'from-amber-500/20 to-transparent'
  },
  {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    gradient: 'from-rose-500/20 to-transparent'
  },
  {
    bg: 'bg-lime-500/10',
    text: 'text-lime-400',
    border: 'border-lime-500/20',
    gradient: 'from-lime-500/20 to-transparent'
  },
];

/**
 * Simple hash function for consistent color assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Get color set for a category
 *
 * @param categorySlug - The category slug (e.g., "getting-started")
 * @param customColor - Optional custom color override from CMS
 * @returns CategoryColorSet with bg, text, border, and gradient classes
 */
export function getCategoryColors(categorySlug: string, customColor?: string): CategoryColorSet {
  // If custom color provided from sheet, create color set from it
  if (customColor) {
    return {
      bg: `bg-${customColor}-500/10`,
      text: `text-${customColor}-400`,
      border: `border-${customColor}-500/20`,
      gradient: `from-${customColor}-500/20 to-transparent`
    };
  }

  // Check predefined colors first
  if (predefinedColors[categorySlug]) {
    return predefinedColors[categorySlug];
  }

  // Fall back to palette based on hash of category name
  const index = hashString(categorySlug) % fallbackPalette.length;
  return fallbackPalette[index];
}

/**
 * Get simplified color classes for badges/pills
 * Returns combined bg, text, and border classes
 */
export function getCategoryBadgeClasses(categorySlug: string, customColor?: string): string {
  const colors = getCategoryColors(categorySlug, customColor);
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

// Default color set for edge cases
export const defaultColors: CategoryColorSet = fallbackPalette[0];
