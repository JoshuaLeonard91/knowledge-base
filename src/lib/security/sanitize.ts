/**
 * Response sanitization utilities
 *
 * Ensures no sensitive data leaks to client responses:
 * - Strips internal IDs and fields
 * - Generic error messages
 * - No stack traces
 * - Safe user data only
 */

import { NextResponse } from 'next/server';

/**
 * Fields that should NEVER appear in responses
 */
const SENSITIVE_FIELDS = [
  // Internal identifiers
  '_id',
  '__v',
  '__internal',
  'internalId',
  'databaseId',

  // Authentication data
  'password',
  'passwordHash',
  'salt',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'sessionToken',

  // Personal data that shouldn't leak
  'email',
  'phone',
  'ip',
  'ipAddress',

  // Server/system info
  'serverId',
  'serverConfig',
  'env',
  'debug',
  'stack',
  'stackTrace',
];

/**
 * Generic error messages to replace detailed errors
 */
const GENERIC_ERRORS: Record<string, string> = {
  authentication: 'Authentication required',
  authorization: 'Access denied',
  validation: 'Invalid input',
  notFound: 'Resource not found',
  rateLimit: 'Too many requests',
  server: 'An error occurred',
};

/**
 * Safe user fields that can be exposed to client
 */
export interface SafeUser {
  displayName: string;
  avatarUrl?: string;
  isAuthenticated: boolean;
}

/**
 * Deep clone and remove sensitive fields from object
 */
export function stripSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  additionalFields: string[] = []
): Partial<T> {
  const fieldsToStrip = [...SENSITIVE_FIELDS, ...additionalFields];

  function sanitize(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(sanitize);
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        // Skip sensitive fields
        if (fieldsToStrip.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
          continue;
        }
        sanitized[key] = sanitize(val);
      }
      return sanitized;
    }

    return value;
  }

  return sanitize(obj) as Partial<T>;
}

/**
 * Create safe user response from full user data
 */
export function sanitizeUserResponse(user: {
  username?: string;
  displayName?: string;
  avatar?: string;
  avatarUrl?: string;
  id?: string;
} | null): SafeUser | null {
  if (!user) return null;

  return {
    displayName: user.displayName || user.username || 'User',
    avatarUrl: user.avatarUrl || user.avatar,
    isAuthenticated: true,
  };
}

/**
 * Create generic error response (no details leaked)
 */
export function sanitizeErrorResponse(
  type: keyof typeof GENERIC_ERRORS = 'server',
  _originalError?: unknown // Underscore prefix - logged but not exposed
): { error: string; code: string } {
  return {
    error: GENERIC_ERRORS[type] || GENERIC_ERRORS.server,
    code: type.toUpperCase(),
  };
}

/**
 * Sanitize article data for response
 */
export function sanitizeArticleResponse(article: {
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  category?: string;
  keywords?: string[];
  readTime?: number;
  [key: string]: unknown;
}): Record<string, unknown> {
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    category: article.category,
    keywords: article.keywords,
    readTime: article.readTime,
  };
}

/**
 * Sanitize search results
 */
export function sanitizeSearchResults(
  results: Array<{
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    [key: string]: unknown;
  }>
): Array<Record<string, string>> {
  return results.map(r => ({
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    category: r.category,
  }));
}

/**
 * Create safe JSON response wrapper
 * Automatically strips sensitive fields and adds security headers
 */
export function createSafeResponse<T extends Record<string, unknown>>(
  data: T,
  options: {
    status?: number;
    stripFields?: string[];
    headers?: Record<string, string>;
  } = {}
): NextResponse {
  const { status = 200, stripFields = [], headers = {} } = options;

  const sanitizedData = stripSensitiveFields(data, stripFields);

  const response = NextResponse.json(sanitizedData, { status });

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');

  // Custom headers
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

/**
 * Create safe error response
 */
export function createErrorResponse(
  type: keyof typeof GENERIC_ERRORS = 'server',
  status: number = 500,
  _originalError?: unknown
): NextResponse {
  const errorData = sanitizeErrorResponse(type, _originalError);

  const response = NextResponse.json(
    { success: false, ...errorData },
    { status }
  );

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Cache-Control', 'no-store');

  return response;
}

/**
 * Create success response with minimal data
 */
export function createSuccessResponse(
  data: Record<string, unknown> = {},
  status: number = 200
): NextResponse {
  return createSafeResponse(
    { success: true, ...data },
    { status }
  );
}

/**
 * Sanitize string input (remove potential XSS)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#x60;');
}

/**
 * Sanitize object recursively (all string values)
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(v =>
        typeof v === 'string' ? sanitizeString(v) : v
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
