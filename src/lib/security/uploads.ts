/**
 * File Upload Security Utilities
 *
 * Shared filename sanitization and file-type verification for
 * both web API routes and Discord bot attachment handling.
 */

import { randomUUID } from 'crypto';

/** Magic number signatures for server-side file type verification */
const MAGIC_SIGNATURES: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
};

/** Verify file content matches declared MIME type via magic bytes */
export function verifyFileSignature(buffer: Buffer, mimeType: string): boolean {
  const expected = MAGIC_SIGNATURES[mimeType];
  if (!expected) return true; // No signature to check (text, docx) — allow
  if (buffer.length < expected.length) return false;
  return expected.every((byte, i) => byte === buffer[i]);
}

/**
 * Sanitize filename: strip path traversal, special chars, generate safe name.
 * Returns a UUID-based filename preserving only the original extension.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/\0/g, '')
    .replace(/[/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
  const ext = cleaned.split('.').pop() || 'bin';
  return `${randomUUID()}.${ext}`;
}
