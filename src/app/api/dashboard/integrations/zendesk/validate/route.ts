/**
 * Zendesk Validation API
 *
 * POST - Test if Zendesk credentials are valid
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { validateCsrfRequest } from '@/lib/security/csrf';
import { ZendeskClient } from '@/lib/zendesk/client';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

export async function POST(request: NextRequest) {
  try {
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { valid: false, error: 'Invalid request' },
        { status: 403, headers: securityHeaders }
      );
    }

    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { valid: false, error: 'Not authenticated' },
        { status: 401, headers: securityHeaders }
      );
    }

    const body = await request.json();
    const { subdomain, email, apiToken } = body;

    if (!subdomain || typeof subdomain !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Zendesk subdomain is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Email is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!apiToken || typeof apiToken !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'API token is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    const normalizedSubdomain = subdomain
      .trim()
      .toLowerCase()
      .replace(/\.zendesk\.com$/, '')
      .replace(/^https?:\/\//, '');

    const client = new ZendeskClient({
      subdomain: normalizedSubdomain,
      email: email.trim(),
      apiToken: apiToken.trim(),
    });

    const valid = await client.testConnection();

    if (!valid) {
      return NextResponse.json(
        { valid: false, error: 'Invalid credentials or subdomain' },
        { headers: securityHeaders }
      );
    }

    return NextResponse.json(
      { valid: true },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Zendesk Validate] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500, headers: securityHeaders }
    );
  }
}
