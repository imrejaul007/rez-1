import express, { Request, Response } from 'express';
import { InstituteReferral } from '../models/InstituteReferral';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';

const router = express.Router();

/**
 * @route   POST /api/institute-referrals
 * @desc    User submits a referral for their institute
 * @access  Private (authenticated)
 */
router.post('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { instituteName, instituteType, city, adminContactEmail } = req.body;

  if (!instituteName || !instituteType || !city) {
    return sendError(res, 'instituteName, instituteType, and city are required', 400);
  }

  if (!['college', 'company'].includes(instituteType)) {
    return sendError(res, 'instituteType must be college or company', 400);
  }

  // Check for duplicate
  const existing = await InstituteReferral.findOne({
    submittedBy: userId,
    instituteName: { $regex: `^${instituteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  });

  if (existing) {
    return sendError(res, 'You have already referred this institute', 400);
  }

  const referral = await InstituteReferral.create({
    submittedBy: userId,
    instituteName: instituteName.trim(),
    instituteType,
    city: city.trim(),
    adminContactEmail: adminContactEmail?.trim(),
  });

  // Update user's institute status
  await User.findByIdAndUpdate(userId, {
    $set: { instituteStatus: 'pending_referral' },
  });

  sendSuccess(res, {
    id: referral._id,
    instituteName: referral.instituteName,
    status: referral.status,
  }, 'Thanks! You get coins when they join.');
}));

export default router;
