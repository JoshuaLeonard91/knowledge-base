'use client';

/**
 * Onboarding Page
 *
 * Professional wizard to set up the user's portal:
 * 1. Choose subdomain
 * 2. Set branding (name, logo, theme)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePlatform } from '../PlatformProvider';

type Step = 'subdomain' | 'branding' | 'complete';

// Predefined theme options
const THEME_OPTIONS = [
  {
    id: 'discord',
    name: 'Discord',
    color: '#5865F2',
    description: 'Classic blurple',
  },
  {
    id: 'dark',
    name: 'Dark',
    color: '#6366f1',
    description: 'Indigo accent',
  },
  {
    id: 'light',
    name: 'Light',
    color: '#3b82f6',
    description: 'Clean blue',
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { siteName } = usePlatform();

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [step, setStep] = useState<Step>('subdomain');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [subdomain, setSubdomain] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('dark');

  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  // Check access on mount
  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch('/api/onboarding/status');
        const data = await res.json();

        if (!data.success) {
          router.push('/signup');
          return;
        }

        if (data.step === 'subscribe' || data.step === 'resubscribe') {
          router.push('/signup');
          return;
        }

        if (data.step === 'dashboard') {
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        console.error('Access check failed:', err);
        router.push('/signup');
      } finally {
        setIsCheckingAccess(false);
      }
    }

    checkAccess();
  }, [router]);

  // Debounced subdomain check
  useEffect(() => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      setSubdomainError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSubdomain(true);
      setSubdomainError(null);

      try {
        const csrfRes = await fetch('/api/auth/session');
        const csrfData = await csrfRes.json();
        const csrfToken = csrfData.csrf;

        const res = await fetch('/api/onboarding/check-subdomain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ subdomain }),
        });

        const data = await res.json();

        if (data.success) {
          setSubdomainAvailable(data.available);
          setSubdomainError(data.available ? null : data.reason);
        } else {
          setSubdomainError(data.error);
        }
      } catch (err) {
        console.error('Subdomain check failed:', err);
        setSubdomainError('Failed to check availability');
      } finally {
        setIsCheckingSubdomain(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [subdomain]);

  // Handle create tenant
  const handleCreateTenant = async () => {
    if (!subdomain || !subdomainAvailable) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrf;

      const selectedColor = THEME_OPTIONS.find(t => t.id === selectedTheme)?.color || '#6366f1';

      const res = await fetch('/api/onboarding/create-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          subdomain,
          displayName: displayName || undefined,
          logoUrl: logoUrl || undefined,
          primaryColor: selectedColor,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTenantSlug(data.tenant.slug);
        setStep('complete');
      } else {
        setError(data.error || 'Failed to create portal');
      }
    } catch (err) {
      console.error('Create tenant failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm">
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-white">
            {siteName}
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 py-12 px-6">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">Set Up Your Portal</h1>
            <p className="text-white/60">
              {step === 'subdomain' && 'Choose a unique subdomain for your support portal.'}
              {step === 'branding' && 'Customize your portal appearance.'}
              {step === 'complete' && 'Your portal is ready to use!'}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-10">
            <div className="flex items-center">
              {/* Step 1 */}
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    step === 'subdomain'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-green-600 border-green-600 text-white'
                  }`}
                >
                  {step !== 'subdomain' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    '1'
                  )}
                </div>
                <span className={`ml-3 font-medium ${step === 'subdomain' ? 'text-white' : 'text-white/60'}`}>
                  Subdomain
                </span>
              </div>

              <div className="w-16 h-0.5 mx-4 bg-white/20" />

              {/* Step 2 */}
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    step === 'branding'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : step === 'complete'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-transparent border-white/30 text-white/40'
                  }`}
                >
                  {step === 'complete' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    '2'
                  )}
                </div>
                <span className={`ml-3 font-medium ${step === 'branding' ? 'text-white' : 'text-white/60'}`}>
                  Branding
                </span>
              </div>

              <div className="w-16 h-0.5 mx-4 bg-white/20" />

              {/* Step 3 */}
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    step === 'complete'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-transparent border-white/30 text-white/40'
                  }`}
                >
                  {step === 'complete' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    '3'
                  )}
                </div>
                <span className={`ml-3 font-medium ${step === 'complete' ? 'text-white' : 'text-white/60'}`}>
                  Complete
                </span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Step Content */}
          <div className="bg-[#16161f] rounded-2xl border border-white/10 overflow-hidden">
            {step === 'subdomain' && (
              <div className="p-8">
                <div className="mb-8">
                  <label className="block text-sm font-medium text-white/80 mb-3">
                    Your Portal URL
                  </label>
                  <div className="flex items-center bg-[#0a0a0f] rounded-xl border border-white/10 overflow-hidden focus-within:border-indigo-500 transition">
                    <span className="px-4 text-white/40 border-r border-white/10">https://</span>
                    <input
                      type="text"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="yourcompany"
                      className="flex-1 px-4 py-4 bg-transparent border-0 focus:outline-none text-white placeholder-white/30"
                      autoFocus
                    />
                    <span className="px-4 text-white/40 border-l border-white/10">.helpportal.app</span>
                  </div>

                  {/* Status */}
                  <div className="mt-3 h-5">
                    {isCheckingSubdomain && (
                      <p className="text-sm text-white/50 flex items-center gap-2">
                        <span className="animate-spin h-3 w-3 border border-white/30 border-t-white rounded-full" />
                        Checking availability...
                      </p>
                    )}
                    {!isCheckingSubdomain && subdomainAvailable === true && (
                      <p className="text-sm text-green-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        This subdomain is available
                      </p>
                    )}
                    {!isCheckingSubdomain && subdomainError && (
                      <p className="text-sm text-red-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {subdomainError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-[#0a0a0f] rounded-xl p-4 mb-8">
                  <p className="text-sm text-white/50">
                    <strong className="text-white/70">Note:</strong> Your subdomain cannot be changed after setup. Choose carefully!
                  </p>
                </div>

                <button
                  onClick={() => setStep('branding')}
                  disabled={!subdomain || !subdomainAvailable || subdomain.length < 3}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed rounded-xl font-semibold transition !text-white"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 'branding' && (
              <div className="p-8">
                <div className="space-y-6 mb-8">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Portal Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={`${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Support`}
                      className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition text-white placeholder-white/30"
                    />
                    <p className="mt-1 text-xs text-white/40">
                      Displayed in the header of your portal
                    </p>
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Logo URL <span className="text-white/40">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition text-white placeholder-white/30"
                    />
                    <p className="mt-1 text-xs text-white/40">
                      Direct link to your logo image (PNG, SVG, or JPG)
                    </p>
                  </div>

                  {/* Theme Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-3">
                      Color Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {THEME_OPTIONS.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setSelectedTheme(theme.id)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            selectedTheme === theme.id
                              ? 'border-white/40 bg-white/5'
                              : 'border-white/10 hover:border-white/20 bg-[#0a0a0f]'
                          }`}
                        >
                          <div
                            className="w-full h-8 rounded-lg mb-3"
                            style={{ backgroundColor: theme.color }}
                          />
                          <p className="font-medium text-sm text-white">{theme.name}</p>
                          <p className="text-xs text-white/40 mt-0.5">{theme.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('subdomain')}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition text-white/80"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateTenant}
                    disabled={isLoading}
                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2 !text-white"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                        Creating...
                      </>
                    ) : (
                      'Create Portal'
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 'complete' && (
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold mb-2">Your Portal is Ready!</h2>
                <p className="text-white/60 mb-8">
                  Your support portal has been created successfully.
                </p>

                <div className="bg-[#0a0a0f] rounded-xl p-5 mb-8">
                  <p className="text-sm text-white/50 mb-2">Portal URL</p>
                  <p className="text-xl font-mono text-indigo-400">
                    https://{tenantSlug}.helpportal.app
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/dashboard"
                    className="py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition text-center !text-white"
                  >
                    Go to Dashboard
                  </Link>
                  <a
                    href={`https://${tenantSlug}.helpportal.app`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-4 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition text-center !text-white flex items-center justify-center gap-2"
                  >
                    Visit Portal
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
