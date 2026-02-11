/**
 * Hygraph Webhook Handler
 *
 * Receives webhook payloads from Hygraph when CMS content changes.
 * Invalidates the Next.js Data Cache for the affected tenant/content type.
 *
 * URL pattern: /api/webhooks/hygraph/{tenantId}
 *   - tenantId = "main" for the main domain
 *   - tenantId = tenant ID for tenant subdomains
 *
 * Auth: HMAC-SHA256 signature in `gcms-signature` header
 * Secret: HYGRAPH_WEBHOOK_SECRET env var (main) or DB webhookSecret (tenant)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db/client';
import { decryptFromString } from '@/lib/security/crypto';
import { hygraph } from '@/lib/hygraph';

export const dynamic = 'force-dynamic';

/**
 * Verify Hygraph webhook signature (HMAC-SHA256)
 * Hygraph sends the signature in the `gcms-signature` header as a hex-encoded HMAC
 */
function verifySignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  const expected = createHmac('sha256', secret).update(body).digest('base64');

  try {
    return timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

/**
 * Map Hygraph model names to cache tags for selective invalidation
 */
function getTagsForModel(modelName: string): string[] {
  const modelTagMap: Record<string, string[]> = {
    Article: ['articles', 'categories'],
    ArticleCategory: ['categories', 'articles'],
    SiteSettings: ['settings'],
    NavigationLink: ['settings'],
    Service: ['services'],
    ServiceTier: ['services'],
    SLAHighlight: ['services'],
    HelpfulResource: ['services'],
    ServicesPageContent: ['services'],
    ContactPageSettings: ['contact'],
    ContactChannel: ['contact'],
    ResponseTimeItem: ['contact'],
    TicketCategory: ['tickets'],
    LandingPageContent: ['landing'],
    PricingPageContent: ['services'],
  };

  return modelTagMap[modelName] || [];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const signature = request.headers.get('gcms-signature');
  const body = await request.text();

  console.log(`[Webhook/Hygraph] Received for ${tenantId}`);

  // Get the webhook secret for verification
  let secret: string | null = null;
  let cacheTag: string;

  if (tenantId === 'main') {
    // Main domain uses env var
    secret = process.env.HYGRAPH_WEBHOOK_SECRET || null;
    cacheTag = 'main';
  } else {
    // Tenant uses DB-stored secret
    try {
      const config = await prisma.tenantHygraphConfig.findUnique({
        where: { tenantId },
        select: { webhookSecret: true },
      });
      if (config?.webhookSecret) {
        secret = decryptFromString(config.webhookSecret);
      }
      cacheTag = `tenant:${tenantId}`;
    } catch (error) {
      console.error(`[Webhook/Hygraph] DB error for tenant ${tenantId}:`, error);
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  }

  // Verify signature
  if (!secret) {
    console.error(`[Webhook/Hygraph] No webhook secret configured for ${tenantId}`);
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 404 });
  }

  if (!verifySignature(body, signature, secret)) {
    console.error(`[Webhook/Hygraph] Invalid signature for ${tenantId}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse the webhook payload
  let payload: { operation?: string; data?: { __typename?: string } };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const modelName = payload.data?.__typename || 'Unknown';
  const operation = payload.operation || 'unknown';

  console.log(`[Webhook/Hygraph] ${tenantId}: ${operation} on ${modelName}`);

  // Invalidate cache tags for the affected content
  const contentTags = getTagsForModel(modelName);

  // Always invalidate the tenant tag (clears all cached data for this tenant)
  const tagsToInvalidate = [...new Set([cacheTag, ...contentTags])];

  for (const tag of tagsToInvalidate) {
    revalidateTag(tag, { expire: 0 });
    console.log(`[Webhook/Hygraph] Invalidated tag: ${tag}`);
  }

  // Clear the in-memory cache on the main domain singleton
  if (tenantId === 'main') {
    hygraph.clearCache();
    console.log('[Webhook/Hygraph] Cleared main domain in-memory cache');
  }

  return NextResponse.json({
    ok: true,
    invalidated: tagsToInvalidate,
    model: modelName,
    operation,
  });
}
