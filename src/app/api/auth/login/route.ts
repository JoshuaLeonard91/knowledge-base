import { NextRequest, NextResponse } from 'next/server';
import { createSession, getAuthMode } from '@/lib/auth';
import { delay } from '@/lib/utils';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/security/sanitize';
import {
  logAuthAttempt,
  getClientIp,
  getUserAgent,
} from '@/lib/security/logger';

/**
 * GET - Check auth mode (Discord OAuth vs Mock)
 * Returns redirect URL for Discord OAuth or indicates mock mode
 */
export async function GET() {
  const authMode = getAuthMode();

  if (authMode === 'discord') {
    // Return Discord OAuth route URL
    return NextResponse.json({
      mode: 'discord',
      redirectUrl: '/api/auth/discord?callbackUrl=/support',
    });
  }

  // Mock mode - no redirect needed
  return NextResponse.json({
    mode: 'mock',
  });
}

/**
 * POST - Perform login
 * For Discord OAuth: redirects to Discord
 * For Mock mode: creates mock session
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const userAgent = getUserAgent(request.headers);
  const authMode = getAuthMode();

  // For Discord OAuth, redirect to NextAuth signin
  if (authMode === 'discord') {
    logAuthAttempt({
      success: true,
      ip,
      userAgent,
      method: 'discord',
      details: { action: 'redirect' },
    });

    // Return redirect URL for client to navigate to
    return NextResponse.json({
      mode: 'discord',
      redirectUrl: '/api/auth/discord?callbackUrl=/support',
    });
  }

  // Mock mode - create session directly
  try {
    // Simulate OAuth delay (prevents timing attacks)
    await delay(800);

    // Create mock session (returns SafeUser - no internal IDs)
    const user = await createSession();

    // Log successful auth
    logAuthAttempt({
      success: true,
      ip,
      userAgent,
      method: 'mock',
      details: { username: user.displayName },
    });

    // Return sanitized response (no internal IDs exposed)
    return createSuccessResponse({ user, mode: 'mock' });
  } catch {
    // Log failed auth
    logAuthAttempt({
      success: false,
      ip,
      userAgent,
      method: 'mock',
      details: { error: 'Authentication failed' },
    });

    // Return generic error (no details exposed)
    return createErrorResponse('authentication', 401);
  }
}
