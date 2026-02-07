'use client';

/**
 * Floating ghosts that wander the screen on the spooky theme.
 * Hidden via CSS when data-theme is not "spooky".
 */

export function SpookyGhosts() {
  return (
    <div className="spooky-ghosts-container">
      <div className="spooky-ghost ghost-1" aria-hidden="true">👻</div>
      <div className="spooky-ghost ghost-2" aria-hidden="true">👻</div>
      <div className="spooky-ghost ghost-3" aria-hidden="true">👻</div>
    </div>
  );
}
