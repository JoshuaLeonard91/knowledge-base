/**
 * In-memory rate limiting
 *
 * Simple sliding window rate limiter using Map.
 * Suitable for single-instance deployments.
 * For multi-instance, use Redis-based solution.
 *
 * Features:
 * - Per-IP rate limiting
 * - Per-endpoint limits
 * - Automatic cleanup of old entries
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Timestamp when limit resets
  retryAfter?: number; // Seconds until retry allowed
}

/**
 * Rate limit entry in store
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store
const store = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start cleanup timer (call once on server start)
 */
export function startCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't prevent process from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Stop cleanup timer
 */
export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Check rate limit for a key
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or expired - create new
  if (!entry || entry.resetAt < now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      reset: now + config.windowMs,
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  // Check if over limit
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      reset: entry.resetAt,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    reset: entry.resetAt,
  };
}

/**
 * Generate rate limit key from IP and resource
 */
export function getRateLimitKey(ip: string, resource: string): string {
  return `${ip}:${resource}`;
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
  config: RateLimitConfig
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString(),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Preset rate limit configurations
 */
export const RATE_LIMITS = {
  // Authentication - strict limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts
    message: 'Too many login attempts. Please try again later.',
  },

  // Search - moderate limits
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches
    message: 'Too many search requests. Please slow down.',
  },

  // Ticket submission - strict limits
  ticket: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 tickets
    message: 'Too many ticket submissions. Please wait before submitting another.',
  },

  // Feedback - moderate limits
  feedback: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 feedback submissions
    message: 'Too many feedback submissions. Please slow down.',
  },

  // General API - lenient limits
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests
    message: 'Too many requests. Please slow down.',
  },

  // Session checks - very lenient
  session: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 checks (1 per second)
    message: 'Too many session checks.',
  },
} as const;

/**
 * Apply rate limit and get result
 */
export function applyRateLimit(
  ip: string,
  limitType: keyof typeof RATE_LIMITS
): RateLimitResult {
  const config = RATE_LIMITS[limitType];
  const key = getRateLimitKey(ip, limitType);
  return checkRateLimit(key, config);
}

/**
 * Reset rate limit for a key (e.g., after successful auth)
 */
export function resetRateLimit(ip: string, resource: string): void {
  const key = getRateLimitKey(ip, resource);
  store.delete(key);
}

/**
 * Get current usage for monitoring
 */
export function getRateLimitStats(): {
  totalKeys: number;
  entries: Array<{ key: string; count: number; resetAt: number }>;
} {
  const entries: Array<{ key: string; count: number; resetAt: number }> = [];

  for (const [key, entry] of store.entries()) {
    entries.push({
      key,
      count: entry.count,
      resetAt: entry.resetAt,
    });
  }

  return {
    totalKeys: store.size,
    entries,
  };
}

// Start cleanup on module load
startCleanup();
