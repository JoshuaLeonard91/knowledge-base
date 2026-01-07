/**
 * Image Proxy API Route
 *
 * Proxies and caches images from Google Docs using Vercel Blob storage.
 * Images are cached persistently and served globally via Vercel's CDN.
 *
 * URL format: /api/cms/image/[documentId]_[objectId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

const CACHE_PREFIX = 'cms-images';

/**
 * Check if image exists in Vercel Blob
 */
async function getCachedImage(cacheKey: string): Promise<string | null> {
  try {
    const blobUrl = `${process.env.BLOB_URL || ''}/${CACHE_PREFIX}/${cacheKey}`;
    const blob = await head(blobUrl);
    return blob?.url || null;
  } catch {
    // Blob doesn't exist
    return null;
  }
}

/**
 * Save image to Vercel Blob
 */
async function setCachedImage(
  cacheKey: string,
  data: ArrayBuffer,
  contentType: string
): Promise<string | null> {
  try {
    const blob = await put(`${CACHE_PREFIX}/${cacheKey}`, data, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  } catch {
    // Cache failure is non-critical, continue without caching
    return null;
  }
}

/**
 * Fetch image from Google Docs
 */
async function fetchGoogleImage(
  documentId: string,
  objectId: string
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // Fetch the document to get the image URI
    const docUrl = `https://docs.googleapis.com/v1/documents/${documentId}?key=${apiKey}`;
    const docResponse = await fetch(docUrl);

    if (!docResponse.ok) {
      return null;
    }

    const doc = await docResponse.json();
    const inlineObject = doc.inlineObjects?.[objectId];

    if (!inlineObject) {
      return null;
    }

    const imageUri = inlineObject.inlineObjectProperties?.embeddedObject?.imageProperties?.contentUri;

    if (!imageUri) {
      return null;
    }

    // Fetch the actual image
    const imageResponse = await fetch(imageUri);

    if (!imageResponse.ok) {
      return null;
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const data = await imageResponse.arrayBuffer();

    return { data, contentType };
  } catch {
    return null;
  }
}

/**
 * Sanitize cache key to prevent issues
 */
function sanitizeCacheKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Parse the ID format: documentId_objectId
  const parts = id.split('_');
  if (parts.length < 2) {
    return NextResponse.json(
      { error: 'Invalid image ID format' },
      { status: 400 }
    );
  }

  const documentId = parts[0];
  const objectId = parts.slice(1).join('_');
  const cacheKey = sanitizeCacheKey(`${documentId}_${objectId}`);

  // Check Vercel Blob cache first
  const cachedUrl = await getCachedImage(cacheKey);
  if (cachedUrl) {
    // Redirect to the cached blob URL (served via Vercel CDN)
    return NextResponse.redirect(cachedUrl, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'HIT',
      },
    });
  }

  // Fetch from Google
  const image = await fetchGoogleImage(documentId, objectId);

  if (!image) {
    return NextResponse.json(
      { error: 'Image not found' },
      { status: 404 }
    );
  }

  // Save to Vercel Blob (don't block response)
  const blobUrl = await setCachedImage(cacheKey, image.data, image.contentType);

  // If we got a blob URL, redirect to it
  if (blobUrl) {
    return NextResponse.redirect(blobUrl, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'MISS',
      },
    });
  }

  // Fallback: return image directly
  return new Response(image.data, {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=86400',
      'X-Cache': 'MISS',
    },
  });
}
