import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { resolveProviderFromRequest } from '@/lib/ticketing/adapter';
import { validateCsrfRequest, csrfErrorResponse } from '@/lib/security/csrf';
import { refreshTicketDM } from '@/lib/discord-bot/helpers';
import { MAIN_DOMAIN_BOT_ID } from '@/lib/discord-bot/constants';

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

    // Tenant-aware provider
    const { provider, tenantId, error: providerError } = await resolveProviderFromRequest();
    if (!provider) {
      return NextResponse.json(
        { success: false, error: providerError || 'Ticketing is not configured.' },
        { status: 503 }
      );
    }

    // Get ticket via provider (ownership verified internally)
    const ticket = await provider.getTicket(ticketId, user.id);

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Fire-and-forget: refresh the Discord DM with latest data from Jira
    const botId = tenantId || MAIN_DOMAIN_BOT_ID;
    refreshTicketDM(botId, ticketId, user.id).catch(err =>
      console.error('[API] DM refresh on ticket view failed:', err)
    );

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

    // Tenant-aware provider
    const { provider, tenantId } = await resolveProviderFromRequest();
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Ticketing is not configured.' },
        { status: 503 }
      );
    }

    // Add comment via provider (ownership verified internally)
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

    // Upload attachments in parallel if provider supports it
    if (files.length > 0 && provider.addAttachment) {
      await Promise.all(
        files.map(async (file) => {
          const buffer = Buffer.from(await file.arrayBuffer());
          await provider.addAttachment!(ticketId, buffer, file.name, file.type);
        })
      );
    }

    // Fire-and-forget: refresh the Discord DM with the new comment
    const botId = tenantId || MAIN_DOMAIN_BOT_ID;
    refreshTicketDM(botId, ticketId, user.id).catch(err =>
      console.error('[API] DM refresh after comment failed:', err)
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const body = await request.json();
    const { action } = body;

    if (!action || !['close', 'reopen'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "close" or "reopen".' },
        { status: 400 }
      );
    }

    // Tenant-aware provider
    const { provider, tenantId } = await resolveProviderFromRequest();
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Ticketing is not configured.' },
        { status: 503 }
      );
    }

    // Verify ownership by attempting to get the ticket
    const ticket = await provider.getTicket(ticketId, user.id);
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Transition the ticket
    if (!provider.transitionTicket) {
      return NextResponse.json(
        { success: false, error: 'Status transitions are not supported.' },
        { status: 501 }
      );
    }

    const targetStatus = action === 'close' ? 'Done' : 'To Do';
    const transitioned = await provider.transitionTicket(ticketId, targetStatus);

    if (!transitioned) {
      return NextResponse.json(
        { success: false, error: 'Failed to update ticket status.' },
        { status: 500 }
      );
    }

    // Re-fetch updated ticket
    const updated = await provider.getTicket(ticketId, user.id);

    // Fire-and-forget: refresh the Discord DM with the new status
    const botId = tenantId || MAIN_DOMAIN_BOT_ID;
    refreshTicketDM(botId, ticketId, user.id).catch(err =>
      console.error('[API] DM refresh after status change failed:', err)
    );

    return NextResponse.json({
      success: true,
      ticket: updated ? {
        id: updated.id,
        summary: updated.summary,
        description: updated.description,
        status: updated.status,
        statusCategory: updated.statusCategory,
        created: updated.created,
        updated: updated.updated,
        comments: updated.comments,
      } : null,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
