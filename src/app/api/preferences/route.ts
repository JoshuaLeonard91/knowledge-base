/**
 * User Preferences API
 *
 * Stores user preferences in httpOnly cookies instead of localStorage.
 * This prevents XSS attacks from accessing preference data.
 *
 * GET - Read preferences from cookie
 * POST - Set preferences in httpOnly cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/security/sanitize';
import { logApiAccess, getClientIp } from '@/lib/security/logger';

// Cookie configuration
const PREFS_COOKIE_NAME = 'user_prefs';
const PREFS_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

// Valid preference keys and values
const VALID_PREFERENCES = {
  uiMode: ['classic', 'minimal'],
} as const;

type PreferenceKey = keyof typeof VALID_PREFERENCES;
type Preferences = {
  [K in PreferenceKey]?: (typeof VALID_PREFERENCES)[K][number];
};

/**
 * GET - Read preferences from cookie
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request.headers);

  try {
    const cookieStore = await cookies();
    const prefsCookie = cookieStore.get(PREFS_COOKIE_NAME);

    let preferences: Preferences = {
      uiMode: 'classic', // Default
    };

    if (prefsCookie?.value) {
      try {
        const parsed = JSON.parse(prefsCookie.value);
        // Validate each preference
        for (const [key, value] of Object.entries(parsed)) {
          if (
            key in VALID_PREFERENCES &&
            VALID_PREFERENCES[key as PreferenceKey].includes(value as never)
          ) {
            preferences[key as PreferenceKey] = value as Preferences[PreferenceKey];
          }
        }
      } catch {
        // Invalid JSON, use defaults
      }
    }

    logApiAccess({
      method: 'GET',
      resource: '/api/preferences',
      statusCode: 200,
      duration: Date.now() - startTime,
      ip,
    });

    return createSuccessResponse({ preferences });
  } catch {
    logApiAccess({
      method: 'GET',
      resource: '/api/preferences',
      statusCode: 500,
      duration: Date.now() - startTime,
      ip,
    });

    return createErrorResponse('server', 500);
  }
}

/**
 * POST - Set preferences in httpOnly cookie
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request.headers);

  try {
    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      logApiAccess({
        method: 'POST',
        resource: '/api/preferences',
        statusCode: 400,
        duration: Date.now() - startTime,
        ip,
      });

      return createErrorResponse('validation', 400);
    }

    // Validate and filter preferences
    const validatedPrefs: Preferences = {};

    for (const [key, value] of Object.entries(preferences)) {
      if (
        key in VALID_PREFERENCES &&
        typeof value === 'string' &&
        VALID_PREFERENCES[key as PreferenceKey].includes(value as never)
      ) {
        validatedPrefs[key as PreferenceKey] = value as Preferences[PreferenceKey];
      }
    }

    // Get existing preferences and merge
    const cookieStore = await cookies();
    const existingCookie = cookieStore.get(PREFS_COOKIE_NAME);
    let existingPrefs: Preferences = {};

    if (existingCookie?.value) {
      try {
        existingPrefs = JSON.parse(existingCookie.value);
      } catch {
        // Invalid JSON, start fresh
      }
    }

    const mergedPrefs = { ...existingPrefs, ...validatedPrefs };

    // Set httpOnly cookie
    cookieStore.set(PREFS_COOKIE_NAME, JSON.stringify(mergedPrefs), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: PREFS_MAX_AGE,
    });

    logApiAccess({
      method: 'POST',
      resource: '/api/preferences',
      statusCode: 200,
      duration: Date.now() - startTime,
      ip,
    });

    return createSuccessResponse({ preferences: mergedPrefs });
  } catch {
    logApiAccess({
      method: 'POST',
      resource: '/api/preferences',
      statusCode: 500,
      duration: Date.now() - startTime,
      ip,
    });

    return createErrorResponse('server', 500);
  }
}
