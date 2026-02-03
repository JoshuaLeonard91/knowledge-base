'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { DiscordLoginButton } from '../auth/DiscordLoginButton';
import { SearchResult, TicketSeverity } from '@/types';
import { TicketCategory } from '@/lib/cms';
import {
  SpinnerGap, PaperPlaneTilt, CheckCircle, WarningCircle, ShieldCheck,
  Lightbulb, X, FileText,
  Info, Warning, Fire, SealWarning, CaretDown, DiscordLogo
} from '@phosphor-icons/react';
import Link from 'next/link';

// Severity options with icons and colors
const severityOptions: Array<{
  id: TicketSeverity;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; weight?: 'duotone' | 'bold'; className?: string }>;
  color: string;
}> = [
  { id: 'low', name: 'Low', description: 'Minor issue, no impact on work', icon: Info, color: 'text-blue-500' },
  { id: 'medium', name: 'Medium', description: 'Moderate impact, workaround available', icon: Warning, color: 'text-yellow-500' },
  { id: 'high', name: 'High', description: 'Significant impact, urgent attention needed', icon: SealWarning, color: 'text-orange-500' },
  { id: 'critical', name: 'Critical', description: 'System down, blocking all work', icon: Fire, color: 'text-red-500' },
];

interface TicketFormProps {
  categories: TicketCategory[];
}

export function TicketForm({ categories }: TicketFormProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [serverId, setServerId] = useState('');
  const [serverIdError, setServerIdError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<TicketSeverity | ''>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; ticketId?: string } | null>(null);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [discordNotify, setDiscordNotify] = useState(true);
  const [csrfToken, setCsrfToken] = useState('');

  // Fetch CSRF token on mount
  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => { if (data.csrf) setCsrfToken(data.csrf); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (description.length < 5) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/articles/search?q=${encodeURIComponent(description)}`);
        const data = await res.json();
        if (data.success) {
          setSuggestions(data.results.slice(0, 3));
        }
      } catch {
        // Silently fail
      }
    };
    const debounce = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(debounce);
  }, [description]);

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
    if (!validateServerId(serverId) || !selectedCategory || !selectedSeverity || description.length < 10) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({
          serverId: serverId.trim(),
          categoryId: selectedCategory,
          severity: selectedSeverity,
          description,
          discordNotify,
        }),
      });

      const data = await res.json();
      setSubmitResult({
        success: data.success,
        message: data.message || data.error,
        ticketId: data.ticketId,
      });

      if (data.success) {
        setServerId('');
        setServerIdError('');
        setSelectedCategory('');
        setSelectedSeverity('');
        setDescription('');
      }
    } catch {
      setSubmitResult({
        success: false,
        message: 'Failed to submit ticket. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerGap size={32} weight="bold" className="text-[var(--accent-primary)] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
          <ShieldCheck size={32} weight="duotone" className="text-[var(--accent-primary)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Authentication Required
        </h2>
        <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
          Please log in with Discord to submit a support ticket.
        </p>
        <DiscordLoginButton />
      </div>
    );
  }

  if (submitResult?.success) {
    return (
      <div className="text-center py-12 px-4 animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
          <CheckCircle size={32} weight="duotone" className="text-[var(--accent-success)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Ticket Submitted!
        </h2>
        <p className="text-[var(--text-secondary)] mb-2">
          {submitResult.message}
        </p>
        {submitResult.ticketId && (
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Reference: <span className="font-mono text-[var(--accent-primary)]">{submitResult.ticketId}</span>
          </p>
        )}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setSubmitResult(null)} className="btn btn-secondary">
            Submit Another
          </button>
          <Link href="/support/tickets" className="btn btn-primary">
            View My Tickets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitResult?.success === false && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20">
          <WarningCircle size={20} weight="duotone" className="text-[var(--accent-danger)] flex-shrink-0" />
          <p className="text-[var(--accent-danger)]">{submitResult.message}</p>
        </div>
      )}

      {/* Discord Server ID Input */}
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
          className={`input ${serverIdError ? 'border-[var(--accent-danger)]' : ''}`}
        />
        {serverIdError && (
          <p className="text-sm text-[var(--accent-danger)] mt-1">{serverIdError}</p>
        )}
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Right-click your server name in Discord → Copy Server ID
        </p>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          What do you need help with?
        </label>
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input w-full appearance-none pr-10 cursor-pointer"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <CaretDown
            size={18}
            weight="bold"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          />
        </div>
      </div>

      {/* Severity Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          How severe is this issue?
        </label>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {severityOptions.map((severity) => {
            const Icon = severity.icon;
            const isSelected = selectedSeverity === severity.id;
            return (
              <button
                key={severity.id}
                type="button"
                onClick={() => setSelectedSeverity(severity.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
                    : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] hover:border-[var(--border-hover)]'
                }`}
              >
                <Icon size={24} weight="duotone" className={isSelected ? 'text-[var(--accent-primary)]' : severity.color} />
                <span className={`font-medium ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                  {severity.name}
                </span>
                <span className="text-xs text-[var(--text-muted)] text-center leading-tight">
                  {severity.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Describe your issue
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please describe your issue in detail..."
          rows={5}
          className="input resize-none"
        />
        <p className="text-xs text-[var(--text-muted)] mt-2">
          {description.length}/2000 characters
        </p>
      </div>

      {/* Article Suggestions */}
      {suggestions.length > 0 && showSuggestions && (
        <div className="p-4 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={20} weight="duotone" className="text-[var(--accent-primary)]" />
              <p className="font-medium text-[var(--text-primary)]">These articles might help</p>
            </div>
            <button type="button" onClick={() => setShowSuggestions(false)} className="p-1 rounded hover:bg-[var(--bg-tertiary)]">
              <X size={16} weight="bold" className="text-[var(--text-muted)]" />
            </button>
          </div>
          <div className="space-y-2">
            {suggestions.map((article) => (
              <Link
                key={article.slug}
                href={`/support/articles/${article.slug}`}
                target="_blank"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <FileText size={16} weight="duotone" className="text-[var(--accent-primary)]" />
                <span className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  {article.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Discord DM Notifications */}
      <label className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={discordNotify}
          onChange={(e) => setDiscordNotify(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--border-primary)] accent-[var(--accent-primary)]"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <DiscordLogo size={16} weight="duotone" className="text-[#5865F2]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Receive ticket updates via Discord DM
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Get notified in your Discord DMs when our team replies to this ticket.
          </p>
        </div>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={!serverId.trim() || !selectedCategory || !selectedSeverity || description.length < 10 || isSubmitting}
        className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <SpinnerGap size={20} weight="bold" className="animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <PaperPlaneTilt size={20} weight="duotone" />
            Submit Ticket
          </>
        )}
      </button>
    </form>
  );
}
