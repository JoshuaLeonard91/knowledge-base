/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the server starts. Used to initialize the
 * Discord bot manager so tenant bots connect on startup.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

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
