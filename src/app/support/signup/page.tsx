'use client';

/**
 * Tenant Signup Page
 *
 * CMS-driven signup page for tenant subdomains.
 * Uses the generic SignupPage component.
 */

import { useEffect, useState } from 'react';
import { SignupPage } from '@/components/signup';
import type { SignupConfig, ServiceTier } from '@/lib/cms';

export default function TenantSignupPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [products, setProducts] = useState<ServiceTier[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [context, setContext] = useState('main');

  useEffect(() => {
    async function loadData() {
      try {
        // Get session status
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        setIsAuthenticated(sessionData.authenticated);

        // Get context from API (tenant detection)
        const configRes = await fetch('/api/tenant');
        const configData = await configRes.json();
        const tenantSlug = configData.tenant?.slug || 'main';
        setContext(tenantSlug);

        // Get signup config (default for now)
        // In production, this would come from CMS via an API
        setConfig({
          signupEnabled: true,
          requirePayment: false,
          allowFreeSignup: true,
          welcomeTitle: 'Join Our Community',
          welcomeSubtitle: 'Sign in to access exclusive features',
          loginButtonText: 'Sign in with Discord',
          successRedirect: '/support',
        });

        // Check subscription if authenticated
        if (sessionData.authenticated) {
          const subRes = await fetch('/api/checkout/products');
          if (subRes.ok) {
            const subData = await subRes.json();
            setProducts(subData.products || []);
            setHasSubscription(subData.hasSubscription || false);
          }
        }
      } catch (error) {
        console.error('Failed to load signup data:', error);
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
          <h1 className="text-2xl font-bold text-white mb-2">Signup Not Available</h1>
          <p className="text-white/60">Signup is not configured for this portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]">
      <SignupPage
        context={context}
        config={config}
        products={products}
        isAuthenticated={isAuthenticated}
        hasSubscription={hasSubscription}
        nextStep="/support"
      />
    </div>
  );
}
