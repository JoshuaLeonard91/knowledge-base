/**
 * Hygraph Validation API
 *
 * POST - Test if Hygraph credentials are valid
 *
 * Makes a simple introspection query to verify:
 * 1. Endpoint is reachable
 * 2. Token is valid
 * 3. Returns project info if successful
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { validateCsrfRequest } from '@/lib/security/csrf';

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

// Simple introspection query to test credentials
const TEST_QUERY = `
  query TestConnection {
    __schema {
      queryType {
        name
      }
    }
  }
`;

/**
 * POST - Validate Hygraph credentials
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
    const { endpoint, token } = body;

    // Validate inputs
    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Endpoint is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate endpoint format
    if (!endpoint.startsWith('https://')) {
      return NextResponse.json(
        { valid: false, error: 'Endpoint must use HTTPS' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate domain to prevent SSRF — only allow *.hygraph.com and *.graphassets.com
    try {
      const parsed = new URL(endpoint);
      if (!parsed.hostname.endsWith('.hygraph.com') && !parsed.hostname.endsWith('.graphassets.com')) {
        return NextResponse.json(
          { valid: false, error: 'Invalid endpoint. Must be a Hygraph domain (*.hygraph.com).' },
          { status: 400, headers: securityHeaders }
        );
      }
    } catch {
      return NextResponse.json(
        { valid: false, error: 'Invalid URL format' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Test the connection
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query: TEST_QUERY }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 401) {
          return NextResponse.json(
            { valid: false, error: 'Invalid API token' },
            { headers: securityHeaders }
          );
        }
        if (response.status === 404) {
          return NextResponse.json(
            { valid: false, error: 'Endpoint not found' },
            { headers: securityHeaders }
          );
        }
        return NextResponse.json(
          { valid: false, error: `HTTP ${response.status}: ${response.statusText}` },
          { headers: securityHeaders }
        );
      }

      const data = await response.json();

      // Check for GraphQL errors
      if (data.errors && data.errors.length > 0) {
        const errorMessage = data.errors[0].message || 'GraphQL error';
        return NextResponse.json(
          { valid: false, error: errorMessage },
          { headers: securityHeaders }
        );
      }

      // Check we got valid schema data
      if (!data.data?.__schema?.queryType?.name) {
        return NextResponse.json(
          { valid: false, error: 'Invalid response from Hygraph' },
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
            { valid: false, error: 'Could not connect to endpoint' },
            { headers: securityHeaders }
          );
        }
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('[Hygraph Validate] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500, headers: securityHeaders }
    );
  }
}
