// Input validation and sanitization utilities
import { randomBytes } from 'crypto';

// Sanitize string input - removes HTML and trims
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .trim();
}

// Validate ticket description
export function validateDescription(description: unknown): { valid: boolean; error?: string; sanitized?: string } {
  const sanitized = sanitizeString(description);

  if (!sanitized) {
    return { valid: false, error: 'Description is required' };
  }

  if (sanitized.length < 10) {
    return { valid: false, error: 'Description must be at least 10 characters' };
  }

  if (sanitized.length > 2000) {
    return { valid: false, error: 'Description must be less than 2000 characters' };
  }

  return { valid: true, sanitized };
}

// Validate server ID (legacy - validates against a list)
export function validateServerId(serverId: unknown, validServerIds: string[]): { valid: boolean; error?: string } {
  if (typeof serverId !== 'string') {
    return { valid: false, error: 'Invalid server ID' };
  }

  if (!validServerIds.includes(serverId)) {
    return { valid: false, error: 'Server not found or not authorized' };
  }

  return { valid: true };
}

// Validate Discord server ID format (snowflake - 17-19 digit number)
export function validateDiscordServerId(serverId: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof serverId !== 'string') {
    return { valid: false, error: 'Server ID is required' };
  }

  const sanitized = serverId.trim();

  if (!sanitized) {
    return { valid: false, error: 'Server ID is required' };
  }

  // Discord snowflake IDs are 17-19 digits
  const snowflakeRegex = /^\d{17,19}$/;
  if (!snowflakeRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid Discord server ID format. It should be a 17-19 digit number.' };
  }

  return { valid: true, sanitized };
}

// Validate ticket severity
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export function validateSeverity(severity: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof severity !== 'string') {
    return { valid: false, error: 'Severity is required' };
  }

  const sanitized = severity.trim().toLowerCase();

  if (!VALID_SEVERITIES.includes(sanitized as typeof VALID_SEVERITIES[number])) {
    return { valid: false, error: 'Invalid severity level' };
  }

  return { valid: true, sanitized };
}

// Validate search query
export function validateSearchQuery(query: unknown): { valid: boolean; error?: string; sanitized?: string } {
  const sanitized = sanitizeString(query);

  if (!sanitized) {
    return { valid: false, error: 'Search query is required' };
  }

  if (sanitized.length < 2) {
    return { valid: false, error: 'Search query must be at least 2 characters' };
  }

  if (sanitized.length > 100) {
    return { valid: false, error: 'Search query must be less than 100 characters' };
  }

  return { valid: true, sanitized };
}

// ==========================================
// SUBDOMAIN VALIDATION
// ==========================================

/** Consolidated reserved subdomain list — infrastructure + service names */
export const RESERVED_SUBDOMAINS = [
  // Infrastructure
  'www', 'api', 'app', 'cdn', 'ftp', 'mail', 'smtp', 'email',
  'static', 'assets', 'media', 'images', 'img',
  // App routes & features
  'admin', 'dashboard', 'billing', 'account', 'settings',
  'auth', 'login', 'logout', 'signup', 'register',
  'support', 'help', 'docs', 'status', 'blog', 'portal',
  'checkout', 'payment', 'stripe', 'webhook', 'webhooks',
  'shop', 'store',
  // Environments
  'dev', 'staging', 'prod', 'test', 'demo',
];

/**
 * Blocked words — common profanity, slurs, and offensive terms.
 * Checked as substrings so "badword123" is also caught.
 */
const BLOCKED_WORDS = [
  // Profanity
  'fuck', 'shit', 'ass', 'damn', 'bitch', 'bastard', 'crap', 'dick',
  'cock', 'cunt', 'piss', 'tits', 'boob', 'porn', 'sexy', 'nude',
  'naked', 'xxx', 'anal', 'anus', 'dildo', 'penis', 'vagina',
  // Slurs (abbreviated/common forms)
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'spic', 'chink',
  'kike', 'dyke', 'tranny', 'whore', 'slut',
  // Hate/violence
  'nazi', 'hitler', 'kkk', 'jihad', 'terror',
  // Scam/impersonation
  'admin', 'moderator', 'official', 'stripe', 'paypal',
];

/** Format: lowercase alphanumeric + hyphens, must start/end with alphanumeric */
const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;

/** At least one letter required (no pure-number subdomains) */
const HAS_LETTER = /[a-z]/;

/**
 * Validate a subdomain slug. Returns { valid, error? }.
 * Does NOT check database availability — callers handle that separately.
 */
export function validateSubdomain(raw: unknown): { valid: boolean; error?: string; normalized?: string } {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, error: 'Subdomain is required' };
  }

  const subdomain = raw.toLowerCase().trim();

  if (subdomain.length < 3) {
    return { valid: false, error: 'Subdomain must be at least 3 characters' };
  }

  if (subdomain.length > 32) {
    return { valid: false, error: 'Subdomain must be 32 characters or less' };
  }

  if (!SUBDOMAIN_REGEX.test(subdomain)) {
    return { valid: false, error: 'Use only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.' };
  }

  if (subdomain.includes('--')) {
    return { valid: false, error: 'Subdomain cannot contain consecutive hyphens' };
  }

  if (!HAS_LETTER.test(subdomain)) {
    return { valid: false, error: 'Subdomain must contain at least one letter' };
  }

  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return { valid: false, error: 'This subdomain is reserved' };
  }

  // Check blocked words as substrings
  const blocked = BLOCKED_WORDS.find(word => subdomain.includes(word));
  if (blocked) {
    return { valid: false, error: 'This subdomain is not allowed' };
  }

  return { valid: true, normalized: subdomain };
}

// Generate a random ticket ID using cryptographic randomness
export function generateTicketId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(8);
  let result = 'TKT-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(bytes[i] % chars.length);
  }
  return result;
}
