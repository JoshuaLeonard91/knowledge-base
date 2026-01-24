'use client';

/**
 * Generic Pricing Page Component
 *
 * CMS-driven pricing page that works on both main domain and tenant subdomains.
 * Fetches products based on context and handles checkout initiation.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductCard } from './ProductCard';
import type { CheckoutProduct } from '@/lib/cms';

interface PricingPageProps {
  context: string;              // "main" or tenant slug
  title?: string;
  subtitle?: string;
  products: CheckoutProduct[];
  isAuthenticated?: boolean;
  currentProductSlug?: string;  // If user already has a subscription
}

export function PricingPage({
  context,
  title = 'Choose Your Plan',
  subtitle = 'Select the plan that works best for you',
  products,
  isAuthenticated = false,
  currentProductSlug,
}: PricingPageProps) {
  const router = useRouter();
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectProduct = async (product: CheckoutProduct) => {
    setError(null);
    setLoadingProduct(product.slug);

    try {
      // If not authenticated, redirect to signup with product info
      if (!isAuthenticated) {
        const params = new URLSearchParams({
          product: product.slug,
          redirect: '/checkout/success',
        });
        router.push(`/signup?${params.toString()}`);
        return;
      }

      // Create checkout session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: product.slug,
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoadingProduct(null);
    }
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

        {/* Error Message */}
        {error && (
          <div className="max-w-lg mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

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
