import crypto from 'crypto';
import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { createServiceLogger } from '../config/logger';

function hashOTP(otp: string, phone: string): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) throw new Error('[FATAL] OTP_HMAC_SECRET environment variable not set');
  return crypto.createHmac('sha256', secret).update(`${phone}:${otp}`).digest('hex');
}

const logger = createServiceLogger('otp');

const OTP_TTL = 300;          // 5 min
const RATE_LIMIT_TTL = 900;   // 15 min
const MAX_OTP_PER_WINDOW = 5;
const RESEND_COOLDOWN = 30;   // sec — within this window, sendOTP returns the existing OTP instead of generating a new one
const MAX_FAIL_ATTEMPTS = 5;
const LOCKOUT_TTL = 1800;     // 30 min

// Notification queue for SMS delivery
let notifQueue: Queue | null = null;
function getNotifQueue(): Queue {
  if (!notifQueue) {
    notifQueue = new Queue('notification-events', { connection: redis });
  }
  return notifQueue;
}

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Sends a 6-digit OTP to the specified phone number via SMS or WhatsApp.
 * Implements rate limiting (5 requests per 15 min) and account lockout after 5 failed verification attempts.
 * @param phone - The recipient phone number (without country code)
 * @param countryCode - Country code prefix (default: +91)
 * @param channel - Delivery channel: 'sms' (default) or 'whatsapp'
 * @returns Success status and message. In dev mode with EXPOSE_DEV_OTP=true, includes the OTP for testing.
 */
export async function sendOTP(
  phone: string,
  countryCode = '+91',
  channel: 'sms' | 'whatsapp' = 'sms',
): Promise<{ success: boolean; message: string; _dev_otp?: string }> {
  const fullPhone = `${countryCode}${phone}`;

  // Rate limit check — skip gracefully if Redis is down
  try {
    const rateKey = `otp-rate:${fullPhone}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, RATE_LIMIT_TTL);
    if (count > MAX_OTP_PER_WINDOW) {
      return { success: false, message: 'Too many OTP requests. Try again later.' };
    }

    // Check lockout
    const lockKey = `otp-lock:${fullPhone}`;
    if (await redis.exists(lockKey)) {
      return { success: false, message: 'Phone locked due to too many failures. Try again in 30 minutes.' };
    }
  } catch (redisErr: any) {
    logger.error('Redis unavailable — cannot verify OTP rate limit', { error: redisErr.message });
    return { success: false, message: 'OTP service temporarily unavailable. Please try again.' };
  }

// Idempotency: if an OTP was sent within the last RESEND_COOLDOWN seconds,
  // return the existing one instead of generating a new one. This protects
  // against accidental double-clicks and React re-renders that fire two
  // sendOTP calls in quick succession — which would invalidate the user's
  // first OTP before they get a chance to enter it.
  const maskedPhone = fullPhone.replace(/(\+\d{1,3})\d{6}(\d{4})/, '$1******$2');
  const sentAtKey = `otp-sent-at:${fullPhone}`;
  const isDevMode = process.env.EXPOSE_DEV_OTP === 'true' && process.env.NODE_ENV !== 'production';
  try {
    const lastSentAt = await redis.get(sentAtKey);
    if (lastSentAt) {
      const ageSec = Math.floor((Date.now() - Number(lastSentAt)) / 1000);
      if (ageSec < RESEND_COOLDOWN) {
        logger.info('OTP send deduplicated (within cooldown)', {
          phone: maskedPhone,
          ageSec,
          cooldown: RESEND_COOLDOWN,
        });
        // In dev mode, also fetch the plaintext OTP from a separate dev-only
        // key so the client can echo it back. This is ONLY populated when
        // EXPOSE_DEV_OTP=true; production never stores or returns plaintext.
        let devOtp: string | undefined;
        if (isDevMode) {
          try {
            devOtp = (await redis.get(`otp-plain:${fullPhone}`)) ?? undefined;
          } catch { /* ignore */ }
        }
        return devOtp
          ? { success: true, message: 'OTP already sent', _dev_otp: devOtp }
          : { success: true, message: 'OTP already sent' };
      }
    }
  } catch (redisErr: any) {
    // Non-fatal — fall through to regenerate the OTP
    logger.warn('Could not read OTP sent-at timestamp; regenerating', { error: redisErr.message });
  }

  const otp = generateOTP();
  try {
    await redis.set(`otp:${fullPhone}`, hashOTP(otp, fullPhone), 'EX', OTP_TTL);
    await redis.set(sentAtKey, Date.now().toString(), 'EX', OTP_TTL);
    // Dev-only: store plaintext OTP separately so a deduplicated request can
    // still echo it back. NEVER written in production (gated on EXPOSE_DEV_OTP).
    if (isDevMode) {
      await redis.set(`otp-plain:${fullPhone}`, otp, 'EX', OTP_TTL);
    }
  } catch (redisErr: any) {
    logger.error('Redis unavailable — cannot store OTP', { error: redisErr.message });
    return { success: false, message: 'OTP service temporarily unavailable. Please try again shortly.' };
  }

  // Dev/testing: capture OTP for response so it's visible even if BullMQ fails locally.
  // CRITICAL: Never expose OTP in production, even if EXPOSE_DEV_OTP is set.
  // isDevMode is already declared at the top of this function.
  if (isDevMode) {
    logger.debug(`[DEV ONLY] OTP generated for phone=***${phone.slice(-4)}`);
  }

  // Publish to notification service for delivery
  try {
    if (channel === 'whatsapp') {
      await getNotifQueue().add('otp-whatsapp', {
        eventId: `otp-wa-${fullPhone}-${crypto.randomBytes(8).toString('hex')}`,
        eventType: 'otp_whatsapp',
        channels: ['whatsapp'],
        userId: '',
        payload: {
          title: 'REZ Verification Code',
          body: `Your REZ verification code is ${otp}. Valid for 5 minutes.`,
          data: { phone: fullPhone },
          whatsappTemplateId: 'rez_otp',
          whatsappTemplateVars: [otp, '5'],  // {{1}} = OTP, {{2}} = expiry minutes
        },
        createdAt: new Date().toISOString(),
      });
    } else {
      await getNotifQueue().add('otp-sms', {
        eventId: `otp-${fullPhone}-${crypto.randomBytes(8).toString('hex')}`,
        eventType: 'otp_sms',
        channels: ['sms'],
        userId: '',
        payload: {
          title: 'REZ OTP',
          body: `Your REZ verification code is ${otp}. Valid for 5 minutes.`,
          data: { phone: fullPhone },
          smsMessage: `Your REZ verification code is ${otp}. Valid for 5 minutes. Do not share this with anyone.`,
        },
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    logger.error(`Failed to enqueue OTP ${channel}`, { phone: maskedPhone, error: err.message });
    // BAK-AUTH-005 FIX: Increment the failure counter so repeated queue failures
    // eventually trigger lockout. This prevents an attacker from hammering the OTP
    // endpoint when BullMQ is down.
    try {
      const failKey = `otp-fail:${fullPhone}`;
      const fails = await redis.incr(failKey);
      if (fails === 1) await redis.expire(failKey, LOCKOUT_TTL);
      if (fails >= MAX_FAIL_ATTEMPTS) {
        await redis.set(`otp-lock:${fullPhone}`, '1', 'EX', LOCKOUT_TTL);
        // PERF: UNLINK returns immediately while Redis deletes asynchronously in background.
        await redis.unlink(failKey);
        logger.warn('Phone locked after queue failure storm', { phone: maskedPhone });
      }
    } catch (lockoutErr: any) {
      logger.error('Failed to increment lockout counter on queue failure', { phone: maskedPhone, error: lockoutErr.message });
    }
    return { success: false, message: 'Failed to send OTP. Please try again.' };
  }

  logger.info(`OTP sent via ${channel}`, { phone: maskedPhone });
  return isDevMode
    ? { success: true, message: 'OTP sent', _dev_otp: otp }
    : { success: true, message: 'OTP sent' };
}

// Lua script: atomically GET, compare, and DEL the OTP key in a single round-trip.
// Returns:  1 = match — OTP consumed
//           0 = key not found (expired or already used)
//          -1 = key exists but hash does not match (wrong OTP)
const VERIFY_AND_CONSUME_OTP_LUA = `
local stored = redis.call('GET', KEYS[1])
if not stored then return 0 end
if stored ~= ARGV[1] then return -1 end
redis.call('DEL', KEYS[1])
return 1
`;

export interface OtpVerifyResult {
  valid: boolean;
  reason?: 'locked' | 'not_found' | 'invalid' | 'max_attempts';
}

/**
 * Verifies a 6-digit OTP atomically using a Lua script to prevent replay race conditions.
 * The OTP is consumed (deleted) on successful verification. After 5 failed attempts,
 * the phone number is locked out for 30 minutes.
 * @param phone - The phone number (without country code)
 * @param otp - The 6-digit OTP to verify
 * @param countryCode - Country code prefix (default: +91)
 * @returns Verification result with validity status and failure reason if applicable
 */
export async function verifyOTP(phone: string, otp: string, countryCode = '+91'): Promise<OtpVerifyResult> {
  const fullPhone = `${countryCode}${phone}`;

  try {
    // Check lockout
    const lockKey = `otp-lock:${fullPhone}`;
    if (await redis.exists(lockKey)) return { valid: false, reason: 'locked' };

    const otpKey = `otp:${fullPhone}`;
    const hash = hashOTP(otp, fullPhone);

    // Atomic GET→compare→DEL via Lua — eliminates the OTP replay race condition
    // where two concurrent requests could both read the key before either deletes it.
    const rawResult = await redis.eval(VERIFY_AND_CONSUME_OTP_LUA, 1, otpKey, hash);
    if (typeof rawResult !== 'number' || ![1, 0, -1].includes(rawResult)) {
      throw new Error(`Unexpected OTP eval result ${JSON.stringify(rawResult)} — Redis script may be corrupted`);
    }
    const result = rawResult;

    if (result !== 1) {
      // 0 = not found/expired, -1 = wrong OTP — both count as a failure attempt
      const failKey = `otp-fail:${fullPhone}`;
      const fails = await redis.incr(failKey);
      // Fail counter should survive for the full lockout window, not just the OTP TTL.
      // Old: expire(failKey, OTP_TTL=300) allowed 5 attempts every 5 minutes (30 per lockout).
      if (fails === 1) await redis.expire(failKey, LOCKOUT_TTL);
      if (fails >= MAX_FAIL_ATTEMPTS) {
        await redis.set(lockKey, '1', 'EX', LOCKOUT_TTL);
        // PERF: UNLINK returns immediately while Redis deletes asynchronously in background.
        await redis.unlink(failKey);
        logger.warn('Phone locked after max OTP failures', { phone: fullPhone.replace(/(\+\d{1,3})\d{6}(\d{4})/, '$1******$2') });
        return { valid: false, reason: 'max_attempts' };
      }
      return { valid: false, reason: result === 0 ? 'not_found' : 'invalid' };
    }

    // Success — OTP was consumed atomically; clean up the failure counter
    // PERF: UNLINK returns immediately while Redis deletes asynchronously in background.
    await redis.unlink(`otp-fail:${fullPhone}`);
    logger.info('OTP verified', { phone: fullPhone.replace(/(\+\d{1,3})\d{6}(\d{4})/, '$1******$2') });
    return { valid: true };
  } catch (redisErr: any) {
    logger.error('Redis unavailable during OTP verification', { error: redisErr.message });
    return { valid: false, reason: 'not_found' };
  }
}

export async function closeQueue(): Promise<void> {
  if (notifQueue) await notifQueue.close();
}
