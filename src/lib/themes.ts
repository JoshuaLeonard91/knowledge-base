/**
 * Shared Theme Constants
 *
 * Single source of truth for theme definitions used across
 * onboarding, dashboard settings, layout, and debug toggle.
 */

export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    background: string;
    surface: string;
    text: string;
  };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Midnight',
    description: 'Sleek dark theme with indigo accents',
    colors: {
      primary: '#6366f1',
      background: '#0a0a0f',
      surface: '#16161f',
      text: '#ffffff',
    },
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean white theme with indigo accents',
    colors: {
      primary: '#4f46e5',
      background: '#ffffff',
      surface: '#f6f8fa',
      text: '#1f2328',
    },
  },
  {
    id: 'spooky',
    name: 'Spooky',
    description: 'Halloween orange & toxic green on deep purple',
    colors: {
      primary: '#f97316',
      background: '#0d0a12',
      surface: '#161022',
      text: '#f5f0e8',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'Cool blue-gray with teal accents',
    colors: {
      primary: '#88c0d0',
      background: '#0c0e12',
      surface: '#151820',
      text: '#f0f2f5',
    },
  },
  {
    id: 'dusk',
    name: 'Dusk',
    description: 'Warm purple-mauve with rose accents',
    colors: {
      primary: '#c4a7e7',
      background: '#0c0c10',
      surface: '#14141a',
      text: '#f0eef5',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Earthy browns with warm amber accents',
    colors: {
      primary: '#fabd2f',
      background: '#0e0e0e',
      surface: '#181818',
      text: '#f0ede8',
    },
  },
  {
    id: 'twilight',
    name: 'Twilight',
    description: 'Refined navy with periwinkle accents',
    colors: {
      primary: '#7aa2f7',
      background: '#0b0b12',
      surface: '#14141c',
      text: '#eef0f6',
    },
  },
  {
    id: 'pastel',
    name: 'Pastel',
    description: 'Soothing dark with soft pastel accents',
    colors: {
      primary: '#89b4fa',
      background: '#0c0c14',
      surface: '#14141e',
      text: '#eef0f6',
    },
  },
  {
    id: 'oceanic',
    name: 'Oceanic',
    description: 'Teal-green with cyan accents',
    colors: {
      primary: '#2aa198',
      background: '#0a0e10',
      surface: '#121818',
      text: '#f0eee8',
    },
  },
];

export const VALID_THEMES = THEME_OPTIONS.map((t) => t.id);

export function isValidTheme(value: string): boolean {
  return VALID_THEMES.includes(value);
}
