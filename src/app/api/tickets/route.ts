import { NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { getTicketProvider } from '@/lib/ticketing/adapter';

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

    // Get tickets for this user via provider adapter
    const provider = getTicketProvider();
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
