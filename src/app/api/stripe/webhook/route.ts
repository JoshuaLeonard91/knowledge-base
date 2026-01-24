/**
 * Stripe Webhook Handler
 *
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for both platform and Connect accounts.
 * Supports unified payment flow for main domain and tenant subdomains.
 *
 * IMPORTANT: If you get signature verification errors:
 * 1. Go to Stripe Dashboard → Developers → Webhooks
 * 2. Click on your webhook endpoint
 * 3. Click "Reveal" on the Signing secret
 * 4. Copy that value to STRIPE_WEBHOOK_SECRET in your environment
 *
 * For Connect events, also configure STRIPE_CONNECT_WEBHOOK_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleAccountUpdated,
} from '@/lib/stripe/webhooks';
import Stripe from 'stripe';

// Route segment config - ensure raw body is preserved
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  // Get raw body
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('[Stripe Webhook] Signature verification failed:', message);
    // Don't log sensitive data like signature or secret prefixes
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Extract connected account ID if this is a Connect event
  // The 'account' field is present when the event is from a connected account
  const connectedAccountId = (event as unknown as { account?: string }).account;

  if (connectedAccountId) {
    console.log('[Stripe Webhook] Connect event from account:', connectedAccountId);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, connectedAccountId);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, connectedAccountId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // Connect-specific events
      case 'account.updated': {
        // Handle connected account status changes
        const account = event.data.object as Stripe.Account;
        console.log('[Stripe Webhook] Account updated:', account.id, 'charges_enabled:', account.charges_enabled);
        await handleAccountUpdated({
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        });
        break;
      }

      // These events are handled elsewhere or don't need action
      case 'customer.subscription.created':
        // Handled via checkout.session.completed
        break;

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
