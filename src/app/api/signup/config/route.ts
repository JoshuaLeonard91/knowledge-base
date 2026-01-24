/**
 * Signup Config API
 *
 * GET /api/signup/config?context=main
 *
 * Returns signup configuration for the given context from CMS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSignupConfig } from '@/lib/cms';

// Validate context parameter (alphanumeric + hyphen only, max 64 chars)
function isValidContext(context: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(context);
}

// Security headers for API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'public, max-age=300', // Cache for 5 minutes (public config)
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const context = searchParams.get('context') || 'main';

    // Validate context parameter
    if (!isValidContext(context)) {
      return NextResponse.json(
        { error: 'Invalid context parameter' },
        { status: 400, headers: securityHeaders }
      );
    }

    const config = await getSignupConfig(context);

    return NextResponse.json(
      { config },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Signup Config] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get signup config' },
      { status: 500, headers: securityHeaders }
    );
  }
}
