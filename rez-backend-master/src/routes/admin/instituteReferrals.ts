import express, { Request, Response } from 'express';
import { Types } from 'mongoose';
import { InstituteReferral } from '../../models/InstituteReferral';
import { User } from '../../models/User';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError } from '../../utils/response';

const router = express.Router();

router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/admin/institute-referrals
 * @desc    List referrals with optional status filter
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter: any = {};
  if (status) filter.status = status;

  const [referrals, total] = await Promise.all([
    InstituteReferral.find(filter)
      .populate('submittedBy', 'phoneNumber profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    InstituteReferral.countDocuments(filter),
  ]);

  sendSuccess(res, {
    referrals,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
  });
}));

/**
 * @route   PUT /api/admin/institute-referrals/:id/status
 * @desc    Update referral status
 * @access  Admin
 */
router.put('/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;

  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid referral ID', 400);
  }

  if (!['pending', 'contacted', 'onboarded', 'declined'].includes(status)) {
    return sendError(res, 'Invalid status', 400);
  }

  const referral = await InstituteReferral.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true }
  );

  if (!referral) {
    return sendError(res, 'Referral not found', 404);
  }

  sendSuccess(res, { referral }, 'Status updated');
}));

/**
 * @route   PUT /api/admin/institute-referrals/:id/onboard
 * @desc    Mark referral as onboarded — credits reward to referrer
 * @access  Admin
 */
router.put('/:id/onboard', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid referral ID', 400);
  }

  const referral = await InstituteReferral.findById(req.params.id);
  if (!referral) {
    return sendError(res, 'Referral not found', 404);
  }

  if (referral.status === 'onboarded') {
    return sendError(res, 'Already onboarded', 400);
  }

  referral.status = 'onboarded';
  referral.onboardedAt = new Date();
  referral.rewardCredited = true;
  await referral.save();

  // Update the referrer's institute status
  await User.findByIdAndUpdate(referral.submittedBy, {
    $set: { instituteStatus: 'onboarded' },
  });

  // TODO: Credit rewardAmount to wallet via walletService when wired
  // await walletService.creditCoins(referral.submittedBy, referral.rewardAmount / 100, 'institute_referral');

  sendSuccess(res, {
    instituteName: referral.instituteName,
    rewardCredited: true,
  }, `${referral.instituteName} marked as onboarded. Reward pending credit.`);
}));

export default router;
