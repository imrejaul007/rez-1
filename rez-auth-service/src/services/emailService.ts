/**
 * emailService.ts
 *
 * Email verification via Resend (https://resend.com).
 * Tokens are stored in Redis with a 24h TTL.
 * On verify, `auth.emailVerified` is set on the user document.
 *
 * Protected by circuit breaker to prevent email service failures from affecting auth.
 */

import crypto from 'crypto';
import { redis } from '../config/redis';
import { createServiceLogger } from '../config/logger';
import { emailCircuit, CircuitBreakerError } from '../utils/circuitBreaker';

const logger = createServiceLogger('email');

const TOKEN_TTL = 86400; // 24h
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@rez.money';
const APP_URL = process.env.APP_URL || 'https://rez.money';

// Email service timeout (10 seconds)
const EMAIL_TIMEOUT_MS = parseInt(process.env.EMAIL_TIMEOUT_MS || '10000', 10);

function makeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function getResend() {
  const { Resend } = await import('resend');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');
  return new Resend(apiKey);
}

/**
 * Execute email API call with circuit breaker protection
 */
async function withEmailCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
  return emailCircuit.execute(operation, () => {
    logger.warn(`[Email] Circuit breaker fallback activated`);
    return undefined as T;
  });
}

export async function sendVerificationEmail(
  userId: string,
  email: string
): Promise<{ success: boolean; message: string }> {
  const token = makeToken();
  const key = `email-verify:${token}`;

  try {
    await redis.set(key, JSON.stringify({ userId, email }), 'EX', TOKEN_TTL);
  } catch (err: any) {
    logger.error('Redis unavailable — cannot store email token', { error: err.message });
    return { success: false, message: 'Email service temporarily unavailable' };
  }

  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  try {
    await withEmailCircuitBreaker(async () => {
      const resend = await getResend();
      await resend.emails.send(
        {
          from: FROM_EMAIL,
          to: email,
          subject: 'Verify your email — REZ',
          html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#1a1a1a">Verify your email</h2>
            <p style="color:#555">Click the button below to verify your email address. This link expires in 24 hours.</p>
            <a href="${verifyUrl}"
               style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0066ff;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
              Verify Email
            </a>
            <p style="color:#999;font-size:12px">Or copy this link: ${verifyUrl}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="color:#aaa;font-size:12px">If you didn't request this, you can ignore this email.</p>
          </div>
        `,
        },
        { timeout: EMAIL_TIMEOUT_MS }
      );
    });
  } catch (err) {
    if (err instanceof CircuitBreakerError) {
      logger.warn('Email circuit breaker open — email not sent', { email });
      return {
        success: false,
        message: 'Email service temporarily unavailable. Please try again later.',
      };
    }
    logger.error('Resend email failed', { email, error: (err as Error).message });
    return { success: false, message: 'Failed to send verification email' };
  }

  logger.info('Verification email sent', {
    userId,
    email: email.replace(/(.{2}).+(@.+)/, '$1***$2'),
  });
  return { success: true, message: 'Verification email sent. Check your inbox.' };
}

export async function verifyEmailToken(
  token: string
): Promise<{ success: boolean; userId?: string; email?: string; key?: string; message: string }> {
  const key = `email-verify:${token}`;

  let raw: string | null;
  try {
    raw = await redis.get(key);
  } catch (err: any) {
    logger.error('Redis unavailable during email token verify', { error: err.message });
    return { success: false, message: 'Email verification service temporarily unavailable' };
  }

  if (!raw) return { success: false, message: 'Token expired or invalid' };

  const { userId, email } = JSON.parse(raw);

  // Return the key to the caller so it can be consumed AFTER the MongoDB write.
  // Old pattern: del key here → MongoDB write in route handler.
  // Problem: if the MongoDB write failed, the token was already consumed and the
  // user had no way to re-verify their email (permanently unrecoverable).
  // The caller is now responsible for calling redis.del(key) on success.
  return { success: true, userId, email, key, message: 'Email verified successfully' };
}
