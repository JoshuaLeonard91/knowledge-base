import { NextRequest, NextResponse } from 'next/server';
import { createSession, getAuthMode } from '@/lib/auth';
import { delay } from '@/lib/utils';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/security/sanitize';
import { validateCsrfRequest } from '@/lib/security/csrf';
import {
  logAuthAttempt,
  getClientIp,
  getUserAgent,
} from '@/lib/security/logger';
import { getConfiguredProviders } from '@/lib/oauth/providers';

/**
 * GET - Check auth mode (OAuth vs Mock)
 * Returns available providers for OAuth or indicates mock mode
 */
export async function GET() {
  const authMode = getAuthMode();

  if (authMode === 'oauth') {
    const providers = getConfiguredProviders();
    return NextResponse.json({
      mode: 'oauth',
      providers,
      // Default redirect URL for backward compat (single-provider clients)
      redirectUrl: `/api/auth/${providers[0] || 'discord'}?callbackUrl=/support`,
    });
  }

  // Mock mode - no redirect needed
  return NextResponse.json({
    mode: 'mock',
  });
}

/**
 * POST - Perform login
 * For OAuth: client-side redirects to provider
 * For Mock mode: creates mock session
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const userAgent = getUserAgent(request.headers);
  const authMode = getAuthMode();

  // For OAuth, redirect to provider
  if (authMode === 'oauth') {
    logAuthAttempt({
      success: true,
      ip,
      userAgent,
      method: 'oauth',
      details: { action: 'redirect' },
    });

    return NextResponse.json({
      mode: 'oauth',
      redirectUrl: '/api/auth/discord?callbackUrl=/support',
    });
  }

  // Mock mode — validate CSRF before creating session
  const csrfResult = await validateCsrfRequest(request);
  if (!csrfResult.valid) {
    return createErrorResponse('authentication', 403);
  }

  // Mock mode - create session directly
  try {
    await delay(800);
    const user = await createSession();

    logAuthAttempt({
      success: true,
      ip,
      userAgent,
      method: 'mock',
      details: { username: user.displayName },
    });

    return createSuccessResponse({ user, mode: 'mock' });
  } catch {
    logAuthAttempt({
      success: false,
      ip,
      userAgent,
      method: 'mock',
      details: { error: 'Authentication failed' },
    });

    return createErrorResponse('authentication', 401);
  }
}
