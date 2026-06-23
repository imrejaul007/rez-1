// ─── userProfileController ─────────────────────────────────────────────────────
import { randomInt } from 'crypto';
// Avatar upload and email-change flow — extracted from authController.ts.

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { sendSuccess, sendUnauthorized, sendNotFound, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import redisService from '../services/redisService';
import { SMSService } from '../services/SMSService';

const EMAIL_CHANGE_OTP_TTL = 600; // 10 minutes
const EMAIL_CHANGE_RATE_LIMIT_TTL = 60; // 1 request per minute

// Upload profile avatar
export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendUnauthorized(res, 'Authentication required');

  if (!req.file) return sendBadRequest(res, 'No image file provided');

  const avatarUrl = req.file.path;
  if (!avatarUrl) throw new AppError('Failed to upload image to Cloudinary', 500, 'UPLOAD_FAILED');

  req.user.profile.avatar = avatarUrl;
  await req.user.save();

  // Sync with partner profile
  try {
    const partnerService = require('../services/partnerService').default;
    const userId = String(req.user._id);
    const PartnerModel = require('../models/Partner').default;
    await PartnerModel.findOneAndUpdate({ userId }, { avatar: avatarUrl });
    await partnerService.syncProfileCompletion(userId);
  } catch (error) {
    logger.error('Error syncing partner profile:', error);
  }

  sendSuccess(
    res,
    {
      id: req.user._id,
      phoneNumber: req.user.phoneNumber,
      email: req.user.email,
      profile: req.user.profile,
      preferences: req.user.preferences,
      wallet: req.user.wallet,
      role: req.user.role,
      isVerified: req.user.auth.isVerified,
      isOnboarded: req.user.auth.isOnboarded,
    },
    'Profile picture updated successfully',
  );
});

// Step 1 — validate new email, send OTP to verified phone number
export const requestEmailChange = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendUnauthorized(res, 'Authentication required');

  const { newEmail } = req.body;
  if (!newEmail || typeof newEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return sendBadRequest(res, 'A valid email address is required');
  }

  const userId = String(req.user._id);
  const currentUser = await User.findById(userId).select('email phoneNumber').lean();
  if (!currentUser) return sendNotFound(res, 'User not found');

  if (newEmail.toLowerCase() === (currentUser.email ?? '').toLowerCase()) {
    return sendBadRequest(res, 'New email must differ from your current email');
  }

  const existing = await User.findOne({ email: newEmail.toLowerCase(), _id: { $ne: userId } }).lean();
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email address is already in use', code: 'EMAIL_TAKEN' });
  }

  if (!currentUser.phoneNumber) {
    return res.status(422).json({
      success: false,
      message: 'A verified phone number is required to change your email. Please contact support.',
      code: 'NO_PHONE_FOR_EMAIL_CHANGE',
    });
  }

  const redisClient = redisService.getClient();
  if (!redisClient) {
    return res
      .status(503)
      .json({ success: false, message: 'Service temporarily unavailable', code: 'REDIS_UNAVAILABLE' });
  }

  const rateLimitKey = `emailchange:ratelimit:${userId}`;
  if (await redisClient.get(rateLimitKey)) {
    return res.status(429).json({
      success: false,
      message: 'Please wait before requesting another email change OTP.',
      code: 'EMAIL_CHANGE_RATE_LIMITED',
    });
  }

  const otp = randomInt(100000, 999999).toString();
  const hashedOtp = await bcrypt.hash(otp, 8);

  const pendingKey = `emailchange:${userId}`;
  await redisClient.set(pendingKey, JSON.stringify({ newEmail: newEmail.toLowerCase(), hashedOtp }), {
    ex: EMAIL_CHANGE_OTP_TTL,
  } as any);
  await redisClient.set(rateLimitKey, '1', { ex: EMAIL_CHANGE_RATE_LIMIT_TTL } as any);

  try {
    await SMSService.sendOTP(currentUser.phoneNumber, otp);
  } catch (smsErr: any) {
    logger.error('[EMAIL_CHANGE] Failed to send OTP SMS', { userId, error: smsErr.message });
    await redisClient.del(pendingKey);
    return res.status(503).json({
      success: false,
      message: 'Failed to send verification SMS. Please try again.',
      code: 'SMS_SEND_FAILED',
    });
  }

  logger.info('[EMAIL_CHANGE] OTP sent for email change', {
    userId,
    maskedEmail: newEmail.replace(/(.{2}).*@/, '$1***@'),
  });

  return res.json({ success: true, message: 'A verification code has been sent to your registered phone number.' });
});

// Step 2 — verify OTP and apply the email update
export const confirmEmailChange = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendUnauthorized(res, 'Authentication required');

  const { otp } = req.body;
  if (!otp || typeof otp !== 'string') return sendBadRequest(res, 'OTP is required');

  const userId = String(req.user._id);
  const redisClient = redisService.getClient();
  if (!redisClient) {
    return res
      .status(503)
      .json({ success: false, message: 'Service temporarily unavailable', code: 'REDIS_UNAVAILABLE' });
  }

  const pendingKey = `emailchange:${userId}`;
  const raw = await redisClient.get(pendingKey);
  if (!raw) {
    return res.status(400).json({
      success: false,
      message: 'No pending email change found or the OTP has expired. Please start the process again.',
      code: 'EMAIL_CHANGE_OTP_EXPIRED',
    });
  }

  const { newEmail, hashedOtp } = JSON.parse(raw);
  const isValid = await bcrypt.compare(otp, hashedOtp);
  if (!isValid) {
    logger.warn('[EMAIL_CHANGE] Invalid OTP provided', { userId });
    return res
      .status(400)
      .json({ success: false, message: 'Invalid verification code', code: 'EMAIL_CHANGE_INVALID_OTP' });
  }

  // Final uniqueness check before write (race-safe)
  const taken = await User.findOne({ email: newEmail, _id: { $ne: userId } }).lean();
  if (taken) {
    await redisClient.del(pendingKey);
    return res.status(409).json({ success: false, message: 'Email address is already in use', code: 'EMAIL_TAKEN' });
  }

  await User.findByIdAndUpdate(userId, { $set: { email: newEmail } }, { runValidators: true });
  await redisClient.del(pendingKey);

  logger.info('[EMAIL_CHANGE] Email updated successfully', {
    userId,
    maskedEmail: newEmail.replace(/(.{2}).*@/, '$1***@'),
  });

  return res.json({ success: true, message: 'Your email address has been updated successfully.' });
});
