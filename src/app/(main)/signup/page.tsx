'use client';

/**
 * Signup Page
 *
 * Handles the signup flow:
 * 1. User clicks Discord login
 * 2. After login, redirects to Stripe checkout
 * 3. After payment, redirects to onboarding
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlatform } from '../PlatformProvider';
import { MainHeader } from '@/components/layout/MainHeader';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled') === 'true';
  const { siteName } = usePlatform();

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setIsLoggedIn(data.authenticated);

        // If logged in, check subscription status
        if (data.authenticated) {
          const subRes = await fetch('/api/stripe/subscription');
          const subData = await subRes.json();

          if (subData.success && subData.nextStep === 'dashboard') {
            // Already has active subscription and tenant
            router.push('/dashboard');
            return;
          } else if (subData.success && subData.nextStep === 'onboarding') {
            // Has subscription but no tenant
            router.push('/onboarding');
            return;
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setIsCheckingSession(false);
      }
    }

    checkSession();
  }, [router]);

  // Handle Discord login
  const handleDiscordLogin = () => {
    // Redirect to Discord OAuth with callback URL back to signup
    window.location.href = `/api/auth/discord?callbackUrl=/signup`;
  };

  // Handle Stripe checkout
  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get CSRF token
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrf;

      // Create checkout session
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      const data = await res.json();

      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      <MainHeader siteName={siteName} />

      {/* Content */}
      <main className="flex-1 flex items-center justify-center py-20 px-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[#16161f] rounded-2xl border border-white/10 p-8">
            <h1 className="text-2xl font-bold text-center mb-2">
              Create Your Portal
            </h1>
            <p className="text-white/60 text-center mb-8">
              {isLoggedIn
                ? 'Continue to payment to create your support portal.'
                : 'Sign in with Discord to get started.'}
            </p>

            {/* Canceled message */}
            {canceled && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-400 text-sm text-center">
                  Payment was canceled. You can try again when you&apos;re ready.
                </p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isLoggedIn
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}
                >
                  {isLoggedIn ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    '1'
                  )}
                </div>
                <div>
                  <p className={`font-medium ${isLoggedIn ? 'text-green-400' : 'text-white'}`}>
                    Sign in with Discord
                  </p>
                  <p className="text-sm text-white/40">
                    {isLoggedIn ? 'Signed in' : 'Connect your Discord account'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isLoggedIn
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  2
                </div>
                <div>
                  <p className={`font-medium ${isLoggedIn ? 'text-white' : 'text-white/40'}`}>
                    Complete Payment
                  </p>
                  <p className="text-sm text-white/40">$15 first payment ($10 setup + $5/mo)</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-white/10 text-white/40">
                  3
                </div>
                <div>
                  <p className="font-medium text-white/40">Set Up Your Portal</p>
                  <p className="text-sm text-white/40">Choose subdomain & branding</p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {isLoggedIn ? (
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
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
            ) : (
              <button
                onClick={handleDiscordLogin}
                className="w-full py-4 bg-[#5865F2] hover:bg-[#4752C4] rounded-xl font-semibold transition flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Sign in with Discord
              </button>
            )}

            {/* Terms */}
            <p className="text-center text-white/40 text-xs mt-6">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-indigo-400 hover:text-indigo-300">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">
                Privacy Policy
              </Link>
            </p>
          </div>

          {/* Back to pricing */}
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
