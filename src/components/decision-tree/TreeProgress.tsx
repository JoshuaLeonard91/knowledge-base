'use client';

import { TreeNode } from '@/types';
import { CaretRight, ArrowCounterClockwise } from '@phosphor-icons/react';

interface TreeProgressProps {
  path: TreeNode[];
  onNavigate: (index: number) => void;
  onReset: () => void;
}

export function TreeProgress({ path, onNavigate, onReset }: TreeProgressProps) {
  if (path.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-6">
      <button
        onClick={onReset}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <ArrowCounterClockwise size={12} weight="bold" />
        Start Over
      </button>
      <CaretRight size={16} weight="bold" className="text-[var(--text-muted)]" />
      {path.map((node, index) => (
        <div key={node.id} className="flex items-center gap-2">
          {index > 0 && <CaretRight size={16} weight="bold" className="text-[var(--text-muted)]" />}
          <button
            onClick={() => onNavigate(index)}
            disabled={index === path.length - 1}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              index === path.length - 1
                ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {node.title.length > 25 ? node.title.slice(0, 25) + '...' : node.title}
          </button>
        </div>
      ))}
    </div>
  );
}
