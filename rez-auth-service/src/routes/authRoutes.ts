import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import type { AuthServiceUser } from '../types/user.types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as otpService from '../services/otpService';
import * as tokenService from '../services/tokenService';
import * as emailService from '../services/emailService';
import * as deviceService from '../services/deviceService';
import { PinSchema, OtpVerifySchema, RefreshTokenSchema, ProfileUpdateSchema, CompleteOnboardingSchema, EmailVerifyRequestSchema } from '../schemas';
import { z } from 'zod';
import * as totpService from '../services/totpService';
import { encryptTotpSecret, decryptTotpSecret, isEncrypted } from '../services/totpEncryption';
import { AdminMfaConfig } from '../models/AdminMfaConfig';
import { requireInternalToken } from '../middleware/internalAuth';
import { otpLimiter, otpSendPhoneLimiter, otpVerifyPhoneLimiter, authLimiter, adminLoginLimiter, hasPinLimiter, hasPinIpLimiter, profileUpdateLimiter, getMeLimiter, emailVerifyLimiter } from '../middleware/rateLimiter';
import { createServiceLogger } from '../config/logger';
import { redis } from '../config/redis';
import { randomUUID } from 'crypto';
import { ApiError } from '../utils/errorResponse';
import { err } from '../utils/response';
import { sendAuthSignupToRezMind, sendAuthLoginToRezMind } from '../services/rezMindService';
// Phase 6.24: App Check middleware to prevent bot/abuse of OTP endpoints.
// Optional in dev (allows curl/no-token), enforced in production.
import { optionalAppCheck } from '../middleware/appCheckVerifier';
// Stub functions for tracking (not implemented in @rez/shared)
const trackUserSignup = async (_userId: string, _data: unknown) => {};
const trackUserLogin = async (_userId: string, _data: unknown) => {};

// ── TOTP/MFA Infrastructure (XSC-07) ───────────────────────────────────
// RFC 6238 TOTP using Node.js built-in crypto (HMAC-SHA1, 6-digit, 30s window).
// Uses base32-encoded secrets. Provides TOTP generation + verification
// for admin/merchant MFA enrollment and login challenge.
// ─────────────────────────────────────────────────────────────────────────

const TOTP_PERIOD = 30;     // seconds per code window
const TOTP_DIGITS = 6;      // standard 6-digit TOTP
const TOTP_ISSUER = 'REZ';  // displayed in authenticator apps
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Base32-decode a string into a Buffer. */
function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bits: string[] = [];
  for (const c of clean) {
    const n = BASE32.indexOf(c);
    bits.push(n.toString(2).padStart(5, '0'));
  }
  const bitStr = bits.join('');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bitStr.length; i += 8) {
    bytes.push(parseInt(bitStr.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** Generate a random base32 TOTP secret (20 bytes / 160 bits). */
function generateTOTPSecret(): string {
  // RFC 6238 recommends at least 160 bits of entropy
  const buf = crypto.randomBytes(20);
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    out += BASE32[buf[i] & 0x1f];
  }
  return out;
}

/** RFC 6238 TOTP: generate a code at a specific timestamp (ms). */
function generateTOTP(secret: string, timeMs: number): string {
  const key = base32Decode(secret);
  const counter = Math.floor(timeMs / 1000 / TOTP_PERIOD);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuf);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const otp = binary % 10 ** TOTP_DIGITS;
  return String(otp).padStart(TOTP_DIGITS, '0');
}

/** Verify a 6-digit TOTP with ±1 time-window tolerance (handles clock skew). */
function verifyTOTP(secret: string, token: string, window = 1): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const now = Date.now();
  for (let delta = -window; delta <= window; delta++) {
    if (generateTOTP(secret, now + delta * TOTP_PERIOD * 1000) === token) return true;
  }
  return false;
}

/** Build an otpauth:// URI for QR code generation in authenticator apps. */
function totpAuthURI(secret: string, accountName: string): string {
  const params = new URLSearchParams({
    secret,
    issuer: TOTP_ISSUER,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD),
  });
  return `otpauth://totp/${encodeURIComponent(`${TOTP_ISSUER}:${accountName}`)}?${params.toString()}`;
}

const logger = createServiceLogger('routes');
const router = Router();

// ── Helpers ───────────────────────────────────────────────────

/** Shape of phone fields used in request bodies and query strings */
interface PhoneFields {
  phone?: string | null;
  countryCode?: string | null;
  phoneNumber?: string | null;
}

/** Shape of parsed onboarding profile (after Zod validation) */
interface OnboardingProfile {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
}

/** Shape of parsed onboarding preferences (after Zod validation) */
interface OnboardingPreferences {
  categories?: string[];
  notifications?: boolean;
  marketingEmails?: boolean;
  language?: string;
  currency?: string;
  theme?: string;
  dietaryPreferences?: string;
}

/** Parse either { phone, countryCode } or E.164 { phoneNumber } into { phone, countryCode } */
export function parsePhone(body: PhoneFields): { phone: string; countryCode: string } | null {
  let { phone, countryCode = '+91', phoneNumber } = body;
  if (!phone && phoneNumber) {
    const e164 = String(phoneNumber).replace(/\s/g, '');
    const match = e164.match(/^(\+\d{1,3})(\d+)$/);
    if (match) { countryCode = match[1]; phone = match[2]; }
    else { phone = e164; }
  }
  if (!phone) return null;
  const phoneStr = String(phone).trim();
  // SECURITY: tightened from 5-15 to 7-15 digits. 5-digit numbers are SMS
  // short codes and would never be a valid user phone — accepting them
  // produces inconsistent rate-limit buckets when the same phone is also
  // submitted with the leading country code.
  if (!/^\d{7,15}$/.test(phoneStr)) return null;
  const countryCodeStr = String(countryCode).trim();
  if (!/^\+\d{1,3}$/.test(countryCodeStr)) return null; // +XX format
  return { phone: phoneStr, countryCode: countryCodeStr };
}

/** Build a consistent user response object from a MongoDB user doc */
function buildUserResponse(user: AuthServiceUser) {
  const id = user._id.toString();
  const fullPhone = (user.phoneNumber || user.phone || '') as string;
  const firstName = user.profile?.firstName || '';
  const lastName = user.profile?.lastName || '';
  const name = user.name || [firstName, lastName].filter(Boolean).join(' ') || '';
  const isOnboarded = !!(user.auth?.isOnboarded);
  return {
    id,
    _id: id,
    name,
    phone: fullPhone,
    phoneNumber: fullPhone,
    email: user.email || '',
    role: (user.role as string) || 'consumer',
    isVerified: user.auth?.isVerified ?? false,
    isOnboarded,
    profile: {
      ...(user.profile || {}),
    },
  };
}

const COMMON_PINS = [
  // 4-digit
  '0000','1111','2222','3333','4444','5555','6666','7777','8888','9999',
  '1234','4321','1212','0101','1010','1122','2211','2580','1357',
  // 5-digit
  '12345','54321','11111','00000','99999','55555',
  // 6-digit
  '123456','654321','111111','000000','999999','112233','121212','123123',
  '696969','159753','123321','666666',
];

// ── Send OTP ──────────────────────────────────────────────────
/**
 * @route POST /send-otp
 * @summary Send OTP for phone authentication
 * @tags OTP
 * @description |
 *   Sends a 6-digit OTP via SMS or WhatsApp for phone verification.
 *   If the user has a PIN set, returns hasPIN:true to redirect to PIN login.
 *   Rate limited: 3 per minute per phone, 5 per 15 minutes per IP.
 * @param {object} req.body - Request body
 * @param {string} req.body.phone - Phone number (digits only, 5-15 chars)
 * @param {string} [req.body.countryCode="+91"] - Country code
 * @param {string} [req.body.channel="sms"] - Delivery channel: "sms" or "whatsapp"
 * @param {boolean} [req.body.force] - Force OTP send even if user has PIN set
 * @response {object} 200 - OTP sent or PIN redirect
 * @response {object} 429 - Rate limit exceeded
 */
async function sendOTPHandler(req: Request, res: Response) {
  try {
    const parsed = parsePhone(req.body);
    if (!parsed) { throw new ApiError(400, 'Phone required'); }

    const fullPhone = `${parsed.countryCode}${parsed.phone}`;
    const Users = mongoose.connection.collection('users');
    const existingUser = await Users.findOne(
      { $or: [{ phoneNumber: fullPhone }, { phone: fullPhone }] },
      { projection: { 'auth.pinHash': 1, 'auth.isOnboarded': 1, isActive: 1 } },
    );

    const isNewUser = !existingUser;
    const hasPIN = !!(existingUser?.auth?.pinHash);

    // Existing user with PIN set — skip OTP, tell frontend to show PIN login.
    // Pass force:true in the request body to send OTP anyway (forgot-PIN flow).
    const forceOtp = req.body.force === true || String(req.body.force) === 'true';
    if (!isNewUser && hasPIN && !forceOtp) {
      res.json({ success: true, isNewUser: false, hasPIN: true, message: 'Please login with your PIN' });
      return;
    }

    const channel: 'sms' | 'whatsapp' = req.body.channel === 'whatsapp' ? 'whatsapp' : 'sms';
    const result = await otpService.sendOTP(parsed.phone, parsed.countryCode, channel);
    res.json({ ...result, isNewUser, hasPIN });
  } catch (err: any) {
    logger.error('OTP send error', { error: err.message });
    throw new ApiError(500, 'Failed to send OTP');
  }
}
// Per-phone limiter (3/min) runs first, then per-IP limiter (5/15min) as a second layer
// Phase 6.24: optionalAppCheck runs the verifier IF a token header is present.
// In production with APP_CHECK_SECRET_KEY set, the client must send a valid
// x-firebase-appcheck header. In dev (no secret), requests pass through
// without verification. This blocks bot abuse of the OTP endpoint without
// breaking local development.
router.post('/auth/otp/send', optionalAppCheck, otpSendPhoneLimiter, otpLimiter, sendOTPHandler);

// Legacy aliases — gateway strips /api/user/auth/ and sends bare paths.
// These ensure the auth microservice is reachable from the API gateway
// without requiring path rewrites that differ between monolith and microservice.
router.post('/user/auth/send-otp', optionalAppCheck, otpSendPhoneLimiter, otpLimiter, sendOTPHandler);

// P0 ALIAS: Nuqta frontend calls POST /auth/send-otp. The gateway rewrites
// /api/auth/send-otp → /api/v1/auth/send-otp, which must hit this service.
// Mounts the canonical sendOTPHandler under the frontend's URL.
router.post('/auth/send-otp', optionalAppCheck, otpSendPhoneLimiter, otpLimiter, sendOTPHandler);

// ── Verify OTP ────────────────────────────────────────────────
/**
 * @route POST /verify-otp
 * @summary Verify OTP and complete authentication
 * @tags OTP
 * @description |
 *   Verifies the 6-digit OTP and issues JWT access and refresh tokens.
 *   Creates a new user atomically on first verification.
 *   If MFA is enabled, returns mfaRequired:true with a session token.
 * @param {object} req.body - Request body
 * @param {string} req.body.phone - Phone number
 * @param {string} req.body.otp - 6-digit OTP code
 * @param {string} [req.body.countryCode="+91"] - Country code
 * @response {object} 200 - Authentication successful
 * @response {object} 401 - Invalid OTP
 */
async function verifyOTPHandler(req: Request, res: Response) {
  try {
    // SECURITY: validate input via Zod. Rejects unknown keys (mass-assignment)
    // and enforces OTP format. 4-8 digits to support both prod (6) and dev (4).
    const validated = OtpVerifySchema.safeParse(req.body);
    if (!validated.success) {
      throw new ApiError(400, validated.error.issues.map((i) => i.message).join('; '));
    }
    const { otp } = validated.data;
    const parsed = parsePhone(validated.data);
    if (!parsed) { throw new ApiError(400, 'Phone required'); }

    const result = await otpService.verifyOTP(parsed.phone, otp, parsed.countryCode);
    if (!result.valid) {
      const REASON_MESSAGES: Record<string, string> = {
        locked: 'Phone is temporarily locked due to too many failed attempts.',
        max_attempts: 'Maximum OTP attempts reached. Please try again in 30 minutes.',
        not_found: 'OTP has expired or was never sent. Please request a new one.',
        invalid: 'Invalid OTP. Please check and try again.',
      };
      const message = REASON_MESSAGES[result.reason ?? 'invalid'] ?? 'Invalid or expired OTP';
      throw new ApiError(401, message, 'INVALID_OTP', { reason: result.reason });
    }

    const Users = mongoose.connection.collection('users');
    const fullPhone = `${parsed.countryCode}${parsed.phone}`;

    // Atomic upsert — eliminates the TOCTOU race between findOne and insertOne
    // for new-user creation. Two concurrent OTP verifications for the same phone
    // would both have seen user===null and both called insertOne, creating duplicates.
    // returnDocument:'after' returns the doc whether it was just inserted or already existed.
    const now = new Date();
    const upsertResult = await Users.findOneAndUpdate(
      { $or: [{ phoneNumber: fullPhone }, { phone: fullPhone }] },
      {
        $setOnInsert: {
          phoneNumber: fullPhone,
          phone: fullPhone,
          role: 'user',
          isActive: true,
          auth: { isOnboarded: false },
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    let user = upsertResult;
    const isNewUser = !!(user && user.createdAt && Math.abs(user.createdAt.getTime() - now.getTime()) < 1000);

    // Reject deactivated/deleted accounts
    if (user && user.isActive === false) {
      throw new ApiError(403, 'This account has been deactivated. Please contact support.');
    }

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const userId = user._id.toString();

    // SEC-005: Check if user has MFA enabled
    const MfaConfig = mongoose.connection.model('MfaConfig');
    const mfaConfig = await MfaConfig.findOne({ userId: new mongoose.Types.ObjectId(userId), isEnabled: true }).lean();

    if (mfaConfig) {
      // MFA is enabled — require TOTP verification
      // SECURITY FIX: Use signed JWT for MFA session token instead of random hex string.
      // Previously, the random hex token was stored in Redis but not cryptographically signed,
      // meaning any tampering with the token would go undetected. Using a signed JWT ensures
      // the token payload cannot be modified without detection.
      const mfaSecret = process.env.JWT_MFA_SESSION_SECRET || process.env.JWT_SECRET;
      if (!mfaSecret) {
        logger.error('SEC-005: MFA session JWT secret not configured');
        throw new ApiError(500, 'MFA service unavailable');
      }
      const mfaSessionPayload = {
        userId,
        phone: fullPhone,
        role: user.role || 'user',
        deviceFingerprint: deviceService.computeFingerprint(req.headers as Record<string, string | string[] | undefined>),
        purpose: 'mfa_verify',
      };
      const mfaSessionToken = jwt.sign(mfaSessionPayload, mfaSecret, { expiresIn: '5m' });
      await redis.setex(`mfa:verify:${mfaSessionToken}`, 300, JSON.stringify({
        userId,
        phone: fullPhone,
        role: user.role || 'user',
        deviceFingerprint: deviceService.computeFingerprint(req.headers as Record<string, string | string[] | undefined>),
      }));

      logger.info('SEC-005: MFA required for user', { userId });

      return res.json({
        success: true,
        mfaRequired: true,
        mfaSessionToken,
        message: 'Please enter your authenticator code to complete login.',
        backupCodesAvailable: (mfaConfig as { backupCodes?: Array<{ used?: boolean }> }).backupCodes?.filter((c) => !c.used).length || 0,
      });
    }

    // No MFA — complete login
    return completeLogin(req, res, user, fullPhone, isNewUser);
  } catch (err: any) {
    // Re-throw ApiError as-is so the original status code (400 for bad input,
    // 401 for bad OTP, 403 for deactivated, etc.) is preserved instead of all
    // failures collapsing to 500. Only unknown errors get wrapped.
    if (err instanceof ApiError) throw err;
    logger.error('OTP verify error', { error: err.message, stack: err.stack });
    throw new ApiError(500, 'Verification failed');
  }
}

/**
 * Complete login after OTP and optional MFA verification
 * SEC-005: Separated from verifyOTPHandler to allow MFA flow
 */
async function completeLogin(req: Request, res: Response, user: any, fullPhone: string, isNewUser = false) {
  const userId = user._id.toString();
  const role = (user.role as string) || 'user';

  const deviceHash = deviceService.computeFingerprint(req.headers as Record<string, string | string[] | undefined>);
  // Device tracking is best-effort — Redis errors must not block login
  let deviceRisk: 'trusted' | 'new' | 'suspicious' = 'new';
  try {
    deviceRisk = await deviceService.assessRisk(userId, deviceHash);
    await deviceService.recordDevice(userId, deviceHash);
  } catch {
    logger.warn('Device tracking unavailable — defaulting to "new"');
  }

  // Embed phone in JWT so web-ordering routes can resolve the customer without a DB call.
  const accessToken = tokenService.generateAccessToken(userId, role, { phoneNumber: fullPhone });
  const refreshToken = tokenService.generateRefreshToken(userId, role);

  // Backfill phoneNumber on existing users missing it
  const updateFields: Record<string, any> = { lastLogin: new Date(), updatedAt: new Date() };
  if (!user.phoneNumber) { updateFields.phoneNumber = fullPhone; updateFields.phone = fullPhone; }
  await mongoose.connection.collection('users').updateOne({ _id: user._id }, { $set: updateFields });

  // Send to REZ Mind
  if (isNewUser) {
    sendAuthSignupToRezMind({ user_id: userId, method: 'phone' }).catch(() => {});
  } else {
    sendAuthLoginToRezMind({ user_id: userId, method: 'phone', success: true }).catch(() => {});
  }

  const userResponse = buildUserResponse(user as AuthServiceUser);
  res.json({
    success: true,
    isNewUser,
    accessToken,
    refreshToken,
    tokens: { accessToken, refreshToken, expiresIn: parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '900', 10) },
    user: userResponse,
    deviceRisk,
  });
}
// Per-phone verify limiter (5/min) then general auth limiter as a second layer
router.post('/auth/otp/verify', optionalAppCheck, otpVerifyPhoneLimiter, authLimiter, verifyOTPHandler);

// Legacy alias — same reason as /user/auth/send-otp above.
router.post('/user/auth/verify-otp', optionalAppCheck, otpVerifyPhoneLimiter, authLimiter, verifyOTPHandler);

// P0 ALIAS: Nuqta frontend calls POST /auth/verify-otp. Same rationale as
// /auth/send-otp above — re-mounts the canonical verifyOTPHandler.
router.post('/auth/verify-otp', optionalAppCheck, otpVerifyPhoneLimiter, authLimiter, verifyOTPHandler);

/**
 * SEC-005: POST /auth/mfa/verify-otp
 * Complete login after MFA verification
 * Called after OTP verification returns mfaRequired: true
 */
router.post('/auth/mfa/verify-otp', authLimiter, async (req: Request, res: Response) => {
  try {
    const { mfaSessionToken, totpCode } = req.body;

    if (!mfaSessionToken || !totpCode) {
      throw new ApiError(400, 'mfaSessionToken and totpCode are required');
    }

    // SECURITY FIX: Verify JWT signature before using the session token.
    // Previously, only checked Redis existence without cryptographic verification.
    const mfaSecret = process.env.JWT_MFA_SESSION_SECRET || process.env.JWT_SECRET;
    if (!mfaSecret) {
      logger.error('SEC-005: MFA session JWT secret not configured');
      throw new ApiError(500, 'MFA service unavailable');
    }

    let jwtPayload: any;
    try {
      jwtPayload = jwt.verify(mfaSessionToken, mfaSecret);
    } catch (jwtErr: any) {
      logger.warn('SEC-005: Invalid MFA session JWT', { error: jwtErr.message });
      throw new ApiError(401, 'MFA session expired or invalid. Please login again.');
    }

    if (jwtPayload.purpose !== 'mfa_verify') {
      logger.warn('SEC-005: MFA session JWT wrong purpose', { purpose: jwtPayload.purpose });
      throw new ApiError(401, 'Invalid MFA session token. Please login again.');
    }

    // Get stored session from Redis (still used for tracking, but JWT is authoritative)
    const sessionJson = await redis.get(`mfa:verify:${mfaSessionToken}`);
    if (!sessionJson) {
      throw new ApiError(401, 'MFA session expired. Please login again.');
    }

    const session = JSON.parse(sessionJson);
    // Use userId from JWT payload (authoritative) instead of session
    const { phone, role, deviceFingerprint } = session;
    const userId = jwtPayload.userId;

    // Get user's MFA config
    const MfaConfig = mongoose.connection.model('MfaConfig');
    const mfaConfig = await MfaConfig.findOne({ userId: new mongoose.Types.ObjectId(userId), isEnabled: true });

    if (!mfaConfig) {
      throw new ApiError(400, 'MFA not enabled for this account');
    }

    // Decrypt the TOTP secret
    const secret = await decryptTotpSecret(mfaConfig.secret);
    const codeValid = verifyTOTP(secret, totpCode);

    if (!codeValid) {
      logger.warn('SEC-005: Invalid TOTP during MFA login', { userId });
      throw new ApiError(401, 'Invalid authenticator code. Please try again.');
    }

    // TOTP valid — complete login
    await redis.unlink(`mfa:verify:${mfaSessionToken}`);

    // Get user document
    const Users = mongoose.connection.collection('users');
    const user = await Users.findOne({ _id: new mongoose.Types.ObjectId(userId) });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Device tracking
    let deviceRisk: 'trusted' | 'new' | 'suspicious' = 'new';
    try {
      deviceRisk = await deviceService.assessRisk(userId, deviceFingerprint);
      await deviceService.recordDevice(userId, deviceFingerprint);
    } catch {
      logger.warn('Device tracking unavailable — defaulting to "new"');
    }

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(userId, role, { phoneNumber: phone });
    const refreshToken = tokenService.generateRefreshToken(userId, role);

    // Update last login
    await Users.updateOne({ _id: user._id }, { $set: { lastLogin: new Date(), updatedAt: new Date() } });

    // Update MFA last verified
    await MfaConfig.updateOne({ userId: new mongoose.Types.ObjectId(userId) }, { $set: { lastVerifiedAt: new Date() } });

    const userResponse = buildUserResponse(user as AuthServiceUser);

    logger.info('SEC-005: MFA login successful', { userId });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      tokens: { accessToken, refreshToken, expiresIn: parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '900', 10) },
      user: userResponse,
      deviceRisk,
    });
  } catch (err: any) {
    logger.error('SEC-005: MFA verify error', { error: err.message });
    throw new ApiError(500, 'MFA verification failed');
  }
});

// ── Legacy aliases for API gateway path compatibility ─────────────────────────
// Gateway strips /api/user/auth/ and sends bare paths (e.g. /logout, /me).
// These aliases let the auth microservice handle requests from both the gateway
// and direct consumer-app calls without a path-rewrite mismatch.
// ───────────────────────────────────────────────────────────────────────────────

// Aliases for protected user endpoints
router.post('/user/auth/logout', authLimiter, logoutHandler);
router.get('/user/auth/me', getMeLimiter, getMeHandler);
router.patch('/user/auth/profile', profileUpdateLimiter, authLimiter, updateProfileHandler);
router.post('/user/auth/complete-onboarding', authLimiter, completeOnboardingHandler);
router.delete('/user/auth/account', authLimiter, deleteAccountHandler);

// Alias for /user/auth/refresh-token → /auth/refresh (consumer app naming)
router.post('/user/auth/refresh-token', authLimiter, refreshHandler);

// Legacy alias for PIN login (ReZ Now calls POST /user/auth/login-pin)
router.post('/user/auth/login-pin', authLimiter, loginPinHandler);

// ── Bare path aliases — gateway strips /api/user/auth/* → bare paths ────────────
// nginx gateway rewrites:
//   /api/user/auth/send-otp      → /send-otp
//   /api/user/auth/verify-otp   → /verify-otp
//   /api/user/auth/login-pin    → /login-pin
//   /api/user/auth/logout       → /logout
//   /api/user/auth/me           → /me
//   /api/user/auth/profile      → /profile
//   /api/user/auth/complete-onboarding → /complete-onboarding
//   /api/user/auth/account      → /account
//   /api/user/auth/refresh-token → /refresh-token
// These ensure the auth microservice handles gateway-stripped bare paths.
// ───────────────────────────────────────────────────────────────────────────────
router.post('/send-otp', otpSendPhoneLimiter, otpLimiter, sendOTPHandler);
router.post('/verify-otp', otpVerifyPhoneLimiter, authLimiter, verifyOTPHandler);
router.post('/login-pin', authLimiter, loginPinHandler);
router.post('/logout', authLimiter, logoutHandler);
router.get('/me', getMeLimiter, getMeHandler);
router.patch('/profile', profileUpdateLimiter, authLimiter, updateProfileHandler);
router.post('/complete-onboarding', authLimiter, completeOnboardingHandler);
router.delete('/account', authLimiter, deleteAccountHandler);
router.post('/refresh-token', authLimiter, refreshHandler);

// ── PIN login (returning users) ───────────────────────────────
/**
 * @route POST /login-pin
 * @summary PIN Login for returning users
 * @tags PIN
 * @description |
 *   Authenticates returning users with a 4-6 digit PIN.
 *   Issues JWT tokens upon successful authentication.
 *   Security: 5 failed attempts triggers 15-minute lockout.
 * @response {object} 200 - Login successful
 * @response {object} 401 - Invalid PIN
 * @response {object} 429 - Account locked
 */
async function loginPinHandler(req: Request, res: Response) {
  try {
    // SECURITY: validate input via Zod before touching the DB. The previous
    // ad-hoc parser accepted `pin: { $ne: null }` style inputs that could
    // confuse downstream lookups.
    const validated = PinSchema.safeParse(req.body);
    if (!validated.success) {
      throw new ApiError(400, validated.error.issues.map((i) => i.message).join('; '));
    }
    const { pin } = validated.data;
    // Re-run parsePhone with the now-validated payload (keeps country-code logic).
    const parsed = parsePhone(validated.data);
    if (!parsed) { throw new ApiError(400, 'Phone required'); }

    const Users = mongoose.connection.collection('users');
    const fullPhone = `${parsed.countryCode}${parsed.phone}`;
    const user = await Users.findOne({ $or: [{ phoneNumber: fullPhone }, { phone: fullPhone }] });
    if (!user || user.isActive === false) { throw new ApiError(401, 'Invalid credentials'); }

    const pinHash = user.auth?.pinHash as string | undefined;
    if (!pinHash) {
      throw new ApiError(400, 'PIN not set. Please login with OTP first.');
    }

    // Check PIN lockout
    const lockKey = `pin-lock:${user._id}`;
    const failKey = `pin-fail:${user._id}`;
    const { redis } = await import('../config/redis');
    const locked = await redis.exists(lockKey);
    if (locked) {
      throw new ApiError(429, 'Account locked due to too many failed PIN attempts. Try again in 15 minutes.');
    }

    // Validate PIN format: must be 4–6 numeric digits before any other check.
    // Prevents non-numeric or over-length PINs from reaching the bcrypt compare.
    if (!/^\d{4,6}$/.test(String(pin))) {
      throw new ApiError(400, 'PIN must be 4–6 numeric digits');
    }

    const pinValid = await bcrypt.compare(String(pin), pinHash);
    if (!pinValid) {
      const fails = await redis.incr(failKey);
      if (fails === 1) await redis.expire(failKey, 900);
      if (fails >= 5) {
        await redis.set(lockKey, '1', 'EX', 900); // 15 min lockout
        // PERF: UNLINK returns immediately while Redis deletes asynchronously in background.
        await redis.unlink(failKey);
        throw new ApiError(429, 'Too many failed attempts. Account locked for 15 minutes.');
      } else {
        throw new ApiError(401, 'Invalid PIN', 'INVALID_PIN', { attemptsRemaining: 5 - fails });
      }
    }

    // Clear failures on success
    // PERF: UNLINK returns immediately while Redis deletes asynchronously in background.
    await redis.unlink(failKey);

    const userId = user._id.toString();
    const role = (user.role as string) || 'user';

    const deviceHash = deviceService.computeFingerprint(req.headers as Record<string, string | string[] | undefined>);
    // Device tracking is best-effort — Redis errors must not block login
    let deviceRisk: 'trusted' | 'new' | 'suspicious' = 'new';
    try {
      deviceRisk = await deviceService.assessRisk(userId, deviceHash);
      await deviceService.recordDevice(userId, deviceHash);
    } catch {
      logger.warn('Device tracking unavailable — defaulting to "new"');
    }

    const accessToken = tokenService.generateAccessToken(userId, role, { phoneNumber: fullPhone });
    const refreshToken = tokenService.generateRefreshToken(userId, role);

    await Users.updateOne({ _id: user._id }, { $set: { lastLogin: new Date(), updatedAt: new Date() } });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      tokens: { accessToken, refreshToken, expiresIn: parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '900', 10) },
      user: buildUserResponse(user as AuthServiceUser),
      deviceRisk,
    });
  } catch (err: any) {
    logger.error('PIN login error', { error: err.message });
    throw new ApiError(500, 'Login failed');
  }
}
router.post('/auth/login-pin', authLimiter, loginPinHandler);

// ── Has PIN (check without sending OTP) ──────────────────────
// BAK-AUTH-001 FIX: Return identical response for all cases to prevent account enumeration.
// Previously leaked `exists` and `hasPIN` booleans allowing attackers to enumerate
// which phone numbers are registered and whether they have a PIN set.
async function hasPinHandler(req: Request, res: Response) {
  try {
    const parsed = parsePhone(req.query as unknown as PhoneFields);
    if (!parsed) { throw new ApiError(400, 'Phone required'); }
    // Always return 200 with success:true — never reveal whether the user exists
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Has-PIN check error', { error: err.message });
    throw new ApiError(500, 'Failed to check PIN status');
  }
}
// SECURITY FIX (AUTH-ENUM-001): Dual-layer rate limiting
// - hasPinIpLimiter: 120 req/min per IP (catches distributed attacks first)
// - hasPinLimiter: 60 req/min per PHONE (prevents phone enumeration)
// Both are fail-closed to prevent bypass during Redis outages
router.get('/auth/has-pin', hasPinIpLimiter, hasPinLimiter, hasPinHandler);

// ── Set PIN ───────────────────────────────────────────────────
/**
 * @route POST /auth/set-pin
 * @summary Set or update user PIN
 * @tags PIN
 * @security BearerAuth
 * @description Sets a new PIN for the authenticated user. Rejects common PINs.
 * @response {object} 200 - PIN set successfully
 * @response {object} 400 - PIN is too common or invalid
 */
async function setPinHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { throw new ApiError(401, 'Not authenticated'); }
    const decoded = await tokenService.validateToken(header.slice(7));

    // SECURITY: validate via Zod. The previous inline regex accepted any
    // property on req.body alongside the PIN — a potential mass-assignment
    // vector if the request body was ever passed to a model update.
    const validated = z.strictObject({ pin: z.string().regex(/^\d{4,6}$/) }).safeParse(req.body);
    if (!validated.success) {
      throw new ApiError(400, 'PIN must be 4–6 digits');
    }
    const { pin } = validated.data;
    if (COMMON_PINS.includes(pin)) {
      throw new ApiError(400, 'PIN is too common. Please choose a less predictable PIN.');
    }

    const pinHash = await bcrypt.hash(pin, 12);
    const Users = mongoose.connection.collection('users');
    await Users.updateOne(
      { _id: new mongoose.Types.ObjectId(decoded.userId) },
      { $set: { 'auth.pinHash': pinHash, 'auth.pinSetAt': new Date(), 'auth.pinAttempts': 0, 'auth.pinLockedUntil': null } }
    );

    res.json({ success: true, message: 'PIN set successfully' });
  } catch (err: any) {
    logger.error('Set PIN error', { error: err.message });
    throw new ApiError(500, 'Failed to set PIN');
  }
}
router.post('/auth/set-pin', authLimiter, setPinHandler);

// ── Complete onboarding ──────────────────────────────────────
/**
 * @route POST /auth/complete-onboarding
 * @summary Complete user onboarding
 * @tags Profile
 * @security BearerAuth
 * @description Completes onboarding by setting profile and preferences.
 * @response {object} 200 - Onboarding completed
 */
async function completeOnboardingHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { throw new ApiError(401, 'Not authenticated'); }
    const decoded = await tokenService.validateToken(header.slice(7));

    // SECURITY: validate body via Zod. The handler below also applies an
    // explicit allowlist per nested object, but the Zod pass ensures the
    // outer shape and rejects unknown top-level keys up front.
    const validated = CompleteOnboardingSchema.safeParse(req.body);
    if (!validated.success) {
      throw new ApiError(400, validated.error.issues.map((i) => i.message).join('; '));
    }
    const { profile, preferences } = validated.data;

    const Users = mongoose.connection.collection('users');
    const user = await Users.findOne({ _id: new mongoose.Types.ObjectId(decoded.userId) });
    if (!user) { throw new ApiError(404, 'User not found'); }

    if (user.auth?.isOnboarded) {
      res.json({ success: true, data: { id: user._id.toString(), isOnboarded: true }, message: 'Already onboarded' });
      return;
    }

    const updateFields: Record<string, unknown> = { 'auth.isOnboarded': true, updatedAt: new Date() };

    if (profile) {
      // Nested profile fields — narrower allowlist than Zod's outer schema.
      const allowed: (keyof OnboardingProfile)[] = ['firstName', 'lastName', 'avatar', 'dateOfBirth', 'gender', 'bio'];
      for (const key of allowed) {
        if (profile[key] !== undefined) updateFields[`profile.${key}`] = profile[key];
      }
    }
    if (preferences) {
      const allowed: (keyof OnboardingPreferences)[] = ['language', 'currency', 'notifications', 'theme', 'dietaryPreferences'];
      for (const key of allowed) {
        if (preferences[key] !== undefined) updateFields[`preferences.${key}`] = preferences[key];
      }
    }

    await Users.updateOne({ _id: user._id }, { $set: updateFields });
    const updated = await Users.findOne({ _id: user._id });
    res.json({ success: true, data: buildUserResponse(updated as AuthServiceUser), message: 'Onboarding completed' });
  } catch (err: any) {
    logger.error('Complete onboarding error', { error: err.message });
    throw new ApiError(500, 'Failed to complete onboarding');
  }
}
router.post('/auth/complete-onboarding', authLimiter, completeOnboardingHandler);

// ── Update profile ────────────────────────────────────────────
/**
 * @route PATCH /auth/profile
 * @summary Update user profile
 * @tags Profile
 * @security BearerAuth
 * @description Updates user profile fields. Rate limited to 10/min.
 * @response {object} 200 - Profile updated
 */
async function updateProfileHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { throw new ApiError(401, 'Not authenticated'); }
    const decoded = await tokenService.validateToken(header.slice(7));

    // SECURITY: Zod outer-shape validation. Inner allowlists below catch
    // any field-level mass-assignment attempts.
    const validated = CompleteOnboardingSchema.safeParse(req.body);
    if (!validated.success) {
      throw new ApiError(400, validated.error.issues.map((i) => i.message).join('; '));
    }
    const { profile, preferences } = validated.data;

    const Users = mongoose.connection.collection('users');
    const user = await Users.findOne({ _id: new mongoose.Types.ObjectId(decoded.userId) });
    if (!user) { throw new ApiError(404, 'User not found'); }

    const updateFields: Record<string, any> = { updatedAt: new Date() };

    // Email changes must go through /auth/email/verify/request — not allowed here
    if (profile) {
      const allowed = ['firstName', 'lastName', 'avatar', 'dateOfBirth', 'gender', 'bio'];
      for (const key of allowed) {
        if (profile[key] !== undefined) updateFields[`profile.${key}`] = profile[key];
      }
    }
    if (preferences) {
      const allowed = ['language', 'currency', 'notifications', 'theme', 'dietaryPreferences'];
      for (const key of allowed) {
        if (preferences[key] !== undefined) updateFields[`preferences.${key}`] = preferences[key];
      }
    }

    await Users.updateOne({ _id: user._id }, { $set: updateFields });
    const updated = await Users.findOne({ _id: user._id });
    res.json({ success: true, data: buildUserResponse(updated as AuthServiceUser) });
  } catch (err: any) {
    logger.error('Update profile error', { error: err.message });
    throw new ApiError(500, 'Failed to update profile');
  }
}
router.patch('/auth/profile', profileUpdateLimiter, authLimiter, updateProfileHandler);

// ── Delete account (soft delete) ─────────────────────────────
/**
 * @route DELETE /auth/account
 * @summary Delete user account
 * @tags Profile
 * @security BearerAuth
 * @description Soft deletes the account and blacklists the current token.
 * @response {object} 200 - Account deleted
 */
async function deleteAccountHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { throw new ApiError(401, 'Not authenticated'); }
    const decoded = await tokenService.validateToken(header.slice(7));

    const Users = mongoose.connection.collection('users');
    await Users.updateOne(
      { _id: new mongoose.Types.ObjectId(decoded.userId) },
      { $set: { isActive: false, deletedAt: new Date(), updatedAt: new Date() } }
    );

    // Blacklist the current token so it can't be reused
    await tokenService.blacklistToken(header.slice(7), decoded.userId);

    res.json({ success: true, message: 'Account deleted' });
  } catch (err: any) {
    logger.error('Delete account error', { error: err.message });
    throw new ApiError(500, 'Failed to delete account');
  }
}
router.delete('/auth/account', authLimiter, deleteAccountHandler);

// ── Admin login (XSC-07: MFA challenge) ────────────────────────
/**
 * @route POST /auth/admin/login
 * @summary Admin authentication
 * @tags Admin
 * @description |
 *   Handles admin authentication with timing-safe password comparison.
 *   Issues admin-scoped JWT tokens.
 *   If MFA is enabled, returns mfaRequired:true with pending session token.
 * @response {object} 200 - Login successful
 * @response {object} 401 - Invalid credentials
 * @response {object} 429 - Account locked
 */
async function adminLoginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) { throw new ApiError(400, 'Email and password required'); }

    const AdminUsers = mongoose.connection.collection('adminusers');
    const admin = await AdminUsers.findOne({ email: String(email).toLowerCase(), isActive: true });

    // SECURITY FIX: Add account lockout for admin login
    const lockKey = `admin-lock:${String(email).toLowerCase()}`;
    const failKey = `admin-fail:${String(email).toLowerCase()}`;
    const { redis } = await import('../config/redis');

    const locked = await redis.exists(lockKey);
    if (locked) {
      throw new ApiError(429, 'Account locked due to too many failed attempts. Try again in 15 minutes.');
    }

    // Always run bcrypt even on miss — prevents timing-based email enumeration
    if (!admin) {
      // CRITICAL FIX (AUTH-F12-001): Use a properly-formatted bcrypt hash instead of
      // an invalid one. The previous value '$2b$12$invalidhashpaddingtopreventimenumeration'
      // was too short (38 chars vs the required 53 for bcrypt at cost 12), which could
      // cause undefined behavior. Using a known-valid bcrypt hash at cost 12 ensures:
      // 1. Constant-time comparison behavior
      // 2. Correct length for crypto.timingSafeEqual
      // This is a defense-in-depth measure - bcrypt.compare is already timing-safe internally.
      await bcrypt.compare(password, '$2b$12$0000000000000000000000.OBv7qCAZ5kH9qZ1aR8E4O');
      throw new ApiError(401, 'Invalid credentials');
    }

    const storedPassword = (admin.password as string) || '';
    let passwordValid = false;
    if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$')) {
      passwordValid = await bcrypt.compare(password, storedPassword);
    } else {
      // Legacy plaintext — constant-time compare, then upgrade to bcrypt.
      // Pad both sides to a fixed length before timingSafeEqual so that unequal
      // lengths don't throw, which would create a fast rejection path leaking
      // password length information via timing.
      try {
        const FIXED_LEN = 256;
        const pwBuf     = Buffer.alloc(FIXED_LEN);
        const storedBuf = Buffer.alloc(FIXED_LEN);
        Buffer.from(String(password)).copy(pwBuf);
        Buffer.from(storedPassword).copy(storedBuf);
        const bytesMatch   = crypto.timingSafeEqual(pwBuf, storedBuf);
        const lengthsMatch = String(password).length === storedPassword.length;
        passwordValid = bytesMatch && lengthsMatch;
      } catch { passwordValid = false; }
      if (passwordValid) {
        const passwordHash = await bcrypt.hash(password, 12);
        await AdminUsers.updateOne({ _id: admin._id }, { $set: { password: passwordHash } });
      }
    }

    if (!passwordValid) {
      // Track failed attempts
      const fails = await redis.incr(failKey);
      if (fails === 1) await redis.expire(failKey, 900); // 15 min window
      if (fails >= 5) {
        await redis.set(lockKey, '1', 'EX', 900); // 15 min lockout
        await redis.unlink(failKey);
        throw new ApiError(429, 'Too many failed attempts. Account locked for 15 minutes.');
      } else {
        throw new ApiError(401, 'Invalid credentials', 'INVALID_PASSWORD', { attemptsRemaining: 5 - fails });
      }
    }

    // Clear failures on success
    await redis.unlink(failKey);

    const userId = admin._id.toString();
    const role = (admin.role as string) || 'admin';

    // Check if MFA is enabled for this admin
    const adminMfa = await AdminMfaConfig.findOne({
      adminId: new mongoose.Types.ObjectId(userId),
      isEnabled: true,
    });

    if (adminMfa) {
      // MFA is enabled — issue a pending session token and require MFA verification
      const pendingTokenSecret = process.env.JWT_ADMIN_SECRET;
      if (!pendingTokenSecret) throw new Error('[FATAL] JWT_ADMIN_SECRET is not set');

      const pendingToken = jwt.sign(
        {
          userId,
          role,
          email: admin.email,
          mfaPending: true,
          pendingSince: Date.now(),
        },
        pendingTokenSecret,
        { expiresIn: '5m' } // Short-lived pending token
      );

      // Store pending session in Redis (5 min TTL)
      const pendingKey = `admin-pending:${userId}`;
      await redis.set(pendingKey, pendingToken, 'EX', 300);

      logger.info('Admin login pending MFA verification', { userId, email: admin.email });

      res.json({
        success: true,
        mfaRequired: true,
        pendingToken,
        user: { id: userId, name: admin.name || '', email: admin.email, role },
        message: 'MFA verification required. Please provide your authenticator code.',
      });
      return;
    }

    // MFA not enabled — proceed with normal login
    const accessToken = tokenService.generateAccessToken(userId, role);
    const refreshToken = tokenService.generateRefreshToken(userId, role);

    res.json({
      success: true,
      mfaRequired: false,
      accessToken,
      refreshToken,
      user: { id: userId, name: admin.name || '', email: admin.email, role },
    });
  } catch (err: any) {
    logger.error('Admin login error', { error: err.message });
    throw new ApiError(500, 'Login failed');
  }
}
router.post('/auth/admin/login', adminLoginLimiter, adminLoginHandler);

/**
 * POST /auth/admin/mfa/verify
 * Verify MFA code to complete admin login.
 * Requires pendingToken from admin login response.
 */
async function adminMfaVerifyHandler(req: Request, res: Response) {
  try {
    const { pendingToken, code } = req.body;
    if (!pendingToken || !code) {
      throw new ApiError(400, 'pendingToken and code are required');
    }

    // Verify the pending token
    const pendingSecret = process.env.JWT_ADMIN_SECRET;
    if (!pendingSecret) throw new Error('[FATAL] JWT_ADMIN_SECRET is not set');

    let pendingPayload: any;
    try {
      pendingPayload = jwt.verify(pendingToken, pendingSecret);
    } catch {
      throw new ApiError(401, 'Pending session expired or invalid. Please login again.');
    }

    if (!pendingPayload.mfaPending) {
      throw new ApiError(400, 'Invalid pending token. MFA verification not required.');
    }

    // Check if pending session exists in Redis
    const { redis } = await import('../config/redis');
    const pendingKey = `admin-pending:${pendingPayload.userId}`;
    const storedToken = await redis.get(pendingKey);
    // CRITICAL FIX (AUTH-F10-001): Use timing-safe comparison for token validation.
    // Previously used !== which has variable timing based on string length.
    // Using crypto.timingSafeEqual prevents timing attacks on the token value.
    if (!storedToken) {
      throw new ApiError(401, 'Pending session expired or already used. Please login again.');
    }
    try {
      const storedBuf = Buffer.from(storedToken);
      const providedBuf = Buffer.from(pendingToken);
      if (storedBuf.length !== providedBuf.length) {
        throw new ApiError(401, 'Pending session expired or already used. Please login again.');
      }
      if (!crypto.timingSafeEqual(storedBuf, providedBuf)) {
        throw new ApiError(401, 'Pending session expired or already used. Please login again.');
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(401, 'Pending session expired or already used. Please login again.');
    }

    // Verify TOTP code
    const adminMfa = await AdminMfaConfig.findOne({
      adminId: new mongoose.Types.ObjectId(pendingPayload.userId),
      isEnabled: true,
    });

    if (!adminMfa) {
      throw new ApiError(400, 'MFA not configured for this account');
    }

    // Decrypt TOTP secret
    const secret = isEncrypted(adminMfa.secret)
      ? decryptTotpSecret(adminMfa.secret)
      : adminMfa.secret;

    // Verify TOTP code (with backup code support)
    let verified = false;

    // Try TOTP first
    if (/^\d{6}$/.test(code)) {
      verified = totpService.verifyTOTPCode(secret, code);
    }

    // Try backup code if TOTP failed
    // HIGH FIX (AUTH-F9-001): Tighten regex from \w to hex-only [A-F0-9].
    // The previous \w allows any word character including ****-**** (asterisks).
    // While this doesn't match real hashes (SHA-256 hex), being strict prevents
    // any edge cases and makes the validation more explicit.
    if (!verified && /^[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
      for (const bc of adminMfa.backupCodes) {
        if (!bc.used && totpService.verifyBackupCode(code.toUpperCase(), bc.code)) {
          bc.used = true;
          bc.usedAt = new Date();
          verified = true;
          break;
        }
      }
      if (verified) {
        await adminMfa.save();
      }
    }

    if (!verified) {
      logger.warn('Admin MFA verification failed', { userId: pendingPayload.userId });
      throw new ApiError(401, 'Invalid MFA code');
    }

    // Delete pending session
    await redis.del(pendingKey);

    // Issue full tokens
    const accessToken = tokenService.generateAccessToken(pendingPayload.userId, pendingPayload.role);
    const refreshToken = tokenService.generateRefreshToken(pendingPayload.userId, pendingPayload.role);

    logger.info('Admin login completed with MFA', { userId: pendingPayload.userId });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: pendingPayload.userId,
        email: pendingPayload.email,
        role: pendingPayload.role,
      },
    });
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    logger.error('Admin MFA verify error', { error: err.message });
    throw new ApiError(500, 'MFA verification failed');
  }
}
// SECURITY: rate-limit admin MFA verify. The TOTP window is 60s, so an attacker
// who has captured a pendingToken (5 min TTL) can otherwise brute-force 6-digit
// codes at unlimited RPS until a hit.
router.post('/auth/admin/mfa/verify', adminLoginLimiter, adminMfaVerifyHandler);

// ── Guest auth (web-menu) ─────────────────────────────────────
/**
 * @route POST /auth/guest
 * @summary Create guest session
 * @tags Auth
 * @description Creates a guest session for unauthenticated web-menu users.
 * @response {object} 200 - Guest session created
 */
async function guestHandler(req: Request, res: Response) {
  try {
    const { tableId, storeId } = req.body;
    // SECURITY FIX: FAIL-CLOSED store validation — if MERCHANT_SERVICE_URL is configured,
    // validation is REQUIRED and any failure (timeout, invalid store) results in rejection.
    // Previously: MERCHANT_SERVICE_URL unset silently skipped validation, allowing
    // guest tokens with arbitrary merchantIds (storeId parameter could be spoofed).
    const merchantServiceUrl = process.env.MERCHANT_SERVICE_URL;
    if (storeId) {
      if (!mongoose.Types.ObjectId.isValid(String(storeId))) {
        throw new ApiError(400, 'Invalid store ID');
      }
      // If MERCHANT_SERVICE_URL is set, storeId validation is REQUIRED (fail-closed)
      if (merchantServiceUrl) {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 3000);
        try {
          const validateRes = await fetch(
            `${merchantServiceUrl}/api/internal/stores/${storeId}/validate`,
            {
              headers: {
                'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
              },
              signal: ac.signal,
            },
          );
          clearTimeout(timer);
          if (!validateRes.ok) {
            logger.warn('Guest auth: store validation rejected store', { storeId, status: validateRes.status });
            throw new ApiError(400, 'Invalid or inactive store');
          }
          const validateData = await validateRes.json() as { valid: boolean };
          if (!validateData.valid) {
            logger.warn('Guest auth: store validation returned invalid', { storeId });
            throw new ApiError(400, 'Invalid or inactive store');
          }
          logger.info('Guest auth: store validated', { storeId });
        } catch (err: any) {
          clearTimeout(timer);
          // FAIL-CLOSED: Any error (timeout, network, validation) results in rejection
          if (err instanceof ApiError) throw err;
          logger.error('Guest auth: store validation failed, rejecting', { storeId, error: err.message });
          throw new ApiError(503, 'Store validation service unavailable. Please try again.');
        }
      } else {
        // MERCHANT_SERVICE_URL not configured — this is a misconfiguration.
        // Reject the request to prevent potential storeId spoofing.
        logger.error('Guest auth: MERCHANT_SERVICE_URL not configured — rejecting guest auth with storeId', { storeId });
        throw new ApiError(503, 'Guest authentication temporarily unavailable. Please try again.');
      }
    }
    // Use crypto.randomBytes — randomUUID() is not cryptographically secure
    // SECURITY FIX (AUTH-GUEST-001): Removed timestamp from guestId for unpredictability.
    // Previously: guest_${Date.now()}_${randomBytes} — timestamp made IDs predictable.
    const guestId = `guest_${crypto.randomBytes(16).toString('hex')}`;
    const guestToken = tokenService.generateAccessToken(guestId, 'guest', { merchantId: storeId });
    res.json({ success: true, guestToken, guestId, tableId, storeId });
  } catch (err: any) {
    logger.error('Guest auth error', { error: err.message });
    throw new ApiError(500, 'Failed to create guest session');
  }
}
router.post('/auth/guest', authLimiter, guestHandler);

// ── Refresh token (rotates both access + refresh) ────────────
/**
 * @route POST /auth/refresh
 * @summary Refresh access token
 * @tags Auth
 * @description Validates refresh token, blacklists it, and issues new tokens.
 * @response {object} 200 - New tokens issued
 * @response {object} 401 - Invalid refresh token
 * @response {object} 409 - Concurrent refresh detected
 */
async function refreshHandler(req: Request, res: Response) {
  try {
    // SECURITY: validate via Zod. The previous inline check accepted any
    // shape of body, including arrays and objects, which made downstream
    // string concatenation undefined-behavior prone.
    const validated = RefreshTokenSchema.safeParse(req.body);
    if (!validated.success) {
      throw new ApiError(400, validated.error.issues.map((i) => i.message).join('; '));
    }
    const { refreshToken } = validated.data;
    const result = await tokenService.rotateRefreshToken(refreshToken);
    res.json({ success: true, accessToken: result.accessToken, refreshToken: result.refreshToken, expiresIn: result.expiresIn });
  } catch (err: any) {
    if (err.code === 'CONCURRENT_REFRESH') {
      throw new ApiError(409, 'Concurrent token refresh detected. Please re-authenticate.', 'CONCURRENT_REFRESH');
    }
    logger.error('Refresh error', { error: err.message });
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
}
router.post('/auth/refresh', authLimiter, refreshHandler);

// Legacy alias — gateway strips /api/user/auth/ and sends /refresh-token to auth service.
router.post('/refresh-token', authLimiter, refreshHandler);

// P0 ALIAS: Nuqta frontend calls POST /auth/refresh-token. Same rationale as
// /auth/send-otp above — re-mounts the canonical refreshHandler.
router.post('/auth/refresh-token', authLimiter, refreshHandler);

// ── Token rotation: new access + refresh, old refresh invalidated ─────────
async function tokenRotateHandler(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { throw new ApiError(400, 'Refresh token required'); }
    const result = await tokenService.rotateRefreshToken(refreshToken);
    res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken, expiresIn: result.expiresIn });
  } catch (err: any) {
    if (err.code === 'CONCURRENT_REFRESH') {
      throw new ApiError(409, 'Concurrent token refresh detected. Please re-authenticate.', 'CONCURRENT_REFRESH');
    }
    logger.error('Token rotation error', { error: err.message });
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
}
router.post('/auth/token/refresh', authLimiter, tokenRotateHandler);

// ── Validate token (API gateway) ──────────────────────────────
/**
 * @route GET /auth/validate
 * @summary Validate JWT token
 * @tags Internal
 * @description |
 *   Validates a JWT token for internal service use.
 *   External callers receive { valid: true/false }.
 *   Internal callers with x-internal-token receive full payload.
 * @response {object} 200 - Token validity status
 */
async function validateHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { res.json({ valid: false }); return; }
    const decoded = await tokenService.validateToken(header.slice(7));
    // BAK-AUTH-002: Do NOT expose userId to unauthenticated callers.
    // Internal services with valid x-internal-token get the full payload.
    const isInternal = req.headers['x-internal-token'] === process.env.INTERNAL_SERVICE_TOKEN;
    if (isInternal) {
      res.json({ valid: true, userId: decoded.userId, role: decoded.role, merchantId: decoded.merchantId });
    } else {
      res.json({ valid: true });
    }
  } catch (err: any) {
    logger.warn('[Auth] Token validation failed', { path: req.path, error: err.message });
    res.json({ valid: false });
  }
}
router.get('/auth/validate', authLimiter, validateHandler);

// ── Logout ────────────────────────────────────────────────────
/**
 * @route POST /auth/logout
 * @summary Logout and invalidate tokens
 * @tags Auth
 * @security BearerAuth
 * @description Blacklists both access and refresh tokens.
 * @response {object} 200 - Logged out
 */
async function logoutHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      await tokenService.blacklistToken(header.slice(7));
    }
    // Also blacklist the refresh token so the session is fully terminated.
    // Without this, a client holding both tokens could immediately use the refresh
    // token to obtain a new access token despite having called logout.
    const { refreshToken } = req.body;
    if (refreshToken && typeof refreshToken === 'string') {
      await tokenService.blacklistToken(refreshToken).catch((err: any) => {
        logger.warn('Failed to blacklist refresh token on logout', { error: err.message });
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Logout error', { error: err.message });
    throw new ApiError(500, 'Logout failed');
  }
}
router.post('/auth/logout', authLimiter, logoutHandler);

// ── Get current user (me) ─────────────────────────────────────
/**
 * @route GET /auth/me
 * @summary Get current user profile
 * @tags Profile
 * @security BearerAuth
 * @description Returns the authenticated user's profile.
 * @response {object} 200 - User profile returned
 * @response {object} 401 - Not authenticated
 */
async function getMeHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { throw new ApiError(401, 'Not authenticated'); }
    const decoded = await tokenService.validateToken(header.slice(7));
    const Users = mongoose.connection.collection('users');
    const user = await Users.findOne({ _id: new mongoose.Types.ObjectId(decoded.userId) });
    if (!user) { throw new ApiError(404, 'User not found'); }
    res.json({ success: true, data: buildUserResponse(user as AuthServiceUser) });
  } catch {
    throw new ApiError(401, 'Invalid token');
  }
}
// Phase 6.24: dedicated getMeLimiter (120/min per IP) instead of the shared
// authLimiter. The shared bucket would 429 every page load since multiple
// components call /auth/me in parallel. The dedicated bucket gives generous
// room for legitimate page loads while preventing unauthenticated enumeration.
router.get('/auth/me', getMeLimiter, getMeHandler);

// ── Internal: get user by ID ──────────────────────────────────
router.get('/internal/auth/user/:id', requireInternalToken, async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new ApiError(400, 'Invalid user ID');
    }
    const Users = mongoose.connection.collection('users');
    const user = await Users.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
    if (!user) { throw new ApiError(404, 'User not found'); }
    res.json({ success: true, data: buildUserResponse(user as AuthServiceUser) });
  } catch (err: any) {
    logger.error('Internal get user error', { error: err.message });
    throw new ApiError(500, 'Internal server error');
  }
});

// ── Change phone number ───────────────────────────────────────
// Step 1: send OTP to the NEW number
/**
 * Step 1 of phone number change: sends an OTP to the new phone number.
 * Requires the user to be authenticated. Checks that the new number is not already in use.
 * @param req - Express request with { phone, countryCode, channel }
 * @param res - Express response with OTP send result
 */
async function changePhoneRequestHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { throw new ApiError(401, 'Not authenticated'); }
    await tokenService.validateToken(header.slice(7));

    const parsed = parsePhone(req.body);
    const channel: 'sms' | 'whatsapp' = req.body.channel === 'whatsapp' ? 'whatsapp' : 'sms';
    if (!parsed) { throw new ApiError(400, 'New phone number required'); }

    const Users = mongoose.connection.collection('users');
    const newFullPhone = `${parsed.countryCode}${parsed.phone}`;
    const existing = await Users.findOne({ $or: [{ phoneNumber: newFullPhone }, { phone: newFullPhone }] });
    if (existing) { throw new ApiError(409, 'Phone number already in use'); }

    const result = await otpService.sendOTP(parsed.phone, parsed.countryCode, channel);
    res.json(result);
  } catch (err: any) {
    logger.error('Change phone request error', { error: err.message });
    throw new ApiError(500, 'Failed to send OTP');
  }
}
router.post('/auth/change-phone/request', otpSendPhoneLimiter, otpLimiter, changePhoneRequestHandler);

// Step 2: verify OTP then update phone
/**
 * Step 2 of phone number change: verifies the OTP and atomically updates the phone number.
 * Uses $nor filter to prevent duplicate phone ownership. Forces re-login by blacklisting current token.
 * @param req - Express request with { phone, otp, countryCode }
 * @param res - Express response confirming phone update and instructing re-login
 */
async function changePhoneVerifyHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { throw new ApiError(401, 'Not authenticated'); }
    const decoded = await tokenService.validateToken(header.slice(7));

    const parsed = parsePhone(req.body);
    const { otp } = req.body;
    if (!parsed) { throw new ApiError(400, 'New phone number required'); }
    if (!otp) { throw new ApiError(400, 'OTP required'); }

    const valid = await otpService.verifyOTP(parsed.phone, otp, parsed.countryCode);
    if (!valid) { throw new ApiError(401, 'Invalid or expired OTP'); }

    const newFullPhone = `${parsed.countryCode}${parsed.phone}`;
    const Users = mongoose.connection.collection('users');

    // AS-02: Atomic phone update — use updateOne with a $nor filter that rejects the
    // write if another document already holds the phone number. The separate findOne +
    // updateOne pattern had a TOCTOU window where two concurrent requests could both
    // pass the duplicate check and then both commit, leaving two accounts sharing a number.
    const updateResult = await Users.updateOne(
      {
        _id: new mongoose.Types.ObjectId(decoded.userId),
        // Only proceed if no OTHER user already owns this phone
        $nor: [{ phoneNumber: newFullPhone }, { phone: newFullPhone }],
      },
      { $set: { phoneNumber: newFullPhone, phone: newFullPhone, updatedAt: new Date() } },
    );

    if (updateResult.matchedCount === 0) {
      // Either the userId was wrong (shouldn't happen — token is valid) or the phone is taken
      throw new ApiError(409, 'Phone number already in use');
    }

    // Force re-login — blacklist current token so new phone is reflected in next token
    await tokenService.blacklistToken(header.slice(7), decoded.userId);

    res.json({ success: true, message: 'Phone number updated. Please log in again.' });
  } catch (err: any) {
    logger.error('Change phone verify error', { error: err.message });
    throw new ApiError(500, 'Failed to update phone number');
  }
}
router.post('/auth/change-phone/verify', authLimiter, changePhoneVerifyHandler);

// ── WhatsApp OTP (explicit channel) ──────────────────────────
// Same as /send-otp but forces WhatsApp delivery
async function sendWhatsAppOTPHandler(req: Request, res: Response) {
  try {
    const parsed = parsePhone(req.body);
    if (!parsed) { throw new ApiError(400, 'Phone required'); }

    const fullPhone = `${parsed.countryCode}${parsed.phone}`;
    const Users = mongoose.connection.collection('users');
    const existingUser = await Users.findOne(
      { $or: [{ phoneNumber: fullPhone }, { phone: fullPhone }] },
      { projection: { 'auth.pinHash': 1, isActive: 1 } },
    );
    const isNewUser = !existingUser;
    const hasPIN = !!(existingUser?.auth?.pinHash);
    const forceOtp = req.body.force === true || String(req.body.force) === 'true';

    if (!isNewUser && hasPIN && !forceOtp) {
      res.json({ success: true, isNewUser: false, hasPIN: true, message: 'Please login with your PIN' });
      return;
    }

    const result = await otpService.sendOTP(parsed.phone, parsed.countryCode, 'whatsapp');
    res.json({ ...result, isNewUser, hasPIN });
  } catch (err: any) {
    logger.error('WhatsApp OTP send error', { error: err.message });
    throw new ApiError(500, 'Failed to send WhatsApp OTP');
  }
}
router.post('/auth/otp/send-whatsapp', otpSendPhoneLimiter, otpLimiter, sendWhatsAppOTPHandler);

// ── Email verification ────────────────────────────────────────
// Request: send verification email
async function emailVerifyRequestHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { throw new ApiError(401, 'Not authenticated'); }
    const decoded = await tokenService.validateToken(header.slice(7));

    // SECURITY: Zod validates email format strictly. The previous regex
    // accepted junk like "a@b.c" — a verification email would be sent to
    // a domain that doesn't actually exist.
    const validated = EmailVerifyRequestSchema.safeParse(req.body);
    if (!validated.success) {
      throw new ApiError(400, validated.error.issues.map((i) => i.message).join('; '));
    }
    const { email } = validated.data;

    const Users = mongoose.connection.collection('users');
    const normalizedEmail = email.toLowerCase().trim();

    // Check email not already taken by a *verified* user
    const existing = await Users.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(decoded.userId) },
      email: normalizedEmail,
      'auth.emailVerified': true,
    });
    if (existing) { throw new ApiError(409, 'Email already in use'); }

    // Do NOT save the email yet — store it only in the Redis token.
    // It will be committed to the user doc only after the link is clicked.
    const result = await emailService.sendVerificationEmail(decoded.userId, normalizedEmail);
    res.json(result);
  } catch (err: any) {
    logger.error('Email verify request error', { error: err.message });
    throw new ApiError(500, 'Failed to send verification email');
  }
}
router.post('/auth/email/verify/request', emailVerifyLimiter, otpLimiter, emailVerifyRequestHandler);

// Confirm: token in link clicks through to here
async function emailVerifyConfirmHandler(req: Request, res: Response) {
  try {
    const { token } = req.params;
    if (!token) { throw new ApiError(400, 'Token required'); }

    const result = await emailService.verifyEmailToken(token);
    if (!result.success) { throw new ApiError(400, result.message || 'Verification failed'); }

    const Users = mongoose.connection.collection('users');

    // Atomic conditional update — replaces the TOCTOU findOne+updateOne pattern.
    // The $nor clause ensures we only claim the email if no OTHER verified user
    // already holds it, making the conflict check and the write a single atomic op.
    const userId = new mongoose.Types.ObjectId(result.userId!);
    const updateResult = await Users.updateOne(
      {
        _id: userId,
        $nor: [{ email: result.email, 'auth.emailVerified': true, _id: { $ne: userId } }],
      },
      { $set: { 'auth.emailVerified': true, email: result.email, updatedAt: new Date() } },
    );
    if (updateResult.matchedCount === 0) {
      throw new ApiError(409, 'Email was claimed by another account. Please try a different address.');
    }

    // Consume the Redis token AFTER the MongoDB write succeeds.
    // Old order: del in emailService.verifyEmailToken → then MongoDB write.
    // Problem: if MongoDB write failed, the token was already gone — unrecoverable.
    if (result.key) {
      // PERF: UNLINK returns immediately while Redis deletes asynchronously in background.
      await redis.unlink(result.key).catch((err) => { logger.error('[AUTH] Token cleanup failed', { key: result.key, error: err?.message }); });
    }

    // Return JSON (API) — frontend can redirect to app after this
    res.json({ success: true, message: 'Email verified successfully', email: result.email });
  } catch (err: any) {
    logger.error('Email verify confirm error', { error: err.message });
    throw new ApiError(500, 'Verification failed');
  }
}
router.get('/auth/email/verify/:token', authLimiter, emailVerifyConfirmHandler);

export default router;

