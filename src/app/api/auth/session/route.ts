import { getSafeUser, getSessionId, getAuthMode } from '@/lib/auth';
import {
  createSafeResponse,
  createErrorResponse,
} from '@/lib/security/sanitize';
import { setCsrfCookie, getCsrfFromCookie } from '@/lib/security/csrf';

export async function GET() {
  try {
    // Get safe user (no internal IDs exposed)
    const user = await getSafeUser();

    // Get session ID for CSRF binding
    const sessionId = await getSessionId();

    // Get or create CSRF token bound to session
    let csrfToken = await getCsrfFromCookie();
    if (!csrfToken) {
      csrfToken = await setCsrfCookie(sessionId || undefined);
    }

    const authMode = getAuthMode();

    if (!user) {
      return createSafeResponse({
        authenticated: false,
        user: null,
        csrf: csrfToken,
        authMode,
      });
    }

    // Return only safe user data - no IDs or sensitive info
    return createSafeResponse({
      authenticated: true,
      user,
      csrf: csrfToken,
      authMode,
    });
  } catch {
    return createErrorResponse('server', 500);
  }
}
