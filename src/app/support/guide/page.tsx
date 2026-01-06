import { TreeContainer } from '@/components/decision-tree/TreeContainer';
import { decisionTree } from '@/lib/data/decision-tree';
import { Compass, Clock, FileText } from '@phosphor-icons/react/dist/ssr';

export default function GuidePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-[var(--border-primary)]">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
              <Compass size={32} weight="duotone" className="text-[var(--accent-primary)]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
                Get Help
              </h1>
              <p className="text-[var(--text-secondary)] mt-1">
                Answer a few questions and we&apos;ll point you in the right direction
              </p>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bg-secondary)]/50 border border-[var(--border-primary)]">
              <Clock size={20} weight="duotone" className="text-[var(--accent-success)] mt-0.5" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Takes 30 seconds</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Quick answers based on your specific situation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bg-secondary)]/50 border border-[var(--border-primary)]">
              <FileText size={20} weight="duotone" className="text-[var(--accent-primary)] mt-0.5" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Helpful resources</p>
                <p className="text-sm text-[var(--text-muted)]">
                  We&apos;ll link you to relevant articles
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <TreeContainer nodes={decisionTree} />
      </div>
    </div>
  );
}
