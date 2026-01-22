/**
 * Stripe Webhook Handlers
 *
 * Process Stripe webhook events to sync subscription state.
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db/client';
import { SubscriptionStatus } from '@/generated/prisma';
import { stripe } from './client';

/**
 * Handle checkout.session.completed event
 *
 * Creates or updates the subscription record when a checkout completes.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!userId || !subscriptionId || !customerId) {
    console.error('[Stripe Webhook] Missing required data in checkout session:', {
      userId: !!userId,
      subscriptionId: !!subscriptionId,
      customerId: !!customerId,
    });
    return;
  }

  // Update user with Stripe customer ID
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

  // Extract period dates - handle different Stripe API versions
  const subData = subscription as unknown as Record<string, unknown>;
  const periodStart = subData.current_period_start as number | undefined;
  const periodEnd = subData.current_period_end as number | undefined;

  // Use current time as fallback if period dates are missing
  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const currentPeriodStart = periodStart ? new Date(periodStart * 1000) : now;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : oneMonthFromNow;

  // Create subscription record
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: subscription.items.data[0]?.price.id || '',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: subscription.items.data[0]?.price.id || '',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: null,
    },
  });

  console.log('[Stripe Webhook] Subscription created/updated for user:', userId);
}

/**
 * Handle invoice.paid event
 *
 * Updates subscription status to ACTIVE and updates period dates.
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // Get subscription ID from invoice - use type assertion for newer Stripe API
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) {
    console.error('[Stripe Webhook] Subscription not found for invoice.paid:', subscriptionId);
    return;
  }

  // Get updated subscription from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
  const subData = stripeSubscription as unknown as Record<string, unknown>;
  const periodStart = subData.current_period_start as number | undefined;
  const periodEnd = subData.current_period_end as number | undefined;

  // Build update data with optional period fields
  const updateData: Record<string, unknown> = {
    status: SubscriptionStatus.ACTIVE,
  };
  if (periodStart) updateData.currentPeriodStart = new Date(periodStart * 1000);
  if (periodEnd) updateData.currentPeriodEnd = new Date(periodEnd * 1000);

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: updateData,
  });

  console.log('[Stripe Webhook] Subscription marked ACTIVE:', subscriptionId);
}

/**
 * Handle invoice.payment_failed event
 *
 * Updates subscription status to PAST_DUE.
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  // Get subscription ID from invoice - use type assertion for newer Stripe API
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) {
    console.error('[Stripe Webhook] Subscription not found for payment_failed:', subscriptionId);
    return;
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: SubscriptionStatus.PAST_DUE,
    },
  });

  console.log('[Stripe Webhook] Subscription marked PAST_DUE:', subscriptionId);
}

/**
 * Handle customer.subscription.updated event
 *
 * Updates subscription details including cancel_at_period_end.
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existingSubscription) {
    console.error('[Stripe Webhook] Subscription not found for update:', subscription.id);
    return;
  }

  // Extract period timestamps with type assertion
  const subData = subscription as unknown as Record<string, unknown>;
  const periodStart = subData.current_period_start as number | undefined;
  const periodEnd = subData.current_period_end as number | undefined;

  // Determine status based on Stripe subscription status
  let status: SubscriptionStatus;
  switch (subscription.status) {
    case 'active':
      status = subscription.cancel_at_period_end
        ? SubscriptionStatus.CANCELED
        : SubscriptionStatus.ACTIVE;
      break;
    case 'past_due':
      status = SubscriptionStatus.PAST_DUE;
      break;
    case 'canceled':
    case 'unpaid':
      status = SubscriptionStatus.EXPIRED;
      break;
    default:
      status = existingSubscription.status;
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    status,
    stripePriceId: subscription.items.data[0]?.price.id || existingSubscription.stripePriceId,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : null,
  };
  if (periodStart) updateData.currentPeriodStart = new Date(periodStart * 1000);
  if (periodEnd) updateData.currentPeriodEnd = new Date(periodEnd * 1000);

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: updateData,
  });

  console.log('[Stripe Webhook] Subscription updated:', subscription.id, 'Status:', status);
}

/**
 * Handle customer.subscription.deleted event
 *
 * Updates subscription status to EXPIRED.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existingSubscription) {
    console.error('[Stripe Webhook] Subscription not found for deletion:', subscription.id);
    return;
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: SubscriptionStatus.EXPIRED,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : new Date(),
    },
  });

  console.log('[Stripe Webhook] Subscription marked EXPIRED:', subscription.id);
}
