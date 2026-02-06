'use client';

/**
 * Generic Pricing Page Component
 *
 * CMS-driven pricing page that works on both main domain and tenant subdomains.
 * Uses ServiceTier from CMS for pricing data.
 *
 * Behavior:
 * - Main domain (isMainDomain=true): Always uses internal /signup flow (Stripe API checkout)
 * - Tenant subdomains: Uses buttonUrl from CMS (Stripe Payment Links)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductCard } from './ProductCard';
import type { ServiceTier } from '@/lib/cms';

interface PricingPageProps {
  title?: string;
  subtitle?: string;
  products: ServiceTier[];
  currentProductSlug?: string;  // If user already has a subscription
  isMainDomain?: boolean;       // If true, always use internal checkout flow
}

export function PricingPage({
  title = 'Choose Your Plan',
  subtitle = 'Select the plan that works best for you',
  products,
  currentProductSlug,
  isMainDomain = false,
}: PricingPageProps) {
  const router = useRouter();
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);

  const handleSelectProduct = (product: ServiceTier) => {
    setLoadingProduct(product.slug);

    // Main domain: Always use internal signup flow (Discord OAuth → Onboarding → Stripe API)
    // Tenants: Use buttonUrl from CMS (Stripe Payment Links)
    if (isMainDomain) {
      router.push(`/signup?product=${product.slug}`);
      return;
    }

    // Tenant: Use buttonUrl from CMS if set
    const targetUrl = product.buttonUrl;

    if (targetUrl) {
      // Only allow HTTPS URLs or relative paths
      if (targetUrl.startsWith('https://')) {
        window.location.href = targetUrl;
      } else if (targetUrl.startsWith('/')) {
        router.push(targetUrl);
      }
      // Ignore HTTP and other protocols
    } else {
      // No buttonUrl configured - redirect to contact page
      router.push('/support/contact');
    }
  };

  // Sort products by order
  const sortedProducts = [...products].sort((a, b) => a.order - b.order);

  if (sortedProducts.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">No Plans Available</h2>
          <p className="text-white/60">Check back later for available plans.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{title}</h1>
          {subtitle && <p className="text-xl text-white/60 max-w-2xl mx-auto">{subtitle}</p>}
        </div>

        {/* Products Grid */}
        <div
          className={`grid gap-8 ${
            sortedProducts.length === 1
              ? 'max-w-lg mx-auto'
              : sortedProducts.length === 2
              ? 'md:grid-cols-2 max-w-4xl mx-auto'
              : 'md:grid-cols-3'
          }`}
        >
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={handleSelectProduct}
              isLoading={loadingProduct === product.slug}
              isCurrent={currentProductSlug === product.slug}
            />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-white/40 text-sm mt-12">
          Secure payment powered by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
