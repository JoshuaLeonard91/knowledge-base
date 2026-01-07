/**
 * Cryptographic utilities for enterprise security
 *
 * Uses Node.js crypto module for:
 * - AES-256-GCM encryption/decryption
 * - HMAC-SHA256 signing
 * - Secure random token generation
 * - Key derivation (scrypt)
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto';

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  iv: string; // Base64 encoded
  data: string; // Base64 encoded
  tag: string; // Base64 encoded auth tag
  v: number; // Version for future migrations
}

/**
 * Get encryption key from environment or derive from secret
 * NEVER log or expose this key
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey && envKey.length === 64) {
    // 32 bytes = 64 hex chars
    return Buffer.from(envKey, 'hex');
  }

  // Fallback: derive from SESSION_SECRET (less secure, for dev only)
  const secret = process.env.SESSION_SECRET || 'insecure-dev-secret-change-in-production';
  const salt = Buffer.from('static-salt-for-dev', 'utf8');

  if (process.env.NODE_ENV === 'production' && !envKey) {
    console.error('[SECURITY] ENCRYPTION_KEY not set in production!');
  }

  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns base64-encoded encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: authTag.toString('base64'),
    v: 1,
  };
}

/**
 * Decrypt AES-256-GCM encrypted data
 * Throws on invalid data or tampered content
 */
export function decrypt(encrypted: EncryptedData): string {
  if (encrypted.v !== 1) {
    throw new Error('Unsupported encryption version');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'base64');
  const data = Buffer.from(encrypted.data, 'base64');
  const authTag = Buffer.from(encrypted.tag, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Decryption failed - data may be tampered');
  }
}

/**
 * Encrypt to a single base64 string (for cookies)
 */
export function encryptToString(plaintext: string): string {
  const encrypted = encrypt(plaintext);
  return Buffer.from(JSON.stringify(encrypted)).toString('base64');
}

/**
 * Decrypt from a single base64 string
 */
export function decryptFromString(encryptedString: string): string {
  try {
    const encrypted = JSON.parse(
      Buffer.from(encryptedString, 'base64').toString('utf8')
    ) as EncryptedData;
    return decrypt(encrypted);
  } catch {
    throw new Error('Invalid encrypted string format');
  }
}

/**
 * Generate HMAC-SHA256 signature
 */
export function sign(data: string, secret?: string): string {
  const key = secret || process.env.SESSION_SECRET || 'insecure-dev-secret';
  return createHmac('sha256', key).update(data).digest('base64');
}

/**
 * Verify HMAC-SHA256 signature (timing-safe)
 */
export function verify(data: string, signature: string, secret?: string): boolean {
  const key = secret || process.env.SESSION_SECRET || 'insecure-dev-secret';
  const expected = createHmac('sha256', key).update(data).digest();
  const actual = Buffer.from(signature, 'base64');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

/**
 * Generate cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate URL-safe random token (base64url)
 */
export function generateUrlSafeToken(length: number = 32): string {
  return randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Hash sensitive data (one-way, for logging)
 * Uses HMAC with app secret so hashes are consistent but not reversible
 */
export function hashForLog(data: string): string {
  const secret = process.env.SESSION_SECRET || 'log-hash-secret';
  return createHmac('sha256', secret)
    .update(data)
    .digest('hex')
    .substring(0, 16); // Truncate for readability
}

/**
 * Derive key from password/secret using scrypt
 */
export function deriveKey(secret: string, salt?: Buffer): Buffer {
  const useSalt = salt || randomBytes(SALT_LENGTH);
  return scryptSync(secret, useSalt, KEY_LENGTH);
}

/**
 * Generate random salt
 */
export function generateSalt(): Buffer {
  return randomBytes(SALT_LENGTH);
}

/**
 * Constant-time string comparison
 */
export function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}
