/**
 * Pricing Page (CMS-driven)
 *
 * Shows the single subscription plan and CTA to sign up.
 */

import Link from 'next/link';
import { getHeaderData, getPricingPageContent } from '@/lib/cms';
import { MainHeader } from '@/components/layout/MainHeader';
import { MainFooter } from '@/components/layout/MainFooter';

export default async function PricingPage() {
  const [headerData, content] = await Promise.all([
    getHeaderData(),
    getPricingPageContent(),
  ]);
  const siteName = headerData.settings.siteName || 'Support Portal';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      <MainHeader siteName={siteName} />

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-slide-up">
            {content.pageTitle}
          </h1>
          <p className="text-xl text-white/60 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {content.pageSubtitle}
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="pb-20 px-6">
        <div className="max-w-lg mx-auto animate-scale-in" style={{ animationDelay: '0.15s' }}>
          <div className="bg-[#16161f] rounded-2xl border border-white/10 overflow-hidden hover:border-indigo-500/30 transition-colors">
            {/* Card Header */}
            <div className="p-8 border-b border-white/10">
              <h2 className="text-xl font-semibold mb-4">{content.planName}</h2>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-bold">${content.monthlyPrice}</span>
                <span className="text-white/60">/month</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-sm rounded">
                  + ${content.setupFee} one-time setup
                </span>
              </div>
              <p className="text-white/60 mt-3">
                First payment: ${Number(content.setupFee) + Number(content.monthlyPrice)} (${content.setupFee} setup + ${content.monthlyPrice} first month)
              </p>
            </div>

            {/* Features */}
            <div className="p-8">
              <ul className="space-y-4">
                {content.features
                  .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
                  .map((feature: { id: string; text: string; order: number }) => (
                    <li key={feature.id} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-white/80">{feature.text}</span>
                    </li>
                  ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="p-8 pt-0">
              <Link
                href={content.ctaLink}
                className="block w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-center transition !text-white"
              >
                {content.ctaText}
              </Link>
              {content.footerNote && (
                <p className="text-center text-white/40 text-sm mt-4">
                  {content.footerNote}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                How does the billing work?
              </h3>
              <p className="text-white/60">
                Your first payment is ${Number(content.setupFee) + Number(content.monthlyPrice)} (${content.setupFee} one-time setup fee + ${content.monthlyPrice} first month). After that, you&apos;ll be billed ${content.monthlyPrice}/month. You can cancel anytime and your portal will remain active until the end of your billing period.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                Can I change my subdomain later?
              </h3>
              <p className="text-white/60">
                Currently, subdomains cannot be changed after creation. Please choose your subdomain carefully during onboarding.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                Do I need a Jira account?
              </h3>
              <p className="text-white/60">
                Jira Service Desk integration is optional. You can use the knowledge base and service catalog features without Jira.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                What happens if I cancel?
              </h3>
              <p className="text-white/60">
                If you cancel, your portal remains active until the end of your current billing period. After that, your portal will become inaccessible but your data is retained for 30 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      <MainFooter siteName={siteName} />
    </div>
  );
}
