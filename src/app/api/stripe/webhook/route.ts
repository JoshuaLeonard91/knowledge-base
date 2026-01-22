/**
 * Stripe Webhook Handler
 *
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events to sync subscription state.
 * Verifies webhook signature for security.
 *
 * IMPORTANT: If you get signature verification errors:
 * 1. Go to Stripe Dashboard → Developers → Webhooks
 * 2. Click on your webhook endpoint
 * 3. Click "Reveal" on the Signing secret
 * 4. Copy that value to STRIPE_WEBHOOK_SECRET in your environment
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
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
    console.error('[Stripe Webhook] Debug info:', {
      signatureHeader: signature.substring(0, 50) + '...',
      bodyLength: body.length,
      secretConfigured: !!WEBHOOK_SECRET,
      secretPrefix: WEBHOOK_SECRET?.substring(0, 10) + '...',
    });
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
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
