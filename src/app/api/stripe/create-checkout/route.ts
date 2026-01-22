/**
 * Stripe Checkout Session API
 *
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout session for subscription signup.
 * Requires authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/stripe/client';
import { upsertUserFromDiscord, getUserByDiscordId } from '@/lib/subscription/helpers';
import { validateCsrfRequest, csrfErrorResponse } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Validate CSRF token
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return csrfErrorResponse();
    }

    // Get user session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Upsert user in database (create if not exists)
    const user = await upsertUserFromDiscord({
      discordId: session.id,
      discordUsername: session.username,
      discordAvatar: session.avatar,
    });

    // Check if user already has an active subscription
    const existingUser = await getUserByDiscordId(session.id);
    if (existingUser?.subscription) {
      const { status } = existingUser.subscription;
      if (status === 'ACTIVE' || status === 'PAST_DUE' || status === 'CANCELED') {
        return NextResponse.json(
          { success: false, error: 'You already have an active subscription', code: 'ALREADY_SUBSCRIBED' },
          { status: 400 }
        );
      }
    }

    // Get base URL - use request host for local dev, env var for production
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev
      ? `${request.nextUrl.protocol}//${request.nextUrl.host}`
      : (process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`);

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      discordId: session.id,
      successUrl: `${baseUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
