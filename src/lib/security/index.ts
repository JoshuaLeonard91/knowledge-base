/**
 * Security module exports
 *
 * Centralized security utilities for enterprise-grade protection
 */

// Cryptographic utilities
export {
  encrypt,
  decrypt,
  encryptToString,
  decryptFromString,
  sign,
  verify,
  generateSecureToken,
  generateUrlSafeToken,
  hashForLog,
  deriveKey,
  generateSalt,
  secureCompare,
  type EncryptedData,
} from './crypto';

// Session management
export {
  createSessionToken,
  parseSessionToken,
  isValidSessionToken,
  getSessionPayload,
  needsRotation,
  rotateSession,
  encryptSessionData,
  decryptSessionData,
  generateSessionId,
  SESSION_COOKIE_CONFIG,
  getSessionCookieOptions,
  getLogoutCookieOptions,
  type SessionPayload,
  type ParsedSession,
} from './session';

// Response sanitization
export {
  stripSensitiveFields,
  sanitizeUserResponse,
  sanitizeErrorResponse,
  sanitizeArticleResponse,
  sanitizeSearchResults,
  createSafeResponse,
  createErrorResponse,
  createSuccessResponse,
  sanitizeString,
  sanitizeObject,
  type SafeUser,
} from './sanitize';

// CSRF protection
export {
  generateCsrfToken,
  validateCsrfToken,
  setCsrfCookie,
  getCsrfFromCookie,
  validateCsrfRequest,
  CSRF_COOKIE_CONFIG,
  getCsrfHeaderName,
  CSRF_PROTECTED_METHODS,
  requiresCsrf,
} from './csrf';

// Security logging
export {
  logSecurityEvent,
  logAuthAttempt,
  logLogout,
  logAccessDenied,
  logValidationFailure,
  logRateLimit,
  logApiAccess,
  logSecurityError,
  logSecurityAlert,
  logTicketSubmission,
  getClientIp,
  getUserAgent,
  type SecurityEvent,
  type EventType,
  type Severity,
  type Outcome,
} from './logger';
