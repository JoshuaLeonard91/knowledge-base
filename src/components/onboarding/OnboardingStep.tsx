'use client';

/**
 * Onboarding Step Component
 *
 * Renders a single step in the onboarding wizard.
 * Handles different step types: SUBDOMAIN, BRANDING, CUSTOM_FIELDS, WELCOME
 */

import { useState } from 'react';
import { DynamicFormField } from './DynamicFormField';
import type { OnboardingStep as OnboardingStepType } from '@/lib/cms';

interface OnboardingStepProps {
  step: OnboardingStepType;
  data: Record<string, string>;
  onDataChange: (data: Record<string, string>) => void;
  onNext: () => void;
  onBack?: () => void;
  isFirst: boolean;
  isLast: boolean;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

export function OnboardingStep({
  step,
  data,
  onDataChange,
  onNext,
  onBack,
  isFirst,
  isLast,
  isLoading,
  errors = {},
}: OnboardingStepProps) {
  const [subdomainValue, setSubdomainValue] = useState(data.subdomain || '');
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);

  const handleFieldChange = (name: string, value: string) => {
    onDataChange({ ...data, [name]: value });
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomainValue(value);
    setSubdomainError(null);
  };

  const checkSubdomainAvailability = async () => {
    if (!subdomainValue || subdomainValue.length < 3) {
      setSubdomainError('Subdomain must be at least 3 characters');
      return false;
    }

    if (subdomainValue.length > 32) {
      setSubdomainError('Subdomain must be 32 characters or less');
      return false;
    }

    setCheckingSubdomain(true);
    try {
      const response = await fetch(`/api/onboarding/check-subdomain?subdomain=${subdomainValue}`);
      const result = await response.json();

      if (!result.available) {
        setSubdomainError(result.message || 'This subdomain is not available');
        return false;
      }

      onDataChange({ ...data, subdomain: subdomainValue });
      return true;
    } catch {
      setSubdomainError('Failed to check subdomain availability');
      return false;
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const handleNext = async () => {
    if (step.type === 'SUBDOMAIN') {
      const isAvailable = await checkSubdomainAvailability();
      if (!isAvailable) return;
    }
    onNext();
  };

  return (
    <div>
      {/* Step Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
        {step.description && <p className="text-white/60">{step.description}</p>}
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {/* SUBDOMAIN Step */}
        {step.type === 'SUBDOMAIN' && (
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Subdomain
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={subdomainValue}
                onChange={handleSubdomainChange}
                placeholder="yourname"
                className={`flex-1 px-4 py-3 bg-white/5 border rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition ${
                  subdomainError ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
              <span className="text-white/60">.helpportal.app</span>
            </div>
            {subdomainError && <p className="mt-2 text-sm text-red-400">{subdomainError}</p>}
            <p className="mt-2 text-sm text-white/40">
              Only lowercase letters, numbers, and hyphens allowed
            </p>
          </div>
        )}

        {/* BRANDING Step */}
        {step.type === 'BRANDING' && step.fields && (
          <div className="space-y-6">
            {step.fields.map((field) => (
              <DynamicFormField
                key={field.name}
                field={field}
                value={data[field.name] || ''}
                onChange={handleFieldChange}
                error={errors[field.name]}
              />
            ))}
          </div>
        )}

        {/* CUSTOM_FIELDS Step */}
        {step.type === 'CUSTOM_FIELDS' && step.fields && (
          <div className="space-y-6">
            {step.fields.map((field) => (
              <DynamicFormField
                key={field.name}
                field={field}
                value={data[field.name] || ''}
                onChange={handleFieldChange}
                error={errors[field.name]}
              />
            ))}
          </div>
        )}

        {/* WELCOME Step */}
        {step.type === 'WELCOME' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-indigo-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-white/60">Click continue to finish setting up your account.</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
        {!isFirst && onBack ? (
          <button
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-3 text-white/60 hover:text-white transition disabled:opacity-50"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={handleNext}
          disabled={isLoading || checkingSubdomain}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-white transition disabled:opacity-50"
        >
          {isLoading || checkingSubdomain ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {checkingSubdomain ? 'Checking...' : 'Processing...'}
            </span>
          ) : isLast ? (
            'Complete Setup'
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
}
