'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { DiscordLoginButton } from '@/components/auth/DiscordLoginButton';
import Link from 'next/link';
import {
  SpinnerGap, Ticket, Clock, CheckCircle, Circle, ArrowRight,
  ShieldCheck, Plus, Funnel, CalendarBlank, ChatCircle
} from '@phosphor-icons/react';

interface TicketSummary {
  id: string;
  summary: string;
  status: string;
  statusCategory: string;
  created: string;
  updated: string;
}

type FilterType = 'all' | 'open' | 'in-progress' | 'resolved';

function getStatusConfig(statusCategory: string) {
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
    label: 'Open'
  };
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

export default function MyTicketsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!user) return;

    const fetchTickets = async () => {
      try {
        const res = await fetch('/api/tickets');
        const data = await res.json();
        if (data.success) {
          setTickets(data.tickets);
        } else {
          setError(data.error || 'Failed to load tickets');
        }
      } catch {
        setError('Failed to load tickets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [user]);

  const filteredTickets = useMemo(() => {
    if (filter === 'all') return tickets;
    if (filter === 'open') return tickets.filter(t => t.statusCategory === 'new' || (!t.statusCategory));
    if (filter === 'in-progress') return tickets.filter(t => t.statusCategory === 'indeterminate');
    if (filter === 'resolved') return tickets.filter(t => t.statusCategory === 'done');
    return tickets;
  }, [tickets, filter]);


  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="max-w-6xl mx-auto px-4 py-16">
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
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
              <ShieldCheck size={32} weight="duotone" className="text-[var(--accent-primary)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Authentication Required
            </h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Please log in with Discord to view your tickets.
            </p>
            <DiscordLoginButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Tickets</h1>
            <p className="text-[var(--text-secondary)]">View and manage your support requests</p>
          </div>
          <Link
            href="/support/ticket"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent-primary)] font-medium hover:bg-[var(--accent-primary)]/90 transition-colors"
          >
            <Plus size={18} weight="bold" className="text-white" />
            <span className="text-white">New Ticket</span>
          </Link>
        </div>

        {/* Filter Tabs */}
        {!isLoading && !error && tickets.length > 0 && (
          <div className="flex items-center gap-2 mb-6 p-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] w-fit">
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Funnel size={16} weight="bold" />
              All
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'open'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Circle size={16} weight="fill" />
              Open
            </button>
            <button
              onClick={() => setFilter('in-progress')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'in-progress'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Clock size={16} weight="fill" />
              In Progress
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'resolved'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CheckCircle size={16} weight="fill" />
              Resolved
            </button>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <SpinnerGap size={32} weight="bold" className="text-[var(--accent-primary)] animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-[var(--accent-danger)]">{error}</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
              <Ticket size={32} weight="duotone" className="text-[var(--text-muted)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              No tickets yet
            </h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              You haven&apos;t submitted any support tickets. Create one to get help from our team.
            </p>
            <Link
              href="/support/ticket"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary)]/90 transition-colors"
            >
              <Plus size={18} weight="bold" />
              Submit a Ticket
            </Link>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <p className="text-[var(--text-muted)]">No tickets match this filter</p>
          </div>
        ) : (
          <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-3 bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-primary)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              <div className="col-span-5">Ticket</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2">Updated</div>
              <div className="col-span-1"></div>
            </div>

            {/* Ticket Rows */}
            <div className="divide-y divide-[var(--border-primary)]">
              {filteredTickets.map((ticket) => {
                const statusConfig = getStatusConfig(ticket.statusCategory);
                const StatusIcon = statusConfig.icon;
                return (
                  <Link
                    key={ticket.id}
                    href={`/support/tickets/${ticket.id}`}
                    className="block hover:bg-[var(--bg-tertiary)]/50 transition-colors group"
                  >
                    {/* Desktop Layout */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-4 items-center">
                      <div className="col-span-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                            <Ticket size={20} weight="duotone" className="text-[var(--text-muted)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-[var(--text-muted)] mb-0.5">{ticket.id}</p>
                            <p className="font-medium text-[var(--text-primary)] truncate">{ticket.summary}</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.bgColor}`}>
                          <StatusIcon size={12} weight="fill" className={statusConfig.color} />
                          <span className={statusConfig.color}>{statusConfig.label}</span>
                        </span>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <CalendarBlank size={14} weight="bold" className="text-[var(--text-muted)]" />
                          <span>{formatRelativeTime(ticket.created)}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <ChatCircle size={14} weight="bold" className="text-[var(--text-muted)]" />
                          <span>{formatRelativeTime(ticket.updated)}</span>
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <ArrowRight
                          size={18}
                          weight="bold"
                          className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors"
                        />
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="sm:hidden p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                            <Ticket size={20} weight="duotone" className="text-[var(--text-muted)]" />
                          </div>
                          <div>
                            <p className="text-xs font-mono text-[var(--text-muted)]">{ticket.id}</p>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${statusConfig.color}`}>
                              <StatusIcon size={12} weight="fill" />
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>
                        <ArrowRight
                          size={18}
                          weight="bold"
                          className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors flex-shrink-0"
                        />
                      </div>
                      <p className="font-medium text-[var(--text-primary)] mb-2">{ticket.summary}</p>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        <span>Created {formatRelativeTime(ticket.created)}</span>
                        <span>Updated {formatRelativeTime(ticket.updated)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
