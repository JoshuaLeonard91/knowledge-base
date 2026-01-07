import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { jiraServiceDesk } from '@/lib/atlassian/client';

export async function GET(request: NextRequest) {
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

    // Get tickets for this user (search by ID and username for backwards compatibility)
    const tickets = await jiraServiceDesk.getTicketsByDiscordUser(user.id, user.username);

    // Transform to a simpler format
    const formattedTickets = tickets.map(ticket => ({
      id: ticket.key,
      summary: ticket.fields.summary,
      status: ticket.fields.status?.name || 'Unknown',
      statusCategory: ticket.fields.status?.statusCategory?.key || 'undefined',
      created: ticket.fields.created,
      updated: ticket.fields.updated,
    }));

    return NextResponse.json({
      success: true,
      tickets: formattedTickets,
    });
  } catch {
    // Log internally but don't expose error details to client
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
