/**
 * File-based security logging
 *
 * Writes structured JSON logs to files:
 * - security.log: Auth attempts, security events
 * - access.log: API access, rate limits
 * - error.log: Validation failures, errors
 *
 * NEVER logs:
 * - Passwords, tokens, API keys
 * - Full user IDs (hashed only)
 * - Session tokens
 * - Request/response bodies with sensitive data
 */

import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'fs';
import { join } from 'path';
import { hashForLog } from './crypto';

// Configuration
const LOG_DIR = process.env.LOG_DIR || './logs';
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB before rotation
const MAX_LOG_FILES = 5; // Keep 5 rotated files

// Log file paths
const SECURITY_LOG = join(LOG_DIR, 'security.log');
const ACCESS_LOG = join(LOG_DIR, 'access.log');
const ERROR_LOG = join(LOG_DIR, 'error.log');

/**
 * Security event types
 */
export type EventType = 'auth' | 'access' | 'validation' | 'error' | 'security' | 'rate_limit';
export type Severity = 'info' | 'warn' | 'error' | 'critical';
export type Outcome = 'success' | 'failure' | 'blocked';

/**
 * Security event structure
 */
export interface SecurityEvent {
  timestamp: string;
  eventType: EventType;
  severity: Severity;
  action: string;
  outcome: Outcome;
  ip?: string;
  userAgent?: string;
  userId?: string; // Will be hashed
  resource?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  details?: Record<string, unknown>;
}

/**
 * Ensure log directory exists
 */
function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Get appropriate log file for event type
 */
function getLogFile(eventType: EventType): string {
  switch (eventType) {
    case 'auth':
    case 'security':
      return SECURITY_LOG;
    case 'access':
    case 'rate_limit':
      return ACCESS_LOG;
    case 'validation':
    case 'error':
      return ERROR_LOG;
    default:
      return ACCESS_LOG;
  }
}

/**
 * Rotate log file if it exceeds max size
 */
function rotateIfNeeded(logFile: string): void {
  try {
    if (!existsSync(logFile)) return;

    const stats = statSync(logFile);
    if (stats.size < MAX_LOG_SIZE) return;

    // Rotate existing files
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const oldFile = `${logFile}.${i}`;
      const newFile = `${logFile}.${i + 1}`;
      if (existsSync(oldFile)) {
        if (i === MAX_LOG_FILES - 1) {
          // Delete oldest
          require('fs').unlinkSync(oldFile);
        } else {
          renameSync(oldFile, newFile);
        }
      }
    }

    // Rotate current to .1
    renameSync(logFile, `${logFile}.1`);
  } catch (err) {
    console.error('[Logger] Rotation error:', err);
  }
}

/**
 * Sanitize event details (remove sensitive data)
 */
function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;

  const sensitiveKeys = [
    'password', 'token', 'secret', 'apiKey', 'authorization',
    'cookie', 'session', 'accessToken', 'refreshToken',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.substring(0, 200) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Write log entry to file
 */
function writeLog(event: SecurityEvent): void {
  try {
    ensureLogDir();

    const logFile = getLogFile(event.eventType);
    rotateIfNeeded(logFile);

    // Hash user ID if present
    const sanitizedEvent: SecurityEvent = {
      ...event,
      userId: event.userId ? hashForLog(event.userId) : undefined,
      details: sanitizeDetails(event.details),
    };

    const logLine = JSON.stringify(sanitizedEvent) + '\n';
    appendFileSync(logFile, logLine, 'utf8');
  } catch (err) {
    // Fallback to console if file write fails
    console.error('[Logger] Write error:', err);
    console.log('[SecurityEvent]', JSON.stringify(event));
  }
}

/**
 * Log a security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  writeLog({
    ...event,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log authentication attempt
 */
export function logAuthAttempt(params: {
  success: boolean;
  ip?: string;
  userAgent?: string;
  userId?: string;
  method?: string;
  details?: Record<string, unknown>;
}): void {
  logSecurityEvent({
    eventType: 'auth',
    severity: params.success ? 'info' : 'warn',
    action: 'login_attempt',
    outcome: params.success ? 'success' : 'failure',
    ip: params.ip,
    userAgent: params.userAgent,
    userId: params.userId,
    method: params.method,
    details: params.details,
  });
}

/**
 * Log logout event
 */
export function logLogout(params: {
  ip?: string;
  userId?: string;
}): void {
  logSecurityEvent({
    eventType: 'auth',
    severity: 'info',
    action: 'logout',
    outcome: 'success',
    ip: params.ip,
    userId: params.userId,
  });
}

/**
 * Log access denied event
 */
export function logAccessDenied(params: {
  resource: string;
  reason: string;
  ip?: string;
  userId?: string;
  method?: string;
}): void {
  logSecurityEvent({
    eventType: 'security',
    severity: 'warn',
    action: 'access_denied',
    outcome: 'blocked',
    resource: params.resource,
    ip: params.ip,
    userId: params.userId,
    method: params.method,
    details: { reason: params.reason },
  });
}

/**
 * Log validation failure
 */
export function logValidationFailure(params: {
  field: string;
  reason: string;
  ip?: string;
  resource?: string;
}): void {
  logSecurityEvent({
    eventType: 'validation',
    severity: 'warn',
    action: 'validation_failed',
    outcome: 'failure',
    ip: params.ip,
    resource: params.resource,
    details: { field: params.field, reason: params.reason },
  });
}

/**
 * Log rate limit triggered
 */
export function logRateLimit(params: {
  ip: string;
  resource: string;
  limit: number;
  window: string;
}): void {
  logSecurityEvent({
    eventType: 'rate_limit',
    severity: 'warn',
    action: 'rate_limit_exceeded',
    outcome: 'blocked',
    ip: params.ip,
    resource: params.resource,
    details: { limit: params.limit, window: params.window },
  });
}

/**
 * Log API access
 */
export function logApiAccess(params: {
  method: string;
  resource: string;
  statusCode: number;
  duration: number;
  ip?: string;
  userId?: string;
}): void {
  logSecurityEvent({
    eventType: 'access',
    severity: 'info',
    action: 'api_access',
    outcome: params.statusCode < 400 ? 'success' : 'failure',
    method: params.method,
    resource: params.resource,
    statusCode: params.statusCode,
    duration: params.duration,
    ip: params.ip,
    userId: params.userId,
  });
}

/**
 * Log security error
 */
export function logSecurityError(params: {
  action: string;
  error: string;
  ip?: string;
  resource?: string;
  details?: Record<string, unknown>;
}): void {
  logSecurityEvent({
    eventType: 'error',
    severity: 'error',
    action: params.action,
    outcome: 'failure',
    ip: params.ip,
    resource: params.resource,
    details: { error: params.error, ...params.details },
  });
}

/**
 * Log critical security event (potential attack)
 */
export function logSecurityAlert(params: {
  action: string;
  description: string;
  ip?: string;
  userId?: string;
  details?: Record<string, unknown>;
}): void {
  logSecurityEvent({
    eventType: 'security',
    severity: 'critical',
    action: params.action,
    outcome: 'blocked',
    ip: params.ip,
    userId: params.userId,
    details: { description: params.description, ...params.details },
  });
}

/**
 * Log ticket submission
 */
export function logTicketSubmission(params: {
  success: boolean;
  ticketId?: string;
  ip?: string;
  userId?: string;
}): void {
  logSecurityEvent({
    eventType: 'access',
    severity: 'info',
    action: 'ticket_submission',
    outcome: params.success ? 'success' : 'failure',
    ip: params.ip,
    userId: params.userId,
    details: params.ticketId ? { ticketId: params.ticketId } : undefined,
  });
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string {
  return headers.get('user-agent') || 'unknown';
}
