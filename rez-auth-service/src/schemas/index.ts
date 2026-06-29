/**
 * Zod input validation schemas for the auth-service.
 *
 * Use these at the top of route handlers:
 *   const parsed = PinSchema.safeParse(req.body);
 *   if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
 *
 * Why Zod?
 * - TypeScript-native (inferred types are correct)
 * - Composable (extend PhoneSchema to require a country code, etc.)
 * - Rejects unknown keys by default (prevents mass-assignment via extra fields)
 *
 * NOTE: a complete migration is out of scope here. Start with the security-
 * critical endpoints (login-pin, set-pin, OTP send, OTP verify) and grow
 * from there. Routes that still use ad-hoc parsing are documented as TODO.
 */
import { z } from 'zod';

/** E.164-style phone. Accepts `{ phone, countryCode }` or `{ phoneNumber: '+91...' }`. */
export const PhoneInputSchema = z
  .strictObject({
    phone: z.string().regex(/^\d{7,15}$/).optional(),
    countryCode: z.string().regex(/^\+\d{1,3}$/).default('+91'),
    phoneNumber: z.string().regex(/^\+\d{1,15}$/).optional(),
  })
  .refine(
    (v) => Boolean(v.phone || v.phoneNumber),
    { message: 'phone or phoneNumber is required' },
  );

/** 4- or 6-digit PIN. */
export const PinSchema = z.strictObject({
  phone: z.string().regex(/^\d{7,15}$/).optional(),
  phoneNumber: z.string().regex(/^\+\d{1,15}$/).optional(),
  countryCode: z.string().regex(/^\+\d{1,3}$/).default('+91'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

/** OTP verification (4-8 digits to support 4-digit dev mode). */
export const OtpVerifySchema = z.strictObject({
  phone: z.string().regex(/^\d{7,15}$/).optional(),
  phoneNumber: z.string().regex(/^\+\d{1,15}$/).optional(),
  countryCode: z.string().regex(/^\+\d{1,3}$/).default('+91'),
  otp: z.string().regex(/^\d{4,8}$/, 'OTP must be 4-8 digits'),
});

/** Email verification request. */
export const EmailVerifyRequestSchema = z.strictObject({
  email: z.string().email().max(254),
});

/** Refresh token request. */
export const RefreshTokenSchema = z.strictObject({
  refreshToken: z.string().min(10).max(2048),
});

/** OAuth consent (state + OTP + approved). */
export const OAuthConsentSchema = z.strictObject({
  state: z.string().min(16).max(128),
  otp: z.string().regex(/^\d{4,8}$/),
  approved: z.boolean(),
  phone: z.string().regex(/^\d{7,15}$/).optional(),
  phoneNumber: z.string().regex(/^\+\d{1,15}$/).optional(),
  countryCode: z.string().regex(/^\+\d{1,3}$/).default('+91'),
});

/** Profile update payload — explicit allowlist. */
export const ProfileUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().email().max(254).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
    .optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  avatar: z.string().url().max(2048).optional(),
  bio: z.string().max(500).optional(),
});

/** Complete-onboarding payload. */
export const CompleteOnboardingSchema = z.strictObject({
  profile: z
    .strictObject({
      name: z.string().min(1).max(120).optional(),
      email: z.string().email().max(254).optional(),
      dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    })
    .optional(),
  preferences: z
    .strictObject({
      categories: z.array(z.string().max(64)).max(50).optional(),
      notifications: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
    })
    .optional(),
});

/** Cross-vertical transaction record (POST /api/profile/transaction).
 *
 * SECURITY: rejects unknown keys (mass-assignment guard), clamps amount to
 * a sane range, validates vertical against the canonical enum.
 */
export const ProfileTransactionSchema = z.strictObject({
  vertical: z.enum(['hotel', 'restaurant', 'fashion', 'pharmacy', 'retail', 'd2c']),
  amount: z.number().finite().min(0).max(10_000_000), // ₹1 crore cap per txn
  merchantId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_\-]+$/, 'merchantId must be alphanumeric'),
  category: z.string().min(1).max(64),
});
