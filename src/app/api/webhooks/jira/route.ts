/**
 * Jira Webhook Handler
 *
 * Receives Jira webhooks when comments are added to tickets.
 * Looks up the ticket owner's Discord ID from the ticket metadata,
 * checks their notification preference, and sends a DM via the bot.
 *
 * Webhook events: jira:issue_updated (filtered for comment_created)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db/client';
import { sendTicketUpdateDM } from '@/lib/discord-bot/notifications';
import { logTicketComment } from '@/lib/discord-bot/log';

/**
 * Verify Jira webhook signature (HMAC-SHA256)
 */
function verifyJiraSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expected = createHmac('sha256', secret).update(body).digest('base64');
  const actual = signature;

  try {
    return timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(actual)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Parse the webhook payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Determine tenant from webhook — Jira sends to tenant-specific URLs
    // URL format: /api/webhooks/jira?tenant={tenantId}
    const tenantId = request.nextUrl.searchParams.get('tenant');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant parameter' },
        { status: 400 }
      );
    }

    // Get tenant's webhook config for signature verification
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { webhookConfig: true },
    });

    if (!tenant || !tenant.webhookConfig?.webhookEnabled) {
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 404 }
      );
    }

    // Verify signature
    const signature = request.headers.get('x-hub-signature');
    if (
      !verifyJiraSignature(rawBody, signature, tenant.webhookConfig.webhookSecret)
    ) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Only process comment_created events
    const webhookEvent = payload.webhookEvent;
    if (webhookEvent !== 'comment_created' && webhookEvent !== 'jira:issue_updated') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // For issue_updated, check if a comment was added
    const comment = payload.comment;
    if (!comment) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Extract ticket info
    const issue = payload.issue;
    if (!issue) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const ticketId = issue.key;
    const ticketSummary = issue.fields?.summary || 'Support Ticket';
    const status = issue.fields?.status?.name || 'Unknown';

    // Extract Discord user ID from ticket description metadata
    const description =
      typeof issue.fields?.description === 'string'
        ? issue.fields.description
        : '';
    const discordIdMatch = description.match(/Discord User ID:\s*(\d{17,19})/i);

    if (!discordIdMatch) {
      // Can't identify the ticket owner — skip
      return NextResponse.json({ ok: true, skipped: true });
    }

    const discordUserId = discordIdMatch[1];

    // Extract comment body
    let commentBody = '';
    if (typeof comment.body === 'string') {
      commentBody = comment.body;
    } else if (comment.body?.content) {
      // ADF format — extract text nodes
      commentBody = extractAdfText(comment.body.content);
    }

    // Don't notify for comments by the ticket author (self-replies)
    const commentAuthorId =
      comment.author?.accountId || comment.author?.name || '';
    const commentAuthor = comment.author?.displayName || 'Support Team';

    // Skip if this looks like a user comment (contains their Discord metadata)
    if (commentBody.includes(`Discord User ID: ${discordUserId}`)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Send DM notification
    await sendTicketUpdateDM({
      tenantId,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      ticketId,
      ticketSummary,
      status,
      commentBody,
      commentAuthor,
      discordUserId,
    });

    // Fire-and-forget: log to admin log channel
    logTicketComment({
      botId: tenantId,
      ticketId,
      commentAuthor,
      commentPreview: commentBody.substring(0, 200),
      isStaff: true,
    }).catch(err => console.error('[Jira Webhook] Log channel failed:', err));

    // Update last webhook timestamp
    await prisma.tenantWebhookConfig.update({
      where: { tenantId },
      data: {
        lastWebhookAt: new Date(),
        webhookFailureCount: 0,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Jira Webhook] Error:', error);

    // Increment failure count if we have the tenant
    const tenantId = request.nextUrl.searchParams.get('tenant');
    if (tenantId) {
      try {
        await prisma.tenantWebhookConfig.update({
          where: { tenantId },
          data: { webhookFailureCount: { increment: 1 } },
        });
      } catch {
        // Ignore update errors
      }
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/** Extract plain text from Jira ADF content nodes */
function extractAdfText(
  content: Array<{ type: string; text?: string; content?: Array<{ type: string; text?: string; content?: unknown[] }> }>
): string {
  return content
    .map((node) => {
      if (node.type === 'text') return node.text || '';
      if (node.type === 'paragraph' && node.content) {
        return extractAdfText(node.content as typeof content);
      }
      if (node.type === 'hardBreak') return '\n';
      return '';
    })
    .join('');
}
