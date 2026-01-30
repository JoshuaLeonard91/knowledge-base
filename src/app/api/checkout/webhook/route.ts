/**
 * Generic Checkout Webhook
 *
 * POST /api/checkout/webhook
 *
 * Handles Stripe webhooks for generic checkout (TenantSubscriptions).
 * Works for both main Stripe account and connected accounts.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db/client';
import { SubscriptionStatus } from '@/generated/prisma';

// Disable body parsing for webhook verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  // Use the appropriate webhook secret
  // For connected accounts, use STRIPE_CONNECT_WEBHOOK_SECRET
  // For direct charges, use STRIPE_CHECKOUT_WEBHOOK_SECRET
  const webhookSecret =
    process.env.STRIPE_CHECKOUT_WEBHOOK_SECRET ||
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook] No webhook secret configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const productSlug = session.metadata?.productSlug;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!userId || !subscriptionId || !customerId) {
    console.error('[Webhook] Missing required data in checkout session');
    return;
  }

  // Update TenantUser with Stripe customer ID
  await prisma.tenantUser.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subData = subscription as unknown as Record<string, unknown>;
  const periodStart = subData.current_period_start as number | undefined;
  const periodEnd = subData.current_period_end as number | undefined;

  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Create TenantSubscription
  await prisma.tenantSubscription.upsert({
    where: { tenantUserId: userId },
    create: {
      tenantUserId: userId,
      productSlug: productSlug || 'unknown',
      stripeSubscriptionId: subscriptionId,
      stripePriceId: subscription.items.data[0]?.price.id || '',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : now,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : oneMonthFromNow,
    },
    update: {
      productSlug: productSlug || 'unknown',
      stripeSubscriptionId: subscriptionId,
      stripePriceId: subscription.items.data[0]?.price.id || '',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : now,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : oneMonthFromNow,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
  });

  console.log('[Webhook] TenantSubscription created');
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId =
    typeof invoiceData.subscription === 'string'
      ? invoiceData.subscription
      : invoiceData.subscription?.id;

  if (!subscriptionId) return;

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) {
    console.error('[Webhook] TenantSubscription not found for invoice.paid:', subscriptionId);
    return;
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subData = stripeSubscription as unknown as Record<string, unknown>;
  const periodStart = subData.current_period_start as number | undefined;
  const periodEnd = subData.current_period_end as number | undefined;

  const updateData: Record<string, unknown> = { status: SubscriptionStatus.ACTIVE };
  if (periodStart) updateData.currentPeriodStart = new Date(periodStart * 1000);
  if (periodEnd) updateData.currentPeriodEnd = new Date(periodEnd * 1000);

  await prisma.tenantSubscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: updateData,
  });

  console.log('[Webhook] TenantSubscription marked ACTIVE:', subscriptionId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId =
    typeof invoiceData.subscription === 'string'
      ? invoiceData.subscription
      : invoiceData.subscription?.id;

  if (!subscriptionId) return;

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!subscription) return;

  await prisma.tenantSubscription.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: SubscriptionStatus.PAST_DUE },
  });

  console.log('[Webhook] TenantSubscription marked PAST_DUE:', subscriptionId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existingSubscription = await prisma.tenantSubscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existingSubscription) return;

  const subData = subscription as unknown as Record<string, unknown>;
  const periodStart = subData.current_period_start as number | undefined;
  const periodEnd = subData.current_period_end as number | undefined;
  const cancelAt = subData.cancel_at as number | null | undefined;

  const isScheduledToCancel = subscription.cancel_at_period_end || !!cancelAt;

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
      status = existingSubscription.status;
  }

  const updateData: Record<string, unknown> = {
    status,
    stripePriceId: subscription.items.data[0]?.price.id || existingSubscription.stripePriceId,
    cancelAtPeriodEnd: isScheduledToCancel,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : cancelAt
        ? new Date()
        : null,
  };
  if (periodStart) updateData.currentPeriodStart = new Date(periodStart * 1000);
  if (periodEnd) updateData.currentPeriodEnd = new Date(periodEnd * 1000);

  await prisma.tenantSubscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: updateData,
  });

  console.log('[Webhook] TenantSubscription updated:', subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const existingSubscription = await prisma.tenantSubscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existingSubscription) return;

  await prisma.tenantSubscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: SubscriptionStatus.EXPIRED,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : new Date(),
    },
  });

  console.log('[Webhook] TenantSubscription marked EXPIRED:', subscription.id);
}
