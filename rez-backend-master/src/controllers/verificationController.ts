// Verification Controller
// Handles zone-specific verification for exclusive zones

import { Request, Response } from 'express';
import { User } from '../models/User';
import { logger } from '../config/logger';
import UserZoneVerification from '../models/UserZoneVerification';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

// Verification type configurations
const VERIFICATION_CONFIGS: Record<string, {
  methods: string[];
  requiresDocument: boolean;
  autoApprove: string[];
}> = {
  student: {
    methods: ['edu_email', 'student_id', 'enrollment_letter'],
    requiresDocument: true,
    autoApprove: ['edu_email'], // Auto-approve .edu emails
  },
  corporate: {
    methods: ['corporate_email'],
    requiresDocument: false,
    autoApprove: ['corporate_email'],
  },
  defence: {
    methods: ['military_id', 'service_card', 'canteen_card', 'ex_servicemen_card'],
    requiresDocument: true,
    autoApprove: [],
  },
  healthcare: {
    methods: ['hospital_id', 'medical_council', 'nursing_license'],
    requiresDocument: true,
    autoApprove: [],
  },
  senior: {
    methods: ['age_verification'],
    requiresDocument: false,
    autoApprove: ['age_verification'], // Auto-approve if DOB shows 60+
  },
  teacher: {
    methods: ['school_id', 'college_id', 'ugc_id'],
    requiresDocument: true,
    autoApprove: [],
  },
  government: {
    methods: ['govt_id', 'pay_slip'],
    requiresDocument: true,
    autoApprove: [],
  },
  differentlyAbled: {
    methods: ['disability_certificate', 'udid_card'],
    requiresDocument: true,
    autoApprove: [],
  },
};

// Helper function to calculate age
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * @desc    Get verification status for all zones
 * @route   GET /api/user/verifications
 * @access  Private
 */
export const getVerificationStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  // Return all verification statuses
  const verifications = user.verifications || {};

  sendSuccess(res, {
    student: verifications.student || { verified: false },
    corporate: verifications.corporate || { verified: false },
    defence: verifications.defence || { verified: false },
    healthcare: verifications.healthcare || { verified: false },
    senior: verifications.senior || { verified: false },
    teacher: verifications.teacher || { verified: false },
    government: verifications.government || { verified: false },
    differentlyAbled: verifications.differentlyAbled || { verified: false },
  }, 'Verification status retrieved successfully');
});

/**
 * @desc    Get verification status for a specific zone
 * @route   GET /api/user/verifications/:zone
 * @access  Private
 */
export const getZoneVerificationStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { zone } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!VERIFICATION_CONFIGS[zone]) {
    return sendBadRequest(res, 'Invalid verification zone');
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  const zoneVerification = user.verifications?.[zone as keyof typeof user.verifications] || { verified: false };

  // Also check UserZoneVerification for pending/rejected status
  const pendingVerification = await UserZoneVerification.findOne({
    userId: user._id,
    verificationType: zone,
  }).sort({ createdAt: -1 }).lean(); // Get most recent

  // Build response with status
  const response: any = {
    ...zoneVerification,
    verified: zoneVerification?.verified || false,
  };

  // Add status from UserZoneVerification if exists
  if (pendingVerification) {
    response.status = pendingVerification.status;
    response.submittedAt = pendingVerification.createdAt;
    if (pendingVerification.status === 'rejected') {
      response.rejectionReason = pendingVerification.rejectionReason;
    }
  } else if (zoneVerification?.verified) {
    response.status = 'approved';
  }

  sendSuccess(res, response, `${zone} verification status retrieved`);
});

/**
 * @desc    Submit verification for a specific zone
 * @route   POST /api/user/verifications/:zone
 * @access  Private
 */
export const submitVerification = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { zone } = req.params;
  const { method, documentNumber, documentImage, email, additionalInfo } = req.body;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  // Validate zone
  if (!VERIFICATION_CONFIGS[zone]) {
    return sendBadRequest(res, 'Invalid verification zone');
  }

  const config = VERIFICATION_CONFIGS[zone];

  // Validate method
  if (!method || !config.methods.includes(method)) {
    return sendBadRequest(res, `Invalid verification method for ${zone}. Valid methods: ${config.methods.join(', ')}`);
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  // Check if already verified
  const existingVerification = user.verifications?.[zone as keyof typeof user.verifications];
  if (existingVerification?.verified) {
    return sendSuccess(res, {
      zone,
      status: 'approved',
      verified: true,
      message: `Your ${zone} verification is already approved!`,
    }, 'Already verified');
  }

  // Initialize verifications if not exists
  if (!user.verifications) {
    user.verifications = {} as any;
  }

  // Handle different verification types
  let isAutoApproved = false;
  let verificationData: any = {
    verified: false,
    verifiedAt: null,
    documentType: method,
  };

  // Zone-specific logic
  switch (zone) {
    case 'student':
      if (method === 'edu_email' && email) {
        // Check if valid .edu email or Indian academic email
        const eduDomains = ['.edu', '.ac.in', '.edu.in', '.ac.uk', '.edu.au'];
        const isEduEmail = eduDomains.some(domain => email.toLowerCase().endsWith(domain));
        if (isEduEmail) {
          isAutoApproved = true;
        }
        (verificationData as any).instituteName = additionalInfo?.instituteName;
      }
      if (additionalInfo?.instituteName) {
        (verificationData as any).instituteName = additionalInfo.instituteName;
      }
      break;

    case 'corporate':
      if (method === 'corporate_email' && email) {
        // Auto-approve corporate emails (not personal domains)
        const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'];
        const domain = email.split('@')[1]?.toLowerCase();
        if (domain && !personalDomains.includes(domain)) {
          isAutoApproved = true;
          (verificationData as any).corporateEmail = email;
          (verificationData as any).companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
        }
      }
      break;

    case 'senior':
      if (method === 'age_verification') {
        // Check user's date of birth
        if (user.profile?.dateOfBirth) {
          const age = calculateAge(user.profile.dateOfBirth);
          if (age >= 60) {
            isAutoApproved = true;
            (verificationData as any).dateOfBirth = user.profile.dateOfBirth;
          } else {
            return sendBadRequest(res, `Age verification failed. You must be 60 or older. Current age: ${age}`);
          }
        } else {
          return sendBadRequest(res, 'Please update your date of birth in your profile first.');
        }
      }
      break;

    case 'defence':
      (verificationData as any).serviceType = additionalInfo?.serviceType;
      break;

    case 'healthcare':
      (verificationData as any).profession = additionalInfo?.profession;
      break;

    case 'teacher':
      (verificationData as any).instituteName = additionalInfo?.instituteName;
      break;

    case 'government':
      (verificationData as any).department = additionalInfo?.department;
      break;

    case 'differentlyAbled':
      (verificationData as any).disabilityType = additionalInfo?.disabilityType;
      break;
  }

  // Store document info if provided
  let documentUrl = null;
  if ((req as any).file) {
    // File was uploaded via multer to Cloudinary
    documentUrl = (req as any).file.path;
    (verificationData as any).documentImage = documentUrl;
  } else if (documentImage) {
    documentUrl = documentImage;
    (verificationData as any).documentImage = documentImage;
  }

  // Auto-approve if eligible
  if (isAutoApproved) {
    verificationData.verified = true;
    verificationData.verifiedAt = new Date();
  }

  // Update user verification (quick access)
  (user.verifications as any)[zone] = verificationData;
  user.markModified('verifications');
  await user.save();

  // Create UserZoneVerification record for admin review (if not auto-approved)
  if (!isAutoApproved) {
    // Check if there's already a pending request
    const existingRequest = await UserZoneVerification.findOne({
      userId: user._id,
      zoneSlug: zone,
      status: 'pending',
    }).lean();

    if (!existingRequest) {
      await UserZoneVerification.create({
        userId: user._id,
        zoneSlug: zone,
        verificationType: zone,
        status: 'pending',
        submittedData: {
          documentType: method,
          documentUrl: documentUrl,
          email: email,
          instituteName: additionalInfo?.instituteName,
          companyName: additionalInfo?.companyName,
          serviceNumber: additionalInfo?.serviceNumber,
          profession: additionalInfo?.profession,
          department: additionalInfo?.department,
          disabilityType: additionalInfo?.disabilityType,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      logger.info(`📝 [VERIFICATION] Created UserZoneVerification record for admin review`);
    }
  }

  logger.info(`✅ [VERIFICATION] ${zone} verification ${isAutoApproved ? 'auto-approved' : 'submitted'} for user ${userId}`);

  sendSuccess(res, {
    zone,
    status: isAutoApproved ? 'approved' : 'pending',
    verified: isAutoApproved,
    message: isAutoApproved
      ? `Your ${zone} verification has been approved! You now have access to exclusive ${zone} deals.`
      : 'Your verification request has been submitted and is pending review. You will be notified once approved.',
  }, isAutoApproved ? 'Verification approved' : 'Verification submitted');
});

/**
 * @desc    Admin: Approve or reject a verification
 * @route   POST /api/user/verifications/:zone/review
 * @access  Private (Admin only)
 */
export const reviewVerification = asyncHandler(async (req: Request, res: Response) => {
  const { zone } = req.params;
  const { userId, action, reason } = req.body;

  if (!VERIFICATION_CONFIGS[zone]) {
    return sendBadRequest(res, 'Invalid verification zone');
  }

  if (!userId || !action) {
    return sendBadRequest(res, 'userId and action are required');
  }

  if (!['approve', 'reject'].includes(action)) {
    return sendBadRequest(res, 'Action must be either "approve" or "reject"');
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  if (!user.verifications?.[zone as keyof typeof user.verifications]) {
    return sendBadRequest(res, 'No verification request found for this zone');
  }

  const isApproved = action === 'approve';

  (user.verifications as any)[zone].verified = isApproved;
  (user.verifications as any)[zone].verifiedAt = isApproved ? new Date() : null;
  (user.verifications as any)[zone].reviewedAt = new Date();
  if (reason) {
    (user.verifications as any)[zone].reviewReason = reason;
  }

  user.markModified('verifications');
  await user.save();

  logger.info(`✅ [VERIFICATION] Admin ${isApproved ? 'approved' : 'rejected'} ${zone} verification for user ${userId}`);

  sendSuccess(res, {
    zone,
    userId,
    status: isApproved ? 'approved' : 'rejected',
    message: `Verification ${isApproved ? 'approved' : 'rejected'} successfully`,
  }, `Verification ${isApproved ? 'approved' : 'rejected'}`);
});

/**
 * @desc    Get available verification methods for a zone
 * @route   GET /api/user/verifications/:zone/methods
 * @access  Public
 */
export const getVerificationMethods = asyncHandler(async (req: Request, res: Response) => {
  const { zone } = req.params;

  if (!VERIFICATION_CONFIGS[zone]) {
    return sendBadRequest(res, 'Invalid verification zone');
  }

  const config = VERIFICATION_CONFIGS[zone];

  sendSuccess(res, {
    zone,
    methods: config.methods,
    requiresDocument: config.requiresDocument,
    autoApproveAvailable: config.autoApprove.length > 0,
  }, 'Verification methods retrieved');
});
