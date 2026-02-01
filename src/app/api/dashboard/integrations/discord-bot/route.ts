/**
 * Discord Bot Integration API
 *
 * GET  - Returns bot config status (no token)
 * POST - Creates/updates config (encrypts token)
 * DELETE - Removes config and disconnects bot
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { encryptToString } from '@/lib/security/crypto';
import { validateCsrfRequest } from '@/lib/security/csrf';
import { getTenantFromRequest } from '@/lib/tenant/resolver';
import { botManager } from '@/lib/discord-bot/manager';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

export async function GET() {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: securityHeaders }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalid' },
        { status: 401, headers: securityHeaders }
      );
    }

    const tenantContext = await getTenantFromRequest();

    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: {
        tenants: {
          include: { discordBotConfig: true },
        },
      },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json(
        { configured: false, hasTenant: false },
        { headers: securityHeaders }
      );
    }

    const tenant = tenantContext
      ? user.tenants.find((t) => t.slug === tenantContext.slug) || user.tenants[0]
      : user.tenants[0];
    const config = tenant.discordBotConfig;

    // Check if bot is actually connected
    const botClient = botManager.getBot(tenant.id);

    return NextResponse.json(
      {
        configured: !!config,
        hasTenant: true,
        enabled: config?.enabled || false,
        guildId: config?.guildId || null,
        connected: !!botClient,
        connectedAt: config?.createdAt || null,
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Discord Bot Config] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403, headers: securityHeaders }
      );
    }

    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: securityHeaders }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalid' },
        { status: 401, headers: securityHeaders }
      );
    }

    const body = await request.json();
    const { botToken, guildId, enabled } = body;

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json(
        { error: 'Bot token is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!guildId || typeof guildId !== 'string') {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate guild ID format (Discord snowflake)
    if (!/^\d{17,19}$/.test(guildId)) {
      return NextResponse.json(
        { error: 'Invalid Guild ID format' },
        { status: 400, headers: securityHeaders }
      );
    }

    const tenantContext = await getTenantFromRequest();

    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 404, headers: securityHeaders }
      );
    }

    const tenant = tenantContext
      ? user.tenants.find((t) => t.slug === tenantContext.slug)
      : user.tenants[0];

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant access denied' },
        { status: 403, headers: securityHeaders }
      );
    }

    const encryptedToken = encryptToString(botToken);
    const isEnabled = enabled !== false;

    await prisma.tenantDiscordBotConfig.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        botToken: encryptedToken,
        guildId,
        enabled: isEnabled,
      },
      update: {
        botToken: encryptedToken,
        guildId,
        enabled: isEnabled,
      },
    });

    // Connect or disconnect bot based on enabled state
    if (isEnabled) {
      const connected = await botManager.connectBot(
        tenant.id,
        botToken,
        guildId
      );
      if (!connected) {
        return NextResponse.json(
          { success: true, warning: 'Config saved but bot failed to connect. Check the token.' },
          { headers: securityHeaders }
        );
      }
    } else {
      await botManager.disconnectBot(tenant.id);
    }

    console.log('[Discord Bot Config] Configuration saved');

    return NextResponse.json(
      { success: true },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Discord Bot Config] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403, headers: securityHeaders }
      );
    }

    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: securityHeaders }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalid' },
        { status: 401, headers: securityHeaders }
      );
    }

    const tenantContext = await getTenantFromRequest();

    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 404, headers: securityHeaders }
      );
    }

    const tenant = tenantContext
      ? user.tenants.find((t) => t.slug === tenantContext.slug)
      : user.tenants[0];

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant access denied' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Disconnect bot first
    await botManager.disconnectBot(tenant.id);

    await prisma.tenantDiscordBotConfig.deleteMany({
      where: { tenantId: tenant.id },
    });

    console.log('[Discord Bot Config] Configuration deleted');

    return NextResponse.json(
      { success: true },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Discord Bot Config] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}
