import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import * as totpService from '../services/totpService';
import { encryptTotpSecret, decryptTotpSecret, isEncrypted } from '../services/totpEncryption';
import { MfaConfig } from '../models/MfaConfig';
import { createServiceLogger } from '../config/logger';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/errorResponse';
import { markMfaVerified } from '../middleware/requireMfa';
import { mfaSetupLimiter, mfaVerifyLimiter } from '../middleware/rateLimiter';

const logger = createServiceLogger('mfa-routes');
const router = Router();

/**
 * MFA Setup & Verification Routes
 * All routes require JWT authentication (user must be logged in)
 */

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    jti?: string;
    sid?: string;
    sessionId?: string;
    mfaVerified?: boolean;
  };
}

/** JWT payload shape for access tokens issued by this service */
interface AccessTokenPayload {
  userId: string;
  role: string;
  jti?: string;
  sid?: string;
  sessionId?: string;
  phoneNumber?: string;
  merchantId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware: Verify JWT token from Authorization header
 * Extracts user info and adds to req.user
 */
function verifyJWT(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'Missing authorization token');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new ApiError(500, 'Server configuration error');
    }

    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as AccessTokenPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      jti: decoded.jti,
      sid: decoded.sid,
    };
    next();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('JWT verification failed', { error: msg });
    throw new ApiError(401, 'Invalid or expired token');
  }
}

/**
 * POST /auth/mfa/setup
 * Generate a new TOTP secret and return QR code URL
 * User must verify setup before MFA is enabled
 */
router.post('/auth/mfa/setup', verifyJWT, mfaSetupLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    // Check if user already has MFA enabled
    const existingMfa = await MfaConfig.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (existingMfa?.isEnabled) {
      throw new ApiError(400, 'MFA already enabled for this account');
    }

    // Generate new secret
    const { secret: rawSecret, keyUri } = totpService.generateSecret(userId, 'Rez');
    const backupCodes = totpService.generateBackupCodes(10);

    // Hash backup codes before storing
    const hashedBackupCodes = backupCodes.map((bc) => ({
      code: totpService.hashBackupCode(bc.code),
      used: false,
    }));

    // AUTH-HIGH-02 FIX: Encrypt TOTP secret before storing in MongoDB.
    // The encryption key must be set via OTP_TOTP_ENCRYPTION_KEY env var.
    // This will throw at startup if the key is missing, preventing plaintext storage.
    const encryptedSecret = encryptTotpSecret(rawSecret);

    // Store in database (MFA not yet enabled)
    await MfaConfig.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        userId: new mongoose.Types.ObjectId(userId),
        secret: encryptedSecret.encrypted,
        isEnabled: false,
        backupCodes: hashedBackupCodes,
      },
      { upsert: true, new: true }
    );

    logger.info('MFA setup initiated', { userId });

    // Return QR code URI and backup codes (unencrypted for user to save)
    // SECURITY FIX (C13): Do NOT return rawSecret — it must never leave the server.
    // The keyUri contains the secret encoded in the otpauth:// URI for QR code scanning.
    res.json({
      success: true,
      keyUri, // otpauth:// URI for QR code (contains encoded secret)
      backupCodes: backupCodes.map((bc) => bc.code), // Plain backup codes for user to save
      message:
        'Scan QR code with authenticator app, then verify setup with a 6-digit code',
    });
  } catch (err: any) {
    logger.error('MFA setup error', { error: err.message });
    throw new ApiError(500, 'Failed to set up MFA');
  }
});

/**
 * POST /auth/mfa/verify-setup
 * Verify the first TOTP code to enable MFA
 * Body: { code: "123456" }
 */
router.post('/auth/mfa/verify-setup', verifyJWT, mfaVerifyLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const code = String(req.body.code).trim();

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    if (!/^\d{6}$/.test(code)) {
      throw new ApiError(400, 'Invalid code format');
    }

    // Fetch pending MFA config
    const mfaConfig = await MfaConfig.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isEnabled: false,
    });

    if (!mfaConfig) {
      throw new ApiError(400, 'No pending MFA setup. Call /auth/mfa/setup first');
    }

    // AUTH-HIGH-02 FIX: Decrypt TOTP secret before verification.
    // Supports both new encrypted values and legacy plaintext values (for migration).
    const secret = isEncrypted(mfaConfig.secret)
      ? decryptTotpSecret(mfaConfig.secret)
      : mfaConfig.secret;

    // Verify the TOTP code
    if (!totpService.verifyTOTPCode(secret, code)) {
      logger.warn('MFA verification failed', { userId });
      throw new ApiError(401, 'Invalid TOTP code');
    }

    // Enable MFA
    mfaConfig.isEnabled = true;
    mfaConfig.enabledAt = new Date();
    mfaConfig.lastVerifiedAt = new Date();
    await mfaConfig.save();

    logger.info('MFA enabled', { userId });

    res.json({
      success: true,
      message: 'MFA successfully enabled',
      isEnabled: true,
    });
  } catch (err: any) {
    logger.error('MFA verification error', { error: err.message });
    throw new ApiError(500, 'Failed to verify MFA');
  }
});

/**
 * POST /auth/mfa/verify
 * Verify MFA code during login flow
 *
 * TOTP Code Format:
 * - 6-digit numeric code (RFC 6238 compliant)
 * - Valid range: 000000-999999
 * - Time-based: changes every 30 seconds
 * - Tolerance: ±1 time window (allows for clock skew)
 *
 * Example: { code: "123456" }
 *
 * Returns MFA-verified JWT token after successful verification
 */
router.post('/auth/mfa/verify', verifyJWT, mfaVerifyLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const code = String(req.body.code).trim();

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    if (!/^\d{6}$/.test(code)) {
      throw new ApiError(400, 'Invalid code format');
    }

    // Fetch MFA config
    const mfaConfig = await MfaConfig.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isEnabled: true,
    });

    if (!mfaConfig) {
      throw new ApiError(400, 'MFA not enabled for this account');
    }

    // AUTH-HIGH-02 FIX: Decrypt TOTP secret before verification.
    const secret = isEncrypted(mfaConfig.secret)
      ? decryptTotpSecret(mfaConfig.secret)
      : mfaConfig.secret;

    // Verify TOTP code
    if (!totpService.verifyTOTPCode(secret, code)) {
      logger.warn('MFA verification failed during login', { userId });
      throw new ApiError(401, 'Invalid TOTP code');
    }

    // Update last verified time
    mfaConfig.lastVerifiedAt = new Date();
    await mfaConfig.save();

    // SECURITY FIX: actually mark the session as MFA-verified in Redis so that
    // requireMfa / enforceAdminMfa middleware does not reject subsequent calls.
    // Without this, every MFA-enabled user is permanently blocked.
    const sessionId = req.user?.sessionId || req.user?.jti || userId;
    await markMfaVerified(String(sessionId), String(userId));

    logger.info('MFA verified during login', { userId });

    res.json({
      success: true,
      message: 'MFA verified',
      mfaVerified: true,
    });
  } catch (err: any) {
    logger.error('MFA verification error', { error: err.message });
    throw new ApiError(500, 'Failed to verify MFA');
  }
});

/**
 * POST /auth/mfa/backup-verify
 * Verify using a one-time backup code (for recovery)
 * Body: { code: "XXXX-XXXX" }
 */
router.post('/auth/mfa/backup-verify', verifyJWT, mfaVerifyLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const backupCode = String(req.body.code).trim().toUpperCase();

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    // Fetch MFA config
    const mfaConfig = await MfaConfig.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isEnabled: true,
    });

    if (!mfaConfig) {
      throw new ApiError(400, 'MFA not enabled for this account');
    }

    // Find and verify backup code (constant-time comparison)
    let codeFound = false;
    for (const bc of mfaConfig.backupCodes) {
      if (!bc.used && totpService.verifyBackupCode(backupCode, bc.code)) {
        bc.used = true;
        bc.usedAt = new Date();
        codeFound = true;
        break;
      }
    }

    if (!codeFound) {
      logger.warn('Invalid backup code', { userId });
      throw new ApiError(401, 'Invalid backup code');
    }

    await mfaConfig.save();

    // SECURITY FIX: actually mark the session as MFA-verified in Redis.
    const sessionId = req.user?.sessionId || req.user?.jti || userId;
    await markMfaVerified(String(sessionId), String(userId));

    logger.info('Backup code used for login', { userId });

    res.json({
      success: true,
      message: 'Backup code verified',
      mfaVerified: true,
    });
  } catch (err: any) {
    logger.error('Backup code verification error', { error: err.message });
    throw new ApiError(500, 'Failed to verify backup code');
  }
});

/**
 * DELETE /auth/mfa/disable
 * Disable MFA for the user (requires valid TOTP code)
 * Body: { code: "123456" }
 */
router.delete('/auth/mfa/disable', verifyJWT, mfaVerifyLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const code = String(req.body.code).trim();

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    if (!/^\d{6}$/.test(code)) {
      throw new ApiError(400, 'Invalid code format');
    }

    // Fetch MFA config
    const mfaConfig = await MfaConfig.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isEnabled: true,
    });

    if (!mfaConfig) {
      throw new ApiError(400, 'MFA not enabled for this account');
    }

    // AUTH-HIGH-02 FIX: Decrypt TOTP secret before verification.
    const secret = isEncrypted(mfaConfig.secret)
      ? decryptTotpSecret(mfaConfig.secret)
      : mfaConfig.secret;

    // Verify TOTP code before disabling
    if (!totpService.verifyTOTPCode(secret, code)) {
      logger.warn('Invalid code provided for MFA disable', { userId });
      throw new ApiError(401, 'Invalid TOTP code');
    }

    // Disable MFA
    mfaConfig.isEnabled = false;
    await mfaConfig.save();

    logger.info('MFA disabled', { userId });

    res.json({
      success: true,
      message: 'MFA successfully disabled',
      isEnabled: false,
    });
  } catch (err: any) {
    logger.error('MFA disable error', { error: err.message });
    throw new ApiError(500, 'Failed to disable MFA');
  }
});

/**
 * GET /auth/mfa/status
 * Get MFA status for current user
 */
router.get('/auth/mfa/status', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const mfaConfig = await MfaConfig.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    const isEnabled = mfaConfig?.isEnabled || false;
    const hasUnusedBackupCodes = (mfaConfig?.backupCodes || []).filter((bc) => !bc.used).length;

    res.json({
      success: true,
      isEnabled,
      enabledAt: mfaConfig?.enabledAt || null,
      lastVerifiedAt: mfaConfig?.lastVerifiedAt || null,
      unUsedBackupCodesCount: hasUnusedBackupCodes,
    });
  } catch (err: any) {
    logger.error('MFA status check error', { error: err.message });
    throw new ApiError(500, 'Failed to fetch MFA status');
  }
});

export default router;
