import { getSafeUser, getSessionId } from '@/lib/auth';
import {
  createSafeResponse,
  createErrorResponse,
} from '@/lib/security/sanitize';
import { generateCsrfToken, getCsrfFromCookie, CSRF_COOKIE_CONFIG } from '@/lib/security/csrf';

export async function GET() {
  try {
    // Get safe user (no internal IDs exposed)
    const user = await getSafeUser();

    // Get session ID for CSRF binding
    const sessionId = await getSessionId();

    // Get existing CSRF token from cookie, or generate a new one
    let csrfToken = await getCsrfFromCookie();
    let needsNewCookie = false;

    if (!csrfToken) {
      csrfToken = generateCsrfToken(sessionId || undefined);
      needsNewCookie = true;
    }

    const response = createSafeResponse(
      user
        ? { authenticated: true, user, csrf: csrfToken }
        : { authenticated: false, user: null, csrf: csrfToken }
    );

    // Set CSRF cookie directly on the response object so it's always
    // included in the Set-Cookie header (cookies().set() from next/headers
    // can fail to merge into a separately-constructed NextResponse)
    if (needsNewCookie) {
      response.cookies.set(CSRF_COOKIE_CONFIG.name, csrfToken, {
        httpOnly: CSRF_COOKIE_CONFIG.httpOnly,
        secure: CSRF_COOKIE_CONFIG.secure,
        sameSite: CSRF_COOKIE_CONFIG.sameSite,
        path: CSRF_COOKIE_CONFIG.path,
        maxAge: CSRF_COOKIE_CONFIG.maxAge,
      });
    }

    return response;
  } catch {
    return createErrorResponse('server', 500);
  }
}
