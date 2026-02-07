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
import { getFooterData, getHeaderData } from "@/lib/cms";
import { ThemeToggle } from "@/components/debug/ThemeToggle";
import { SpookyGhosts } from "@/components/debug/SpookyGhosts";

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

  // Fetch header and footer data from CMS (cached per request)
  const [headerData, footerData] = await Promise.all([
    getHeaderData(),
    getFooterData(),
  ]);

  // Determine the theme to apply (data-theme attribute)
  // Priority: tenant theme > default based on context
  // Only allow valid theme values to prevent injection
  const VALID_THEMES = ['dark', 'light', 'spooky', 'arctic', 'dusk', 'ember', 'twilight', 'pastel', 'oceanic'] as const;
  let dataTheme: string = 'dark'; // Default for main domain
  if (tenant?.branding?.theme && VALID_THEMES.includes(tenant.branding.theme as typeof VALID_THEMES[number])) {
    dataTheme = tenant.branding.theme;
  }

  // All accent/border colors come from [data-theme] blocks in globals.css
  // Only set inline CSS variables for tenant-specific branding overrides
  const cssVariables: Record<string, string> = {};
  if (tenant?.branding?.primaryColor && !tenant?.branding?.theme) {
    cssVariables['--accent-primary'] = tenant.branding.primaryColor;
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
    <html lang="en" className={dataTheme !== 'light' ? 'dark' : ''} data-theme={dataTheme} style={cssVariables as React.CSSProperties}>
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
        <ThemeToggle />
        <SpookyGhosts />
      </body>
    </html>
  );
}
