'use client';

/**
 * Signup Page
 *
 * Simple Discord login page for the main domain.
 * After login, users are redirected to the dashboard where they can:
 * - Choose a plan (if no subscription)
 * - Complete setup (if has subscription but no tenant)
 * - Access their portal (if fully set up)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainHeader } from '@/components/layout/MainHeader';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled') === 'true';

  const [isLoading, setIsLoading] = useState(true);
  const [siteName, setSiteName] = useState('HelpPortal');

  useEffect(() => {
    async function checkAuth() {
      try {
        // Get tenant context for site name
        const tenantRes = await fetch('/api/tenant');
        const tenantData = await tenantRes.json();
        setSiteName(tenantData.tenant?.name || 'HelpPortal');

        // Check if already authenticated
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();

        if (sessionData.authenticated) {
          // Already logged in - go to dashboard
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        console.error('Failed to check auth');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  const handleDiscordLogin = () => {
    window.location.href = '/api/auth/discord?callbackUrl=/dashboard';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      <MainHeader siteName={siteName} />

      <main className="flex-1 flex items-center justify-center py-20 px-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[#16161f] rounded-2xl border border-white/10 p-8">
            {/* Header */}
            <h1 className="text-2xl font-bold text-center mb-2">
              Get Started
            </h1>
            <p className="text-white/60 text-center mb-8">
              Sign in with Discord to create your support portal
            </p>

            {/* Canceled Warning */}
            {canceled && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-400 text-sm text-center">
                  Payment was canceled. You can try again from your dashboard.
                </p>
              </div>
            )}

            {/* Discord Login Button */}
            <button
              onClick={handleDiscordLogin}
              className="w-full py-4 bg-[#5865F2] hover:bg-[#4752C4] rounded-xl font-semibold transition flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Sign in with Discord
            </button>

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
            <Link href="/" className="text-white/60 hover:text-white transition">
              &larr; Back to Home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
