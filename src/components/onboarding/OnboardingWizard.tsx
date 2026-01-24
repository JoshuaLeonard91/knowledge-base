'use client';

/**
 * Generic Onboarding Wizard Component
 *
 * CMS-driven onboarding wizard that works on both main domain and tenant subdomains.
 * Handles multi-step onboarding with dynamic form fields.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OnboardingStep } from './OnboardingStep';
import type { OnboardingConfig } from '@/lib/cms';

interface OnboardingWizardProps {
  context: string;              // "main" or tenant slug
  config: OnboardingConfig;
  isAuthenticated?: boolean;
  userId?: string;
  csrfToken?: string;           // CSRF token for API requests
}

export function OnboardingWizard({
  context,
  config,
  isAuthenticated = false,
  userId,
  csrfToken: initialCsrfToken,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [csrfToken, setCsrfToken] = useState(initialCsrfToken);

  // Fetch fresh CSRF token on mount to ensure it's valid
  useEffect(() => {
    async function fetchCsrf() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = await res.json();
        if (data.csrf) {
          setCsrfToken(data.csrf);
        }
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
      }
    }
    fetchCsrf();
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signup');
    }
  }, [isAuthenticated, router]);

  const currentStep = config.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === config.steps.length - 1;

  const handleDataChange = (newData: Record<string, string>) => {
    setFormData(newData);
  };

  const handleNext = async () => {
    if (isLastStep) {
      await handleComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch fresh CSRF token before submitting
      let token = csrfToken;
      try {
        const csrfRes = await fetch('/api/auth/session', { cache: 'no-store' });
        const csrfData = await csrfRes.json();
        if (csrfData.csrf) {
          token = csrfData.csrf;
          setCsrfToken(token);
        }
      } catch {
        // Use existing token if refresh fails
      }

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token || '',
        },
        body: JSON.stringify({
          context,
          data: formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete onboarding');
      }

      setIsComplete(true);

      // Redirect after a short delay to show completion message
      setTimeout(() => {
        router.push(config.completionCtaLink);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // Show completion screen
  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{config.completionTitle}</h1>
          {config.completionMessage && (
            <p className="text-white/60 mb-6">{config.completionMessage}</p>
          )}
          <Link
            href={config.completionCtaLink}
            className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-white transition"
          >
            {config.completionCtaText}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-6">
      <div className="max-w-lg w-full">
        {/* Progress Indicator */}
        {config.steps.length > 1 && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              {config.steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      index < currentStepIndex
                        ? 'bg-green-500 text-white'
                        : index === currentStepIndex
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < config.steps.length - 1 && (
                    <div
                      className={`w-8 h-0.5 transition-colors ${
                        index < currentStepIndex ? 'bg-green-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-white/40 text-sm mt-3">
              Step {currentStepIndex + 1} of {config.steps.length}
            </p>
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
          <OnboardingStep
            step={currentStep}
            data={formData}
            onDataChange={handleDataChange}
            onNext={handleNext}
            onBack={handleBack}
            isFirst={isFirstStep}
            isLast={isLastStep}
            isLoading={isLoading}
          />
        </div>

        {/* Skip Option (for non-required steps) */}
        {!currentStep.required && !isLastStep && (
          <button
            onClick={() => setCurrentStepIndex((prev) => prev + 1)}
            className="block w-full text-center text-white/40 hover:text-white/60 text-sm mt-4 transition"
          >
            Skip this step
          </button>
        )}
      </div>
    </div>
  );
}
