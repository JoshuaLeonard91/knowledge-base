'use client';

/**
 * Checkout Success Page
 *
 * Displayed after successful Stripe payment.
 * Polls /api/onboarding/status until the webhook has processed,
 * then redirects to the appropriate next step.
 */

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const MAX_POLL_ATTEMPTS = 15; // 15 attempts
const POLL_INTERVAL_MS = 2000; // 2 seconds between polls = 30 seconds max

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    let cancelled = false;

    async function pollForSubscription() {
      // Initial delay to give webhook time
      await new Promise((resolve) => setTimeout(resolve, 3000));
      if (cancelled) return;

      for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
        if (cancelled) return;

        try {
          const res = await fetch(`/api/onboarding/status?t=${Date.now()}`);
          const data = await res.json();

          pollRef.current = i + 1;
          if (!cancelled) setPollCount(i + 1);

          // Webhook has processed — user has an active subscription
          if (data.success && data.steps?.subscriptionActive) {
            if (cancelled) return;
            setStatus('success');

            // Short delay to show success message, then redirect
            setTimeout(() => {
              if (cancelled) return;
              const nextPage = data.steps?.tenantCreated ? '/dashboard' : '/onboarding';
              window.location.href = nextPage;
            }, 2000);
            return;
          }

          // User exists but no subscription yet — webhook still processing
          // Continue polling
        } catch {
          // Network error — keep trying
        }

        // Wait before next poll
        if (i < MAX_POLL_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      }

      // Exhausted all attempts — show success anyway with manual link
      // The webhook may still process in the background
      if (!cancelled) {
        setStatus('success');
      }
    }

    pollForSubscription();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Processing your payment...</h1>
          <p className="text-white/60">Please wait while we confirm your subscription.</p>
          {pollCount > 3 && (
            <p className="text-white/40 text-sm mt-4">Still waiting for confirmation...</p>
          )}
          {pollCount > 8 && (
            <Link
              href="/dashboard"
              className="inline-block mt-4 text-indigo-400 hover:text-indigo-300 text-sm transition"
            >
              Taking too long? Go to Dashboard
            </Link>
          )}
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
              href="/dashboard"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-white transition"
            >
              Go to Dashboard
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
