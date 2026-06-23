import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, requireSeniorAdmin } from '../../middleware/auth';
import { Merchant } from '../../models/Merchant';
import { Store } from '../../models/Store';
import { isSocketInitialized, getIO } from '../../config/socket';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateQuery } from '../../middleware/validation';
import { adminMerchantSearchSchema } from '../../validators/financialValidators';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/merchants
 * @desc    Get all merchants with pagination, filters, and search
 * @access  Admin
 */
router.get('/', validateQuery(adminMerchantSearchSchema), asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    // Status filter (pending/approved/suspended maps to verificationStatus)
    if (req.query.status) {
      const statusMap: Record<string, string> = {
        'pending': 'pending',
        'approved': 'verified',
        'suspended': 'rejected'
      };
      const mappedStatus = statusMap[req.query.status as string] || req.query.status;
      filter.verificationStatus = mappedStatus;
    }

    // isActive filter
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) {
        filter.createdAt.$gte = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        filter.createdAt.$lte = new Date(req.query.dateTo as string);
      }
    }

    // Search by business name, owner name, or email
    if (req.query.search) {
      const searchRegex = { $regex: escapeRegex(req.query.search as string), $options: 'i' };
      filter.$or = [
        { businessName: searchRegex },
        { ownerName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // City filter
    if (req.query.city) {
      filter['businessAddress.city'] = { $regex: escapeRegex(req.query.city as string), $options: 'i' };
    }

    // State filter
    if (req.query.state) {
      filter['businessAddress.state'] = { $regex: escapeRegex(req.query.state as string), $options: 'i' };
    }

    const [merchants, totalArr] = await Promise.all([
      Merchant.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'stores',
            localField: '_id',
            foreignField: 'merchantId',
            as: 'stores'
          }
        },
        {
          $addFields: {
            phoneNumber: '$phone',
            status: {
              $switch: {
                branches: [
                  { case: { $and: [{ $eq: ['$verificationStatus', 'verified'] }, { $eq: ['$isActive', false] }] }, then: 'suspended' },
                  { case: { $eq: ['$verificationStatus', 'verified'] }, then: 'approved' },
                  { case: { $eq: ['$verificationStatus', 'rejected'] }, then: 'rejected' },
                ],
                default: 'pending'
              }
            },
            stores: {
              $map: {
                input: '$stores',
                as: 'store',
                in: { _id: '$$store._id', name: '$$store.name', status: { $cond: ['$$store.isActive', 'active', 'inactive'] } }
              }
            }
          }
        },
        {
          $project: {
            businessName: 1, ownerName: 1, email: 1, phone: 1, phoneNumber: 1,
            businessAddress: 1, verificationStatus: 1, status: 1, isActive: 1,
            logo: 1, createdAt: 1, 'onboarding.status': 1, stores: 1
          }
        }
      ]),
      Merchant.aggregate([{ $match: filter }, { $count: 'total' }])
    ]);

    const total = totalArr[0]?.total || 0;

    res.json({
      success: true,
      data: {
        merchants,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  }));

/**
 * @route   GET /api/admin/merchants/stats
 * @desc    Get merchant statistics
 * @access  Admin
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Merchant.aggregate([
      {
        $facet: {
          // Verification status breakdown
          byVerificationStatus: [
            { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
          ],
          // Active status breakdown
          byActiveStatus: [
            { $group: { _id: '$isActive', count: { $sum: 1 } } }
          ],
          // Today's registrations
          today: [
            { $match: { createdAt: { $gte: today } } },
            { $count: 'count' }
          ],
          // Overall stats
          overall: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 }
              }
            }
          ],
          // By onboarding status
          byOnboardingStatus: [
            { $group: { _id: '$onboarding.status', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    // Transform results
    const result = {
      byVerificationStatus: stats[0].byVerificationStatus.reduce((acc: any, item: any) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
      byActiveStatus: {
        active: 0,
        inactive: 0
      },
      byOnboardingStatus: stats[0].byOnboardingStatus.reduce((acc: any, item: any) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
      today: stats[0].today[0]?.count || 0,
      total: stats[0].overall[0]?.total || 0
    };

    // Map active status
    stats[0].byActiveStatus.forEach((item: any) => {
      if (item._id === true) {
        result.byActiveStatus.active = item.count;
      } else {
        result.byActiveStatus.inactive = item.count;
      }
    });

    res.json({
      success: true,
      data: result
    });
  }));

/**
 * @route   GET /api/admin/merchants/:id
 * @desc    Get single merchant details
 * @access  Admin
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const merchant = await Merchant.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpiry -emailVerificationToken -emailVerificationExpiry');

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    res.json({
      success: true,
      data: merchant
    });
  }));

/**
 * @route   POST /api/admin/merchants/:id/approve
 * @desc    Approve a merchant
 * @access  Admin
 */
router.post('/:id/approve', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
    const merchant = await Merchant.findById(req.params.id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    if (merchant.verificationStatus === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Merchant is already approved'
      });
    }

    // Update merchant status
    merchant.verificationStatus = 'verified';
    merchant.isActive = true;

    // Update onboarding status if applicable
    if (merchant.onboarding) {
      merchant.onboarding.status = 'completed';
      merchant.onboarding.completedAt = new Date();
      if (merchant.onboarding.stepData?.verification) {
        merchant.onboarding.stepData.verification.verificationStatus = 'verified';
        merchant.onboarding.stepData.verification.verifiedAt = new Date();
        merchant.onboarding.stepData.verification.verifiedBy = req.userId;
      }
    }

    await merchant.save();

    // Emit real-time notification to merchant app
    if (isSocketInitialized()) {
      getIO().emit('merchant_approved', {
        merchantId: merchant._id,
        message: 'Your merchant account has been approved!',
      });
    }

    res.json({
      success: true,
      message: 'Merchant approved successfully',
      data: merchant
    });
  }));

/**
 * @route   POST /api/admin/merchants/:id/reject
 * @desc    Reject a merchant (with reason)
 * @access  Admin
 */
router.post('/:id/reject', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const merchant = await Merchant.findById(req.params.id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    if (merchant.verificationStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Merchant is already rejected'
      });
    }

    // Update merchant status
    merchant.verificationStatus = 'rejected';
    merchant.isActive = false;

    // Update onboarding status if applicable
    if (merchant.onboarding) {
      merchant.onboarding.status = 'rejected';
      merchant.onboarding.rejectionReason = reason;
      if (merchant.onboarding.stepData?.verification) {
        merchant.onboarding.stepData.verification.verificationStatus = 'rejected';
      }
    }

    await merchant.save();

    // Emit real-time notification to merchant app
    if (isSocketInitialized()) {
      getIO().emit('merchant_rejected', {
        merchantId: merchant._id,
        reason,
        message: `Your merchant application was rejected: ${reason || 'No reason provided'}`,
      });
    }

    res.json({
      success: true,
      message: 'Merchant rejected',
      data: merchant
    });
  }));

/**
 * @route   POST /api/admin/merchants/:id/suspend
 * @desc    Suspend a merchant (with reason)
 * @access  Admin
 */
router.post('/:id/suspend', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason is required'
      });
    }

    const merchant = await Merchant.findById(req.params.id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    if (!merchant.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Merchant is already suspended/inactive'
      });
    }

    // Suspend the merchant by setting isActive to false
    // Keep verificationStatus as is (they might be verified but suspended)
    merchant.isActive = false;

    // Store suspension reason in onboarding rejectionReason or a custom field
    if (merchant.onboarding) {
      merchant.onboarding.rejectionReason = `Suspended: ${reason}`;
    }

    await merchant.save();

    res.json({
      success: true,
      message: 'Merchant suspended',
      data: merchant
    });
  }));

/**
 * @route   POST /api/admin/merchants/:id/reactivate
 * @desc    Reactivate a suspended merchant
 * @access  Admin
 */
router.post('/:id/reactivate', requireSeniorAdmin, asyncHandler(async (req: Request, res: Response) => {
    const merchant = await Merchant.findById(req.params.id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    if (merchant.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Merchant is already active'
      });
    }

    // Reactivate the merchant
    merchant.isActive = true;

    // Clear suspension reason if it was a suspension
    if (merchant.onboarding?.rejectionReason?.startsWith('Suspended:')) {
      merchant.onboarding.rejectionReason = undefined;
    }

    await merchant.save();

    res.json({
      success: true,
      message: 'Merchant reactivated successfully',
      data: merchant
    });
  }));

export default router;
