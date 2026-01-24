'use client';

/**
 * Tenant Onboarding Page
 *
 * CMS-driven onboarding wizard for tenant subdomains.
 * Uses the generic OnboardingWizard component.
 */

import { useEffect, useState } from 'react';
import { OnboardingWizard } from '@/components/onboarding';
import type { OnboardingConfig } from '@/lib/cms';

export default function TenantOnboardingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [context, setContext] = useState('main');

  useEffect(() => {
    async function loadData() {
      try {
        // Get session status
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        setIsAuthenticated(sessionData.authenticated);
        setUserId(sessionData.user?.id);

        // Get context from API (tenant detection)
        const configRes = await fetch('/api/tenant');
        const configData = await configRes.json();
        const tenantSlug = configData.tenant?.slug || 'main';
        setContext(tenantSlug);

        // Get onboarding config (default for tenant)
        // In production, this would come from CMS via an API
        setConfig({
          steps: [
            {
              id: 'welcome',
              title: 'Welcome!',
              description: 'Your account has been created successfully.',
              type: 'WELCOME',
              required: true,
            },
          ],
          completionTitle: 'You\'re All Set!',
          completionMessage: 'Your account is ready to use.',
          completionCtaText: 'Go to Dashboard',
          completionCtaLink: '/support',
        });
      } catch (error) {
        console.error('Failed to load onboarding data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Onboarding Not Available</h1>
          <p className="text-white/60">Onboarding is not configured for this portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]">
      <OnboardingWizard
        context={context}
        config={config}
        isAuthenticated={isAuthenticated}
        userId={userId}
      />
    </div>
  );
}
