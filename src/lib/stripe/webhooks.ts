/**
 * Stripe Webhook Handlers
 *
 * Process Stripe webhook events to sync subscription state.
 * Supports both main domain (User/Subscription) and tenant (TenantUser/TenantSubscription) flows.
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db/client';
import { SubscriptionStatus } from '@/generated/prisma';
import { stripe } from './client';

/**
 * Handle checkout.session.completed event
 *
 * Creates or updates the subscription record when a checkout completes.
 * Routes to appropriate handler based on context (main domain vs tenant).
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  connectedAccountId?: string
): Promise<void> {
  const userId = session.metadata?.userId;
  const context = session.metadata?.context || 'main';
  const productSlug = session.metadata?.productSlug;
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

  // Route based on context
  if (context === 'main') {
    await handleMainDomainCheckout(userId, subscriptionId, customerId, connectedAccountId);
  } else {
    await handleTenantCheckout(userId, subscriptionId, customerId, context, productSlug || 'default', connectedAccountId);
  }
}

/**
 * Handle main domain checkout - updates User and Subscription models
 */
async function handleMainDomainCheckout(
  tenantUserId: string,
  subscriptionId: string,
  customerId: string,
  connectedAccountId?: string
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
  // If using Connect, need to fetch from connected account
  const subscription = connectedAccountId
    ? await stripe.subscriptions.retrieve(subscriptionId, { stripeAccount: connectedAccountId }) as Stripe.Subscription
    : await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

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
 * Handle tenant checkout - updates TenantUser and TenantSubscription models
 */
async function handleTenantCheckout(
  tenantUserId: string,
  subscriptionId: string,
  customerId: string,
  tenantSlug: string,
  productSlug: string,
  connectedAccountId?: string
): Promise<void> {
  // Verify tenant user exists
  const tenantUser = await prisma.tenantUser.findUnique({
    where: { id: tenantUserId },
  });

  if (!tenantUser) {
    console.error('[Stripe Webhook] TenantUser not found:', tenantUserId);
    return;
  }

  // Update tenant user with Stripe customer ID
  await prisma.tenantUser.update({
    where: { id: tenantUserId },
    data: { stripeCustomerId: customerId },
  });

  // Get subscription details from connected account
  const subscription = connectedAccountId
    ? await stripe.subscriptions.retrieve(subscriptionId, { stripeAccount: connectedAccountId }) as Stripe.Subscription
    : await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

  // Extract period dates
  const subData = subscription as unknown as Record<string, unknown>;
  const periodStart = subData.current_period_start as number | undefined;
  const periodEnd = subData.current_period_end as number | undefined;

  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const currentPeriodStart = periodStart ? new Date(periodStart * 1000) : now;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : oneMonthFromNow;

  // Create/update tenant subscription record
  await prisma.tenantSubscription.upsert({
    where: { tenantUserId },
    create: {
      tenantUserId,
      productSlug,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: subscription.items.data[0]?.price.id || '',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      productSlug,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: subscription.items.data[0]?.price.id || '',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: null,
    },
  });

  console.log('[Stripe Webhook] Tenant subscription created/updated for user:', tenantUserId, 'tenant:', tenantSlug);
}

/**
 * Handle invoice.paid event
 *
 * Updates subscription status to ACTIVE and updates period dates.
 * Checks both Subscription and TenantSubscription models.
 */
export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  connectedAccountId?: string
): Promise<void> {
  // Get subscription ID from invoice
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  // Try to find in main Subscription model first
  const mainSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (mainSubscription) {
    // Get updated subscription from Stripe
    const stripeSubscription = connectedAccountId
      ? await stripe.subscriptions.retrieve(subscriptionId, { stripeAccount: connectedAccountId }) as Stripe.Subscription
      : await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

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
    return;
  }

  // Try TenantSubscription model
  const tenantSubscription = await prisma.tenantSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (tenantSubscription) {
    const stripeSubscription = connectedAccountId
      ? await stripe.subscriptions.retrieve(subscriptionId, { stripeAccount: connectedAccountId }) as Stripe.Subscription
      : await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

    const subData = stripeSubscription as unknown as Record<string, unknown>;
    const periodStart = subData.current_period_start as number | undefined;
    const periodEnd = subData.current_period_end as number | undefined;

    const updateData: Record<string, unknown> = {
      status: SubscriptionStatus.ACTIVE,
    };
    if (periodStart) updateData.currentPeriodStart = new Date(periodStart * 1000);
    if (periodEnd) updateData.currentPeriodEnd = new Date(periodEnd * 1000);

    await prisma.tenantSubscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: updateData,
    });

    console.log('[Stripe Webhook] Tenant subscription marked ACTIVE:', subscriptionId);
    return;
  }

  console.error('[Stripe Webhook] Subscription not found for invoice.paid:', subscriptionId);
}

/**
 * Handle invoice.payment_failed event
 *
 * Updates subscription status to PAST_DUE.
 * Checks both Subscription and TenantSubscription models.
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

  // Try main Subscription first
  const mainSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (mainSubscription) {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
    console.log('[Stripe Webhook] Main subscription marked PAST_DUE:', subscriptionId);
    return;
  }

  // Try TenantSubscription
  const tenantSubscription = await prisma.tenantSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (tenantSubscription) {
    await prisma.tenantSubscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
    console.log('[Stripe Webhook] Tenant subscription marked PAST_DUE:', subscriptionId);
    return;
  }

  console.error('[Stripe Webhook] Subscription not found for payment_failed:', subscriptionId);
}

/**
 * Handle customer.subscription.updated event
 *
 * Updates subscription details including cancel_at_period_end.
 * Checks both Subscription and TenantSubscription models.
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

  // Try main Subscription first
  const mainSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (mainSubscription) {
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
    return;
  }

  // Try TenantSubscription
  const tenantSubscription = await prisma.tenantSubscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (tenantSubscription) {
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
        status = tenantSubscription.status;
    }

    const updateData: Record<string, unknown> = {
      status,
      stripePriceId: subscription.items.data[0]?.price.id || tenantSubscription.stripePriceId,
      cancelAtPeriodEnd: isScheduledToCancel,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : cancelAt ? new Date() : null,
    };
    if (periodStart) updateData.currentPeriodStart = new Date(periodStart * 1000);
    if (periodEnd) updateData.currentPeriodEnd = new Date(periodEnd * 1000);

    await prisma.tenantSubscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: updateData,
    });

    console.log('[Stripe Webhook] Tenant subscription updated:', subscription.id, 'Status:', status);
    return;
  }

  console.error('[Stripe Webhook] Subscription not found for update:', subscription.id);
}

/**
 * Handle customer.subscription.deleted event
 *
 * Updates subscription status to EXPIRED.
 * Checks both Subscription and TenantSubscription models.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000)
    : new Date();

  // Try main Subscription first
  const mainSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (mainSubscription) {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: SubscriptionStatus.EXPIRED,
        canceledAt,
      },
    });
    console.log('[Stripe Webhook] Main subscription marked EXPIRED:', subscription.id);
    return;
  }

  // Try TenantSubscription
  const tenantSubscription = await prisma.tenantSubscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (tenantSubscription) {
    await prisma.tenantSubscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: SubscriptionStatus.EXPIRED,
        canceledAt,
      },
    });
    console.log('[Stripe Webhook] Tenant subscription marked EXPIRED:', subscription.id);
    return;
  }

  console.error('[Stripe Webhook] Subscription not found for deletion:', subscription.id);
}

/**
 * Handle account.updated event (Stripe Connect)
 *
 * Updates TenantStripeConfig when a connected account's capabilities change.
 * This is triggered when:
 * - Account completes onboarding
 * - Charges or payouts become enabled/disabled
 * - Account status changes
 */
export async function handleAccountUpdated(account: {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}): Promise<void> {
  // Find the TenantStripeConfig with this account ID
  const stripeConfig = await prisma.tenantStripeConfig.findUnique({
    where: { stripeAccountId: account.id },
  });

  if (!stripeConfig) {
    console.log('[Stripe Webhook] No tenant config for account:', account.id);
    return;
  }

  // Determine new status
  type AccountStatus = 'PENDING' | 'CONNECTED' | 'ACTIVE' | 'RESTRICTED';
  let newStatus: AccountStatus = 'PENDING';
  if (account.charges_enabled && account.payouts_enabled) {
    newStatus = 'ACTIVE';
  } else if (account.charges_enabled || account.details_submitted) {
    newStatus = 'CONNECTED';
  }

  // Update if changed
  const chargesEnabled = account.charges_enabled || false;
  const payoutsEnabled = account.payouts_enabled || false;

  if (
    newStatus !== stripeConfig.stripeAccountStatus ||
    chargesEnabled !== stripeConfig.chargesEnabled ||
    payoutsEnabled !== stripeConfig.payoutsEnabled
  ) {
    await prisma.tenantStripeConfig.update({
      where: { stripeAccountId: account.id },
      data: {
        stripeAccountStatus: newStatus,
        chargesEnabled,
        payoutsEnabled,
      },
    });

    console.log('[Stripe Webhook] Account status updated:', {
      accountId: account.id,
      status: newStatus,
      chargesEnabled,
      payoutsEnabled,
    });
  }
}
