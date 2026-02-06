/**
 * Shared API route auth utilities
 *
 * Eliminates duplicated auth + tenant ownership boilerplate across routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { validateCsrfRequest } from '@/lib/security/csrf';
import { getTenantFromRequest } from '@/lib/tenant/resolver';
import { prisma } from '@/lib/db/client';
import type { PublicUser } from '@/types';
import type { Tenant } from '@/generated/prisma';

/** Standard security headers applied to all dashboard API responses */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
} as const;

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

type AuthSuccess = { session: PublicUser };
type AuthError = { response: NextResponse };
export type AuthResult = AuthSuccess | AuthError;

type TenantAuthSuccess = { session: PublicUser; tenant: Tenant };
type TenantAuthError = { response: NextResponse };
export type TenantAuthResult = TenantAuthSuccess | TenantAuthError;

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: securityHeaders });
}

/**
 * Validate authentication and CSRF (for mutations).
 *
 * Pass `request` for handlers that accept mutations so CSRF is auto-checked.
 * Omit for GET-only handlers.
 */
export async function requireAuth(request?: NextRequest): Promise<AuthResult> {
  const authenticated = await isAuthenticated();
  if (!authenticated) return { response: errorResponse('Not authenticated', 401) };

  if (request && MUTATION_METHODS.includes(request.method)) {
    const csrf = await validateCsrfRequest(request);
    if (!csrf.valid) return { response: errorResponse('Invalid request', 403) };
  }

  const session = await getSession();
  if (!session) return { response: errorResponse('Session invalid', 401) };

  return { session };
}

/**
 * Validate authentication + resolve tenant ownership.
 *
 * Returns the caller's tenant after verifying they own it.
 */
export async function requireTenantOwner(request?: NextRequest): Promise<TenantAuthResult> {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult;

  const { session } = authResult;
  const tenantContext = await getTenantFromRequest();

  const user = await prisma.user.findUnique({
    where: { discordId: session.id },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return { response: errorResponse('No tenant found', 404) };
  }

  const tenant = tenantContext
    ? user.tenants.find((t) => t.slug === tenantContext.slug) || user.tenants[0]
    : user.tenants[0];

  if (!tenant) {
    return { response: errorResponse('Tenant access denied', 403) };
  }

  return { session, tenant };
}
