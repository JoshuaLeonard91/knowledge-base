'use client';

import { useState, useEffect } from 'react';
import { CaretLeft, CheckCircle, BookOpenText, PaperPlaneTilt } from '@phosphor-icons/react';
import { MinimalView } from './MinimalApp';
import { decisionTree } from '@/lib/data/decision-tree';
import { TreeNode } from '@/types';

interface MinimalWizardProps {
  onNavigate: (view: MinimalView) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function MinimalWizard({ onNavigate, onBack, onComplete }: MinimalWizardProps) {
  const [path, setPath] = useState<TreeNode[]>([]);
  const [currentNode, setCurrentNode] = useState<TreeNode | null>(null);

  useEffect(() => {
    // Find the root node
    const root = decisionTree.find(node => node.id === 'root');
    if (root) {
      setCurrentNode(root);
      setPath([root]);
    }
  }, []);

  const handleSelect = (nextId: string) => {
    const nextNode = decisionTree.find(node => node.id === nextId);
    if (nextNode) {
      setCurrentNode(nextNode);
      setPath([...path, nextNode]);

      if (nextNode.type === 'solution') {
        onComplete();
      }
    }
  };

  const handleBack = () => {
    if (path.length > 1) {
      const newPath = path.slice(0, -1);
      setPath(newPath);
      setCurrentNode(newPath[newPath.length - 1]);
    } else {
      onBack();
    }
  };

  if (!currentNode) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate progress
  const totalSteps = currentNode.type === 'solution' ? path.length : path.length + 1;
  const currentStep = path.length;

  return (
    <div className="min-h-[60vh]">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 mb-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <CaretLeft size={18} weight="bold" />
        <span className="text-sm">Back</span>
      </button>

      {/* Question or Solution */}
      {currentNode.type === 'question' ? (
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3 text-center">
            {currentNode.title}
          </h2>
          {currentNode.description && (
            <p className="text-[var(--text-secondary)] mb-8 text-center">
              {currentNode.description}
            </p>
          )}

          {/* Options */}
          <div className="space-y-2">
            {currentNode.options?.map((option) => (
              <button
                key={option.nextId}
                onClick={() => handleSelect(option.nextId)}
                className="w-full group flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)] transition-all text-left"
              >
                <div className="w-5 h-5 rounded-full border-2 border-[var(--border-hover)] group-hover:border-[var(--accent-primary)] flex items-center justify-center transition-colors">
                  <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-[var(--accent-primary)] transition-colors" />
                </div>
                <span className="flex-1 text-[var(--text-primary)]">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Solution
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-full bg-[var(--accent-success)]/10">
              <CheckCircle size={28} weight="duotone" className="text-[var(--accent-success)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {currentNode.title}
            </h2>
          </div>

          {currentNode.description && (
            <p className="text-[var(--text-secondary)] mb-6">
              {currentNode.description}
            </p>
          )}

          {/* Steps */}
          {currentNode.solution?.steps && currentNode.solution.steps.length > 0 && (
            <div className="mb-8 p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <p className="text-sm font-medium text-[var(--text-muted)] mb-4">
                Try these steps:
              </p>
              <ol className="space-y-3">
                {currentNode.solution.steps.map((step, index) => (
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
          {currentNode.solution?.articleSlug && (
            <button
              onClick={() => onNavigate({ type: 'article', slug: currentNode.solution!.articleSlug! })}
              className="w-full group flex items-center gap-3 p-4 mb-4 rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)] transition-all"
            >
              <BookOpenText size={20} weight="duotone" className="text-[var(--accent-primary)]" />
              <span className="flex-1 text-left text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                Read full article
              </span>
            </button>
          )}

          {/* Submit ticket */}
          {currentNode.solution?.canFileTicket && (
            <div className="pt-6 border-t border-[var(--border-primary)]">
              <p className="text-sm text-[var(--text-muted)] mb-3">
                Still need help?
              </p>
              <button
                onClick={() => onNavigate({ type: 'ticket' })}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary)]/90 transition-colors"
              >
                <PaperPlaneTilt size={20} weight="bold" />
                Submit a ticket
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.min(totalSteps, 5) }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < currentStep
                  ? 'bg-[var(--accent-primary)]'
                  : 'bg-[var(--border-primary)]'
              }`}
            />
          ))}
          {totalSteps > 5 && (
            <span className="text-xs text-[var(--text-muted)]">+{totalSteps - 5}</span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Step {currentStep} of {totalSteps}
        </p>
      </div>
    </div>
  );
}
