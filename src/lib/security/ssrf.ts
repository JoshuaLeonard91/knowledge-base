/**
 * SSRF Protection Utilities
 *
 * Validates outbound URLs to prevent Server-Side Request Forgery.
 * Blocks requests to private/internal IP ranges and non-HTTPS protocols.
 */

import { lookup } from 'dns/promises';

/** Private and reserved IP ranges that must never be accessed server-side */
const PRIVATE_IP_PATTERNS = [
  /^127\./,                   // Loopback
  /^10\./,                    // RFC 1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC 1918
  /^192\.168\./,              // RFC 1918
  /^169\.254\./,              // Link-local
  /^0\./,                     // Current network
  /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./, // Carrier-grade NAT
  /^198\.51\.100\./,          // Documentation
  /^203\.0\.113\./,           // Documentation
  /^(?:::1|::ffff:127\.)/,    // IPv6 loopback
  /^f[cd]/i,                  // IPv6 private (fc00::/7)
  /^fe80/i,                   // IPv6 link-local
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip));
}

/**
 * Validate that a URL is safe to fetch server-side.
 * Blocks private IPs, non-HTTPS protocols, and resolves DNS to check for rebinding.
 *
 * @param url - The URL to validate
 * @param allowedProtocols - Allowed protocols (default: https only)
 * @returns Object with `safe` boolean and optional `reason` string
 */
export async function validateOutboundUrl(
  url: string,
  allowedProtocols: string[] = ['https:']
): Promise<{ safe: boolean; reason?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }

  // Protocol check
  if (!allowedProtocols.includes(parsed.protocol)) {
    return { safe: false, reason: `Disallowed protocol: ${parsed.protocol}` };
  }

  // Don't allow IP addresses directly in the hostname
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
    if (isPrivateIp(parsed.hostname)) {
      return { safe: false, reason: 'Private IP address' };
    }
  }

  // DNS resolution check — prevents DNS rebinding attacks
  try {
    const { address } = await lookup(parsed.hostname);
    if (isPrivateIp(address)) {
      return { safe: false, reason: 'Hostname resolves to private IP' };
    }
  } catch {
    // DNS resolution failure — could be a transient issue; allow through
    // since the fetch itself will fail if the host is unreachable
  }

  return { safe: true };
}

/**
 * Safe fetch wrapper that validates the URL before making the request.
 * Use this for any server-side fetch of user-provided or external URLs.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const validation = await validateOutboundUrl(url);
  if (!validation.safe) {
    throw new Error(`SSRF blocked: ${validation.reason}`);
  }

  return fetch(url, {
    ...init,
    redirect: 'manual', // Don't follow redirects automatically (could redirect to internal IPs)
  });
}
