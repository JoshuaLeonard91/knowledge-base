/**
 * Shared Phosphor icon resolver (SSR variant).
 *
 * Uses @phosphor-icons/react/dist/ssr for server-side rendering compatibility.
 * Same API as @/lib/icons but safe for server components.
 */

import * as PhosphorIcons from '@phosphor-icons/react/dist/ssr';

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
 * Resolve a Phosphor icon component by name (SSR-safe).
 * Returns the matching icon or a fallback.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getIconSSR(name: string, fallback?: React.ComponentType<any>): React.ComponentType<any> {
  if (name && isComponent(icons[name])) {
    return icons[name];
  }
  const aliased = aliases[name];
  if (aliased && isComponent(icons[aliased])) {
    return icons[aliased];
  }
  return fallback || PhosphorIcons.FileText;
}
