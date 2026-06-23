import { logger } from '../config/logger';
import express, { Request, Response } from 'express';
import Joi from 'joi';
import { Types } from 'mongoose';
import UserZoneVerification from '../models/UserZoneVerification';
import ExclusiveZone from '../models/ExclusiveZone';
import { User } from '../models/User';
import { authenticate, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { autoVerificationService } from '../services/autoVerificationService';
import { privilegeResolutionService } from '../services/entitlement/privilegeResolutionService';

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const submitVerificationSchema = Joi.object({
  documentType: Joi.string().optional(),
  documentUrl: Joi.string().uri().optional(),
  email: Joi.string().email().optional(),
  dateOfBirth: Joi.date().optional(),
  instituteName: Joi.string().max(200).optional(),
  companyName: Joi.string().max(200).optional(),
  serviceNumber: Joi.string().max(100).optional(),
  serviceType: Joi.string().valid('army', 'navy', 'airforce', 'paramilitary').optional(),
  profession: Joi.string().valid('doctor', 'nurse', 'paramedic', 'pharmacist').optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
});

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   GET /api/zones/:slug/eligibility
 * @desc    Check user's eligibility status for a zone
 * @access  Public (optional auth)
 */
router.get('/:slug/eligibility', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const userId = (req as any).user?._id;

    // Find the zone
    const zone = await ExclusiveZone.findOne({ slug, isActive: true });
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zone not found',
      });
    }

    // Default response for unauthenticated users
    if (!userId) {
      return res.json({
        success: true,
        data: {
          zone: {
            name: zone.name,
            slug: zone.slug,
            description: zone.description,
            eligibilityType: zone.eligibilityType,
            eligibilityDetails: zone.eligibilityDetails,
            verificationRequired: zone.verificationRequired,
          },
          isEligible: false,
          verificationStatus: null,
          requiresAuth: true,
          message: 'Login required to check eligibility',
        },
      });
    }

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check eligibility based on zone type
    let isEligible = false;
    let autoVerified = false;
    let verificationStatus: string | null = null;
    let message = '';

    switch (zone.eligibilityType) {
      case 'gender':
        // Women zone - auto-verified based on profile
        isEligible = user.profile?.gender === 'female';
        autoVerified = isEligible;
        message = isEligible
          ? 'You are eligible for this zone'
          : 'This zone is exclusive to women';
        break;

      case 'birthday_month':
        // Birthday zone - auto-verified based on DOB
        if (user.profile?.dateOfBirth) {
          const birthMonth = new Date(user.profile.dateOfBirth).getMonth();
          const currentMonth = new Date().getMonth();
          isEligible = birthMonth === currentMonth;
          autoVerified = isEligible;
          message = isEligible
            ? 'Happy Birthday! You are eligible for birthday deals this month'
            : 'This zone is for users celebrating their birthday this month';
        } else {
          message = 'Please update your date of birth in your profile';
        }
        break;

      case 'age':
        // Senior zone - auto-verified based on age
        if (user.profile?.dateOfBirth) {
          const age = Math.floor(
            (Date.now() - new Date(user.profile.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000)
          );
          isEligible = age >= 60;
          autoVerified = isEligible;
          message = isEligible
            ? 'You are eligible for senior citizen benefits'
            : 'This zone is for users aged 60 and above';
        } else {
          message = 'Please update your date of birth in your profile';
        }
        break;

      case 'student':
        // Student zone - requires verification
        if (user.verifications?.student?.verified) {
          isEligible = true;
          verificationStatus = 'approved';
          message = 'Your student status is verified';
        } else {
          // Check for pending verification
          const pending = await UserZoneVerification.findOne({
            userId: user._id,
            verificationType: 'student',
            status: 'pending',
          });
          if (pending) {
            verificationStatus = 'pending';
            message = 'Your verification is pending review';
          } else {
            message = 'Student verification required';
          }
        }
        break;

      case 'corporate_email':
        // Corporate zone - requires verification
        if (user.verifications?.corporate?.verified) {
          isEligible = true;
          verificationStatus = 'approved';
          message = 'Your corporate status is verified';
        } else {
          const pending = await UserZoneVerification.findOne({
            userId: user._id,
            verificationType: 'corporate',
            status: 'pending',
          });
          if (pending) {
            verificationStatus = 'pending';
            message = 'Your verification is pending review';
          } else {
            message = 'Corporate email verification required';
          }
        }
        break;

      case 'verification':
        // Generic verification (defence, etc.) - check by zone slug
        const verificationTypeMap: Record<string, string> = {
          defence: 'defence',
          senior: 'senior',
        };
        const verificationType = verificationTypeMap[slug] || slug;
        const userVerification = user.verifications?.[verificationType as keyof typeof user.verifications];

        if (userVerification && typeof userVerification === 'object' && 'verified' in userVerification) {
          if (userVerification.verified) {
            isEligible = true;
            verificationStatus = 'approved';
            message = 'Your verification is approved';
          }
        }

        if (!isEligible) {
          const pending = await UserZoneVerification.findOne({
            userId: user._id,
            zoneSlug: slug,
            status: 'pending',
          });
          if (pending) {
            verificationStatus = 'pending';
            message = 'Your verification is pending review';
          } else {
            message = 'Verification required for this zone';
          }
        }
        break;

      default:
        message = 'Unknown eligibility type';
    }

    return res.json({
      success: true,
      data: {
        zone: {
          name: zone.name,
          slug: zone.slug,
          description: zone.description,
          eligibilityType: zone.eligibilityType,
          eligibilityDetails: zone.eligibilityDetails,
          verificationRequired: zone.verificationRequired,
        },
        isEligible,
        autoVerified,
        verificationStatus,
        requiresAuth: false,
        message,
      },
    });
}));

/**
 * @route   POST /api/zones/:slug/verify
 * @desc    Submit verification request for a zone
 * @access  Private (authenticated)
 */
router.post('/:slug/verify', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const userId = (req as any).user._id;

    // Validate request body
    const { error, value } = submitVerificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Find the zone
    const zone = await ExclusiveZone.findOne({ slug, isActive: true });
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zone not found',
      });
    }

    // Map zone slug to verification type
    const verificationTypeMap: Record<string, string> = {
      student: 'student',
      corporate: 'corporate',
      defence: 'defence',
      healthcare: 'healthcare',
      senior: 'senior',
      teacher: 'teacher',
      government: 'government',
      differentlyAbled: 'differentlyAbled',
    };

    const verificationType = verificationTypeMap[slug];
    if (!verificationType) {
      return res.status(400).json({
        success: false,
        message: 'This zone does not support verification requests',
      });
    }

    // Check if user already has an approved or pending verification
    const existingVerification = await UserZoneVerification.findOne({
      userId,
      zoneSlug: slug,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingVerification) {
      return res.status(400).json({
        success: false,
        message:
          existingVerification.status === 'pending'
            ? 'You already have a pending verification request'
            : 'You are already verified for this zone',
        data: { status: existingVerification.status },
      });
    }

    // ── Auto-verify check ──
    if (verificationType === 'student') {
      const autoCheck = await autoVerificationService.checkStudentAutoVerify({
        userId: userId.toString(),
        email: value.email,
        instituteName: value.instituteName,
      });

      if (autoCheck.shouldAutoVerify && autoCheck.institution) {
        await autoVerificationService.autoVerify({
          userId: userId.toString(),
          zoneSlug: slug,
          verificationType,
          institution: autoCheck.institution,
          submittedData: value,
        });

        return res.status(201).json({
          success: true,
          message: 'Instantly verified! Student deals are unlocked.',
          data: {
            autoVerified: true,
            provisionalUnlock: false,
            institutionName: autoCheck.institution.name,
          },
        });
      }
    }

    if (verificationType === 'corporate') {
      const autoCheck = await autoVerificationService.checkCorporateAutoVerify({
        userId: userId.toString(),
        email: value.email,
        companyName: value.companyName,
      });

      if (autoCheck.shouldAutoVerify && autoCheck.institution) {
        await autoVerificationService.autoVerify({
          userId: userId.toString(),
          zoneSlug: slug,
          verificationType,
          institution: autoCheck.institution,
          submittedData: value,
        });

        return res.status(201).json({
          success: true,
          message: 'Instantly verified! Work perks are unlocked.',
          data: {
            autoVerified: true,
            provisionalUnlock: false,
            institutionName: autoCheck.institution.name,
          },
        });
      }
    }

    // ── No auto-verify: create pending + grant provisional access ──
    const verification = new UserZoneVerification({
      userId,
      zoneSlug: slug,
      verificationType,
      status: 'pending',
      submittedData: value,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    await verification.save();

    // Grant provisional access immediately
    const segmentValue = verificationType === 'student'
      ? 'verified_student'
      : verificationType === 'corporate'
        ? 'verified_employee'
        : `verified_${verificationType}`;

    await User.findByIdAndUpdate(userId, {
      $set: {
        verificationSegment: 'provisional',
        featureLevel: 2,
        segment: segmentValue,
      },
      $addToSet: { activeZones: slug },
    });
    await privilegeResolutionService.invalidate(userId.toString());

    return res.status(201).json({
      success: true,
      message: 'Provisional access granted. Full unlock in 2-4 hours.',
      data: {
        id: verification._id,
        status: verification.status,
        autoVerified: false,
        provisionalUnlock: true,
        zoneSlug: verification.zoneSlug,
        createdAt: verification.createdAt,
      },
    });
}));

/**
 * @route   GET /api/zones/:slug/status
 * @desc    Get user's verification status for a zone
 * @access  Private (authenticated)
 */
router.get('/:slug/status', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const userId = (req as any).user._id;

    // Find the most recent verification
    const verification = await UserZoneVerification.findOne({
      userId,
      zoneSlug: slug,
    }).sort({ createdAt: -1 });

    if (!verification) {
      return res.json({
        success: true,
        data: {
          hasVerification: false,
          status: null,
          message: 'No verification request found',
        },
      });
    }

    return res.json({
      success: true,
      data: {
        hasVerification: true,
        status: verification.status,
        submittedAt: verification.createdAt,
        reviewedAt: verification.reviewedAt,
        rejectionReason: verification.rejectionReason,
        expiresAt: verification.expiresAt,
      },
    });
}));

/**
 * @route   GET /api/zones/my-verifications
 * @desc    Get all user's verifications
 * @access  Private (authenticated)
 */
router.get('/my-verifications', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;

    const verifications = await UserZoneVerification.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: verifications,
    });
}));

/**
 * @route   GET /api/zones/institutions
 * @desc    Search institutions for autocomplete (public, no admin required)
 * @access  Public (optionalAuth)
 */
router.get('/institutions', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const { search, limit = '10' } = req.query;
  const limitNum = Math.min(20, parseInt(limit as string, 10) || 10);

  if (!search || (search as string).length < 2) {
    return res.json({ success: true, data: { institutions: [] } });
  }

  const { VerifiedInstitution } = await import('../models/VerifiedInstitution');
  const escapedSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const institutions = await VerifiedInstitution.find({
    isActive: true,
    $or: [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { aliases: { $regex: escapedSearch, $options: 'i' } },
    ],
  })
    .select('name type city')
    .limit(limitNum)
    .lean();

  return res.json({
    success: true,
    data: { institutions },
  });
}));

export default router;
