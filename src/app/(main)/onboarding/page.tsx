'use client';

/**
 * Unified Onboarding Page (CMS-driven)
 *
 * Works identically on both main domain and tenant subdomains.
 * All steps and content are driven by CMS configuration.
 *
 * Context differences (handled by API):
 * - Main domain: Creates Tenant (subdomain + branding)
 * - Tenant subdomain: Saves user profile data
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding';
import { MainHeader } from '@/components/layout/MainHeader';
import type { OnboardingConfig } from '@/lib/cms';

export default function OnboardingPage() {
  const router = useRouter();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [context, setContext] = useState('main');
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [siteName, setSiteName] = useState('HelpPortal');
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Get tenant context
        const tenantRes = await fetch('/api/tenant');
        const tenantData = await tenantRes.json();
        const tenant = tenantData.tenant;
        const currentContext = tenant?.slug || 'main';
        setContext(currentContext);
        setSiteName(tenant?.name || 'HelpPortal');

        // Get session
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();

        if (!sessionData.authenticated) {
          router.push('/signup');
          return;
        }

        setIsAuthenticated(true);
        setUserId(sessionData.user?.id);

        // Check if user needs to be on this page
        if (currentContext === 'main') {
          // Main domain: check subscription and tenant status
          const statusRes = await fetch('/api/onboarding/status');
          const statusData = await statusRes.json();

          if (!statusData.success) {
            router.push('/signup');
            return;
          }

          if (statusData.step === 'subscribe' || statusData.step === 'resubscribe') {
            router.push('/signup');
            return;
          }

          if (statusData.step === 'dashboard') {
            router.push('/dashboard');
            return;
          }
        }

        // Get onboarding config from CMS
        const configRes = await fetch(`/api/onboarding/config?context=${currentContext}`);
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(configData.config);
        } else {
          // Use defaults from CMS module (will be fetched by API)
          // Fallback config here for safety
          if (currentContext === 'main') {
            setConfig({
              steps: [
                {
                  id: 'subdomain',
                  title: 'Choose Your Subdomain',
                  description: 'Pick a unique subdomain for your support portal',
                  type: 'SUBDOMAIN',
                  required: true,
                },
                {
                  id: 'branding',
                  title: 'Customize Your Portal',
                  description: 'Choose a theme and optionally add your logo',
                  type: 'BRANDING',
                  required: false,
                  fields: [
                    { name: 'portalName', label: 'Portal Name', type: 'TEXT', required: false, placeholder: 'My Support Portal' },
                    { name: 'theme', label: 'Choose Your Theme', type: 'THEME', required: false },
                    { name: 'logoUrl', label: 'Logo URL (optional)', type: 'IMAGE_URL', required: false, placeholder: 'https://...' },
                  ],
                },
              ],
              completionTitle: 'Your Portal is Ready!',
              completionMessage: 'Your support portal has been created successfully.',
              completionCtaText: 'Go to Dashboard',
              completionCtaLink: '/dashboard',
            });
          } else {
            setConfig({
              steps: [
                {
                  id: 'welcome',
                  title: 'Welcome!',
                  description: 'Your account has been created.',
                  type: 'WELCOME',
                  required: true,
                },
              ],
              completionTitle: 'Welcome!',
              completionMessage: 'Your account is ready.',
              completionCtaText: 'Continue',
              completionCtaLink: '/dashboard',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load onboarding data:', err);
        setError('Failed to load. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">
            Go back to signup
          </Link>
        </div>
      </div>
    );
  }

  if (!config || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      <MainHeader siteName={siteName} />
      <OnboardingWizard
        context={context}
        config={config}
        isAuthenticated={isAuthenticated}
        userId={userId}
      />
    </div>
  );
}
