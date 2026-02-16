/**
 * Stripe Client
 *
 * Server-side Stripe SDK initialization and utilities.
 */

import Stripe from 'stripe';

// Validate environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

// Initialize Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Price ID for the Pro subscription ($5/month recurring)
export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID;

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Resume a canceled subscription (if still in current period)
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}

/**
 * Get subscription details from Stripe
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch {
    return null;
  }
}

/**
 * Get customer details from Stripe
 */
export async function getStripeCustomer(
  customerId: string
): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    return customer as Stripe.Customer;
  } catch {
    return null;
  }
}

// ==========================================
// GENERIC CHECKOUT (CMS-driven products)
// ==========================================

/**
 * Create a checkout session for a specific product (CMS-driven)
 *
 * Used for main domain payments only. Tenants use external Payment Links.
 */
export async function createGenericCheckoutSession({
  productSlug,
  priceId,
  priceAmount,
  productName,
  userId,
  userEmail,
  context,
  successUrl,
  cancelUrl,
}: {
  productSlug: string;
  priceId?: string;
  priceAmount: number;
  productName: string;
  userId: string;
  userEmail?: string | null;
  context: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  // Build line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: productName },
            unit_amount: priceAmount,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ];

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail || undefined,
    metadata: {
      userId,
      productSlug,
      context,
    },
    subscription_data: {
      metadata: {
        userId,
        productSlug,
        context,
      },
    },
    allow_promotion_codes: true,
  });

  return session;
}
