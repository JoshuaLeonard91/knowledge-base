import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { jiraServiceDesk, JiraIssue } from '@/lib/atlassian/client';

// Helper to extract text from ADF format
function extractDescriptionText(issue: JiraIssue): string {
  let descriptionText = '';
  if (typeof issue.fields.description === 'string') {
    descriptionText = issue.fields.description;
  } else if ((issue.fields.description as { content?: unknown[] })?.content) {
    const extractText = (content: unknown[], isTopLevel = false): string => {
      return content.map((node: Record<string, unknown>) => {
        if (node.type === 'text') return node.text as string;
        if (node.type === 'paragraph' && node.content) {
          return extractText(node.content as unknown[]);
        }
        if (node.type === 'hardBreak') return '\n';
        if (node.content) return extractText(node.content as unknown[]);
        return '';
      }).join(isTopLevel ? '\n' : '');
    };
    descriptionText = extractText((issue.fields.description as { content: unknown[] }).content, true);
  }
  return descriptionText;
}

// Helper to sanitize description for client response - removes sensitive metadata
function sanitizeDescriptionForClient(description: string): string {
  // Remove the metadata section that contains Discord IDs and other internal info
  const metadataSeparator = '----';
  const separatorIndex = description.indexOf(metadataSeparator);

  if (separatorIndex !== -1) {
    // Return only the user's original description, trimmed
    return description.substring(0, separatorIndex).trim();
  }

  // If no separator, remove any Discord ID patterns as a fallback
  return description
    .replace(/Discord User ID:\s*\d+/gi, '')
    .replace(/Discord Username:\s*\S+/gi, '')
    .replace(/Discord Server ID:\s*\d+/gi, '')
    .replace(/\*Submitted via Support Portal\*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Helper to verify ticket belongs to user
function verifyTicketOwnership(descriptionText: string, user: { id: string; username?: string }): boolean {
  return descriptionText.includes(user.id) ||
    (user.username ? descriptionText.includes(user.username) : false);
}

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

    // Get ticket with comments
    const { issue, comments } = await jiraServiceDesk.getTicketWithComments(ticketId);

    if (!issue) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Verify this ticket belongs to the user by checking Discord User ID or username in description
    const descriptionText = extractDescriptionText(issue);
    const belongsToUser = verifyTicketOwnership(descriptionText, user);

    if (!belongsToUser) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Sanitize description to remove internal metadata (Discord IDs, etc.)
    const sanitizedDescription = sanitizeDescriptionForClient(descriptionText);

    // Sanitize comments to remove any Discord IDs that might be in comment bodies
    const sanitizedComments = comments.map(comment => ({
      ...comment,
      body: sanitizeDescriptionForClient(comment.body),
      // Don't expose internal Jira author names - show generic labels
      author: comment.author.toLowerCase().includes('system') ? 'System' : 'Support Team',
    }));

    return NextResponse.json({
      success: true,
      ticket: {
        id: issue.key,
        summary: issue.fields.summary,
        description: sanitizedDescription,
        status: issue.fields.status?.name || 'Unknown',
        statusCategory: issue.fields.status?.statusCategory?.key || 'undefined',
        created: issue.fields.created,
        updated: issue.fields.updated,
        comments: sanitizedComments,
      },
    });
  } catch {
    // Log internally but don't expose error details to client
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

    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { message } = body;

    // Validate message exists and is a non-empty string
    if (!message || typeof message !== 'string' || message.trim().length < 1) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Enforce maximum comment length (5000 characters)
    const MAX_COMMENT_LENGTH = 5000;
    if (message.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'Message is too long' },
        { status: 400 }
      );
    }

    // Get the ticket to verify ownership
    const issue = await jiraServiceDesk.getIssue(ticketId);

    if (!issue) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Verify this ticket belongs to the user
    const descriptionText = extractDescriptionText(issue);
    const belongsToUser = verifyTicketOwnership(descriptionText, user);

    if (!belongsToUser) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Add comment with user info
    let commentText = `${message.trim()}\n\n----\n`;
    if (user.username) {
      commentText += `Discord Username: ${user.username}\n`;
    }
    commentText += `Discord User ID: ${user.id}`;
    const success = await jiraServiceDesk.addComment(ticketId, commentText);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to add comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    // Log internally but don't expose error details to client
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
