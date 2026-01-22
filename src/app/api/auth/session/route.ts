import { getSafeUser } from '@/lib/auth';
import {
  createSafeResponse,
  createErrorResponse,
} from '@/lib/security/sanitize';
import { setCsrfCookie, getCsrfFromCookie } from '@/lib/security/csrf';

export async function GET() {
  try {
    // Get safe user (no internal IDs exposed)
    const user = await getSafeUser();

    // Get or create CSRF token (not session-bound since we don't expose internal IDs)
    let csrfToken = await getCsrfFromCookie();
    if (!csrfToken) {
      csrfToken = await setCsrfCookie();
    }

    if (!user) {
      return createSafeResponse({
        authenticated: false,
        user: null,
        csrf: csrfToken,
      });
    }

    // Return only safe user data - no IDs or sensitive info
    return createSafeResponse({
      authenticated: true,
      user,
      csrf: csrfToken,
    });
  } catch (error) {
    return createErrorResponse('server', 500, error);
  }
}
