import { logger } from '../config/logger';
// Profile Controller
// Handles user profile management API endpoints

import { Request, Response } from 'express';
import { sendSuccess, sendError, sendBadRequest, sendNotFound, sendValidationError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { User } from '../models/User';
import { uploadProfileImage } from '../middleware/upload';
import redisService from '../services/redisService';

// Strip HTML tags to prevent stored XSS
const stripHtml = (str: string): string => str.replace(/<[^>]*>/g, '').trim();

/**
 * @desc    Get user profile data
 * @route   GET /api/user/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  // Check Redis cache first
  const cacheKey = `profile:user:${userId}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Profile retrieved successfully');
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return sendNotFound(res, 'User not found');
  }

  const profileData = {
    id: (user._id as any).toString(),
    name: user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : '',
    email: user.email,
    phone: user.phoneNumber,
    profilePicture: user.profile?.avatar || '',
    isVerified: user.auth?.isVerified || false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  // Cache for 60 seconds
  redisService.set(cacheKey, profileData, 60).catch(err =>
    logger.warn('[Profile] Cache set failed', { error: err.message })
  );

  sendSuccess(res, profileData, 'Profile retrieved successfully');
});

/**
 * @desc    Update user profile
 * @route   PUT /api/user/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  logger.info('🔄 [PROFILE_UPDATE] Update request received for user:', userId);

  // Extract from nested profile object (frontend sends { profile: { ... }, preferences: { ... }, email: ... })
  const { profile, preferences, email } = req.body;

  // Input validation
  if (email !== undefined) {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendBadRequest(res, 'Invalid email format');
    }
    if (email.length > 254) {
      return sendBadRequest(res, 'Email is too long');
    }
  }

  if (profile) {
    if (profile.firstName !== undefined && (typeof profile.firstName !== 'string' || profile.firstName.length > 50)) {
      return sendBadRequest(res, 'First name must be 50 characters or less');
    }
    if (profile.lastName !== undefined && (typeof profile.lastName !== 'string' || profile.lastName.length > 50)) {
      return sendBadRequest(res, 'Last name must be 50 characters or less');
    }
    if (profile.bio !== undefined && (typeof profile.bio !== 'string' || profile.bio.length > 500)) {
      return sendBadRequest(res, 'Bio must be 500 characters or less');
    }
    if (profile.website !== undefined && typeof profile.website === 'string' && profile.website.length > 0) {
      if (profile.website.length > 200) {
        return sendBadRequest(res, 'Website URL is too long');
      }
      try {
        new URL(profile.website.startsWith('http') ? profile.website : `https://${profile.website}`);
      } catch {
        return sendBadRequest(res, 'Invalid website URL');
      }
    }
    if (profile.gender !== undefined && !['male', 'female', 'other'].includes(profile.gender)) {
      return sendBadRequest(res, 'Invalid gender value');
    }
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Initialize profile object if it doesn't exist
    if (!user.profile) {
      user.profile = {} as any;
    }

    // Update email if provided
    if (email !== undefined && email !== user.email) {
      // Check if email already exists
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } }).lean();
      if (existingUser) {
        return sendBadRequest(res, 'Email is already in use');
      }
      user.email = stripHtml(email);
      logger.info('✅ [PROFILE_UPDATE] Email updated');
    }

    // Update profile fields (sanitize string inputs to prevent stored XSS)
    if (profile) {
      if (profile.firstName !== undefined) {
        user.profile.firstName = stripHtml(profile.firstName);
      }

      if (profile.lastName !== undefined) {
        user.profile.lastName = stripHtml(profile.lastName);
      }

      if (profile.bio !== undefined) {
        user.profile.bio = stripHtml(profile.bio);
        logger.info('✅ [PROFILE_UPDATE] Bio updated');
      }

      if (profile.website !== undefined) {
        user.profile.website = stripHtml(profile.website);
        logger.info('✅ [PROFILE_UPDATE] Website updated');
      }

      if (profile.dateOfBirth !== undefined) {
        user.profile.dateOfBirth = new Date(profile.dateOfBirth);
        logger.info('✅ [PROFILE_UPDATE] Date of Birth updated to:', profile.dateOfBirth);
      }

      if (profile.gender !== undefined) {
        user.profile.gender = profile.gender;
        logger.info('✅ [PROFILE_UPDATE] Gender updated to:', profile.gender);
      }

      if (profile.location !== undefined) {
        // Initialize location object if it doesn't exist
        if (!user.profile.location) {
          user.profile.location = {} as any;
        }

        if (profile.location.address !== undefined) {
          user.profile.location!.address = stripHtml(profile.location.address);
          logger.info('✅ [PROFILE_UPDATE] Location updated');
        }
        if (profile.location.city !== undefined) {
          user.profile.location!.city = stripHtml(profile.location.city);
        }
        if (profile.location.state !== undefined) {
          user.profile.location!.state = stripHtml(profile.location.state);
        }
        if (profile.location.pincode !== undefined) {
          user.profile.location!.pincode = stripHtml(profile.location.pincode);
        }
      }

      if (profile.avatar !== undefined) {
        user.profile.avatar = profile.avatar;
      }
    }

    // Update preferences
    if (preferences) {
      if (!user.preferences) {
        user.preferences = {} as any;
      }

      if (preferences.theme !== undefined) {
        user.preferences.theme = preferences.theme;
      }

      if (preferences.language !== undefined) {
        user.preferences.language = preferences.language;
      }

      if (preferences.emailNotifications !== undefined) {
        user.preferences.emailNotifications = preferences.emailNotifications;
      }

      if (preferences.pushNotifications !== undefined) {
        user.preferences.pushNotifications = preferences.pushNotifications;
      }

      if (preferences.smsNotifications !== undefined) {
        user.preferences.smsNotifications = preferences.smsNotifications;
      }
    }

    // Mark modified paths for Mongoose to detect changes
    user.markModified('profile');
    user.markModified('preferences');

    logger.info('💾 [PROFILE_UPDATE] Saving user to database...');

    await user.save();

    // Invalidate profile cache
    redisService.del(`profile:user:${userId}`).catch(err =>
      logger.warn('[Profile] Cache invalidation failed', { error: err.message })
    );

    logger.info('✅ [PROFILE_UPDATE] Profile saved successfully');

    const updatedProfile = {
      id: (user._id as any).toString(),
      name: user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : '',
      email: user.email,
      phone: user.phoneNumber,
      profilePicture: user.profile?.avatar || '',
      bio: user.profile?.bio || '',
      website: user.profile?.website || '',
      location: user.profile?.location?.address || '',
      dateOfBirth: user.profile?.dateOfBirth,
      gender: user.profile?.gender,
      isVerified: user.auth?.isVerified || false,
      updatedAt: user.updatedAt
    };

    sendSuccess(res, updatedProfile, 'Profile updated successfully');
  } catch (error: any) {
    logger.error('❌ [PROFILE_UPDATE] Error:', error);

    // Handle Mongoose validation errors — return field-specific messages
    if (error.name === 'ValidationError' && error.errors) {
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path?.replace('profile.', '') || 'unknown',
        message: err.message,
      }));
      return sendValidationError(res, validationErrors);
    }

    throw new AppError('Failed to update profile', 500);
  }
});

/**
 * @desc    Get profile completion status
 * @route   GET /api/user/profile/completion
 * @access  Private
 */
export const getProfileCompletion = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return sendNotFound(res, 'User not found');
  }

  const profile = user.profile || {};
  const totalFields = 9; // Total number of profile fields (increased to include website)
  let completedFields = 0;
  const missingFields: string[] = [];
  const nextSteps: string[] = [];

  // Check each field
  if (profile.firstName) completedFields++;
  else missingFields.push('firstName');

  if (user.email) completedFields++;
  else missingFields.push('email');

  if (user.phoneNumber) completedFields++;
  else missingFields.push('phone');

  if (profile.avatar) completedFields++;
  else missingFields.push('avatar');

  if (profile.dateOfBirth) completedFields++;
  else missingFields.push('dateOfBirth');

  if (profile.gender) completedFields++;
  else missingFields.push('gender');

  if (profile.location?.address) completedFields++;
  else missingFields.push('address');

  if (profile.bio) completedFields++;
  else missingFields.push('bio');

  if (profile.website) completedFields++;
  else missingFields.push('website');

  // Calculate completion percentage
  const completionPercentage = Math.round((completedFields / totalFields) * 100);

  // Generate next steps
  if (missingFields.includes('name')) nextSteps.push('Add your name');
  if (missingFields.includes('profilePicture')) nextSteps.push('Upload a profile picture');
  if (missingFields.includes('dateOfBirth')) nextSteps.push('Add your date of birth');
  if (missingFields.includes('address')) nextSteps.push('Add your address');

  const completionStatus = {
    totalFields,
    completedFields,
    completionPercentage,
    missingFields,
    nextSteps
  };

  sendSuccess(res, completionStatus, 'Profile completion status retrieved successfully');
});

/**
 * @desc    Save ring size to user profile
 * @route   POST /api/user/profile/ring-size
 * @access  Private
 */
export const saveRingSize = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { ringSize } = req.body;
  
  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!ringSize) {
    return sendError(res, 'Ring size is required', 400);
  }

  const validSizes = ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'];
  if (!validSizes.includes(ringSize)) {
    return sendError(res, 'Invalid ring size', 400);
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    user.profile = user.profile || {};
    user.profile.ringSize = ringSize;
    await user.save();

    sendSuccess(res, { ringSize }, 'Ring size saved successfully');
  } catch (error: any) {
    logger.error('❌ [PROFILE] Save ring size failed:', error);
    sendError(res, 'Failed to save ring size', 500);
  }
});

/**
 * @desc    Upload profile picture
 * @route   POST /api/user/profile/picture
 * @access  Private
 */
export const uploadProfilePicture = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!req.file) {
    return sendBadRequest(res, 'No profile picture uploaded');
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Update user profile with new picture URL
    user.profile = user.profile || {};
    user.profile.avatar = req.file.path;
    
    await user.save();

    sendSuccess(res, { profilePicture: req.file.path }, 'Profile picture uploaded successfully');
  } catch (error) {
    throw new AppError('Failed to upload profile picture', 500);
  }
});

/**
 * @desc    Delete profile picture
 * @route   DELETE /api/user/profile/picture
 * @access  Private
 */
export const deleteProfilePicture = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Remove profile picture
    user.profile = user.profile || {};
    user.profile.avatar = '';
    
    await user.save();

    sendSuccess(res, { success: true }, 'Profile picture deleted successfully');
  } catch (error) {
    throw new AppError('Failed to delete profile picture', 500);
  }
});

/**
 * @desc    Verify profile
 * @route   POST /api/user/profile/verify
 * @access  Private
 */
export const verifyProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  
  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const { documentType, documentNumber, documentImage } = req.body;

  if (!documentType || !documentNumber || !documentImage) {
    return sendBadRequest(res, 'Document type, number, and image are required');
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // In a real application, you would:
    // 1. Store the verification documents
    // 2. Send them to a verification service
    // 3. Update the user's verification status
    
    // For now, we'll just mark it as pending
    user.profile = user.profile || {};
    user.profile.verificationStatus = 'pending';
    user.profile.verificationDocuments = {
      documentType,
      documentNumber,
      documentImage,
      submittedAt: new Date()
    };
    
    await user.save();

    sendSuccess(res, { verificationStatus: 'pending' }, 'Verification documents submitted successfully');
  } catch (error) {
    throw new AppError('Failed to submit verification documents', 500);
  }
});
