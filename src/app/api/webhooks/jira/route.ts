/**
 * Jira Webhook Handler
 *
 * Receives lightweight webhook payloads from Jira Automation rules.
 * On receiving an event, fetches the full ticket data from Jira's API
 * to get accurate comments, status, and description.
 *
 * Supports:
 * - comment_created: Staff replied → notify user via Discord DM
 * - issue_transitioned: Status changed → refresh Discord DM
 *
 * Auth: ?secret= URL token (Jira Automation) or HMAC-SHA256 (classic webhook)
 * Routing: main domain (no ?tenant) or tenant-specific (?tenant=id)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db/client';
import { sendTicketUpdateDM } from '@/lib/discord-bot/notifications';
import { logTicketComment } from '@/lib/discord-bot/log';
import { refreshTicketDM } from '@/lib/discord-bot/helpers';
import { MAIN_DOMAIN_BOT_ID } from '@/lib/discord-bot/constants';
import { getTicketProvider, getTicketProviderForTenant } from '@/lib/ticketing/adapter';

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

    const webhookEvent = payload.webhookEvent || 'unknown';
    console.log(`[Jira Webhook] Received event=${webhookEvent}, payload keys=${Object.keys(payload).join(',')}`);

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

    // Verify auth: HMAC signature (classic webhook) OR ?secret= token (Jira Automation)
    const signature = request.headers.get('x-hub-signature');
    const urlSecret = request.nextUrl.searchParams.get('secret');
    const hasValidSignature = signature && verifyJiraSignature(rawBody, signature, webhookSecret);
    const hasValidToken = urlSecret && urlSecret.length === webhookSecret.length &&
      timingSafeEqual(Buffer.from(urlSecret), Buffer.from(webhookSecret));

    if (!hasValidSignature && !hasValidToken) {
      console.log(`[Jira Webhook] Rejected: invalid auth for bot=${botId} (sig=${!!signature}, token=${!!urlSecret})`);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Extract issue key from payload — supports multiple formats:
    // Lightweight: { issueKey: "KBT-18" }
    // Classic webhook: { issue: { key: "KBT-18" } }
    const issueKey = payload.issueKey || payload.issue?.key;
    if (!issueKey) {
      console.log(`[Jira Webhook] Skipped: no issueKey in payload`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Only process known event types
    if (webhookEvent !== 'comment_created' && webhookEvent !== 'issue_transitioned' && webhookEvent !== 'jira:issue_updated') {
      console.log(`[Jira Webhook] Skipped: unhandled event type "${webhookEvent}"`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Get the ticket provider to fetch full data from Jira
    const provider = botId === MAIN_DOMAIN_BOT_ID
      ? getTicketProvider()
      : await getTicketProviderForTenant(botId);

    if (!provider) {
      console.log(`[Jira Webhook] Error: no ticket provider for bot=${botId}`);
      return NextResponse.json(
        { error: 'Ticket provider not available' },
        { status: 503 }
      );
    }

    // Fetch the full ticket from Jira without ownership verification.
    // The webhook handler is a trusted server-side path — it extracts the
    // Discord user ID from the ticket description metadata directly.
    console.log(`[Jira Webhook] Fetching ticket ${issueKey} from Jira...`);

    if (!provider.getTicketUnguarded) {
      console.log(`[Jira Webhook] Error: provider does not support getTicketUnguarded`);
      return NextResponse.json({ error: 'Not supported' }, { status: 501 });
    }

    const result = await provider.getTicketUnguarded(issueKey);
    if (!result) {
      console.log(`[Jira Webhook] Skipped: ticket ${issueKey} not found or no Discord User ID in description`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { ticket, discordUserId } = result;

    console.log(`[Jira Webhook] ticket=${issueKey}, status=${ticket.status}, comments=${ticket.comments.length}`);

    // For comment_created: check if the latest comment is from staff
    if (webhookEvent === 'comment_created' || webhookEvent === 'jira:issue_updated') {
      const latestStaffComment = [...ticket.comments]
        .reverse()
        .find(c => c.isStaff);

      if (!latestStaffComment) {
        console.log(`[Jira Webhook] Skipped: no staff comment found for ${issueKey}`);
        return NextResponse.json({ ok: true, skipped: true });
      }

      // Check if this comment is recent (within last 2 minutes) to avoid processing old comments
      const commentAge = Date.now() - new Date(latestStaffComment.created).getTime();
      if (commentAge > 2 * 60 * 1000) {
        console.log(`[Jira Webhook] Skipped: latest staff comment on ${issueKey} is ${Math.round(commentAge / 1000)}s old`);
        return NextResponse.json({ ok: true, skipped: true });
      }

      console.log(`[Jira Webhook] Processing staff comment on ${issueKey}: author=${latestStaffComment.author}, age=${Math.round(commentAge / 1000)}s`);

      // Send/refresh DM notification
      await sendTicketUpdateDM({
        tenantId: botId,
        tenantSlug,
        tenantName,
        ticketId: issueKey,
        ticketSummary: ticket.summary,
        status: ticket.status,
        commentBody: latestStaffComment.body,
        commentAuthor: latestStaffComment.author,
        discordUserId,
      });

      // Fire-and-forget: log to admin log channel
      logTicketComment({
        botId,
        ticketId: issueKey,
        commentAuthor: latestStaffComment.author,
        commentPreview: latestStaffComment.body.substring(0, 200),
        isStaff: true,
      }).catch(err => console.error('[Jira Webhook] Log channel failed:', err));
    } else if (webhookEvent === 'issue_transitioned') {
      // Status change — just refresh the DM
      console.log(`[Jira Webhook] Processing status change for ${issueKey}: status=${ticket.status}`);
      await refreshTicketDM(botId, issueKey, discordUserId);
    }

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
