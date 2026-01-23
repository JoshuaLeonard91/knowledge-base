'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CaretLeft, PaperPlaneTilt, CheckCircle, WarningCircle, SpinnerGap } from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { DiscordLoginButton } from '@/components/auth/DiscordLoginButton';

interface MinimalTicketProps {
  onBack: () => void;
}

export function MinimalTicket({ onBack }: MinimalTicketProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [serverId, setServerId] = useState('');
  const [serverIdError, setServerIdError] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  // Validate Discord server ID format
  const validateServerId = (id: string): boolean => {
    const trimmed = id.trim();
    if (!trimmed) {
      setServerIdError('Server ID is required');
      return false;
    }
    // Discord snowflake IDs are 17-19 digits
    if (!/^\d{17,19}$/.test(trimmed)) {
      setServerIdError('Invalid format. Discord server IDs are 17-19 digit numbers.');
      return false;
    }
    setServerIdError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !user || !validateServerId(serverId)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: serverId.trim(),
          categoryId: 'technical',
          severity: 'medium',
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        setTicketId(data.ticketId);
      } else {
        setError(data.error || 'Failed to submit ticket');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-full bg-[var(--accent-success)]/10 mb-6">
          <CheckCircle size={48} weight="duotone" className="text-[var(--accent-success)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Ticket Submitted
        </h2>
        <p className="text-[var(--text-secondary)] mb-2">
          We&apos;ll get back to you as soon as possible.
        </p>
        {ticketId && (
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Reference: <span className="font-mono text-[var(--accent-primary)]">{ticketId}</span>
          </p>
        )}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onBack}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Back to support
          </button>
          <Link
            href="/support/tickets"
            className="text-[var(--accent-primary)] hover:underline"
          >
            View My Tickets
          </Link>
        </div>
      </div>
    );
  }

  // Auth required
  if (!authLoading && !user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
          Sign in to continue
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Please log in with Discord to submit a support ticket.
        </p>
        <DiscordLoginButton />
        <button
          onClick={onBack}
          className="mt-6 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh]">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <CaretLeft size={18} weight="bold" />
        <span className="text-sm">Back</span>
      </button>

      {/* Header */}
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        Submit a Ticket
      </h1>
      <p className="text-[var(--text-secondary)] mb-8">
        Describe your issue and we&apos;ll help you out.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <img
              src={user.avatarUrl || '/avatars/default.png'}
              alt={user.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="font-medium text-[var(--text-primary)]">{user.displayName}</p>
              <p className="text-sm text-[var(--text-muted)]">Logged in with Discord</p>
            </div>
          </div>
        )}

        {/* Discord Server ID */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Discord Server ID
          </label>
          <input
            type="text"
            value={serverId}
            onChange={(e) => {
              setServerId(e.target.value);
              if (serverIdError) setServerIdError('');
            }}
            placeholder=""
            className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors ${serverIdError ? 'border-[var(--accent-danger)]' : 'border-[var(--border-primary)]'}`}
          />
          {serverIdError && (
            <p className="text-sm text-[var(--accent-danger)] mt-1">{serverIdError}</p>
          )}
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Right-click your server name in Discord → Copy Server ID
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            How can we help?
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your issue in detail..."
            rows={6}
            required
            minLength={20}
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-none"
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Minimum 20 characters
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]">
            <WarningCircle size={18} weight="bold" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !serverId.trim() || description.trim().length < 20}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <SpinnerGap size={20} weight="bold" className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <PaperPlaneTilt size={20} weight="bold" />
              Submit Ticket
            </>
          )}
        </button>
      </form>
    </div>
  );
}
