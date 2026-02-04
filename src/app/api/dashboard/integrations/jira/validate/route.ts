/**
 * Jira Validation API
 *
 * POST - Test if Jira credentials are valid
 *
 * Makes a simple API call to verify:
 * 1. URL is reachable
 * 2. Credentials are valid
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { validateCsrfRequest } from '@/lib/security/csrf';

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

/**
 * POST - Validate Jira credentials
 */
export async function POST(request: NextRequest) {
  try {
    // Validate CSRF
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { valid: false, error: 'Invalid request' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { valid: false, error: 'Not authenticated' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Parse body
    const body = await request.json();
    const { jiraUrl, email, apiToken } = body;

    // Validate inputs
    if (!jiraUrl || typeof jiraUrl !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Jira URL is required' },
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

    // Normalize URL
    let normalizedUrl = jiraUrl.trim();
    if (!normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Validate domain to prevent SSRF — only allow *.atlassian.net
    try {
      const parsed = new URL(normalizedUrl);
      if (!parsed.hostname.endsWith('.atlassian.net')) {
        return NextResponse.json(
          { valid: false, error: 'Invalid Jira URL. Must be a *.atlassian.net domain.' },
          { status: 400, headers: securityHeaders }
        );
      }
    } catch {
      return NextResponse.json(
        { valid: false, error: 'Invalid URL format' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Create auth header (Basic auth with email:token)
    const authHeader = Buffer.from(`${email}:${apiToken}`).toString('base64');

    // Test the connection by fetching current user
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(`${normalizedUrl}/rest/api/3/myself`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${authHeader}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 401) {
          return NextResponse.json(
            { valid: false, error: 'Invalid email or API token' },
            { headers: securityHeaders }
          );
        }
        if (response.status === 403) {
          return NextResponse.json(
            { valid: false, error: 'Access denied. Check your permissions.' },
            { headers: securityHeaders }
          );
        }
        if (response.status === 404) {
          return NextResponse.json(
            { valid: false, error: 'Jira site not found' },
            { headers: securityHeaders }
          );
        }
        return NextResponse.json(
          { valid: false, error: `HTTP ${response.status}: ${response.statusText}` },
          { headers: securityHeaders }
        );
      }

      const data = await response.json();

      // Verify we got user data
      if (!data.accountId) {
        return NextResponse.json(
          { valid: false, error: 'Invalid response from Jira' },
          { headers: securityHeaders }
        );
      }

      return NextResponse.json(
        { valid: true },
        { headers: securityHeaders }
      );
    } catch (fetchError) {
      clearTimeout(timeout);

      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return NextResponse.json(
            { valid: false, error: 'Connection timed out' },
            { headers: securityHeaders }
          );
        }
        if (fetchError.message.includes('fetch failed')) {
          return NextResponse.json(
            { valid: false, error: 'Could not connect to Jira' },
            { headers: securityHeaders }
          );
        }
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('[Jira Validate] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500, headers: securityHeaders }
    );
  }
}
