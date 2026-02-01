import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { getTicketProvider } from '@/lib/ticketing/adapter';
import { validateCsrfRequest, csrfErrorResponse } from '@/lib/security/csrf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;

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

    // Get ticket via provider (ownership verified internally)
    const provider = getTicketProvider();
    const ticket = await provider.getTicket(ticketId, user.id);

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        summary: ticket.summary,
        description: ticket.description,
        status: ticket.status,
        statusCategory: ticket.statusCategory,
        created: ticket.created,
        updated: ticket.updated,
        comments: ticket.comments,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;

    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Validate CSRF token
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return csrfErrorResponse();
    }

    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Parse request body — supports both JSON and FormData
    const contentType = request.headers.get('content-type') || '';
    let message: string;
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      message = formData.get('message') as string || '';
      const fileEntries = formData.getAll('files');
      files = fileEntries.filter((f): f is File => f instanceof File);
    } else {
      const body = await request.json();
      message = body.message || '';
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length < 1) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const MAX_COMMENT_LENGTH = 5000;
    if (message.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'Message is too long' },
        { status: 400 }
      );
    }

    // Validate files
    const MAX_FILES = 5;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File "${file.name}" exceeds 10MB limit` },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `File type "${file.type}" is not allowed` },
          { status: 400 }
        );
      }
    }

    // Add comment via provider (ownership verified internally)
    const provider = getTicketProvider();
    const success = await provider.addComment({
      ticketId,
      message: message.trim(),
      discordUserId: user.id,
      discordUsername: user.username,
    });

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to add comment' },
        { status: 500 }
      );
    }

    // Upload attachments if provider supports it
    if (files.length > 0 && provider.addAttachment) {
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        await provider.addAttachment(ticketId, buffer, file.name, file.type);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
