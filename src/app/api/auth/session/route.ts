import { getSafeUser } from '@/lib/auth';
import {
  createSafeResponse,
  createErrorResponse,
} from '@/lib/security/sanitize';

export async function GET() {
  try {
    // Get safe user (no internal IDs exposed)
    const user = await getSafeUser();

    if (!user) {
      return createSafeResponse({
        authenticated: false,
        user: null,
      });
    }

    // Return only safe user data - no IDs or sensitive info
    return createSafeResponse({
      authenticated: true,
      user,
    });
  } catch (error) {
    return createErrorResponse('server', 500, error);
  }
}
