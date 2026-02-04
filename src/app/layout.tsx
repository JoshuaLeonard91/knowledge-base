import type { Metadata } from "next";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LayoutContent } from "@/components/layout/LayoutContent";
import { HistoryProvider } from "@/components/support/HistoryProvider";
import { TenantProvider } from "@/lib/tenant/context";
import { getTenantFromRequest } from "@/lib/tenant/resolver";
import { getTheme, themeToCSSVariables } from "@/lib/theme";
import { getFooterData, getHeaderData } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Support Portal - Help Center",
  description: "Get help with Discord integrations, troubleshoot issues, and find answers to common questions.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get tenant from request (subdomain or query param)
  const tenant = await getTenantFromRequest();

  // Check for invalid subdomain - redirect to main domain
  // If middleware set x-tenant-slug but tenant wasn't found, redirect
  const headersList = await headers();
  const requestedSlug = headersList.get('x-tenant-slug');

  if (requestedSlug && !tenant) {
    // Invalid subdomain - redirect to main domain
    const mainDomain = process.env.NEXT_PUBLIC_APP_URL || 'https://helpportal.app';
    redirect(mainDomain);
  }

  // Fetch theme, header, and footer data from CMS (cached per request)
  const [theme, headerData, footerData] = await Promise.all([
    getTheme(),
    getHeaderData(),
    getFooterData(),
  ]);

  // Build CSS variables from theme
  let cssVariables = themeToCSSVariables(theme);

  // Determine the theme to apply (data-theme attribute)
  // Priority: tenant theme > default based on context
  // Only allow valid theme values to prevent injection
  const VALID_THEMES = ['discord', 'dark', 'light'] as const;
  let dataTheme: string = 'dark'; // Default for main domain
  if (tenant?.branding?.theme && VALID_THEMES.includes(tenant.branding.theme as typeof VALID_THEMES[number])) {
    dataTheme = tenant.branding.theme;
  }

  // Override with tenant branding if available (legacy primaryColor support)
  if (tenant?.branding?.primaryColor && !tenant?.branding?.theme) {
    cssVariables = {
      ...cssVariables,
      '--accent-primary': tenant.branding.primaryColor,
    };
  } else if (!tenant) {
    // Main domain uses indigo dark theme
    // Override all accent-related variables to match marketing pages
    cssVariables = {
      ...cssVariables,
      '--accent-primary': '#6366f1',
      '--accent-secondary': '#8b5cf6', // Purple for gradients (matches marketing pages)
      '--accent-hover': '#4f46e5',
      '--accent-glow': 'rgba(99, 102, 241, 0.4)',
      '--border-primary': 'rgba(99, 102, 241, 0.06)',
      '--border-hover': 'rgba(99, 102, 241, 0.1)',
    };
  }

  // Convert tenant to client-safe config for context
  // NOTE: Do NOT include internal IDs or sensitive config
  const clientTenant = tenant ? {
    slug: tenant.slug,
    name: tenant.name,
    plan: tenant.plan,
    features: tenant.features,
    branding: tenant.branding ? {
      logoUrl: tenant.branding.logoUrl,
      faviconUrl: tenant.branding.faviconUrl,
      primaryColor: tenant.branding.primaryColor,
      theme: tenant.branding.theme,
      // NOTE: customDomain intentionally excluded from client
    } : null,
    jiraConnected: tenant.jira?.connected ?? false,
  } : null;

  return (
    <html lang="en" className="dark" data-theme={dataTheme} style={cssVariables as React.CSSProperties}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
        <ThemeProvider>
          <AuthProvider>
            <TenantProvider tenant={clientTenant}>
              <HistoryProvider>
                <LayoutContent headerData={headerData} footerData={footerData}>{children}</LayoutContent>
              </HistoryProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>

      </body>
    </html>
  );
}
