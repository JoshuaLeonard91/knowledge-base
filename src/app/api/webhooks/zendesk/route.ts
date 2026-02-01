/**
 * Zendesk Webhook Handler
 *
 * Receives Zendesk webhooks when tickets are updated (agent replies).
 * Looks up the ticket requester's Discord ID, checks notification
 * preference, and sends a DM via the bot.
 *
 * Zendesk webhook payload is configured via Zendesk Admin → Webhooks.
 * Expected payload format (JSON template in Zendesk):
 * {
 *   "ticket_id": "{{ticket.id}}",
 *   "ticket_subject": "{{ticket.title}}",
 *   "ticket_status": "{{ticket.status}}",
 *   "requester_external_id": "{{ticket.requester.external_id}}",
 *   "comment_body": "{{ticket.latest_public_comment}}",
 *   "comment_author": "{{current_user.name}}",
 *   "event": "comment_added"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db/client';
import { sendTicketUpdateDM } from '@/lib/discord-bot/notifications';

/**
 * Verify Zendesk webhook signature (HMAC-SHA256)
 */
function verifyZendeskSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expected = createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  try {
    return timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

interface ZendeskWebhookPayload {
  ticket_id: string;
  ticket_subject: string;
  ticket_status: string;
  requester_external_id: string;
  comment_body: string;
  comment_author: string;
  event: string;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    let payload: ZendeskWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Determine tenant from URL param
    const tenantId = request.nextUrl.searchParams.get('tenant');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant parameter' },
        { status: 400 }
      );
    }

    // Get tenant's webhook config
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
    const signature = request.headers.get('x-zendesk-webhook-signature');
    if (
      !verifyZendeskSignature(
        rawBody,
        signature,
        tenant.webhookConfig.webhookSecret
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Only process comment events
    if (payload.event !== 'comment_added') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Extract Discord user ID from requester's external_id
    // Format: "discord:{discordUserId}"
    const externalId = payload.requester_external_id;
    if (!externalId || !externalId.startsWith('discord:')) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const discordUserId = externalId.replace('discord:', '');

    // Send DM notification
    await sendTicketUpdateDM({
      tenantId,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      ticketId: payload.ticket_id,
      ticketSummary: payload.ticket_subject,
      status: payload.ticket_status,
      commentBody: payload.comment_body,
      commentAuthor: payload.comment_author,
      discordUserId,
    });

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
    console.error('[Zendesk Webhook] Error:', error);

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
