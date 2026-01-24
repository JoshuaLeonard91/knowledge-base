'use client';

/**
 * Product Card Component
 *
 * Displays a single product/plan with pricing and features.
 * Used in the generic PricingPage component.
 */

import type { CheckoutProduct } from '@/lib/cms';

interface ProductCardProps {
  product: CheckoutProduct;
  onSelect: (product: CheckoutProduct) => void;
  isLoading?: boolean;
  isCurrent?: boolean;
}

export function ProductCard({ product, onSelect, isLoading, isCurrent }: ProductCardProps) {
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const formatInterval = (interval: string) => {
    switch (interval) {
      case 'MONTHLY':
        return '/month';
      case 'YEARLY':
        return '/year';
      case 'ONE_TIME':
        return ' one-time';
      default:
        return '';
    }
  };

  return (
    <div
      className={`relative bg-[#16161f] rounded-2xl border overflow-hidden transition-all duration-300 ${
        product.isFeatured
          ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Badge */}
      {product.badge && (
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-full">
            {product.badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="p-8 border-b border-white/10">
        <h3 className="text-xl font-semibold text-white mb-2">{product.name}</h3>
        {product.description && (
          <p className="text-white/60 text-sm mb-4">{product.description}</p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">
            {formatPrice(product.priceAmount, product.priceCurrency)}
          </span>
          <span className="text-white/60">{formatInterval(product.priceInterval)}</span>
        </div>
      </div>

      {/* Features */}
      <div className="p-8">
        <ul className="space-y-3 mb-8">
          {product.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
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
              <span className="text-white/80 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={() => onSelect(product)}
          disabled={isLoading || isCurrent}
          className={`w-full py-3 rounded-xl font-semibold transition-all ${
            isCurrent
              ? 'bg-green-500/20 text-green-400 cursor-default'
              : product.isFeatured
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : isCurrent ? (
            'Current Plan'
          ) : (
            'Get Started'
          )}
        </button>
      </div>
    </div>
  );
}
