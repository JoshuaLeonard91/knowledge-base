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

// Price IDs for subscription and setup fee
export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID; // $5/month recurring
export const SETUP_FEE_PRICE_ID = process.env.STRIPE_SETUP_FEE_PRICE_ID; // $10 one-time

/**
 * Create a Stripe Checkout session for subscription with setup fee
 *
 * Includes:
 * - $10 one-time setup fee
 * - $5/month recurring subscription
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  discordId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail?: string | null;
  discordId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  if (!SUBSCRIPTION_PRICE_ID) {
    throw new Error('STRIPE_PRICE_ID environment variable is required');
  }

  // Build line items - subscription is required, setup fee is optional
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price: SUBSCRIPTION_PRICE_ID,
      quantity: 1,
    },
  ];

  // Add one-time setup fee if configured
  if (SETUP_FEE_PRICE_ID) {
    lineItems.unshift({
      price: SETUP_FEE_PRICE_ID,
      quantity: 1,
    });
  }

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
      discordId,
    },
    subscription_data: {
      metadata: {
        userId,
        discordId,
      },
    },
    allow_promotion_codes: true,
  });

  return session;
}

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
// STRIPE CONNECT & GENERIC CHECKOUT
// ==========================================

/**
 * Create a checkout session for a specific product (CMS-driven)
 * Supports both main Stripe account and connected accounts
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
  connectedAccountId,
  applicationFeePercent = 10,
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
  connectedAccountId?: string;
  applicationFeePercent?: number;
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

  // Base session params
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
  };

  // If using connected account, add application fee
  if (connectedAccountId) {
    sessionParams.subscription_data!.application_fee_percent = applicationFeePercent;
  }

  // Create session (on connected account if specified)
  const session = connectedAccountId
    ? await stripe.checkout.sessions.create(sessionParams, {
        stripeAccount: connectedAccountId,
      })
    : await stripe.checkout.sessions.create(sessionParams);

  return session;
}

/**
 * Create a Stripe Connect OAuth link for tenant onboarding
 */
export function getStripeConnectOAuthUrl(
  tenantId: string,
  returnUrl: string,
  sessionId?: string
): string {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) {
    throw new Error('STRIPE_CONNECT_CLIENT_ID not configured');
  }

  // Include session ID in state for extra security binding
  const stateData: { tenantId: string; returnUrl: string; sessionId?: string; ts: number } = {
    tenantId,
    returnUrl,
    ts: Date.now(), // Timestamp to prevent replay attacks
  };
  if (sessionId) {
    stateData.sessionId = sessionId;
  }

  const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'read_write',
    state,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for connected account ID
 */
export async function exchangeStripeConnectCode(code: string): Promise<{
  stripeAccountId: string;
  accessToken: string;
}> {
  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code,
  });

  if (!response.stripe_user_id) {
    throw new Error('No Stripe account ID returned');
  }

  return {
    stripeAccountId: response.stripe_user_id,
    accessToken: response.access_token || '',
  };
}

/**
 * Get connected account details
 */
export async function getConnectedAccount(
  accountId: string
): Promise<Stripe.Account | null> {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch {
    return null;
  }
}
