/**
 * Stripe Connect Callback API
 *
 * GET /api/stripe/connect/callback
 *
 * Handles the OAuth callback from Stripe Connect.
 * Exchanges the authorization code for an account ID and stores it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { exchangeStripeConnectCode, getConnectedAccount } from '@/lib/stripe';
import { StripeAccountStatus } from '@/generated/prisma';
import { isAuthenticated, getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');
    const errorDescription = request.nextUrl.searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('[Stripe Connect Callback] OAuth error:', error, errorDescription);
      const returnUrl = '/dashboard/settings/payments';
      return NextResponse.redirect(
        new URL(`${returnUrl}?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/payments?error=missing_params', request.url)
      );
    }

    // SECURITY: Verify user is authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.redirect(
        new URL('/login?error=auth_required', request.url)
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(
        new URL('/login?error=session_invalid', request.url)
      );
    }

    // Decode state to get tenant ID and return URL
    let tenantId: string;
    let returnUrl: string;
    let stateSessionId: string | undefined;

    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      tenantId = stateData.tenantId;
      returnUrl = stateData.returnUrl || '/dashboard/settings/payments';
      stateSessionId = stateData.sessionId; // Optional session binding
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/settings/payments?error=invalid_state', request.url)
      );
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { owner: true },
    });

    if (!tenant) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/payments?error=tenant_not_found', request.url)
      );
    }

    // SECURITY: Verify the current user owns this tenant
    if (!tenant.owner || tenant.owner.discordId !== session.id) {
      console.error('[Stripe Connect Callback] User does not own tenant:', {
        userId: session.id,
        tenantOwnerId: tenant.owner?.discordId,
        tenantId,
      });
      return NextResponse.redirect(
        new URL('/dashboard/settings/payments?error=unauthorized', request.url)
      );
    }

    // Exchange code for account ID
    const { stripeAccountId } = await exchangeStripeConnectCode(code);

    // Get account details
    const account = await getConnectedAccount(stripeAccountId);

    if (!account) {
      return NextResponse.redirect(
        new URL(`${returnUrl}?error=account_not_found`, request.url)
      );
    }

    // Determine account status
    let accountStatus: StripeAccountStatus = StripeAccountStatus.PENDING;
    if (account.charges_enabled && account.payouts_enabled) {
      accountStatus = StripeAccountStatus.ACTIVE;
    } else if (account.charges_enabled || account.details_submitted) {
      accountStatus = StripeAccountStatus.CONNECTED;
    }

    // Store or update the Stripe config
    await prisma.tenantStripeConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        stripeAccountId,
        stripeAccountStatus: accountStatus,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
      },
      update: {
        stripeAccountId,
        stripeAccountStatus: accountStatus,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
      },
    });

    console.log('[Stripe Connect] Account connected:', {
      tenantId,
      stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`${returnUrl}?connected=true`, request.url)
    );
  } catch (error) {
    console.error('[Stripe Connect Callback] Error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings/payments?error=connection_failed', request.url)
    );
  }
}
