'use client';

import { TreeNode as TreeNodeType } from '@/types';
import Link from 'next/link';
import {
  Zap, FileText, Share2, WifiOff, Users, Shield, Settings, Terminal,
  AlertTriangle, HelpCircle, Search, Calendar, EyeOff, AlertCircle,
  FileWarning, Plus, Lock, MessageSquare, Unlink, ChevronRight,
  CheckCircle, Ticket, BookOpen, ArrowLeft, User, Wrench
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, FileText, Share2, WifiOff, Users, Shield, Settings, Terminal,
  AlertTriangle, HelpCircle, Search, Calendar, EyeOff, AlertCircle,
  FileWarning, Plus, Lock, MessageSquare, Unlink, User, Wrench
};

interface TreeNodeProps {
  node: TreeNodeType;
  onSelect: (nextId: string) => void;
  onBack: () => void;
  canGoBack: boolean;
}

export function TreeNodeComponent({ node, onSelect, onBack, canGoBack }: TreeNodeProps) {
  if (node.type === 'solution') {
    return (
      <div className="animate-slide-up">
        {/* Back button */}
        {canGoBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Go back</span>
          </button>
        )}

        {/* Solution header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20">
            <CheckCircle className="w-8 h-8 text-[var(--accent-success)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {node.title}
            </h2>
            {node.description && (
              <p className="text-[var(--text-secondary)]">{node.description}</p>
            )}
          </div>
        </div>

        {/* Solution steps */}
        {node.solution?.steps && node.solution.steps.length > 0 && (
          <div className="mb-6 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">
              Follow these steps:
            </h3>
            <ol className="space-y-3">
              {node.solution.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-[var(--text-secondary)] pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Related article */}
        {node.solution?.articleSlug && (
          <Link
            href={`/support/articles/${node.solution.articleSlug}`}
            className="flex items-center gap-4 p-4 mb-6 rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)] transition-all group"
          >
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
              <BookOpen className="w-5 h-5 text-[var(--accent-primary)]" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                Read the full article
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Get more detailed information and examples
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all" />
          </Link>
        )}

        {/* Still need help */}
        {node.solution?.canFileTicket && (
          <div className="p-6 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">
              Still need help?
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              If these steps didn&apos;t resolve your issue, you can submit a support ticket for personalized assistance.
            </p>
            <Link href="/support/ticket" className="btn btn-primary">
              <Ticket className="w-5 h-5" />
              Submit Support Ticket
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Question type node
  return (
    <div className="animate-slide-up">
      {/* Back button */}
      {canGoBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Go back</span>
        </button>
      )}

      {/* Question */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3">
          {node.title}
        </h2>
        {node.description && (
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
            {node.description}
          </p>
        )}
      </div>

      {/* Options */}
      <div className="grid gap-4 sm:grid-cols-2">
        {node.options?.map((option) => {
          const Icon = option.icon ? iconMap[option.icon] : ChevronRight;
          return (
            <button
              key={option.nextId}
              onClick={() => onSelect(option.nextId)}
              className="group relative p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:shadow-[var(--shadow-glow)] transition-all text-left overflow-hidden"
            >
              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative flex items-center gap-4">
                {option.icon && (
                  <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] group-hover:bg-[var(--accent-primary)]/10 transition-colors">
                    <Icon className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                  </div>
                )}
                <span className="flex-1 font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  {option.label}
                </span>
                <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
