import { NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { resolveProviderFromRequest } from '@/lib/ticketing/adapter';

export async function GET() {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Get tickets for this user via tenant-aware provider
    const { provider, error: providerError } = await resolveProviderFromRequest();
    if (!provider) {
      return NextResponse.json(
        { success: false, error: providerError || 'Ticketing is not configured.' },
        { status: 503 }
      );
    }

    const tickets = await provider.listTickets(user.id, user.username);

    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch {
    // Log internally but don't expose error details to client
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
