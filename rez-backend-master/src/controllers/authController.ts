import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';

/** Hash a refresh token for secure storage — never store raw tokens in DB */
export const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyToken,
  blacklistToken,
  isTokenBlacklisted,
  logoutAllDevices
} from '../middleware/auth';
import {
  sendSuccess,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
  sendTooManyRequests,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import referralService from '../services/referralService';
import { ReferralFraudDetection } from '../services/referralFraudDetection';
import { Wallet } from '../models/Wallet';
import { Types } from 'mongoose';
import { logger } from '../config/logger';

const referralFraudDetection = new ReferralFraudDetection();
import achievementService from '../services/achievementService';
import gamificationEventBus from '../events/gamificationEventBus';

import twilio from "twilio";
import dotenv from 'dotenv';

// Ensure dotenv is loaded
dotenv.config();

// Twilio credentials loaded from environment

// Use environment variables for Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER?.startsWith('+') 
  ? process.env.TWILIO_PHONE_NUMBER 
  : `+91${process.env.TWILIO_PHONE_NUMBER || '8210224305'}`;

// Twilio configuration loaded

// Only initialize Twilio client if we have valid credentials
let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_ACCOUNT_SID.startsWith('AC')) {
  try {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    logger.info('Twilio client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Twilio client', { error: error instanceof Error ? error.message : String(error) });
    client = null;
  }
} else {
  logger.info('Development mode: Twilio client not initialized (using console OTP)');
}

const isDev = process.env.NODE_ENV === 'development';

const smsService = {
  sendOTP: async (phoneNumber: string, otp: string): Promise<boolean> => {
    // In development without Twilio, log OTP to console for testing
    if (!client) {
      if (isDev) {
        logger.debug('[DEV_MODE] OTP generated', { phone: `***${phoneNumber.slice(-4)}` });
      } else {
        logger.error('[OTP_SERVICE] No SMS provider configured in production!');
        return false;
      }
      return true;
    }

    // Send SMS via Twilio
    try {
      await client.messages.create({
        body: `Your REZ App OTP is ${otp}. Valid for 10 minutes.`,
        from: TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      logger.info('[OTP_SERVICE] SMS sent', { phone: `***${phoneNumber.slice(-4)}` });
      return true;
    } catch (error) {
      logger.error('[OTP_SERVICE] SMS send failed', { error: error instanceof Error ? error.message : String(error) });
      if (isDev) {
        logger.debug('[DEV_FALLBACK] OTP generated', { phone: `***${phoneNumber.slice(-4)}` });
        return true;
      }
      return false;
    }
  }
};


// Phone normalization helper - supports international numbers
const normalizePhoneNumber = (phone: string): string => {
  // Remove all spaces and special characters except +
  let normalized = phone.replace(/[\s\-()]/g, '');

  // If already has international format (starts with +), return as-is
  if (normalized.startsWith('+')) {
    return normalized;
  }

  // For backward compatibility: if starts with country code without +, add +
  if (normalized.startsWith('91') && normalized.length >= 12) {
    return `+${normalized}`;
  }
  if (normalized.startsWith('971') && normalized.length >= 12) {
    return `+${normalized}`;
  }

  // Default: assume Indian number if no country code, add +91
  return `+91${normalized}`;
};

// Send OTP to phone number
/**
 * @swagger
 * /api/user/auth/send-otp:
 *   post:
 *     summary: Send OTP to phone number
 *     description: Sends a 6-digit OTP to the provided phone number for authentication. Creates a new user if one doesn't exist.
 *     tags: [User Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543210"
 *                 description: Phone number (auto-normalizes international formats)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Optional email for signup
 *               referralCode:
 *                 type: string
 *                 description: Optional referral code
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "OTP sent successfully"
 *                     expiresIn:
 *                       type: number
 *                       example: 300
 *       400:
 *         description: Invalid referral code
 *       409:
 *         description: Email already registered
 *       429:
 *         description: Too many requests / account locked
 */
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  let { phoneNumber, email, referralCode } = req.body;

  // Normalize phone number BEFORE validation
  const originalPhone = phoneNumber;
  phoneNumber = normalizePhoneNumber(phoneNumber);

  if (isDev) {
    logger.debug('[SEND_OTP]', { phone: `***${phoneNumber.slice(-4)}`, hasEmail: !!email });
  }

  // Check if user exists (no .lean() — we need instance methods: generateOTP, save, isAccountLocked)
  let user = await User.findOne({ phoneNumber }) as any;

  // Create user if doesn't exist, or reactivate if inactive
  if (!user) {
    // Check if email already exists (only if email is provided)
    if (email) {
      const emailExists = await User.findOne({ email }).lean();
      if (emailExists) {
        return sendConflict(res, 'Email is already registered');
      }
    }

    // Check if referral code is valid (if provided)
    if (referralCode) {
      const referrerUser = await User.findOne({ 'referral.referralCode': referralCode }).lean();
      if (!referrerUser) {
        return sendBadRequest(res, 'Invalid referral code');
      }
    }

    user = new User({
      phoneNumber,
      email,
      role: 'user',
      auth: {
        isVerified: false,
        isOnboarded: false
      },
      referral: referralCode ? {
        referredBy: referralCode,
        referredUsers: [],
        totalReferrals: 0,
        referralEarnings: 0
      } : undefined
    });

    // Initialize achievements for new user
    try {
      await achievementService.initializeUserAchievements(String(user._id));
    } catch (error) {
      logger.error('[AUTH] Error initializing achievements for new user:', error);
    }
  } else if (user.isActive && email) {
    return sendConflict(res, 'Phone number is already registered. Please use Sign In instead.');
  } else if (user.isActive && !email) {
    // Normal login flow — continue with OTP generation
  } else if (!user.isActive) {
    // Deactivated account — DON'T reactivate yet.
    // S-7: Do NOT reset loginAttempts or lockUntil here
    // S-13: Do NOT apply email changes during reactivation
    if (email && user.email !== email) {
      logger.info(`[AUTH] Email change attempted during reactivation for user ${user._id} — ignored.`);
    }
  }

  if (!user) {
    throw new AppError('User creation or retrieval failed', 500, 'USER_CREATION_FAILED');
  }

  // Check if account is locked
  if (user.isAccountLocked()) {
    const lockTime = user.auth.lockUntil;
    const minutesLeft = lockTime ? Math.ceil((lockTime.getTime() - Date.now()) / (1000 * 60)) : 0;
    return sendTooManyRequests(res, `Account locked. Try again in ${minutesLeft} minutes.`);
  }

  // Generate and save OTP
  const otp = user.generateOTP();
  await user.save();

  // Send OTP via SMS
  let otpSent = false;
  try {
    otpSent = await smsService.sendOTP(phoneNumber, otp);
  } catch (smsErr) {
    if (!isDev) throw new AppError('Failed to send OTP. Please try again.', 500, 'SMS_FAILED');
    logger.warn('[SEND_OTP] SMS failed in dev mode, continuing with devOtp in response');
  }

  if (!otpSent && !isDev) {
    throw new AppError('Failed to send OTP. Please try again.', 500, 'SMS_FAILED');
  }

  const responseData: any = {
    message: 'OTP sent successfully',
    expiresIn: 10 * 60
  };

  // SECURITY: require explicit EXPOSE_DEV_OTP flag, not just "not production".
  // A misconfigured NODE_ENV (unset → default development) would leak the OTP
  // to anyone hitting the API. The flag must be set intentionally.
  if (process.env.EXPOSE_DEV_OTP === 'true') {
    responseData.devOtp = otp;
  }

  sendSuccess(res, responseData, 'OTP sent to your phone number');
});

// Verify OTP and login
/**
 * @swagger
 * /api/user/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and authenticate
 *     description: Verifies the OTP and returns JWT tokens. Processes referral bonus for new users. Reactivates deactivated accounts.
 *     tags: [User Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, otp]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: 6-digit OTP
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 *       429:
 *         description: Account locked due to too many failed attempts
 */
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  let { phoneNumber, otp } = req.body;

  // Normalize phone number BEFORE looking up user
  const originalPhone = phoneNumber;
  phoneNumber = normalizePhoneNumber(phoneNumber);

  if (isDev) {
    logger.debug('[VERIFY_OTP]', { phone: `***${phoneNumber.slice(-4)}` });
  }

  // Find user with OTP fields (no .lean() — we need instance methods: isAccountLocked, verifyOTP, save)
  const user = await User.findOne({ phoneNumber }).select('+auth.otpCode +auth.otpExpiry');

  if (!user) {
    return sendNotFound(res, 'User not found');
  }

  // Deactivated accounts are allowed through OTP verification — reactivated below on success.

  // Check if account is locked
  if (user.isAccountLocked()) {
    return sendTooManyRequests(res, 'Account is temporarily locked');
  }

  // Development bypass: Accept OTP starting with "123" for testing
  const isDevelopmentBypass = process.env.NODE_ENV === 'development' && otp.startsWith('123');

  if (isDevelopmentBypass) {
    logger.debug('[DEV_BYPASS] Development OTP bypass', { phone: `***${phoneNumber.slice(-4)}` });
  } else {
    // Verify OTP properly
    const isValidOTP = user.verifyOTP(otp);

    if (!isValidOTP) {
      await user.incrementLoginAttempts();
      return sendUnauthorized(res, 'Invalid or expired OTP');
    }
  }

  // Reset login attempts on successful verification
  await user.resetLoginAttempts();

  // Process referral if this is a new user with a referrer
  if (!user.auth.isVerified && user.referral.referredBy) {
    try {
      const referrerUser = await User.findOne({ 'referral.referralCode': user.referral.referredBy }).lean();
      if (referrerUser) {
        // Fraud check before processing referral
        const fraudCheck = await referralFraudDetection.checkReferral(
          String(referrerUser._id),
          String(user._id),
          {
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
            deviceId: req.headers['x-device-id'],
          }
        );

        if (fraudCheck.action === 'block') {
          logger.warn(`[REFERRAL] Fraud blocked for referral ${user.referral.referredBy}: ${fraudCheck.reasons.join(', ')} (score: ${fraudCheck.riskScore})`);
          user.referral.referredBy = '';
        } else {
          if (fraudCheck.action === 'review') {
            logger.warn(`[REFERRAL] Flagged for review: ${user.referral.referredBy} (score: ${fraudCheck.riskScore}, reasons: ${fraudCheck.reasons.join(', ')})`);
          }

        // Create referral relationship using referral service
        await referralService.createReferral({
          referrerId: new Types.ObjectId(String(referrerUser._id)),
          refereeId: new Types.ObjectId(String(user._id)),
          referralCode: user.referral.referredBy,
          signupSource: 'otp_verification',
        });

        // Add referee discount (₹30) to their wallet for first order
        let refereeWallet = await Wallet.findOne({ user: user._id }).lean() as any;
        // Credit referral bonus via walletService (atomic $inc + CoinTransaction + LedgerEntry)
        const { walletService } = await import('../services/walletService');
        await walletService.credit({
          userId: String(user._id),
          amount: 30,
          source: 'referral',
          description: 'Referral signup bonus',
          operationType: 'referral_bonus',
          referenceId: `referral:${referrerUser._id}:${user._id}`,
          referenceModel: 'User',
          metadata: { referrerId: String(referrerUser._id) },
        });

        // Update user referral stats
        referrerUser.referral.referredUsers.push(String(user._id));
        referrerUser.referral.totalReferrals += 1;
        await referrerUser.save();

        // Emit gamification event for referral completion (for the REFERRER)
        gamificationEventBus.emit('referral_completed', {
          userId: String(referrerUser._id),
          entityId: String(user._id),
          entityType: 'referral',
          source: { controller: 'authController', action: 'verifyOTP' }
        });
        logger.info(`🏆 [REFERRAL] Gamification event emitted for referrer: ${referrerUser._id}`);

        // Update referrer's partner referral task progress
        try {
          const Partner = require('../models/Partner').default;
          const partner = await Partner.findOne({ userId: referrerUser._id });
          
          if (partner) {
            const referralTask = partner.tasks.find((t: any) => t.type === 'referral');
            if (referralTask && referralTask.progress.current < referralTask.progress.target) {
              referralTask.progress.current += 1;
              
              if (referralTask.progress.current >= referralTask.progress.target) {
                referralTask.completed = true;
                referralTask.completedAt = new Date();
              }
              
              await partner.save();
              logger.info('✅ [REFERRAL] Partner referral task updated:', referralTask.progress.current, '/', referralTask.progress.target);
            }
          }
        } catch (error) {
          logger.error('❌ [REFERRAL] Error updating partner referral task:', error);
        }

        logger.info(`🎁 [REFERRAL] New referral created! Referee ${user._id} received ₹30 signup bonus.`);
        } // end else (fraud check passed)
      }
    } catch (error) {
      logger.error('Error processing referral:', error);
      // Don't fail the OTP verification if referral processing fails
    }
  }

  // Reactivate deactivated accounts after successful OTP verification
  if (!user.isActive) {
    user.isActive = true;
    user.auth.isVerified = false;
    user.auth.isOnboarded = false;
    user.auth.refreshToken = undefined;

    // S-13: Do NOT apply any pending email changes during reactivation.
    // Email changes must go through a separate verified flow (profile update with OTP/email verification).
    // The original email on file is preserved to prevent unverified email takeover.
    if ((user as any)._pendingReactivationEmail) {
      logger.info(`⚠️ [AUTH] Email change requested during reactivation for user ${user._id} — ignored. User must update email separately after reactivation.`);
    }

    logger.info('✅ [AUTH] Deactivated account reactivated after OTP verification:', user._id);
  }

  // Update last login
  user.auth.lastLogin = new Date();

  // Emit gamification event for login (fire-and-forget, non-blocking)
  gamificationEventBus.emit('login', {
    userId: String(user._id),
    source: { controller: 'authController', action: 'verifyOTP' }
  });

  // Generate tokens
  const accessToken = generateToken(String(user._id), user.role);
  const refreshToken = generateRefreshToken(String(user._id));

  // Save hashed refresh token (never store raw tokens in DB)
  user.auth.refreshToken = hashRefreshToken(refreshToken);
  await user.save();

  // Prepare user data for response (exclude sensitive fields)
  const userData = {
    id: user._id,
    phoneNumber: user.phoneNumber,
    email: user.email,
    profile: user.profile,
    preferences: user.preferences,
    wallet: user.wallet,
    role: user.role,
    isVerified: user.auth.isVerified,
    isOnboarded: user.auth.isOnboarded
  };

  sendSuccess(res, {
    user: userData,
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    }
  }, 'Login successful');
});

// Refresh access token
/**
 * @swagger
 * /api/user/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Uses a valid refresh token to obtain new access and refresh tokens. The old refresh token is blacklisted (rotation).
 *     tags: [User Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token from login
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         description: Invalid or already-used refresh token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendUnauthorized(res, 'Refresh token required');
  }

  const decoded = verifyRefreshToken(refreshToken);

  // Check if refresh token (by its hash) has been revoked (e.g., after logout)
  if (await isTokenBlacklisted(hashRefreshToken(refreshToken), true)) {
    return sendUnauthorized(res, 'Refresh token has been revoked');
  }

  const user = await User.findById(decoded.userId).select('+auth.refreshToken').lean();

  if (!user || user.auth.refreshToken !== hashRefreshToken(refreshToken)) {
    return sendUnauthorized(res, 'Invalid refresh token');
  }

  if (!user.isActive) {
    return sendUnauthorized(res, 'Account is deactivated');
  }

  const newAccessToken = generateToken(String(user._id), user.role);
  const newRefreshToken = generateRefreshToken(String(user._id));
  const newHashedToken = hashRefreshToken(newRefreshToken);
  const oldHashedToken = hashRefreshToken(refreshToken);

  // Atomic token rotation — prevents race condition
  const rotated = await User.findOneAndUpdate(
    { _id: decoded.userId, 'auth.refreshToken': oldHashedToken },
    { $set: { 'auth.refreshToken': newHashedToken } },
    { new: true }
  );

  if (!rotated) {
    return sendUnauthorized(res, 'Refresh token already used');
  }

  // SECURITY: blacklist by hash, not raw token. isTokenBlacklisted() checks
  // against the hash, so writing the raw value would never match — meaning
  // revoked tokens stayed valid.
  blacklistToken(hashRefreshToken(refreshToken), 7 * 24 * 60 * 60);

  sendSuccess(res, {
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    }
  }, 'Token refreshed successfully');
});

// Logout
/**
 * @swagger
 * /api/user/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Blacklists the current access and refresh tokens, clears refresh token from DB.
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    // SECURITY: blacklist the access token (raw is fine — isTokenBlacklisted
    // accepts both forms for access tokens) and the hashed refresh token.
    blacklistToken(token, 24 * 60 * 60);

    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (user) {
        if (user.auth.refreshToken) {
          // user.auth.refreshToken is already stored as a hash — blacklist as-is.
          blacklistToken(user.auth.refreshToken, 7 * 24 * 60 * 60);
        }
        user.auth.refreshToken = undefined;
        await user.save();
        logger.info('[LOGOUT] User tokens cleared:', user._id);
      }
    } catch (tokenError) {
      // Token is invalid/expired — that's okay for logout
      logger.info('[LOGOUT] Invalid token during logout (expected):', tokenError instanceof Error ? tokenError.message : String(tokenError));
    }
  }

  sendSuccess(res, null, 'Logged out successfully');
});

// Get current user profile
/**
 * @swagger
 * /api/user/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the authenticated user's full profile including preferences and wallet reference.
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized
 */
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const userData = {
    id: req.user._id,
    phoneNumber: req.user.phoneNumber,
    email: req.user.email,
    profile: req.user.profile,
    preferences: req.user.preferences,
    wallet: req.user.wallet,
    role: req.user.role,
    isVerified: req.user.auth.isVerified,
    isOnboarded: req.user.auth.isOnboarded,
    createdAt: req.user.createdAt,
    updatedAt: req.user.updatedAt,
    // Identity layer fields
    statedIdentity: (req.user as any).statedIdentity,
    featureLevel: (req.user as any).featureLevel,
    segment: (req.user as any).segment,
    verificationSegment: (req.user as any).verificationSegment,
    instituteStatus: (req.user as any).instituteStatus,
    activeZones: (req.user as any).activeZones,
    verifications: (req.user as any).verifications,
  };

  sendSuccess(res, userData, 'User profile retrieved successfully');
});

// Update user profile
/**
 * @swagger
 * /api/user/auth/profile:
 *   put:
 *     summary: Update user profile
 *     description: Updates the authenticated user's profile and/or preferences. Syncs partner profile if exists.
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profile:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   avatar:
 *                     type: string
 *                   dateOfBirth:
 *                     type: string
 *                     format: date
 *                   gender:
 *                     type: string
 *                     enum: [male, female, other]
 *               preferences:
 *                 type: object
 *                 properties:
 *                   language:
 *                     type: string
 *                   notifications:
 *                     type: boolean
 *                   privacyLevel:
 *                     type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const { profile, preferences, statedIdentity } = req.body;

  if (profile) {
    const allowedProfileFields = ['firstName', 'lastName', 'avatar', 'dateOfBirth', 'gender', 'bio'];
    allowedProfileFields.forEach(key => {
      if (profile[key] !== undefined) {
        req.user!.profile[key as keyof typeof req.user.profile] = profile[key];
      }
    });
  }

  if (preferences) {
    const allowedPreferenceFields = ['language', 'currency', 'notifications', 'theme', 'dietaryPreferences'];
    allowedPreferenceFields.forEach(key => {
      if (preferences[key] !== undefined) {
        req.user!.preferences[key as keyof typeof req.user.preferences] = preferences[key];
      }
    });
  }

  // Accept statedIdentity for identity layer
  if (statedIdentity && ['student', 'corporate', 'other', 'general'].includes(statedIdentity)) {
    (req.user as any).statedIdentity = statedIdentity;
  }

  await req.user.save();

  // Sync with partner profile
  try {
    const partnerService = require('../services/partnerService').default;
    const userId = (req.user._id as any).toString();
    await partnerService.syncProfileCompletion(userId);
  } catch (error) {
    logger.error('Error syncing partner profile:', error);
  }

  const userData = {
    id: req.user._id,
    phoneNumber: req.user.phoneNumber,
    email: req.user.email,
    profile: req.user.profile,
    preferences: req.user.preferences,
    wallet: req.user.wallet,
    role: req.user.role,
    isVerified: req.user.auth.isVerified,
    isOnboarded: req.user.auth.isOnboarded,
    statedIdentity: (req.user as any).statedIdentity,
    featureLevel: (req.user as any).featureLevel,
    segment: (req.user as any).segment,
    verificationSegment: (req.user as any).verificationSegment,
    instituteStatus: (req.user as any).instituteStatus,
  };

  sendSuccess(res, userData, 'Profile updated successfully');
});

// Complete onboarding
/**
 * @swagger
 * /api/user/auth/complete-onboarding:
 *   post:
 *     summary: Complete user onboarding
 *     description: Marks the user as onboarded after collecting profile data. Fails if already onboarded.
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profile:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   dateOfBirth:
 *                     type: string
 *                     format: date
 *                   gender:
 *                     type: string
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Onboarding completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       409:
 *         description: User already onboarded
 */
export const completeOnboarding = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  if (req.user.auth.isOnboarded) {
    // Return success (idempotent) — don't 409, because the frontend
    // (tabs)/index.tsx fallback retries this and a 409 dispatches AUTH_FAILURE
    // which clears the auth session and kicks the user to sign-in.
    const userData = {
      id: req.user._id,
      phoneNumber: req.user.phoneNumber,
      email: req.user.email,
      profile: req.user.profile,
      preferences: req.user.preferences,
      wallet: req.user.wallet,
      role: req.user.role,
      isVerified: req.user.auth.isVerified,
      isOnboarded: req.user.auth.isOnboarded,
    };
    return sendSuccess(res, userData, 'User is already onboarded');
  }

  const { profile, preferences } = req.body;

  if (profile) {
    const allowedProfileFields = ['firstName', 'lastName', 'avatar', 'dateOfBirth', 'gender', 'bio'];
    allowedProfileFields.forEach(key => {
      if (profile[key] !== undefined) {
        req.user!.profile[key as keyof typeof req.user.profile] = profile[key];
      }
    });
  }

  if (preferences) {
    const allowedPreferenceFields = ['language', 'currency', 'notifications', 'theme', 'dietaryPreferences'];
    allowedPreferenceFields.forEach(key => {
      if (preferences[key] !== undefined) {
        req.user!.preferences[key as keyof typeof req.user.preferences] = preferences[key];
      }
    });
  }

  req.user.auth.isOnboarded = true;
  await req.user.save();

  const userData = {
    id: req.user._id,
    phoneNumber: req.user.phoneNumber,
    email: req.user.email,
    profile: req.user.profile,
    preferences: req.user.preferences,
    wallet: req.user.wallet,
    role: req.user.role,
    isVerified: req.user.auth.isVerified,
    isOnboarded: req.user.auth.isOnboarded
  };

  sendSuccess(res, userData, 'Onboarding completed successfully');
});

// Change password
/**
 * @swagger
 * /api/user/auth/change-password:
 *   put:
 *     summary: Change password
 *     description: Changes the user's password. Requires current password. New password must contain uppercase, lowercase, and digit (min 8 chars).
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Must contain uppercase, lowercase, and digit
 *     responses:
 *       200:
 *         description: Password changed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Weak password
 *       401:
 *         description: Wrong current password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
  }

  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    throw new AppError('Password must contain at least one uppercase letter, one lowercase letter, and one digit', 400, 'WEAK_PASSWORD');
  }

  const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
  }

  req.user.password = newPassword;
  req.user.auth.refreshToken = undefined;
  await req.user.save();

  // Invalidate all existing sessions (blacklist all tokens for this user)
  await logoutAllDevices(String(req.user._id));

  sendSuccess(res, null, 'Password changed successfully. All other sessions have been logged out.');
});

// Delete account (GDPR-compliant: anonymize + cascade)
/**
 * @swagger
 * /api/user/auth/account:
 *   delete:
 *     summary: Delete account (GDPR)
 *     description: |
 *       Permanently deletes the user account with full GDPR-compliant cascade:
 *       - Anonymizes orders, reviews, transactions
 *       - Deletes videos, wishlists, favorites, notifications
 *       - Cancels subscriptions, freezes wallet
 *       - Clears all tokens and push tokens
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  // Re-authentication required before account deletion
  const { password, otp } = req.body;

  if (req.user.password) {
    // User has a password set — require password confirmation
    if (!password) {
      throw new AppError('Password is required to confirm account deletion', 400, 'REAUTH_REQUIRED');
    }
    const isValid = await req.user.comparePassword(password);
    if (!isValid) {
      throw new AppError('Incorrect password', 401, 'INVALID_PASSWORD');
    }
  } else {
    // OTP-only user — require a fresh OTP
    if (!otp) {
      throw new AppError('OTP is required to confirm account deletion', 400, 'REAUTH_REQUIRED');
    }
    const isValidOtp = req.user.verifyOTP(otp);
    if (!isValidOtp) {
      throw new AppError('Invalid or expired OTP', 401, 'INVALID_OTP');
    }
  }

  const userId = req.user._id;
    const anonymizedId = `deleted_${userId}`;

    // Dynamic imports to avoid circular dependencies
    const { Order } = await import('../models/Order');
    const { Review } = await import('../models/Review');
    const { Video } = await import('../models/Video');
    const { Subscription } = await import('../models/Subscription');
    const { CoinTransaction } = await import('../models/CoinTransaction');
    const { Transfer } = await import('../models/Transfer');
    const { CoinGift } = await import('../models/CoinGift');
    const { Wishlist } = await import('../models/Wishlist');
    const { Favorite } = await import('../models/Favorite');
    const { Conversation } = await import('../models/Conversation');
    const { Message } = await import('../models/Message');
    const PriceAlert = (await import('../models/PriceAlert')).default;
    const { SupportTicket } = await import('../models/SupportTicket');
    const { Notification } = await import('../models/Notification');

    // 1. Anonymize orders (retain for financial compliance, strip PII)
    await Order.updateMany(
      { user: userId },
      { $set: {
        'deliveryAddress.name': 'Deleted User',
        'deliveryAddress.phone': '',
        'deliveryAddress.email': '',
      }}
    );

    // 2. Anonymize reviews (retain for store integrity, strip PII)
    await Review.updateMany(
      { user: userId },
      { $set: { userName: 'Deleted User', userAvatar: '' } }
    );

    // 3. Delete user's videos/UGC content
    await Video.deleteMany({ user: userId });

    // 4. Cancel active subscriptions
    await Subscription.updateMany(
      { userId, status: { $in: ['active', 'trialing'] } },
      { $set: { status: 'cancelled', cancelledAt: new Date() } }
    );

    // 5. Anonymize financial records (retain for audit, strip PII)
    await CoinTransaction.updateMany(
      { userId },
      { $set: { 'metadata.userName': 'Deleted User' } }
    );
    await Transfer.updateMany(
      { $or: [{ sender: userId }, { recipient: userId }] },
      { $set: { 'metadata.userName': 'Deleted User' } }
    );

    // 6. Delete personal data collections
    await Promise.all([
      Wishlist.deleteMany({ user: userId }),
      Favorite.deleteMany({ user: userId }),
      CoinGift.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),
      PriceAlert.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
    ]);

    // 7. Anonymize conversations/messages
    await Conversation.updateMany(
      { participants: userId },
      { $pull: { participants: userId } }
    );
    await Message.updateMany(
      { sender: userId },
      { $set: { senderName: 'Deleted User' } }
    );

    // 8. Delete support tickets
    await SupportTicket.deleteMany({ user: userId });

    // 9. Deactivate wallet (zero out, keep for ledger integrity)
    await Wallet.updateMany(
      { userId },
      { $set: {
        'balance.available': 0,
        'balance.pending': 0,
        'balance.cashback': 0,
        isFrozen: true,
      }}
    );

    // 10. Remove referral references
    await User.updateMany(
      { referredBy: userId },
      { $unset: { referredBy: 1 } }
    );

    // 11. Anonymize and deactivate the user
    req.user.isActive = false;
    req.user.phoneNumber = anonymizedId;
    req.user.email = `${anonymizedId}@deleted.local`;
    if (req.user.profile) {
      req.user.profile.firstName = 'Deleted';
      req.user.profile.lastName = 'User';
      req.user.profile.avatar = '';
    }
    req.user.auth.refreshToken = undefined;
    (req.user as any).pushTokens = [];
    (req.user as any).deviceInfo = [];
    await req.user.save();

  sendSuccess(res, null, 'Account and associated data deleted successfully');
});

// GDPR data export — returns all user data as JSON
/**
 * @swagger
 * /api/user/auth/me/data-export:
 *   get:
 *     summary: Export user data (GDPR)
 *     description: Returns all user data as JSON for GDPR data portability — profile, wallet, orders, reviews, transactions, subscriptions, wishlists, favorites.
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data export
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       type: object
 *                     wallet:
 *                       type: object
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     exportedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 */
export const exportUserData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const userId = req.user._id;

    const { Order } = await import('../models/Order');
    const { Review } = await import('../models/Review');
    const { CoinTransaction } = await import('../models/CoinTransaction');
    const { Subscription } = await import('../models/Subscription');
    const { Wishlist } = await import('../models/Wishlist');
    const { Favorite } = await import('../models/Favorite');

    const [orders, reviews, transactions, subscriptions, wishlists, favorites, wallet] = await Promise.all([
      Order.find({ user: userId }).select('-__v').lean(),
      Review.find({ user: userId }).select('-__v').lean(),
      CoinTransaction.find({ userId }).select('-__v').lean(),
      Subscription.find({ userId }).select('-__v').lean(),
      Wishlist.find({ user: userId }).select('-__v').lean(),
      Favorite.find({ user: userId }).select('-__v').lean(),
      Wallet.findOne({ userId }).select('-__v').lean(),
    ]);

    const userData = {
      profile: {
        phoneNumber: req.user.phoneNumber,
        email: req.user.email,
        profile: req.user.profile,
        createdAt: req.user.createdAt,
      },
      wallet,
      orders,
      reviews,
      transactions,
      subscriptions,
      wishlists,
      favorites,
      exportedAt: new Date().toISOString(),
    };

  sendSuccess(res, userData, 'User data exported successfully');
});

// Get user statistics (aggregated data from all modules)
/**
 * @swagger
 * /api/user/auth/statistics:
 *   get:
 *     summary: Get user statistics
 *     description: Returns aggregated statistics across user's wallet, orders, videos, projects, vouchers, achievements, and more.
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         joinedDate:
 *                           type: string
 *                           format: date-time
 *                         totalReferrals:
 *                           type: number
 *                         referralEarnings:
 *                           type: number
 *                     wallet:
 *                       type: object
 *                       properties:
 *                         balance:
 *                           type: number
 *                         totalEarned:
 *                           type: number
 *                         totalSpent:
 *                           type: number
 *                     orders:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         totalSpent:
 *                           type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalEarnings:
 *                           type: number
 *                         totalSpendings:
 *                           type: number
 *       401:
 *         description: Unauthorized
 */
export const getUserStatistics = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const userId = req.user._id;

  const { Order } = await import('../models/Order');
    const { Video } = await import('../models/Video');
    const { Project } = await import('../models/Project');
    const OfferRedemption = (await import('../models/OfferRedemption')).default;
    const { UserVoucher } = await import('../models/Voucher');
    const { Review } = await import('../models/Review');
    const { UserAchievement } = await import('../models/Achievement');

    // Aggregate statistics from various modules
    const [
      orderStats,
      videoStats,
      projectStats,
      offerStats,
      voucherStats,
      reviewStats,
      achievementStats
    ] = await Promise.all([
      // Order statistics (exclude pending_payment orders)
      Order.aggregate([
        {
          $match: {
            user: userId,
            status: { $ne: 'pending_payment' } // Exclude pending payment orders
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalPrice' },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            }
          }
        }
      ]),

      // Video statistics
      Video.aggregate([
        { $match: { creator: userId } },
        {
          $group: {
            _id: null,
            totalVideos: { $sum: 1 },
            totalViews: { $sum: '$engagement.views' },
            totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
            totalShares: { $sum: '$engagement.shares' }
          }
        }
      ]),

      // Project statistics
      Project.aggregate([
        { $match: { 'submissions.user': userId } },
        { $unwind: '$submissions' },
        { $match: { 'submissions.user': userId } },
        {
          $group: {
            _id: null,
            totalProjects: { $sum: 1 },
            approvedSubmissions: {
              $sum: { $cond: [{ $eq: ['$submissions.status', 'approved'] }, 1, 0] }
            },
            rejectedSubmissions: {
              $sum: { $cond: [{ $eq: ['$submissions.status', 'rejected'] }, 1, 0] }
            },
            totalEarned: { $sum: { $ifNull: ['$submissions.paidAmount', 0] } }
          }
        }
      ]),

      // Offer redemption statistics
      OfferRedemption.countDocuments({ user: userId }),

      // Voucher statistics
      UserVoucher.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            totalVouchers: { $sum: 1 },
            usedVouchers: {
              $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] }
            },
            activeVouchers: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            }
          }
        }
      ]),

      // Review statistics
      Review.countDocuments({ user: userId, isActive: true }),

      // Achievement statistics
      UserAchievement.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unlocked: {
              $sum: { $cond: [{ $eq: ['$unlocked', true] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    // Build statistics response
    const statistics = {
      user: {
        joinedDate: req.user.createdAt,
        isVerified: req.user.auth.isVerified,
        totalReferrals: req.user.referral.totalReferrals,
        referralEarnings: req.user.referral.referralEarnings
      },
      wallet: {
        balance: req.user.wallet.balance,
        totalEarned: req.user.wallet.totalEarned,
        totalSpent: req.user.wallet.totalSpent,
        pendingAmount: req.user.wallet.pendingAmount
      },
      orders: {
        total: orderStats[0]?.totalOrders || 0,
        completed: orderStats[0]?.completedOrders || 0,
        cancelled: orderStats[0]?.cancelledOrders || 0,
        totalSpent: orderStats[0]?.totalSpent || 0
      },
      videos: {
        totalCreated: videoStats[0]?.totalVideos || 0,
        totalViews: videoStats[0]?.totalViews || 0,
        totalLikes: videoStats[0]?.totalLikes || 0,
        totalShares: videoStats[0]?.totalShares || 0
      },
      projects: {
        totalParticipated: projectStats[0]?.totalProjects || 0,
        approved: projectStats[0]?.approvedSubmissions || 0,
        rejected: projectStats[0]?.rejectedSubmissions || 0,
        totalEarned: projectStats[0]?.totalEarned || 0
      },
      offers: {
        totalRedeemed: offerStats || 0
      },
      vouchers: {
        total: voucherStats[0]?.totalVouchers || 0,
        used: voucherStats[0]?.usedVouchers || 0,
        active: voucherStats[0]?.activeVouchers || 0
      },
      reviews: {
        total: reviewStats || 0
      },
      achievements: {
        total: achievementStats[0]?.total || 0,
        unlocked: achievementStats[0]?.unlocked || 0
      },
      summary: {
        totalActivity: (
          (orderStats[0]?.totalOrders || 0) +
          (videoStats[0]?.totalVideos || 0) +
          (projectStats[0]?.totalProjects || 0) +
          (offerStats || 0) +
          (voucherStats[0]?.totalVouchers || 0) +
          (reviewStats || 0)
        ),
        totalEarnings: (
          (req.user.wallet.totalEarned || 0) +
          (projectStats[0]?.totalEarned || 0) +
          (req.user.referral.referralEarnings || 0)
        ),
        totalSpendings: (
          (orderStats[0]?.totalSpent || 0) +
          (req.user.wallet.totalSpent || 0)
        )
      }
    };

  sendSuccess(res, statistics, 'User statistics retrieved successfully');
});

// Upload profile avatar
/**
 * @swagger
 * /api/user/auth/upload-avatar:
 *   post:
 *     summary: Upload user avatar
 *     description: Uploads a profile avatar image to Cloudinary. Syncs partner profile if exists.
 *     tags: [User Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, etc.)
 *     responses:
 *       200:
 *         description: Avatar uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: No file provided
 *       500:
 *         description: Upload failed
 */
export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  if (!req.file) {
    return sendBadRequest(res, 'No image file provided');
  }

  const avatarUrl = (req.file as any).path;
  if (!avatarUrl) {
    throw new AppError('Failed to upload image to Cloudinary', 500, 'UPLOAD_FAILED');
  }

  req.user.profile.avatar = avatarUrl;
  await req.user.save();

  // Sync with partner profile
  try {
    const partnerService = require('../services/partnerService').default;
    const userId = (req.user._id as any).toString();
    const Partner = require('../models/Partner').default;
    await Partner.findOneAndUpdate({ userId }, { avatar: avatarUrl });
    await partnerService.syncProfileCompletion(userId);
  } catch (error) {
    logger.error('Error syncing partner profile:', error);
  }

  const userData = {
    id: req.user._id,
    phoneNumber: req.user.phoneNumber,
    email: req.user.email,
    profile: req.user.profile,
    preferences: req.user.preferences,
    wallet: req.user.wallet,
    role: req.user.role,
    isVerified: req.user.auth.isVerified,
    isOnboarded: req.user.auth.isOnboarded
  };

  sendSuccess(res, userData, 'Profile picture updated successfully');
});