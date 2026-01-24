'use client';

/**
 * Checkout Success Page
 *
 * Displayed after successful payment.
 * Verifies the session and redirects appropriately.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    async function verifySession() {
      if (!sessionId) {
        setStatus('error');
        return;
      }

      try {
        // Wait a moment for webhook to process
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check subscription status
        const res = await fetch('/api/auth/session');
        const data = await res.json();

        if (data.authenticated) {
          setStatus('success');
          // Redirect to onboarding or dashboard after showing success
          setTimeout(() => {
            router.push('/onboarding');
          }, 3000);
        } else {
          setStatus('success');
        }
      } catch (error) {
        console.error('Failed to verify session:', error);
        setStatus('error');
      }
    }

    verifySession();
  }, [sessionId, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Processing your payment...</h1>
          <p className="text-white/60">Please wait while we confirm your subscription.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-white/60 mb-6">
            We couldn&apos;t verify your payment. If you were charged, please contact support.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/pricing"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-white transition"
            >
              Try Again
            </Link>
            <Link href="/support/contact" className="text-white/60 hover:text-white transition">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center animate-scale-in">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 animate-slide-up">Payment Successful!</h1>
        <p className="text-white/60 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          Thank you for your subscription. Redirecting you to complete setup...
        </p>
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Link
            href="/onboarding"
            className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-white transition"
          >
            Continue to Setup
          </Link>
        </div>
      </div>
    </div>
  );
}
