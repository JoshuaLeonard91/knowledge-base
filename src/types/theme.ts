/**
 * CMS-managed theme configuration
 * Only accent color is controlled via CMS - all others are auto-derived
 */
export interface SiteTheme {
  name: string;
  accentPrimary: string;
  accentSecondary: string; // For gradient endpoints
  accentHover: string;
  accentGlow: string;
  borderPrimary: string;
  borderHover: string;
}

/**
 * Raw theme data from Hygraph CMS
 */
export interface HygraphSiteTheme {
  name?: string;
  accentPrimary: { hex: string };
}

/**
 * CSS variable mapping for theme injection
 */
export interface ThemeCSSVariables {
  '--accent-primary': string;
  '--accent-secondary': string;
  '--accent-hover': string;
  '--accent-glow': string;
  '--border-primary': string;
  '--border-hover': string;
}
