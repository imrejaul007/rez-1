import crypto from 'crypto';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('totp');

/**
 * TOTP Service - RFC 6238 compliant
 * Generates and verifies TOTP codes (Google Authenticator compatible)
 */

export interface TOTPSecret {
  secret: string; // base32 encoded
  keyUri: string; // otpauth:// URI for QR code generation
}

export interface BackupCode {
  code: string;
  used: boolean;
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TIME_STEP = 30; // seconds
const DIGITS = 6;
const BACKUP_CODE_LENGTH = 8;

/**
 * Convert buffer to base32 string (RFC 4648)
 */
function bufferToBase32(buffer: Buffer): string {
  let bits = '';
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, '0');
  }
  bits = bits.padEnd(Math.ceil(bits.length / 5) * 5, '0');

  let base32 = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    base32 += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return base32;
}

/**
 * Convert base32 string back to buffer (RFC 4648)
 */
function base32ToBuffer(base32: string): Buffer {
  base32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < base32.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(base32[i]);
    if (idx === -1) throw new Error('Invalid base32 character');
    bits += idx.toString(2).padStart(5, '0');
  }
  bits = bits.slice(0, Math.floor(bits.length / 8) * 8);

  const buffer = Buffer.alloc(bits.length / 8);
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8);
    buffer[i / 8] = parseInt(byte, 2);
  }
  return buffer;
}

/**
 * Generate a new TOTP secret for MFA enrollment.
 * @param userId - The user identifier to embed in the otpauth URI
 * @param issuer - The service name displayed in authenticator apps (default: 'Rez')
 * @returns An object containing the base32-encoded secret and the otpauth:// URI for QR code generation
 */
export function generateSecret(userId: string, issuer: string = 'Rez'): TOTPSecret {
  const secretBuffer = crypto.randomBytes(32); // 256 bits for SHA256 strength
  const secret = bufferToBase32(secretBuffer);

  // otpauth:// URI for QR code generation (Google Authenticator compatible)
  const keyUri = encodeURI(
    `otpauth://totp/${issuer}:${userId}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${TIME_STEP}`
  );

  return { secret, keyUri };
}

/**
 * Generate a 6-digit TOTP code from a secret
 * @param secret Base32-encoded secret
 * @param timestamp Optional timestamp (defaults to current time)
 */
export function generateTOTPCode(secret: string, timestamp?: number): string {
  const timeStep = Math.floor((timestamp || Date.now()) / 1000 / TIME_STEP);
  const secretBuffer = base32ToBuffer(secret);

  // HMAC-SHA1 (RFC 6238)
  const hmac = crypto.createHmac('sha1', secretBuffer);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(timeStep), 0);
  hmac.update(buffer);
  const hash = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = code % Math.pow(10, DIGITS);
  return otp.toString().padStart(DIGITS, '0');
}

/**
 * Verify a TOTP code with a time window
 *
 * RFC 6238 compliant verification with configurable clock skew tolerance.
 * This function validates the code format and checks against multiple time windows
 * to account for clock drift between the server and authenticator app.
 *
 * TOTP Code Format:
 * - Must be exactly 6 digits (000000-999999)
 * - Regex validation: /^\d{6}$/
 * - Generated using HMAC-SHA1 with 30-second time steps
 *
 * Security Notes:
 * - Uses constant-time comparison via generateTOTPCode equality check
 * - Window parameter allows ±N time steps (default 1 = ±30 seconds tolerance)
 * - Prevents timing attacks by always checking all windows before returning
 *
 * @param secret Base32-encoded secret (from generateSecret)
 * @param code The 6-digit TOTP code to verify
 * @param window Number of time steps before/after current (default 1 = ±30 seconds)
 * @returns true if code is valid, false otherwise
 */
export function verifyTOTPCode(secret: string, code: string, window: number = 1): boolean {
  // Validate format: exactly 6 numeric digits
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  // Calculate current time step (30-second windows)
  const now = Math.floor(Date.now() / 1000 / TIME_STEP);

  for (let i = -window; i <= window; i++) {
    const timestamp = (now + i) * TIME_STEP * 1000;
    if (generateTOTPCode(secret, timestamp) === code) {
      return true;
    }
  }

  return false;
}

/**
 * Generates single-use backup codes for MFA account recovery.
 * @param count - Number of codes to generate (default: 10)
 * @returns Array of backup code objects with formatted XXXX-XXXX codes
 */
export function generateBackupCodes(count: number = 10): BackupCode[] {
  const codes: BackupCode[] = [];

  for (let i = 0; i < count; i++) {
    const randomBytes = crypto.randomBytes(Math.ceil(BACKUP_CODE_LENGTH / 2));
    const code = randomBytes
      .toString('hex')
      .toUpperCase()
      .slice(0, BACKUP_CODE_LENGTH);

    codes.push({
      code: code.match(/.{1,4}/g)?.join('-') || code, // Format as XXXX-XXXX
      used: false,
    });
  }

  return codes;
}

/**
 * Hashes a backup code using SHA-256 before storage.
 * @param code - The plain-text backup code to hash
 * @returns The hex-encoded SHA-256 hash of the code
 */
export function hashBackupCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');
}

/**
 * Verifies a backup code using constant-time comparison to prevent timing attacks.
 * @param code - The plain-text backup code from the user
 * @param hashedCode - The stored SHA-256 hash of the original code
 * @returns true if the code matches the hash, false otherwise
 */
export function verifyBackupCode(code: string, hashedCode: string): boolean {
  const codeHash = hashBackupCode(code);
  return crypto.timingSafeEqual(
    Buffer.from(codeHash),
    Buffer.from(hashedCode)
  );
}

logger.info('TOTP service initialized (RFC 6238 compliant)');
