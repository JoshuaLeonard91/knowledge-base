'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { DiscordLoginButton } from '../auth/DiscordLoginButton';
import { SearchResult, MockServer, TicketSubject } from '@/types';
import {
  SpinnerGap, PaperPlaneTilt, CheckCircle, WarningCircle, ShieldCheck,
  User, Wrench, CreditCard, ChatCircle, Question, Lightbulb, X, FileText
} from '@phosphor-icons/react';
import Link from 'next/link';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const subjectIcons: Record<string, React.ComponentType<any>> = {
  'account': User,
  'technical': Wrench,
  'billing': CreditCard,
  'feedback': ChatCircle,
  'other': Question,
};

interface TicketFormProps {
  servers: MockServer[];
  subjects: TicketSubject[];
}

export function TicketForm({ servers, subjects }: TicketFormProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedServer, setSelectedServer] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; ticketId?: string } | null>(null);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServer || !selectedSubject || description.length < 10) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: selectedServer,
          subjectId: selectedSubject,
          description,
        }),
      });

      const data = await res.json();
      setSubmitResult({
        success: data.success,
        message: data.message || data.error,
        ticketId: data.ticketId,
      });

      if (data.success) {
        setSelectedServer('');
        setSelectedSubject('');
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
          <Link href="/support" className="btn btn-primary">
            Back to Support
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

      {/* Server Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Select Server
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          {servers.map((server) => (
            <button
              key={server.id}
              type="button"
              onClick={() => setSelectedServer(server.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                selectedServer === server.id
                  ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] hover:border-[var(--border-hover)]'
              }`}
            >
              <img src={server.icon} alt={server.name} className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${selectedServer === server.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                  {server.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{server.memberCount} members</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Subject Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          What do you need help with?
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          {subjects.map((subject) => {
            const Icon = subjectIcons[subject.id] || Question;
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => setSelectedSubject(subject.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  selectedSubject === subject.id
                    ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]'
                    : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] hover:border-[var(--border-hover)]'
                }`}
              >
                <Icon size={20} weight="duotone" className={selectedSubject === subject.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'} />
                <span className={selectedSubject === subject.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}>
                  {subject.name}
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

      {/* Submit */}
      <button
        type="submit"
        disabled={!selectedServer || !selectedSubject || description.length < 10 || isSubmitting}
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
