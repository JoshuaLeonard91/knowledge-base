import { NextRequest } from 'next/server';
import { destroySession, getSession } from '@/lib/auth';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/security/sanitize';
import {
  logLogout,
  getClientIp,
} from '@/lib/security/logger';
import { validateCsrfRequest, csrfErrorResponse } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  try {
    // Validate CSRF token to prevent logout CSRF attacks
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return csrfErrorResponse();
    }

    // Get user before destroying session (for logging)
    const user = await getSession();

    await destroySession();

    // Log logout event
    logLogout({
      ip,
      userId: user?.id,
    });

    return createSuccessResponse({});
  } catch (error) {
    return createErrorResponse('server', 500, error);
  }
}
