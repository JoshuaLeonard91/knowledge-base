import { NextRequest, NextResponse } from 'next/server';
import { getFullUser, isAuthenticated } from '@/lib/auth';
import { ticketSubjects } from '@/lib/data/servers';
import {
  validateDescription,
  validateServerId,
  validateSubjectId,
  generateTicketId,
} from '@/lib/validation';
import { delay } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get full user data (includes servers)
    const user = await getFullUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { serverId, subjectId, description } = body;

    // Validate server ID against user's actual servers
    const validServerIds = user.servers.map(s => s.id);
    const serverValidation = validateServerId(serverId, validServerIds);
    if (!serverValidation.valid) {
      return NextResponse.json(
        { success: false, error: serverValidation.error },
        { status: 400 }
      );
    }

    // Validate subject ID
    const validSubjectIds = ticketSubjects.map(s => s.id);
    const subjectValidation = validateSubjectId(subjectId, validSubjectIds);
    if (!subjectValidation.valid) {
      return NextResponse.json(
        { success: false, error: subjectValidation.error },
        { status: 400 }
      );
    }

    // Validate and sanitize description
    const descValidation = validateDescription(description);
    if (!descValidation.valid) {
      return NextResponse.json(
        { success: false, error: descValidation.error },
        { status: 400 }
      );
    }

    // Simulate processing delay
    await delay(1000);

    // Generate ticket ID
    const ticketId = generateTicketId();

    // In a real app, you would:
    // 1. Store the ticket in a database
    // 2. Send email notification
    // 3. Create Discord thread or webhook notification

    // Mock: Log ticket details (server-side only, not exposed to client)
    console.log('=== NEW SUPPORT TICKET ===');
    console.log('Ticket ID:', ticketId);
    console.log('User:', user.username);
    console.log('Server:', user.servers.find(s => s.id === serverId)?.name);
    console.log('Subject:', ticketSubjects.find(s => s.id === subjectId)?.name);
    console.log('Description:', descValidation.sanitized);
    console.log('========================');

    // Return success with ticket ID only (no sensitive data)
    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Your ticket has been submitted successfully. We\'ll get back to you soon!',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to submit ticket' },
      { status: 500 }
    );
  }
}
