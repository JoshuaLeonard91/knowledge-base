/**
 * Stripe Webhook Handlers
 *
 * Process Stripe webhook events to sync subscription state.
 * Only handles main domain subscriptions (User/Subscription models).
 * Tenant subdomains use external Payment Links and manage their own Stripe.
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db/client';
import { SubscriptionStatus } from '@/generated/prisma';
import { stripe } from './client';

/**
 * Handle checkout.session.completed event
 *
 * Creates or updates the subscription record when a checkout completes.
 * Only handles main domain checkouts - tenants use external Payment Links.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  const context = session.metadata?.context || 'main';
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

  // Only handle main domain checkouts
  if (context !== 'main') {
    console.log('[Stripe Webhook] Ignoring non-main context checkout:', context);
    return;
  }

  await handleMainDomainCheckout(userId, subscriptionId, customerId);
}

/**
 * Handle main domain checkout - updates User and Subscription models
 */
async function handleMainDomainCheckout(
  tenantUserId: string,
  subscriptionId: string,
  customerId: string
): Promise<void> {
  // For main domain, the checkout creates a TenantUser with null tenantId
  // We need to find the corresponding User record via discordId
  const tenantUser = await prisma.tenantUser.findUnique({
    where: { id: tenantUserId },
  });

  if (!tenantUser) {
    console.error('[Stripe Webhook] TenantUser not found:', tenantUserId);
    return;
  }

  // Find or create the User record
  let user = await prisma.user.findUnique({
    where: { discordId: tenantUser.discordId },
  });

  if (!user) {
    // Create User if doesn't exist
    user = await prisma.user.create({
      data: {
        discordId: tenantUser.discordId,
        discordUsername: tenantUser.discordUsername,
        discordAvatar: tenantUser.discordAvatar,
        stripeCustomerId: customerId,
      },
    });
  } else {
    // Update user with Stripe customer ID
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

  // Extract period dates
  const subData = subscription as unknown as Record<string, unknown>;
  const periodStart = subData.current_period_start as number | undefined;
  const periodEnd = subData.current_period_end as number | undefined;

  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const currentPeriodStart = periodStart ? new Date(periodStart * 1000) : now;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : oneMonthFromNow;

  // Create/update subscription record
  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
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

  console.log('[Stripe Webhook] Main domain subscription created/updated for user:', user.id);
}

/**
 * Handle invoice.paid event
 *
 * Updates subscription status to ACTIVE and updates period dates.
 * Only handles main domain subscriptions - tenants manage their own Stripe.
 */
export async function handleInvoicePaid(
  invoice: Stripe.Invoice
): Promise<void> {
  // Get subscription ID from invoice
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  // Find in main Subscription model
  const mainSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!mainSubscription) {
    console.log('[Stripe Webhook] Subscription not found for invoice.paid:', subscriptionId);
    return;
  }

  // Get updated subscription from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

  const subData = stripeSubscription as unknown as Record<string, unknown>;
  const periodStart = subData.current_period_start as number | undefined;
  const periodEnd = subData.current_period_end as number | undefined;

  const updateData: Record<string, unknown> = {
    status: SubscriptionStatus.ACTIVE,
  };
  if (periodStart) updateData.currentPeriodStart = new Date(periodStart * 1000);
  if (periodEnd) updateData.currentPeriodEnd = new Date(periodEnd * 1000);

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: updateData,
  });

  console.log('[Stripe Webhook] Main subscription marked ACTIVE:', subscriptionId);
}

/**
 * Handle invoice.payment_failed event
 *
 * Updates subscription status to PAST_DUE.
 * Only handles main domain subscriptions.
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  // Find in main Subscription
  const mainSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!mainSubscription) {
    console.log('[Stripe Webhook] Subscription not found for payment_failed:', subscriptionId);
    return;
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: SubscriptionStatus.PAST_DUE },
  });
  console.log('[Stripe Webhook] Main subscription marked PAST_DUE:', subscriptionId);
}

/**
 * Handle customer.subscription.updated event
 *
 * Updates subscription details including cancel_at_period_end.
 * Only handles main domain subscriptions.
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  // Extract common data
  const subData = subscription as unknown as Record<string, unknown>;
  const periodStart = subData.current_period_start as number | undefined;
  const periodEnd = subData.current_period_end as number | undefined;
  const cancelAt = subData.cancel_at as number | null | undefined;
  const isScheduledToCancel = subscription.cancel_at_period_end || !!cancelAt;

  // Find in main Subscription
  const mainSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!mainSubscription) {
    console.log('[Stripe Webhook] Subscription not found for update:', subscription.id);
    return;
  }

  let status: SubscriptionStatus;
  switch (subscription.status) {
    case 'active':
      status = isScheduledToCancel ? SubscriptionStatus.CANCELED : SubscriptionStatus.ACTIVE;
      break;
    case 'past_due':
      status = SubscriptionStatus.PAST_DUE;
      break;
    case 'canceled':
    case 'unpaid':
      status = SubscriptionStatus.EXPIRED;
      break;
    default:
      status = mainSubscription.status;
  }

  const updateData: Record<string, unknown> = {
    status,
    stripePriceId: subscription.items.data[0]?.price.id || mainSubscription.stripePriceId,
    cancelAtPeriodEnd: isScheduledToCancel,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : cancelAt ? new Date() : null,
  };
  if (periodStart) updateData.currentPeriodStart = new Date(periodStart * 1000);
  if (periodEnd) updateData.currentPeriodEnd = new Date(periodEnd * 1000);

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: updateData,
  });

  console.log('[Stripe Webhook] Main subscription updated:', subscription.id, 'Status:', status);
}

/**
 * Handle customer.subscription.deleted event
 *
 * Updates subscription status to EXPIRED.
 * Only handles main domain subscriptions.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000)
    : new Date();

  // Find in main Subscription
  const mainSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!mainSubscription) {
    console.log('[Stripe Webhook] Subscription not found for deletion:', subscription.id);
    return;
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: SubscriptionStatus.EXPIRED,
      canceledAt,
    },
  });
  console.log('[Stripe Webhook] Main subscription marked EXPIRED:', subscription.id);
}
