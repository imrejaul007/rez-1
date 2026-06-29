/**
 * Environment variable validation using Zod
 * Ensures all required config is present and properly typed at startup
 * Fails fast if validation fails, preventing runtime errors
 */

import { z } from 'zod';
import { logger } from './logger';

const envSchema = z.object({
  // === Core Service ===
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('4002'),
  HEALTH_PORT: z.string().transform(Number).default('4102'),
  SERVICE_NAME: z.string().default('rez-auth-service'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // === Database [REQUIRED] ===
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // === Cache [REQUIRED] ===
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_SENTINEL_HOSTS: z.string().optional(),
  REDIS_SENTINEL_NAME: z.string().default('mymaster'),

  // === Authentication [REQUIRED] ===
  JWT_SECRET: z.string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .describe('Used to sign and verify JWT tokens for user authentication'),
  JWT_ADMIN_SECRET: z.string()
    .min(32, 'JWT_ADMIN_SECRET must be at least 32 characters')
    .describe('Used to sign and verify JWT tokens for admin authentication'),
  JWT_MERCHANT_SECRET: z.string()
    .min(32, 'JWT_MERCHANT_SECRET must be at least 32 characters')
    .describe('Used to sign and verify JWT tokens for merchant authentication'),
  JWT_REFRESH_SECRET: z.string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
    .describe('Used to sign and verify JWT refresh tokens'),

  // === JWT Token Expiry [OPTIONAL] ===
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_EXPIRES_IN_SECONDS: z.string().transform(Number).default('900'),
  JWT_ADMIN_EXPIRES_IN: z.string().optional(),
  JWT_MFA_SESSION_SECRET: z.string()
    .min(32, 'JWT_MFA_SESSION_SECRET must be at least 32 characters')
    .optional()
    .describe('Phase 6.24: required in production. Used to sign MFA session tokens independently of JWT_SECRET so a leaked consumer JWT_SECRET cannot be replayed as an MFA session.'),

  // === Internal Service Auth [REQUIRED] ===
  // Must have either INTERNAL_SERVICE_TOKENS_JSON or INTERNAL_SERVICE_TOKEN
  INTERNAL_SERVICE_TOKENS_JSON: z.string().optional(),
  INTERNAL_SERVICE_TOKEN: z.string().optional(),

  // === Email Service [OPTIONAL] ===
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('noreply@rez.money'),
  APP_URL: z.string().default('https://rez.money'),

  // === OTP Service [REQUIRED] ===
  OTP_HMAC_SECRET: z.string()
    .min(32, 'OTP_HMAC_SECRET must be at least 32 characters')
    .describe('Used to generate and verify OTP codes'),
  EXPOSE_DEV_OTP: z.enum(['true', 'false']).default('false'),

  // === TOTP/MFA Encryption [REQUIRED] ===
  // AES-256-GCM key for encrypting TOTP secrets at rest in MongoDB.
  // C17: Made required — service throws at startup if not set.
  OTP_TOTP_ENCRYPTION_KEY: z.string()
    .min(1, 'OTP_TOTP_ENCRYPTION_KEY is required')
    .describe('AES-256-GCM key for encrypting TOTP secrets at rest'),

  // === CORS [REQUIRED] ===
  CORS_ORIGIN: z.string().default('https://rez.money,https://www.rez.money,https://admin.rez.money'),

  // === Observability [OPTIONAL] ===
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().transform(Number).optional(),

  // === Internal Service URLs [OPTIONAL] ===
  // VIOLATION-1 fix: auth-service must not read the stores collection directly.
  // Instead, call the merchant service's internal /internal/stores/:storeId/validate endpoint.
  MERCHANT_SERVICE_URL: z.string().optional(),
});

type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns parsed config
 * Throws if validation fails
 */
export function validateEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = Object.entries(parsed.error.flatten().fieldErrors)
      .map(([field, messages]) => `${field}: ${messages?.join(', ')}`)
      .join('\n');
    throw new Error(`[FATAL] Environment validation failed:\n${errors}`);
  }

  // Additional validation: at least one internal service token format must be present
  const { INTERNAL_SERVICE_TOKENS_JSON, INTERNAL_SERVICE_TOKEN } = parsed.data;
  if (!INTERNAL_SERVICE_TOKENS_JSON && !INTERNAL_SERVICE_TOKEN) {
    throw new Error('[FATAL] Must set either INTERNAL_SERVICE_TOKENS_JSON or INTERNAL_SERVICE_TOKEN');
  }

  return parsed.data;
}

/**
 * Pre-validated environment config
 * Safe to use throughout the application
 */
export const env = validateEnv();
