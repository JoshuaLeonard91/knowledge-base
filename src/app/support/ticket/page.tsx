import { TicketForm } from '@/components/support/TicketForm';
import { getFullUser } from '@/lib/auth';
import { ticketSubjects } from '@/lib/data/servers';
import { Ticket, Shield, Clock, CheckCircle } from '@phosphor-icons/react/dist/ssr';

export default async function TicketPage() {
  // Get user data server-side (includes servers)
  const user = await getFullUser();
  const servers = user?.servers || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-[var(--border-primary)]">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/20">
              <Ticket size={32} weight="duotone" className="text-[var(--accent-warning)]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
                Submit a Support Ticket
              </h1>
              <p className="text-[var(--text-secondary)] mt-1">
                Get personalized help from our support team
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <TicketForm servers={servers} subjects={ticketSubjects} />
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* What to expect */}
            <div className="p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">What to expect</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 h-fit">
                    <CheckCircle size={16} weight="duotone" className="text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Confirmation</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      You&apos;ll receive a ticket ID immediately
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="p-2 rounded-lg bg-[var(--accent-warning)]/10 h-fit">
                    <Clock size={16} weight="duotone" className="text-[var(--accent-warning)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Response Time</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Usually within 24-48 hours
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="p-2 rounded-lg bg-[var(--accent-success)]/10 h-fit">
                    <Shield size={16} weight="duotone" className="text-[var(--accent-success)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Privacy</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Your data is securely handled
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Tips */}
            <div className="p-6 rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">Tips for faster resolution</h3>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-primary)]">•</span>
                  Be specific about the issue
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-primary)]">•</span>
                  Include error messages if any
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-primary)]">•</span>
                  Mention what you&apos;ve already tried
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-primary)]">•</span>
                  Check suggested articles first
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
