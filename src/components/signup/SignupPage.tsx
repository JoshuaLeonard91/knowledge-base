'use client';

/**
 * Generic Signup Page Component
 *
 * CMS-driven signup page that works on both main domain and tenant subdomains.
 * Handles Discord OAuth and optional payment flow.
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { SignupConfig, ServiceTier } from '@/lib/cms';

interface SignupPageProps {
  context: string;              // "main" or tenant slug
  config: SignupConfig;
  products?: ServiceTier[]; // For paid signup
  isAuthenticated?: boolean;
  hasSubscription?: boolean;
  nextStep?: string;            // Where to redirect after signup
}

export function SignupPage({
  context,
  config,
  products = [],
  isAuthenticated = false,
  hasSubscription = false,
  nextStep,
}: SignupPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get product from URL if specified
  const selectedProductSlug = searchParams.get('product');
  const selectedProduct = products.find((p) => p.slug === selectedProductSlug);

  // Redirect if already authenticated and has subscription
  useEffect(() => {
    if (isAuthenticated && hasSubscription && nextStep) {
      router.push(nextStep);
    }
  }, [isAuthenticated, hasSubscription, nextStep, router]);

  const handleDiscordLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build callback URL with product info if needed
      const callbackParams = new URLSearchParams();
      if (selectedProductSlug) {
        callbackParams.set('product', selectedProductSlug);
      }
      callbackParams.set('context', context);

      const callbackUrl = `/signup${callbackParams.toString() ? `?${callbackParams.toString()}` : ''}`;

      // Redirect to Discord OAuth
      window.location.href = `/api/auth/discord?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  const handleContinueToPayment = async () => {
    if (!selectedProduct) {
      // Redirect to pricing to select a product
      router.push('/pricing');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: selectedProduct.slug,
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  const handleContinueFree = () => {
    router.push(config.successRedirect);
  };

  // Determine current step
  const getStep = () => {
    if (!isAuthenticated) return 1;
    if (config.requirePayment && !hasSubscription) return 2;
    return 3;
  };

  const currentStep = getStep();

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{config.welcomeTitle}</h1>
          {config.welcomeSubtitle && (
            <p className="text-white/60">{config.welcomeSubtitle}</p>
          )}
        </div>

        {/* Progress Steps (for multi-step flows) */}
        {config.requirePayment && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-indigo-600 text-white'
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
                {step < 3 && <div className={`w-12 h-0.5 ${step < currentStep ? 'bg-green-500' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-[#16161f] rounded-2xl border border-white/10 p-8">
          {/* Step 1: Discord Login */}
          {currentStep === 1 && (
            <>
              <button
                onClick={handleDiscordLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-4 bg-[#5865F2] hover:bg-[#4752c4] rounded-xl font-semibold text-white transition disabled:opacity-50"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                )}
                {config.loginButtonText}
              </button>

              {selectedProduct && (
                <div className="mt-6 p-4 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-sm text-center">
                    Selected: <span className="text-white font-medium">{selectedProduct.name}</span>
                  </p>
                </div>
              )}
            </>
          )}

          {/* Step 2: Payment (if required) */}
          {currentStep === 2 && (
            <>
              {selectedProduct ? (
                <>
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Continue to Payment</h3>
                    <p className="text-white/60 text-sm">
                      You&apos;re subscribing to {selectedProduct.name}
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-white">
                        {selectedProduct.price || 'Free'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleContinueToPayment}
                    disabled={isLoading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-white transition disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Continue to Payment'}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Choose a Plan</h3>
                    <p className="text-white/60 text-sm">Select a plan to continue</p>
                  </div>

                  <Link
                    href="/pricing"
                    className="block w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-white text-center transition"
                  >
                    View Plans
                  </Link>
                </>
              )}

              {config.allowFreeSignup && (
                <button
                  onClick={handleContinueFree}
                  className="w-full mt-4 py-3 text-white/60 hover:text-white text-sm transition"
                >
                  Continue with free account
                </button>
              )}
            </>
          )}

          {/* Step 3: Complete (redirect) */}
          {currentStep === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">You&apos;re all set!</h3>
              <p className="text-white/60 text-sm mb-6">Redirecting you now...</p>
              <Link
                href={config.successRedirect}
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-white transition"
              >
                Continue
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-white/60 hover:text-white underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-white/60 hover:text-white underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
