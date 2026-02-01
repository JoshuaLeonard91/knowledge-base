'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { DiscordLoginButton } from '@/components/auth/DiscordLoginButton';
import Link from 'next/link';
import {
  SpinnerGap, CaretLeft, Clock, CheckCircle, Circle,
  ShieldCheck, User, PaperPlaneTilt, WarningCircle,
  CalendarBlank, ArrowsClockwise, Hash, Tag, Hourglass, XCircle,
  Paperclip, X, FileText, Image as ImageIcon
} from '@phosphor-icons/react';

interface Comment {
  id: string;
  author: string;
  body: string;
  created: string;
  isStaff: boolean;
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
  const [csrfToken, setCsrfToken] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => { if (data.csrf) setCsrfToken(data.csrf); })
      .catch(() => {});
  }, []);

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

  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_EXTENSIONS = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.doc,.docx';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAddFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (attachedFiles.length + validFiles.length >= MAX_FILES) {
        setReplyError(`Maximum ${MAX_FILES} files allowed`);
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        setReplyError(`"${file.name}" exceeds 10MB limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setReplyError(null);

    try {
      let res: Response;

      if (attachedFiles.length > 0) {
        const formData = new FormData();
        formData.append('message', replyMessage.trim());
        for (const file of attachedFiles) {
          formData.append('files', file);
        }
        res = await fetch(`/api/tickets/${ticketId}`, {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrfToken },
          body: formData,
        });
      } else {
        res = await fetch(`/api/tickets/${ticketId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify({ message: replyMessage.trim() }),
        });
      }

      const data = await res.json();

      if (data.success) {
        setReplyMessage('');
        setAttachedFiles([]);
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
          <div className="lg:col-span-2 space-y-0">
            {/* Ticket header */}
            <div className="p-6 rounded-t-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <span className="text-xs font-mono px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                  {ticket.id}
                </span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                  <StatusIcon size={14} weight="fill" />
                  {statusConfig.label}
                </div>
                {ticket.priority && (
                  <span className={`text-xs font-medium ${priorityConfig.color}`}>
                    {priorityConfig.label} Priority
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{ticket.summary}</h1>
            </div>

            {/* Conversation timeline — single continuous thread */}
            <div className="rounded-b-xl bg-[var(--bg-secondary)] border border-t-0 border-[var(--border-primary)] overflow-hidden">
              {/* Original request — first entry in the timeline */}
              <div className="p-6 bg-[var(--accent-primary)]/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-[var(--accent-primary)]/15 ring-2 ring-[var(--accent-primary)]/30 flex items-center justify-center">
                    <User size={18} weight="bold" className="text-[var(--accent-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">You</p>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-medium">Author</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{formatDate(ticket.created)}</p>
                  </div>
                </div>
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed ml-12">
                  {extractUserDescription(ticket.description)}
                </p>
              </div>

              {/* Thread entries */}
              {ticket.comments.length === 0 ? (
                <div className="px-6 py-8 text-center border-t border-[var(--border-primary)]">
                  <Hourglass size={24} weight="duotone" className="text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-muted)]">Awaiting response from support</p>
                </div>
              ) : (
                ticket.comments.map((comment) => {
                  const isStaff = comment.isStaff;
                  return (
                    <div
                      key={comment.id}
                      className={`p-6 border-t border-[var(--border-primary)] ${isStaff ? 'bg-[var(--accent-secondary)]/[0.03]' : 'bg-[var(--accent-primary)]/10'}`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ring-2 ${isStaff ? 'bg-[var(--accent-secondary)]/15 ring-[var(--accent-secondary)]/30' : 'bg-[var(--accent-primary)]/15 ring-[var(--accent-primary)]/30'}`}>
                          <User size={18} weight="bold" className={isStaff ? 'text-[var(--accent-secondary)]' : 'text-[var(--accent-primary)]'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{comment.author}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isStaff ? 'bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]' : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'}`}>
                              {isStaff ? 'Support' : 'You'}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">{formatDate(comment.created)}</p>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{formatRelativeTime(comment.created)}</span>
                      </div>
                      <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed ml-12">
                        {comment.body}
                      </p>
                    </div>
                  );
                })
              )}

              {/* Response form — anchored at bottom of thread */}
              <div className="border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)]/30">
                <form onSubmit={handleSubmitReply} className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-full bg-[var(--accent-primary)]/15 ring-2 ring-[var(--accent-primary)]/30 flex items-center justify-center">
                      <User size={18} weight="bold" className="text-[var(--accent-primary)]" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Write a response</p>
                  </div>

                  {/* Textarea with drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative ml-12 rounded-lg border transition-all ${isDragging ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' : 'border-[var(--border-primary)] bg-[var(--bg-secondary)]'}`}
                  >
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Write your response..."
                      rows={4}
                      maxLength={5000}
                      className="w-full px-4 py-3 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none"
                    />
                    {isDragging && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 border-2 border-dashed border-[var(--accent-primary)]">
                        <p className="text-sm font-medium text-[var(--accent-primary)]">Drop files here</p>
                      </div>
                    )}
                  </div>

                  {/* Attached files */}
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 ml-12">
                      {attachedFiles.map((file, index) => {
                        const isImage = file.type.startsWith('image/');
                        return (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm"
                          >
                            {isImage ? (
                              <ImageIcon size={16} weight="duotone" className="text-[var(--accent-primary)] flex-shrink-0" />
                            ) : (
                              <FileText size={16} weight="duotone" className="text-[var(--accent-primary)] flex-shrink-0" />
                            )}
                            <span className="text-[var(--text-secondary)] max-w-[150px] truncate">{file.name}</span>
                            <span className="text-xs text-[var(--text-muted)]">{formatFileSize(file.size)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index)}
                              className="p-0.5 rounded hover:bg-[var(--accent-danger)]/10 text-[var(--text-muted)] hover:text-[var(--accent-danger)] transition-colors"
                            >
                              <X size={14} weight="bold" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Error */}
                  {replyError && (
                    <div className="flex items-center gap-2 p-3 ml-12 rounded-lg bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]">
                      <WarningCircle size={18} weight="bold" />
                      <p className="text-sm">{replyError}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between ml-12">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors">
                        <Paperclip size={14} weight="bold" />
                        <span>Attach</span>
                        <input
                          type="file"
                          multiple
                          accept={ALLOWED_EXTENSIONS}
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) handleAddFiles(e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <span className="text-xs text-[var(--text-muted)]">
                        {replyMessage.length}/5000
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !replyMessage.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:bg-[var(--accent-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <SpinnerGap size={16} weight="bold" className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <PaperPlaneTilt size={16} weight="bold" />
                          Submit Response
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
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
