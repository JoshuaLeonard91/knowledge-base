'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { DiscordLoginButton } from '@/components/auth/DiscordLoginButton';
import Link from 'next/link';
import {
  SpinnerGap, CaretLeft, Clock, CheckCircle, Circle,
  ShieldCheck, ChatCircle, User, PaperPlaneTilt, WarningCircle,
  CalendarBlank, ArrowsClockwise, Hash, Tag, Hourglass, XCircle
} from '@phosphor-icons/react';

interface Comment {
  id: string;
  author: string;
  body: string;
  created: string;
}

interface TicketDetail {
  id: string;
  summary: string;
  description: string;
  status: string;
  statusCategory: string;
  created: string;
  updated: string;
  comments: Comment[];
  priority?: string;
  resolution?: string;
}

type StatusCategory = 'done' | 'indeterminate' | 'new' | string;

function getStatusConfig(status: string, statusCategory: StatusCategory) {
  const configs: Record<string, { color: string; bgColor: string; icon: typeof CheckCircle; label: string }> = {
    'done': {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      icon: CheckCircle,
      label: 'Resolved'
    },
    'indeterminate': {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      icon: Clock,
      label: 'In Progress'
    },
    'new': {
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      icon: Circle,
      label: 'Open'
    }
  };

  return configs[statusCategory] || {
    color: 'text-[var(--text-muted)]',
    bgColor: 'bg-[var(--bg-tertiary)] border-[var(--border-primary)]',
    icon: Circle,
    label: status
  };
}

function getPriorityConfig(priority?: string) {
  const configs: Record<string, { color: string; label: string }> = {
    'Highest': { color: 'text-red-400', label: 'Critical' },
    'High': { color: 'text-orange-400', label: 'High' },
    'Medium': { color: 'text-amber-400', label: 'Medium' },
    'Low': { color: 'text-blue-400', label: 'Low' },
    'Lowest': { color: 'text-slate-400', label: 'Lowest' }
  };
  return configs[priority || ''] || { color: 'text-[var(--text-muted)]', label: priority || 'None' };
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function extractUserDescription(description: string): string {
  let text = description;

  const dashParts = text.split('----');
  if (dashParts.length > 1) {
    text = dashParts[0];
  } else {
    const submitIndex = text.indexOf('Submitted via Support Portal');
    if (submitIndex > 0) {
      text = text.substring(0, submitIndex);
    } else {
      const submitIndexMarkdown = text.indexOf('*Submitted via Support Portal*');
      if (submitIndexMarkdown > 0) {
        text = text.substring(0, submitIndexMarkdown);
      }
    }
  }

  const metadataPatterns = [
    /Discord Server ID:.*$/gm,
    /Discord Username:.*$/gm,
    /Discord User ID:.*$/gm,
  ];

  for (const pattern of metadataPatterns) {
    text = text.replace(pattern, '');
  }

  return text.trim();
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ticketId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
      } else {
        setError(data.error || 'Failed to load ticket');
      }
    } catch {
      setError('Failed to load ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setReplyError(null);

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setReplyMessage('');
        await fetchTicket();
      } else {
        setReplyError(data.error || 'Failed to send reply');
      }
    } catch {
      setReplyError('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ticketId]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center py-12">
            <SpinnerGap size={32} weight="bold" className="text-[var(--accent-primary)] animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
              <ShieldCheck size={32} weight="duotone" className="text-[var(--accent-primary)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Authentication Required
            </h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Please log in with Discord to view this ticket.
            </p>
            <DiscordLoginButton />
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center py-12">
            <SpinnerGap size={32} weight="bold" className="text-[var(--accent-primary)] animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <Link
            href="/support/tickets"
            className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8"
          >
            <CaretLeft size={18} weight="bold" />
            Back to tickets
          </Link>
          <div className="text-center py-12">
            <p className="text-[var(--accent-danger)]">{error || 'Ticket not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(ticket.status, ticket.statusCategory);
  const StatusIcon = statusConfig.icon;
  const priorityConfig = getPriorityConfig(ticket.priority);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/support/tickets"
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <CaretLeft size={18} weight="bold" />
          Back to tickets
        </Link>

        {/* Main grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket header card */}
            <div className="p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                      {ticket.id}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-[var(--text-primary)]">{ticket.summary}</h1>
                </div>
                {/* Mobile status badge */}
                <div className={`lg:hidden flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusConfig.bgColor}`}>
                  <StatusIcon size={16} weight="fill" className={statusConfig.color} />
                  <span className={`text-sm font-medium ${statusConfig.color}`}>{ticket.status}</span>
                </div>
              </div>
            </div>

            {/* Original message */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
                    <User size={20} weight="bold" className="text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">You</p>
                    <p className="text-xs text-[var(--text-muted)]">{formatDate(ticket.created)}</p>
                  </div>
                  <span className="ml-auto text-xs px-2 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                    Original Request
                  </span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {extractUserDescription(ticket.description)}
                </p>
              </div>
            </div>

            {/* Comments/Responses section */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                  <ChatCircle size={20} weight="duotone" className="text-[var(--accent-primary)]" />
                  Activity
                  {ticket.comments.length > 0 && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                      {ticket.comments.length} {ticket.comments.length === 1 ? 'response' : 'responses'}
                    </span>
                  )}
                </h2>
              </div>

              {ticket.comments.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                    <Hourglass size={24} weight="duotone" className="text-[var(--text-muted)]" />
                  </div>
                  <p className="text-[var(--text-muted)]">No responses yet</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">We&apos;ll get back to you soon!</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-primary)]">
                  {ticket.comments.map((comment) => (
                    <div key={comment.id} className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent-secondary)]/10 flex items-center justify-center">
                          <User size={20} weight="bold" className="text-[var(--accent-secondary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{comment.author}</p>
                          <p className="text-xs text-[var(--text-muted)]">{formatDate(comment.created)}</p>
                        </div>
                        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]">
                          Support Team
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed pl-[52px]">
                        {comment.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply form */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Reply</h2>
              </div>
              <form onSubmit={handleSubmitReply} className="p-6">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all resize-none"
                />

                {replyError && (
                  <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]">
                    <WarningCircle size={18} weight="bold" />
                    <p className="text-sm">{replyError}</p>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !replyMessage.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <SpinnerGap size={18} weight="bold" className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <PaperPlaneTilt size={18} weight="bold" />
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right column - Sidebar */}
          <div className="space-y-6">
            {/* Status card */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Status</h3>
              </div>
              <div className="p-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${statusConfig.bgColor}`}>
                  <StatusIcon size={24} weight="fill" className={statusConfig.color} />
                  <p className={`text-sm font-semibold ${statusConfig.color}`}>{statusConfig.label}</p>
                </div>

                {ticket.resolution && (
                  <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <XCircle size={18} weight="fill" className="text-emerald-400" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Resolution</p>
                      <p className="text-sm font-medium text-emerald-400">{ticket.resolution}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Details card */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Details</h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Ticket ID */}
                <div className="flex items-start gap-3">
                  <Hash size={18} weight="bold" className="text-[var(--text-muted)] mt-0.5" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Ticket ID</p>
                    <p className="text-sm font-mono text-[var(--text-primary)]">{ticket.id}</p>
                  </div>
                </div>

                {/* Priority */}
                {ticket.priority && (
                  <div className="flex items-start gap-3">
                    <Tag size={18} weight="bold" className="text-[var(--text-muted)] mt-0.5" />
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Priority</p>
                      <p className={`text-sm font-medium ${priorityConfig.color}`}>{priorityConfig.label}</p>
                    </div>
                  </div>
                )}

                {/* Created */}
                <div className="flex items-start gap-3">
                  <CalendarBlank size={18} weight="bold" className="text-[var(--text-muted)] mt-0.5" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Created</p>
                    <p className="text-sm text-[var(--text-primary)]">{formatDate(ticket.created)}</p>
                    <p className="text-xs text-[var(--text-muted)]">{formatRelativeTime(ticket.created)}</p>
                  </div>
                </div>

                {/* Updated */}
                <div className="flex items-start gap-3">
                  <ArrowsClockwise size={18} weight="bold" className="text-[var(--text-muted)] mt-0.5" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Last Updated</p>
                    <p className="text-sm text-[var(--text-primary)]">{formatDate(ticket.updated)}</p>
                    <p className="text-xs text-[var(--text-muted)]">{formatRelativeTime(ticket.updated)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats card */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Quick Stats</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{ticket.comments.length}</p>
                  <p className="text-xs text-[var(--text-muted)]">Responses</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {Math.ceil((new Date().getTime() - new Date(ticket.created).getTime()) / 86400000)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">Days Open</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
