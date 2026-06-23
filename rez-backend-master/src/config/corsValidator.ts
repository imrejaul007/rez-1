/**
 * CORS Configuration Validator
 *
 * Phase 1 Subtask 1.3: This validator was previously in `middleware/corsConfig.ts`
 * (which had zero importers and was dead code). It is now called from
 * `server.ts:startServer()` so the process fail-closes at boot if a misconfigured
 * CORS_ORIGIN would otherwise allow wildcard access in production.
 */
import { logger } from './logger';

export const validateCorsConfiguration = (): void => {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
      logger.error('❌ CRITICAL: CORS_ORIGIN not properly configured for production!');
      logger.error('   Please set CORS_ORIGIN to a comma-separated list of allowed origins (must start with https://)');
      throw new Error('Invalid CORS configuration for production');
    }

    const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
    if (!allowedOrigins.every(origin => origin.startsWith('https://'))) {
      logger.warn('⚠️ WARNING: Some CORS origins are not using HTTPS in production');
    }
  }

  logger.info('✅ CORS configuration validated');
};
