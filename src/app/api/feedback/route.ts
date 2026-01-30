import { NextRequest } from 'next/server';
import { sanitizeString } from '@/lib/validation';
import { delay } from '@/lib/utils';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/security/sanitize';
import {
  logApiAccess,
  logValidationFailure,
  getClientIp,
} from '@/lib/security/logger';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { articleSlug, helpful, comment } = body;

    // Validate article slug
    const sanitizedSlug = sanitizeString(articleSlug);
    if (!sanitizedSlug) {
      logValidationFailure({
        field: 'articleSlug',
        reason: 'Invalid article slug',
        ip,
        resource: '/api/feedback',
      });
      return createErrorResponse('validation', 400);
    }

    // Validate helpful (must be boolean)
    if (typeof helpful !== 'boolean') {
      logValidationFailure({
        field: 'helpful',
        reason: 'Must be boolean',
        ip,
        resource: '/api/feedback',
      });
      return createErrorResponse('validation', 400);
    }

    // Sanitize optional comment (max 500 chars)
    const sanitizedComment = comment ? sanitizeString(comment).slice(0, 500) : null;

    // Simulate processing
    await delay(300);

    // Log feedback submission (not the actual content for privacy)
    logApiAccess({
      method: 'POST',
      resource: '/api/feedback',
      statusCode: 200,
      duration: Date.now() - startTime,
      ip,
    });

    // Return minimal success response
    return createSuccessResponse({});
  } catch {
    logApiAccess({
      method: 'POST',
      resource: '/api/feedback',
      statusCode: 500,
      duration: Date.now() - startTime,
      ip,
    });

    return createErrorResponse('server', 500);
  }
}
