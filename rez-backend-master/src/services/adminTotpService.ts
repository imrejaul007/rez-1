import * as OTPAuth from 'otpauth';
import crypto from 'crypto';
import { User } from '../models/User';
import { logger } from '../config/logger';

const TOTP_ISSUER = 'REZ Admin';
const TOTP_ALGORITHM = 'SHA1';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;

// Encrypt/decrypt TOTP secret for storage
const ENCRYPTION_KEY = process.env.JWT_SECRET?.slice(0, 32).padEnd(32, '0') || '';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate a TOTP secret for an admin user and return the setup URI (for QR code).
 * Does NOT enable TOTP — call enableTotp after first successful verification.
 */
export async function generateTotpSecret(userId: string): Promise<{ secret: string; uri: string }> {
  const user = await User.findById(userId).select('+auth.totpSecret');
  if (!user) throw new Error('User not found');

  const secret = new OTPAuth.Secret({ size: 20 });

  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: user.email || user.phoneNumber || 'Admin',
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  });

  // Store encrypted secret (not yet enabled)
  user.auth.totpSecret = encrypt(secret.base32);
  user.auth.totpEnabled = false;
  await user.save();

  logger.info(`[TOTP] Secret generated for admin user ${userId}`);

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Verify a 6-digit TOTP code against the stored secret.
 */
export async function verifyTotp(userId: string, code: string): Promise<boolean> {
  const user = await User.findById(userId).select('+auth.totpSecret');
  if (!user || !user.auth.totpSecret) return false;

  const secretBase32 = decrypt(user.auth.totpSecret);

  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  // Allow 1 period of drift (window=1 means ±30s)
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/**
 * Enable TOTP after first successful verification.
 */
export async function enableTotp(userId: string, code: string): Promise<boolean> {
  const isValid = await verifyTotp(userId, code);
  if (!isValid) return false;

  await User.findByIdAndUpdate(userId, { $set: { 'auth.totpEnabled': true } });
  logger.info(`[TOTP] 2FA enabled for admin user ${userId}`);
  return true;
}

/**
 * Disable TOTP — requires a valid code to prevent unauthorized disabling.
 */
export async function disableTotp(userId: string, code: string): Promise<boolean> {
  const isValid = await verifyTotp(userId, code);
  if (!isValid) return false;

  await User.findByIdAndUpdate(userId, {
    $set: { 'auth.totpEnabled': false },
    $unset: { 'auth.totpSecret': 1 },
  });
  logger.info(`[TOTP] 2FA disabled for admin user ${userId}`);
  return true;
}

/**
 * Check if a user has TOTP enabled.
 */
export async function isTotpEnabled(userId: string): Promise<boolean> {
  const user = await User.findById(userId).select('auth.totpEnabled').lean();
  return user?.auth?.totpEnabled === true;
}
