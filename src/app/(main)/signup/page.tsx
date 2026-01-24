'use client';

/**
 * Unified Signup Page (CMS-driven)
 *
 * Works identically on both main domain and tenant subdomains.
 * All content and behavior is driven by CMS configuration.
 *
 * Flow:
 * 1. Discord OAuth
 * 2. Payment (if required by config)
 * 3. Redirect to onboarding or dashboard
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainHeader } from '@/components/layout/MainHeader';
import type { SignupConfig, CheckoutProduct } from '@/lib/cms';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled') === 'true';
  const productSlug = searchParams.get('product');

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [context, setContext] = useState('main');
  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [products, setProducts] = useState<CheckoutProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CheckoutProduct | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [siteName, setSiteName] = useState('HelpPortal');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

        // Get session
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        setIsAuthenticated(sessionData.authenticated);

        // Get products
        const productsRes = await fetch('/api/checkout/products');
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
          setHasSubscription(productsData.hasSubscription || false);

          // Select product from URL if specified
          if (productSlug && productsData.products) {
            const product = productsData.products.find((p: CheckoutProduct) => p.slug === productSlug);
            if (product) setSelectedProduct(product);
          }
        }

        // Get signup config from CMS
        const configRes = await fetch(`/api/signup/config?context=${currentContext}`);
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(configData.config);
        } else {
          // Use defaults
          setConfig({
            signupEnabled: true,
            requirePayment: currentContext === 'main',
            allowFreeSignup: currentContext !== 'main',
            welcomeTitle: currentContext === 'main' ? 'Create Your Portal' : 'Join Us',
            welcomeSubtitle: 'Sign in with Discord to get started',
            loginButtonText: 'Sign in with Discord',
            successRedirect: currentContext === 'main' ? '/onboarding' : '/dashboard',
          });
        }

        // Check if user should be redirected
        if (sessionData.authenticated) {
          if (currentContext === 'main') {
            // Main domain: check subscription and tenant status
            const subRes = await fetch('/api/stripe/subscription');
            const subData = await subRes.json();

            if (subData.success && subData.nextStep === 'dashboard') {
              router.push('/dashboard');
              return;
            } else if (subData.success && subData.nextStep === 'onboarding') {
              router.push('/onboarding');
              return;
            }
          }
        }

        setSiteName(tenantData.tenant?.name || 'HelpPortal');
      } catch (err) {
        console.error('Failed to load signup data:', err);
        setError('Failed to load. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router, productSlug]);

  // Determine current step
  const getCurrentStep = () => {
    if (!isAuthenticated) return 1;
    if (config?.requirePayment && !hasSubscription) return 2;
    return 3;
  };

  const currentStep = getCurrentStep();

  // Handle Discord login
  const handleDiscordLogin = () => {
    const params = new URLSearchParams();
    if (productSlug) params.set('product', productSlug);
    const callbackUrl = `/signup${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = `/api/auth/discord?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  // Handle payment
  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();

      const endpoint = context === 'main'
        ? '/api/stripe/create-checkout'
        : '/api/checkout/create-session';

      const body = context === 'main'
        ? {}
        : { productSlug: selectedProduct?.slug, context };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrf,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || 'Failed to start checkout');
      }
    } catch (err) {
      console.error('Payment failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle free continue
  const handleFreeContinue = () => {
    router.push(config?.successRedirect || '/dashboard');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      <MainHeader siteName={siteName} />

      <main className="flex-1 flex items-center justify-center py-20 px-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[#16161f] rounded-2xl border border-white/10 p-8">
            {/* Header */}
            <h1 className="text-2xl font-bold text-center mb-2">
              {config.welcomeTitle}
            </h1>
            <p className="text-white/60 text-center mb-8">
              {config.welcomeSubtitle}
            </p>

            {/* Canceled Warning */}
            {canceled && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-400 text-sm text-center">
                  Payment was canceled. You can try again when you&apos;re ready.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Progress Steps (if multi-step) */}
            {config.requirePayment && (
              <div className="flex items-center justify-center gap-4 mb-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        step < currentStep
                          ? 'bg-green-500/20 text-green-400'
                          : step === currentStep
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {step < currentStep ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step
                      )}
                    </div>
                    {step < 3 && <div className={`w-8 h-0.5 mx-2 ${step < currentStep ? 'bg-green-500/50' : 'bg-white/10'}`} />}
                  </div>
                ))}
              </div>
            )}

            {/* Step 1: Discord Login */}
            {currentStep === 1 && (
              <button
                onClick={handleDiscordLogin}
                className="w-full py-4 bg-[#5865F2] hover:bg-[#4752C4] rounded-xl font-semibold transition flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                {config.loginButtonText}
              </button>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <div>
                {/* Show product info */}
                {products.length > 0 && (
                  <div className="mb-6 p-4 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white">
                          {selectedProduct?.name || products[0]?.name || 'Pro Plan'}
                        </p>
                        <p className="text-sm text-white/60">
                          {selectedProduct?.description || products[0]?.description || 'Full access to all features'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          ${((selectedProduct?.priceAmount || products[0]?.priceAmount || 500) / 100).toFixed(0)}
                        </p>
                        <p className="text-sm text-white/60">/month</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>

                {config.allowFreeSignup && (
                  <button
                    onClick={handleFreeContinue}
                    className="w-full mt-4 py-3 text-white/60 hover:text-white text-sm transition"
                  >
                    Continue with free account
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Complete */}
            {currentStep === 3 && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">You&apos;re all set!</h3>
                <p className="text-white/60 text-sm mb-6">Redirecting...</p>
                <Link
                  href={config.successRedirect}
                  className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition"
                >
                  Continue
                </Link>
              </div>
            )}

            {/* Footer */}
            <p className="text-center text-white/40 text-xs mt-6">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-indigo-400 hover:text-indigo-300">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>
            </p>
          </div>

          {/* Back Link */}
          <p className="text-center mt-6">
            <Link href="/pricing" className="text-white/60 hover:text-white transition">
              &larr; Back to Pricing
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
