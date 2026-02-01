/**
 * Shared Phosphor icon resolver.
 *
 * Instead of maintaining separate hardcoded icon maps in every component,
 * this module re-exports the entire Phosphor library as a lookup object
 * so any valid Phosphor icon name from the CMS "just works."
 *
 * Usage (client components):
 *   import { getIcon } from '@/lib/icons';
 *   const Icon = getIcon('TreeStructure');
 *
 * Usage (SSR / server components):
 *   import { getIconSSR } from '@/lib/icons-ssr';
 *   const Icon = getIconSSR('TreeStructure');
 */

import * as PhosphorIcons from '@phosphor-icons/react';

// Common aliases: names people might use in the CMS that differ from Phosphor's naming
const aliases: Record<string, string> = {
  Zap: 'Lightning',
  Filter: 'Funnel',
  Share2: 'ShareNetwork',
  WifiOff: 'WifiSlash',
  AlertTriangle: 'Warning',
  Search: 'MagnifyingGlass',
  RefreshCw: 'ArrowsClockwise',
  Layers: 'Stack',
  Settings: 'Gear',
  Rocket: 'RocketLaunch',
  HelpCircle: 'Question',
  BookOpen: 'BookOpenText',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const icons = PhosphorIcons as Record<string, any>;

/**
 * Check if a value is a valid React component (function or forwardRef object).
 * Phosphor icons use React.forwardRef() which returns an object, not a function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isComponent(value: any): boolean {
  if (!value) return false;
  // Regular function/class components
  if (typeof value === 'function') return true;
  // forwardRef / memo components (objects with $$typeof symbol)
  if (typeof value === 'object' && value.$$typeof) return true;
  return false;
}

/**
 * Resolve a Phosphor icon component by name (client-side).
 * Returns the matching icon or a fallback.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getIcon(name: string, fallback?: React.ComponentType<any>): React.ComponentType<any> {
  // Direct match
  if (name && isComponent(icons[name])) {
    return icons[name];
  }
  // Alias match
  const aliased = aliases[name];
  if (aliased && isComponent(icons[aliased])) {
    return icons[aliased];
  }
  // Fallback
  return fallback || PhosphorIcons.FileText;
}
