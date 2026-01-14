import { cache } from 'react';
import { SiteTheme, ThemeCSSVariables } from '@/types/theme';
import { hygraph } from '@/lib/hygraph';

/**
 * Default theme - Discord purple accent
 * Used when CMS theme is unavailable
 */
export const DEFAULT_THEME: SiteTheme = {
  name: 'Default',
  accentPrimary: '#5865F2',
  accentHover: '#4752c4',
  accentGlow: 'rgba(88, 101, 242, 0.4)',
  borderPrimary: 'rgba(88, 101, 242, 0.06)',
  borderHover: 'rgba(88, 101, 242, 0.1)',
};

/**
 * Darken a hex color by a percentage
 * @param hex - Hex color string (e.g., "#5865F2")
 * @param percent - Amount to darken (0-100)
 */
function darkenColor(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Darken each channel
  const factor = 1 - percent / 100;
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Convert hex color to rgba string
 * @param hex - Hex color string (e.g., "#5865F2")
 * @param alpha - Alpha value (0-1)
 */
function hexToRgba(hex: string, alpha: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Fetch theme from CMS with React cache (request deduplication)
 * Each tenant's Hygraph project has their own SiteTheme entry
 */
export const getTheme = cache(async (): Promise<SiteTheme> => {
  // Skip if Hygraph not configured
  if (!hygraph.isAvailable()) {
    return DEFAULT_THEME;
  }

  try {
    const cmsTheme = await hygraph.getSiteTheme();

    if (!cmsTheme) {
      return DEFAULT_THEME;
    }

    // Auto-derive all theme colors from primary accent
    return {
      name: cmsTheme.name || 'Custom',
      accentPrimary: cmsTheme.accentPrimary,
      accentHover: darkenColor(cmsTheme.accentPrimary, 15),
      accentGlow: hexToRgba(cmsTheme.accentPrimary, 0.4),
      borderPrimary: hexToRgba(cmsTheme.accentPrimary, 0.06),
      borderHover: hexToRgba(cmsTheme.accentPrimary, 0.1),
    };
  } catch (error) {
    console.error('[Theme] Failed to fetch theme:', error);
    return DEFAULT_THEME;
  }
});

/**
 * Convert theme to CSS custom properties
 */
export function themeToCSSVariables(theme: SiteTheme): ThemeCSSVariables {
  return {
    '--accent-primary': theme.accentPrimary,
    '--accent-hover': theme.accentHover,
    '--accent-glow': theme.accentGlow,
    '--border-primary': theme.borderPrimary,
    '--border-hover': theme.borderHover,
  };
}
