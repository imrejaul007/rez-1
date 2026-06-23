import { logger } from './logger';

/**
 * Environment Variable Validation Utility
 * Ensures all required environment variables are present and valid
 * Prevents server startup with missing or invalid configuration
 */

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_MERCHANT_SECRET: string;
  FRONTEND_URL: string;
  BCRYPT_ROUNDS: number;
}

// Required environment variables
const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_MERCHANT_SECRET',
  'FRONTEND_URL'
];

// Recommended environment variables (warn if missing)
const RECOMMENDED_ENV_VARS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'SENDGRID_API_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

// Environment-specific validation rules
const PRODUCTION_REQUIRED = [
  'REDIS_URL',
  'CORS_ORIGIN',
  'SENTRY_DSN'
];

/**
 * Validate environment variables
 * Throws error if required variables are missing
 * Logs warnings for recommended variables
 */
export function validateEnvironment(): EnvConfig {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName] || process.env[varName]?.trim() === '') {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Validate JWT secrets are not default values
  if (process.env.JWT_SECRET === 'your-fallback-secret' ||
      process.env.JWT_SECRET === 'your-super-secret-jwt-key-here') {
    errors.push('JWT_SECRET must be changed from default value');
  }

  if (process.env.JWT_MERCHANT_SECRET === 'your-merchant-secret-here-change-in-production') {
    errors.push('JWT_MERCHANT_SECRET must be changed from default value');
  }

  if (process.env.JWT_REFRESH_SECRET === 'your-fallback-refresh-secret' ||
      process.env.JWT_REFRESH_SECRET === 'your-refresh-token-secret') {
    errors.push('JWT_REFRESH_SECRET must be changed from default value');
  }

  // Validate JWT secret strength (minimum 32 characters)
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long for security');
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters long for security');
  }

  if (process.env.JWT_MERCHANT_SECRET && process.env.JWT_MERCHANT_SECRET.length < 32) {
    errors.push('JWT_MERCHANT_SECRET must be at least 32 characters long for security');
  }

  // Validate MongoDB URI format
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb://') &&
      !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
    errors.push('MONGODB_URI must be a valid MongoDB connection string');
  }

  // Validate PORT
  const port = parseInt(process.env.PORT || '5000', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('PORT must be a valid port number (1-65535)');
  }

  // Validate BCRYPT_ROUNDS
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  if (isNaN(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
    warnings.push('BCRYPT_ROUNDS should be between 10-15 (recommended: 12)');
  }

  // Validate Razorpay credentials are not placeholder values
  const razorpayPlaceholders = ['rzp_test_your_razorpay_key_id', 'your_razorpay_key_secret', 'your_key_id', 'your_key_secret'];
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.RAZORPAY_KEY_ID || razorpayPlaceholders.includes(process.env.RAZORPAY_KEY_ID)) {
      errors.push('RAZORPAY_KEY_ID is missing or set to a placeholder value');
    }
    if (!process.env.RAZORPAY_KEY_SECRET || razorpayPlaceholders.includes(process.env.RAZORPAY_KEY_SECRET)) {
      errors.push('RAZORPAY_KEY_SECRET is missing or set to a placeholder value');
    }
  }

  // Production-specific validation
  if (process.env.NODE_ENV === 'production') {
    PRODUCTION_REQUIRED.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Missing production-required variable: ${varName}`);
      }
    });

    // Ensure HTTPS in production
    if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('https://')) {
      warnings.push('FRONTEND_URL should use HTTPS in production');
    }

    // Ensure rate limiting is not disabled
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      warnings.push('Rate limiting is disabled in production - this is not recommended!');
    }
  }

  // Check recommended variables
  RECOMMENDED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(`Recommended environment variable missing: ${varName}`);
    }
  });

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('\n⚠️  Environment Configuration Warnings:');
    warnings.forEach(warning => logger.warn(`   - ${warning}`));
    logger.warn('');
  }

  // Throw if any errors
  if (errors.length > 0) {
    logger.error('\n❌ Environment Configuration Errors:');
    errors.forEach(error => logger.error(`   - ${error}`));
    logger.error('\nPlease fix the above errors before starting the server.\n');
    throw new Error('Environment validation failed');
  }

  // Return validated config
  const config: EnvConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: port,
    MONGODB_URI: process.env.MONGODB_URI!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    JWT_MERCHANT_SECRET: process.env.JWT_MERCHANT_SECRET!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
    BCRYPT_ROUNDS: bcryptRounds
  };

  logger.info('✅ Environment validation passed');
  logger.info(`   Environment: ${config.NODE_ENV}`);
  logger.info(`   Port: ${config.PORT}`);
  logger.info(`   Database: ${config.MONGODB_URI.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB'}`);

  return config;
}

/**
 * Check if sensitive data is exposed in environment
 */
export function checkForExposedSecrets(): void {
  const sensitiveVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_MERCHANT_SECRET',
    'TWILIO_AUTH_TOKEN',
    'SENDGRID_API_KEY',
    'RAZORPAY_KEY_SECRET',
    'CLOUDINARY_API_SECRET',
    'MONGODB_URI'
  ];

  // In production, block DEBUG_MODE — it exposes stack traces and secrets
  if (process.env.NODE_ENV === 'production' && process.env.DEBUG_MODE === 'true') {
    logger.error('FATAL: DEBUG_MODE cannot be enabled in production. Shutting down.');
    process.exit(1);
  }

  // Check .env file is in .gitignore (runtime check not possible, rely on deployment checklist)
  logger.info('ℹ️  Ensure .env files are in .gitignore and never committed to version control');
}

/**
 * Generate secure random secret
 * Useful for generating new JWT secrets
 */
export function generateSecureSecret(length: number = 64): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Mask sensitive environment variable for logging
 */
export function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return '***';
  return secret.substring(0, 4) + '***' + secret.substring(secret.length - 4);
}

export default {
  validateEnvironment,
  checkForExposedSecrets,
  generateSecureSecret,
  maskSecret
};
