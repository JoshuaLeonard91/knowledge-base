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
import { MAIN_DOMAIN_BOT_ID } from '@/lib/discord-bot/constants';

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

    console.log(`[Jira Webhook] Received webhook, event=${payload.webhookEvent || 'unknown'}`);

    // Resolve context: main domain (no ?tenant) or tenant-specific (?tenant=id)
    const tenantParam = request.nextUrl.searchParams.get('tenant');
    let botId: string;
    let tenantSlug: string;
    let tenantName: string;
    let webhookSecret: string;

    if (!tenantParam) {
      // Main domain — use env vars
      const envSecret = process.env.JIRA_WEBHOOK_SECRET;
      if (!envSecret) {
        console.log('[Jira Webhook] Rejected: no ?tenant param and JIRA_WEBHOOK_SECRET not set');
        return NextResponse.json(
          { error: 'Webhook not configured' },
          { status: 404 }
        );
      }
      botId = MAIN_DOMAIN_BOT_ID;
      tenantSlug = process.env.MAIN_DOMAIN_SLUG || 'main';
      tenantName = process.env.MAIN_DOMAIN_NAME || 'Support';
      webhookSecret = envSecret;
    } else {
      // Tenant-specific — look up from database
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantParam },
        include: { webhookConfig: true },
      });

      if (!tenant || !tenant.webhookConfig?.webhookEnabled) {
        console.log(`[Jira Webhook] Rejected: tenant=${tenantParam} not found or webhook disabled`);
        return NextResponse.json(
          { error: 'Webhook not configured' },
          { status: 404 }
        );
      }
      botId = tenantParam;
      tenantSlug = tenant.slug;
      tenantName = tenant.name;
      webhookSecret = tenant.webhookConfig.webhookSecret;
    }

    // Verify signature
    const signature = request.headers.get('x-hub-signature');
    if (!verifyJiraSignature(rawBody, signature, webhookSecret)) {
      console.log(`[Jira Webhook] Rejected: invalid signature for bot=${botId}`);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Only process comment_created events
    const webhookEvent = payload.webhookEvent;
    if (webhookEvent !== 'comment_created' && webhookEvent !== 'jira:issue_updated') {
      console.log(`[Jira Webhook] Skipped: unhandled event type "${webhookEvent}"`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    // For issue_updated, check if a comment was added
    const comment = payload.comment;
    if (!comment) {
      console.log(`[Jira Webhook] Skipped: ${webhookEvent} but no comment in payload`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Extract ticket info
    const issue = payload.issue;
    if (!issue) {
      console.log(`[Jira Webhook] Skipped: no issue in payload`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    const ticketId = issue.key;
    const ticketSummary = issue.fields?.summary || 'Support Ticket';
    const status = issue.fields?.status?.name || 'Unknown';

    // Extract Discord user ID from ticket description metadata
    // Description may be a plain string or ADF (Atlassian Document Format) object
    let description = '';
    if (typeof issue.fields?.description === 'string') {
      description = issue.fields.description;
    } else if (issue.fields?.description?.content) {
      description = extractAdfText(issue.fields.description.content);
    }
    console.log(`[Jira Webhook] ticket=${ticketId}, descriptionType=${typeof issue.fields?.description}, extractedLen=${description.length}, preview="${description.substring(0, 150)}"`);

    const discordIdMatch = description.match(/Discord User ID:\s*(\d{17,19})/i);

    if (!discordIdMatch) {
      console.log(`[Jira Webhook] Skipped: no Discord User ID found in description for ${ticketId}`);
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
    console.log(`[Jira Webhook] ticket=${ticketId}, commentBodyLen=${commentBody.length}, commentPreview="${commentBody.substring(0, 100)}"`);

    // Don't notify for comments by the ticket author (self-replies)
    const commentAuthorId =
      comment.author?.accountId || comment.author?.name || '';
    const commentAuthor = comment.author?.displayName || 'Support Team';

    // Skip if this looks like a user comment (contains their Discord metadata)
    if (commentBody.includes(`Discord User ID: ${discordUserId}`)) {
      console.log(`[Jira Webhook] Skipped: comment on ${ticketId} is user's own reply (contains Discord metadata)`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Send DM notification
    console.log(`[Jira Webhook] Processing comment for ticket=${ticketId}, discordUser=${discordUserId}, author=${commentAuthor}, bot=${botId}`);
    await sendTicketUpdateDM({
      tenantId: botId,
      tenantSlug,
      tenantName,
      ticketId,
      ticketSummary,
      status,
      commentBody,
      commentAuthor,
      discordUserId,
    });

    // Fire-and-forget: log to admin log channel
    logTicketComment({
      botId,
      ticketId,
      commentAuthor,
      commentPreview: commentBody.substring(0, 200),
      isStaff: true,
    }).catch(err => console.error('[Jira Webhook] Log channel failed:', err));

    // Update last webhook timestamp (only for tenants with DB config)
    if (tenantParam) {
      await prisma.tenantWebhookConfig.update({
        where: { tenantId: tenantParam },
        data: {
          lastWebhookAt: new Date(),
          webhookFailureCount: 0,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Jira Webhook] Error:', error);

    // Increment failure count if we have a tenant with DB config
    const tenantParam = request.nextUrl.searchParams.get('tenant');
    if (tenantParam) {
      try {
        await prisma.tenantWebhookConfig.update({
          where: { tenantId: tenantParam },
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

/** Extract plain text from Jira ADF content nodes (recursive) */
function extractAdfText(
  content: Array<{ type: string; text?: string; content?: unknown[]; attrs?: Record<string, unknown> }>
): string {
  return content
    .map((node) => {
      if (node.type === 'text') return node.text || '';
      if (node.type === 'hardBreak') return '\n';
      if (node.type === 'rule') return '\n---\n';
      // Skip media nodes (attachments handled separately)
      if (node.type === 'media' || node.type === 'mediaSingle') return '';
      if (node.content) {
        const inner = extractAdfText(node.content as typeof content);
        // Block-level nodes get trailing newlines
        if (['paragraph', 'heading', 'blockquote', 'codeBlock', 'listItem'].includes(node.type)) {
          return inner + '\n';
        }
        return inner;
      }
      return '';
    })
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
