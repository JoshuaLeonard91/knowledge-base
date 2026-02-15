/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the server starts. Used to initialize the
 * Discord bot manager so tenant bots connect on startup,
 * and warm up caches to eliminate cold-start latency.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

/**
 * Warm up the server after it starts listening.
 *
 * Cold starts are slow because the first request must:
 * 1. Establish the Prisma connection pool (1-3s to remote DB)
 * 2. Fetch CMS data from Hygraph (200-500ms per query)
 * 3. Render React server components from scratch
 *
 * This function pre-warms all three layers so real users
 * never hit the cold path.
 */
async function warmup() {
  const start = Date.now();
  const port = process.env.PORT || 3000;
  const base = `http://localhost:${port}`;

  try {
    // 1. Pre-connect Prisma (biggest latency win — avoids cold DB connection)
    const { prisma } = await import('@/lib/db/client');
    await prisma.$connect();
    console.log(`[Warmup] Prisma connected (${Date.now() - start}ms)`);

    // 2. Pre-load all active tenant slugs so resolver cache is warm
    const tenants = await prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true },
    });
    console.log(`[Warmup] Loaded ${tenants.length} active tenants (${Date.now() - start}ms)`);

    // 3. Wait for the HTTP server to be ready, then self-fetch key routes
    //    to warm Next.js Data Cache + React rendering pipeline
    const maxWait = 30_000;
    const pollInterval = 500;
    let serverReady = false;

    for (let elapsed = 0; elapsed < maxWait; elapsed += pollInterval) {
      try {
        const res = await fetch(`${base}/api/auth/session`, { method: 'GET' });
        if (res.ok || res.status === 401) {
          serverReady = true;
          break;
        }
      } catch {
        // Server not listening yet
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }

    if (!serverReady) {
      console.warn('[Warmup] Server did not become ready within timeout, skipping route warmup');
      return;
    }

    // Warm main domain routes (populates Next.js Data Cache + CMS caches)
    const routes = ['/support', '/support/articles', '/support/services'];
    await Promise.all(
      routes.map((route) =>
        fetch(`${base}${route}`, { headers: { 'x-warmup': '1' } }).catch(() => {})
      )
    );
    console.log(`[Warmup] Main domain routes warmed (${Date.now() - start}ms)`);

    // Warm tenant routes (each tenant's first request populates their CMS cache)
    if (tenants.length > 0 && process.env.APP_DOMAIN) {
      const domain = process.env.APP_DOMAIN; // e.g. helpportal.app
      await Promise.all(
        tenants.map((t) =>
          fetch(`${base}/support`, {
            headers: {
              host: `${t.slug}.${domain}`,
              'x-warmup': '1',
            },
          }).catch(() => {})
        )
      );
      console.log(`[Warmup] Tenant routes warmed (${Date.now() - start}ms)`);
    }

    console.log(`[Warmup] Complete in ${Date.now() - start}ms`);
  } catch (error) {
    // Warmup is best-effort — don't crash the server
    console.error('[Warmup] Failed:', error);
  }
}

export async function register() {
  // Only run on the server (not during build or on edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { botManager } = await import('@/lib/discord-bot/manager');
    const { startTokenRefresh } = await import('@/lib/atlassian/token-refresh');

    console.log('[Instrumentation] Starting Discord bot manager...');
    botManager.initialize().catch((error) => {
      console.error('[Instrumentation] Bot manager init failed:', error);
    });

    // Background OAuth token refresh (prevents 90-day expiry)
    startTokenRefresh();

    // Warm up caches in the background (don't block server start)
    warmup().catch((error) => {
      console.error('[Instrumentation] Warmup failed:', error);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('[Instrumentation] Shutting down...');
      await botManager.shutdown();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
