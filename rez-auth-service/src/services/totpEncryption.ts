/**
 * TOTP Encryption Service
 * AES-256-GCM encryption for TOTP secrets at rest in MongoDB.
 *
 * AUTH-HIGH-02 fix: TOTP secrets are now encrypted before DB persistence.
 *
 * Format stored in DB: base64(JSON) where JSON = { v: 1, iv: <16-byte-hex>, ct: <ciphertext-hex> }
 */

import crypto from 'crypto';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('totp-encryption');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // bytes — required by GCM
const KEY_LENGTH = 32; // bytes — AES-256
const TAG_LENGTH = 16; // bytes — GCM authentication tag
const CURRENT_VERSION = 1;

/** Result of encrypting a TOTP secret */
export interface EncryptedPayload {
  encrypted: string; // base64(JSON) — safe for MongoDB string field
}

/** Metadata extracted from a stored encrypted payload */
export interface EncryptionMetadata {
  version: number;
  iv: string; // hex
  tag: string; // hex
}

/**
 * Derive a 32-byte key from OTP_TOTP_ENCRYPTION_KEY.
 * Supports three formats:
 *   1. Raw 32-byte hex string  (64 hex chars)
 *   2. Raw 32-byte base64 string
 *   3. Passphrase — stretched via PBKDF2 (100,000 iterations, SHA-512)
 */
function deriveKey(rawKey: string): Buffer {
  if (/^[a-f0-9]{64}$/i.test(rawKey)) {
    // Format 1: 32-byte hex
    return Buffer.from(rawKey.slice(0, 64), 'hex');
  }
  if (/^[A-Za-z0-9+/]{43}=$/.test(rawKey) || /^[A-Za-z0-9+/]{44}$/.test(rawKey)) {
    // Format 2: base64 — decode to 32 bytes
    const decoded = Buffer.from(rawKey, 'base64');
    if (decoded.length === KEY_LENGTH) return decoded;
  }
  // Format 3: passphrase — PBKDF2 stretch
  const salt = 'rez-totp-v1'; // fixed salt for deterministic derivation
  return crypto.pbkdf2Sync(rawKey, salt, 100_000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt a raw TOTP base32 secret before storing in MongoDB.
 *
 * @param plaintext Raw base32 TOTP secret
 * @returns Encrypted payload safe for string storage
 * @throws Error if OTP_TOTP_ENCRYPTION_KEY is not configured
 */
export function encryptTotpSecret(plaintext: string): EncryptedPayload {
  const rawKey = process.env.OTP_TOTP_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error(
      '[FATAL] OTP_TOTP_ENCRYPTION_KEY environment variable is not set. ' +
      'TOTP secrets cannot be stored encrypted. ' +
      'Generate with: openssl rand -hex 32'
    );
  }

  const key = deriveKey(rawKey);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload = {
    v: CURRENT_VERSION,
    iv: iv.toString('hex'),
    ct: Buffer.concat([encrypted, tag]).toString('hex'),
  };

  return { encrypted: Buffer.from(JSON.stringify(payload)).toString('base64') };
}

/**
 * Decrypt a TOTP secret retrieved from MongoDB.
 *
 * @param encryptedPayload base64(JSON) string from DB
 * @returns Raw base32 TOTP secret
 * @throws Error if decryption fails (tampered data, wrong key, etc.)
 */
export function decryptTotpSecret(encryptedPayload: string): string {
  const rawKey = process.env.OTP_TOTP_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error(
      '[FATAL] OTP_TOTP_ENCRYPTION_KEY environment variable is not set. ' +
      'TOTP secrets cannot be decrypted.'
    );
  }

  let parsed: { v: number; iv: string; ct: string };
  try {
    parsed = JSON.parse(Buffer.from(encryptedPayload, 'base64').toString('utf8'));
  } catch {
    throw new Error('TOTP secret is corrupted or not encrypted (invalid base64 payload)');
  }

  if (parsed.v !== CURRENT_VERSION) {
    throw new Error(`Unsupported TOTP encryption version: ${parsed.v} (expected ${CURRENT_VERSION})`);
  }

  const key = deriveKey(rawKey);
  const iv = Buffer.from(parsed.iv, 'hex');
  const ctHex = parsed.ct;
  const ciphertext = Buffer.from(ctHex.slice(0, ctHex.length - TAG_LENGTH * 2), 'hex');
  const tag = Buffer.from(ctHex.slice(-TAG_LENGTH * 2), 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (err: any) {
    logger.error('TOTP secret decryption failed — data may be tampered or key is wrong', {
      error: err.message,
    });
    throw new Error('TOTP secret decryption failed — data may be tampered');
  }
}

/**
 * Check whether a stored secret value is encrypted (vs legacy plaintext).
 * Returns true if it appears to be a base64 JSON encrypted payload.
 */
export function isEncrypted(value: string): boolean {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
    return typeof parsed === 'object' && parsed !== null && typeof parsed.v === 'number' && typeof parsed.iv === 'string' && typeof parsed.ct === 'string';
  } catch {
    return false;
  }
}

logger.info('TOTP encryption service initialized (AES-256-GCM)');
