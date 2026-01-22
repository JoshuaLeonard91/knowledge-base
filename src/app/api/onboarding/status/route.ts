/**
 * Onboarding Status API
 *
 * GET /api/onboarding/status
 *
 * Returns the current user's onboarding completion status.
 * Requires authenticated user.
 */

import { NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import {
  getUserByDiscordId,
  hasActiveAccess,
  getSignupStep,
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

    // Get user from database
    const user = await getUserByDiscordId(session.id);

    // User not in database yet
    if (!user) {
      return NextResponse.json({
        success: true,
        onboarded: false,
        step: 'subscribe',
        steps: {
          accountCreated: false,
          subscriptionActive: false,
          tenantCreated: false,
        },
      });
    }

    const { subscription, tenants } = user;
    const hasAccess = hasActiveAccess(subscription);
    const step = getSignupStep(user);

    return NextResponse.json({
      success: true,
      onboarded: step === 'dashboard',
      step,
      steps: {
        accountCreated: true,
        subscriptionActive: hasAccess,
        tenantCreated: tenants.length > 0,
      },
      tenant: tenants[0]
        ? {
            slug: tenants[0].slug,
            name: tenants[0].name,
            status: tenants[0].status,
          }
        : null,
    });
  } catch (error) {
    console.error('[Onboarding Status] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get onboarding status' },
      { status: 500 }
    );
  }
}
