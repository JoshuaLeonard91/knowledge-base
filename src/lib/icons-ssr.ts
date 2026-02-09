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
  if (typeof value === 'function') return true;
  if (typeof value === 'object' && value.$$typeof) return true;
  return false;
}

/**
 * Lowercase → PascalCase lookup map, built once at module init.
 * Handles the "bookopentext" → "BookOpenText" case where there are
 * no separators or casing boundaries to split on.
 */
const lowercaseMap: Record<string, string> = {};
for (const key of Object.keys(icons)) {
  if (isComponent(icons[key])) {
    lowercaseMap[key.toLowerCase()] = key;
  }
}

/**
 * Normalize any common format to PascalCase.
 * Handles kebab-case, snake_case, spaces, and camelCase.
 * e.g. "book-open-text" | "book_open_text" | "book open text" | "bookOpenText" → "BookOpenText"
 */
function toPascalCase(name: string): string {
  // If it contains separators (hyphens, underscores, spaces), split on them
  if (/[-_ ]/.test(name)) {
    return name
      .split(/[-_ ]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }
  // camelCase → PascalCase (split on lowercase→uppercase boundaries)
  // e.g. "bookOpenText" → "BookOpenText"
  return name.replace(/(^[a-z])|([A-Z])/g, (match) => match.toUpperCase());
}

/**
 * Try to find an icon component by name, checking multiple formats.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findIcon(name: string): React.ComponentType<any> | null {
  // 1. Direct match (PascalCase, e.g. "BookOpenText")
  if (isComponent(icons[name])) return icons[name];

  // 2. Alias match (e.g. "Zap" → "Lightning")
  const aliased = aliases[name];
  if (aliased && isComponent(icons[aliased])) return icons[aliased];

  // 3. Normalize to PascalCase (handles kebab-case, snake_case, spaces, camelCase)
  const pascal = toPascalCase(name);
  if (pascal !== name) {
    if (isComponent(icons[pascal])) return icons[pascal];
    const aliasedPascal = aliases[pascal];
    if (aliasedPascal && isComponent(icons[aliasedPascal])) return icons[aliasedPascal];
  }

  // 4. Lowercase lookup (handles "bookopentext" → "BookOpenText")
  const fromLower = lowercaseMap[name.toLowerCase()];
  if (fromLower && isComponent(icons[fromLower])) return icons[fromLower];

  return null;
}

/**
 * Resolve a Phosphor icon component by name (SSR-safe).
 * Accepts PascalCase ("BookOpenText") or kebab-case ("book-open-text").
 * Returns the matching icon or a fallback.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getIconSSR(name: string, fallback?: React.ComponentType<any>): React.ComponentType<any> {
  if (name) {
    const found = findIcon(name);
    if (found) return found;
  }
  return fallback || PhosphorIcons.FileText;
}
