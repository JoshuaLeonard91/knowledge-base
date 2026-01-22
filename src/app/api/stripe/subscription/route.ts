/**
 * Subscription Status API
 *
 * GET /api/stripe/subscription
 *
 * Returns the current user's subscription status.
 * Requires authenticated user.
 *
 * Also syncs with Stripe if the local subscription might be stale.
 */

import { NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import {
  getUserByDiscordId,
  formatSubscriptionStatus,
  hasActiveAccess,
  getSignupStep,
  syncSubscriptionWithStripe,
} from '@/lib/subscription/helpers';

export async function GET() {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Get user with subscription from database
    let user = await getUserByDiscordId(session.id);

    // User not in database yet (hasn't completed signup)
    if (!user) {
      return NextResponse.json({
        success: true,
        subscription: null,
        hasAccess: false,
        nextStep: 'subscribe',
        status: formatSubscriptionStatus(null),
      });
    }

    // Sync with Stripe if user has a subscription (catches webhook misses)
    if (user.subscription) {
      const synced = await syncSubscriptionWithStripe(user.subscription);
      if (synced) {
        // Re-fetch user to get updated subscription data
        user = await getUserByDiscordId(session.id) || user;
      }
    }

    const { subscription, tenants } = user;
    const hasAccess = hasActiveAccess(subscription);
    const nextStep = getSignupStep(user);

    return NextResponse.json({
      success: true,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            canceledAt: subscription.canceledAt?.toISOString() || null,
          }
        : null,
      hasAccess,
      nextStep,
      status: formatSubscriptionStatus(subscription),
      tenant: tenants[0]
        ? {
            slug: tenants[0].slug,
            name: tenants[0].name,
            status: tenants[0].status,
          }
        : null,
    });
  } catch (error) {
    console.error('[Subscription API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
