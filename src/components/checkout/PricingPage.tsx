'use client';

/**
 * Generic Pricing Page Component
 *
 * CMS-driven pricing page that works on both main domain and tenant subdomains.
 * Always redirects to signup page to ensure login is required before checkout.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductCard } from './ProductCard';
import type { CheckoutProduct } from '@/lib/cms';

interface PricingPageProps {
  title?: string;
  subtitle?: string;
  products: CheckoutProduct[];
  currentProductSlug?: string;  // If user already has a subscription
}

export function PricingPage({
  title = 'Choose Your Plan',
  subtitle = 'Select the plan that works best for you',
  products,
  currentProductSlug,
}: PricingPageProps) {
  const router = useRouter();
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);

  const handleSelectProduct = (product: CheckoutProduct) => {
    setLoadingProduct(product.slug);

    // Always redirect to signup page
    // This ensures login is required before checkout (unified flow)
    // The signup page handles the complete flow: login → product selection → payment
    const params = new URLSearchParams({
      product: product.slug,
    });
    router.push(`/signup?${params.toString()}`);
  };

  // Sort products by sortOrder
  const sortedProducts = [...products].sort((a, b) => a.sortOrder - b.sortOrder);

  // Filter to only active products
  const activeProducts = sortedProducts.filter((p) => p.isActive);

  if (activeProducts.length === 0) {
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
            activeProducts.length === 1
              ? 'max-w-lg mx-auto'
              : activeProducts.length === 2
              ? 'md:grid-cols-2 max-w-4xl mx-auto'
              : 'md:grid-cols-3'
          }`}
        >
          {activeProducts.map((product) => (
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
