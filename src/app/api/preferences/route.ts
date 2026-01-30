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
import { validateCsrfRequest } from '@/lib/security/csrf';
import { logApiAccess, getClientIp } from '@/lib/security/logger';
import { SearchHistoryItem, ViewHistoryItem } from '@/types';

// Cookie configuration
const PREFS_COOKIE_NAME = 'user_prefs';
const PREFS_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

// History limits
const MAX_RECENT_SEARCHES = 5;
const MAX_VIEWED_ARTICLES = 5;

// Valid preference keys and values
const VALID_PREFERENCES = {
  uiMode: ['classic', 'minimal'],
} as const;

type PreferenceKey = keyof typeof VALID_PREFERENCES;
type Preferences = {
  [K in PreferenceKey]?: (typeof VALID_PREFERENCES)[K][number];
} & {
  recentSearches?: SearchHistoryItem[];
  viewedArticles?: ViewHistoryItem[];
};

// Validate search history item
function isValidSearchHistoryItem(item: unknown): item is SearchHistoryItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as SearchHistoryItem).query === 'string' &&
    (item as SearchHistoryItem).query.length >= 2 &&
    (item as SearchHistoryItem).query.length <= 100 &&
    typeof (item as SearchHistoryItem).timestamp === 'number'
  );
}

// Validate view history item
function isValidViewHistoryItem(item: unknown): item is ViewHistoryItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as ViewHistoryItem).slug === 'string' &&
    (item as ViewHistoryItem).slug.length > 0 &&
    (item as ViewHistoryItem).slug.length <= 200 &&
    typeof (item as ViewHistoryItem).title === 'string' &&
    (item as ViewHistoryItem).title.length > 0 &&
    (item as ViewHistoryItem).title.length <= 300 &&
    typeof (item as ViewHistoryItem).category === 'string' &&
    typeof (item as ViewHistoryItem).timestamp === 'number'
  );
}

/**
 * GET - Read preferences from cookie
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request.headers);

  try {
    const cookieStore = await cookies();
    const prefsCookie = cookieStore.get(PREFS_COOKIE_NAME);

    const preferences: Preferences = {
      uiMode: 'classic', // Default
      recentSearches: [],
      viewedArticles: [],
    };

    if (prefsCookie?.value) {
      try {
        const parsed = JSON.parse(prefsCookie.value);
        // Validate enum preferences
        for (const [key, value] of Object.entries(parsed)) {
          if (
            key in VALID_PREFERENCES &&
            VALID_PREFERENCES[key as PreferenceKey].includes(value as never)
          ) {
            preferences[key as PreferenceKey] = value as Preferences[PreferenceKey];
          }
        }
        // Validate and load history arrays
        if (Array.isArray(parsed.recentSearches)) {
          preferences.recentSearches = parsed.recentSearches
            .filter(isValidSearchHistoryItem)
            .slice(0, MAX_RECENT_SEARCHES);
        }
        if (Array.isArray(parsed.viewedArticles)) {
          preferences.viewedArticles = parsed.viewedArticles
            .filter(isValidViewHistoryItem)
            .slice(0, MAX_VIEWED_ARTICLES);
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
    // Validate CSRF token
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return createErrorResponse('forbidden', 403);
    }

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
      // Handle enum preferences
      if (
        key in VALID_PREFERENCES &&
        typeof value === 'string' &&
        VALID_PREFERENCES[key as PreferenceKey].includes(value as never)
      ) {
        validatedPrefs[key as PreferenceKey] = value as Preferences[PreferenceKey];
      }
    }

    // Handle history arrays
    if (Array.isArray(preferences.recentSearches)) {
      validatedPrefs.recentSearches = preferences.recentSearches
        .filter(isValidSearchHistoryItem)
        .slice(0, MAX_RECENT_SEARCHES);
    }
    if (Array.isArray(preferences.viewedArticles)) {
      validatedPrefs.viewedArticles = preferences.viewedArticles
        .filter(isValidViewHistoryItem)
        .slice(0, MAX_VIEWED_ARTICLES);
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
