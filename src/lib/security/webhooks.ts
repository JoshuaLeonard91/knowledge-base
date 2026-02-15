/**
 * Webhook Security Utilities
 *
 * Provides event deduplication and timestamp validation for
 * Stripe (and other) webhook handlers.
 */

// In-memory processed event IDs with TTL-based eviction
const processedEvents = new Map<string, number>();
const MAX_PROCESSED_EVENTS = 10_000;
const EVENT_TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Maximum allowed age for webhook events (5 minutes)
const MAX_EVENT_AGE_MS = 5 * 60 * 1000;

/** Periodic cleanup of expired event IDs */
function cleanupProcessedEvents() {
  const now = Date.now();
  for (const [id, expiresAt] of processedEvents) {
    if (expiresAt < now) processedEvents.delete(id);
  }
}

setInterval(cleanupProcessedEvents, CLEANUP_INTERVAL_MS).unref();

/**
 * Check if a webhook event has already been processed (idempotency).
 * Returns true if the event is a duplicate and should be skipped.
 * Marks the event as processed if it's new.
 */
export function isDuplicateEvent(eventId: string): boolean {
  // Evict expired entries if map is too large
  if (processedEvents.size > MAX_PROCESSED_EVENTS) {
    cleanupProcessedEvents();
  }

  const existing = processedEvents.get(eventId);
  if (existing !== undefined && existing > Date.now()) {
    return true; // Already processed
  }

  // Mark as processed
  processedEvents.set(eventId, Date.now() + EVENT_TTL_MS);
  return false;
}

/**
 * Validate webhook event timestamp is within acceptable range.
 * Returns true if the event is fresh enough to process.
 *
 * @param eventCreatedUnix - Unix timestamp (seconds) from the event
 */
export function isEventTimestampValid(eventCreatedUnix: number): boolean {
  const eventAgeMs = Date.now() - (eventCreatedUnix * 1000);
  return eventAgeMs <= MAX_EVENT_AGE_MS && eventAgeMs >= -30_000; // Allow 30s clock skew
}
