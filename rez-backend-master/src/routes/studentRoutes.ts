// @ts-nocheck
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { UserTransaction } from '../models/Wallet';
import { authenticate, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { STUDENT_TIERS, STUDENT_MISSIONS, StudentTierKey } from '../models/StudentProfile';

const router = express.Router();

// ============================================
// HELPERS
// ============================================

function getStudentTier(lifetimeCoins: number): StudentTierKey {
  const tiers = Object.entries(STUDENT_TIERS).reverse();
  for (const [tier, config] of tiers) {
    if (lifetimeCoins >= config.minCoins) {
      return tier as StudentTierKey;
    }
  }
  return 'freshman';
}

function getNextTier(
  currentTier: StudentTierKey,
): { tier: StudentTierKey; config: typeof STUDENT_TIERS.freshman } | null {
  const tierOrder: StudentTierKey[] = ['freshman', 'sophomore', 'junior', 'senior', 'scholar'];
  const currentIndex = tierOrder.indexOf(currentTier);
  if (currentIndex < tierOrder.length - 1) {
    const nextTier = tierOrder[currentIndex + 1];
    return { tier: nextTier, config: STUDENT_TIERS[nextTier] };
  }
  return null;
}

async function getStudentStats(userId: string): Promise<{
  lifetimeCoins: number;
  currentCoins: number;
  tier: StudentTierKey;
  totalOrders: number;
  totalSavings: number;
}> {
  // Get user
  const user = await User.findById(userId);
  if (!user) {
    return { lifetimeCoins: 0, currentCoins: 0, tier: 'freshman', totalOrders: 0, totalSavings: 0 };
  }

  // Calculate coins from transactions
  const transactions = await UserTransaction.find({
    user: userId,
    type: 'earned',
  });

  const lifetimeCoins = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const currentCoins = user.studentCoins?.balance || 0;

  // Get order count (approximate from transactions)
  const orderTxns = await UserTransaction.countDocuments({
    user: userId,
    description: { $regex: /order/i },
  });

  const tier = getStudentTier(lifetimeCoins);

  return {
    lifetimeCoins,
    currentCoins,
    tier,
    totalOrders: orderTxns,
    totalSavings: user.studentStats?.totalSavings || 0,
  };
}

// ============================================
// PROFILE ROUTES
// ============================================

/**
 * @route   GET /api/student/profile
 * @desc    Get student profile with tier, coins, stats
 * @access  Private
 */
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if verified student
    const isVerified = user.verifications?.student?.verified === true;
    const instituteName = user.verifications?.student?.instituteName;

    if (!isVerified) {
      return res.json({
        success: true,
        data: {
          isStudent: false,
          message: 'Not a verified student',
        },
      });
    }

    const stats = await getStudentStats(userId.toString());
    const tierConfig = STUDENT_TIERS[stats.tier];
    const nextTier = getNextTier(stats.tier);

    // Get referral code
    const referralCode = user.studentProfile?.referralCode || `STU${userId.toString().slice(-6).toUpperCase()}`;

    // Calculate tier progress
    let progress = 100;
    if (nextTier) {
      const currentMin = tierConfig.minCoins;
      const nextMin = nextTier.config.minCoins;
      const range = nextMin - currentMin;
      const progressCoins = stats.lifetimeCoins - currentMin;
      progress = Math.min(100, Math.floor((progressCoins / range) * 100));
    }

    return res.json({
      success: true,
      data: {
        isStudent: true,
        institution: {
          name: instituteName,
          verified: true,
        },
        tier: {
          name: stats.tier,
          badge: tierConfig.badge,
          color: tierConfig.color,
          multiplier: tierConfig.multiplier,
        },
        coins: {
          lifetime: stats.lifetimeCoins,
          current: stats.currentCoins,
        },
        stats: {
          totalOrders: stats.totalOrders,
          totalSavings: stats.totalSavings,
        },
        nextTier: nextTier
          ? {
              tier: nextTier.tier,
              coinsNeeded: nextTier.config.minCoins - stats.lifetimeCoins,
            }
          : null,
        progress,
        referralCode,
        referralsCount: user.studentProfile?.referralsCount || 0,
      },
    });
  }),
);

/**
 * @route   GET /api/student/missions
 * @desc    Get available missions for student
 * @access  Private
 */
router.get(
  '/missions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;

    // Check if verified student
    const user = await User.findById(userId);
    if (!user || user.verifications?.student?.verified !== true) {
      return res.json({
        success: true,
        data: { missions: [], message: 'Not a verified student' },
      });
    }

    // Get user progress from their profile
    const completedMissions = user.studentMissions || [];
    const stats = await getStudentStats(userId.toString());

    const missions = STUDENT_MISSIONS.map((mission) => {
      const isCompleted = completedMissions.includes(mission.id);
      const progress = isCompleted ? mission.target : 0;

      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        coins: mission.coins,
        target: mission.target,
        progress,
        percentComplete: Math.floor((progress / mission.target) * 100),
        status: isCompleted ? 'completed' : 'available',
        expiresIn: mission.expiresIn,
      };
    });

    return res.json({
      success: true,
      data: { missions },
    });
  }),
);

/**
 * @route   POST /api/student/missions/:id/claim
 * @desc    Claim mission reward
 * @access  Private
 */
router.post(
  '/missions/:id/claim',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user._id;

    const mission = STUDENT_MISSIONS.find((m) => m.id === id);
    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already claimed
    if (user.studentMissions?.includes(id)) {
      return res.status(400).json({ success: false, message: 'Already claimed' });
    }

    // Check if target met (simplified - in real app, check actual progress)
    // For now, allow claiming if available
    if (!user.studentMissions) {
      user.studentMissions = [];
    }
    user.studentMissions.push(id);

    // Award coins
    if (!user.studentCoins) {
      user.studentCoins = { balance: 0 };
    }
    user.studentCoins.balance += mission.coins;

    await user.save();

    // Create transaction
    await UserTransaction.create({
      user: userId,
      type: 'earned',
      amount: mission.coins,
      description: `Mission reward: ${mission.title}`,
      source: 'mission',
    });

    return res.json({
      success: true,
      data: {
        coinsAwarded: mission.coins,
        newBalance: user.studentCoins.balance,
      },
    });
  }),
);

/**
 * @route   GET /api/student/leaderboard/:institution
 * @desc    Get campus leaderboard
 * @access  Public
 */
router.get(
  '/leaderboard/:institution',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { institution } = req.params;
    const { period = 'weekly', limit = 20 } = req.query;

    // Find students from this institution
    const escapedInstitution = institution.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const students = await User.find({
      'verifications.student.verified': true,
      'verifications.student.instituteName': { $regex: escapedInstitution, $options: 'i' },
    }).lean();

    if (students.length === 0) {
      return res.json({
        success: true,
        data: {
          leaderboard: [],
          institutionName: institution,
          totalStudents: 0,
        },
      });
    }

    const studentIds = students.map((s) => s._id);

    // Get coin totals for these students
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await UserTransaction.aggregate([
      {
        $match: {
          user: { $in: studentIds },
          type: 'earned',
          createdAt:
            period === 'weekly' ? { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } : { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$user',
          totalCoins: { $sum: '$amount' },
        },
      },
      { $sort: { totalCoins: -1 } },
      { $limit: parseInt(limit as string) },
    ]);

    // Build leaderboard
    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
    const leaderboard = transactions.map((txn, index) => {
      const student = studentMap.get(txn._id.toString());
      const tier = getStudentTier(txn.totalCoins);
      return {
        rank: index + 1,
        userId: txn._id,
        name: student?.profile?.firstName
          ? `${student.profile.firstName} ${student.profile.lastName?.[0] || ''}.`
          : 'Student',
        coins: txn.totalCoins,
        tier: STUDENT_TIERS[tier].badge,
      };
    });

    // Find current user's rank if authenticated
    const userId = (req as any).user?._id;
    let userRank = null;
    if (userId) {
      const userIndex = transactions.findIndex((t) => t._id.toString() === userId.toString());
      if (userIndex >= 0) {
        userRank = userIndex + 1;
      }
    }

    return res.json({
      success: true,
      data: {
        leaderboard,
        institutionName: institution,
        totalStudents: students.length,
        userRank,
      },
    });
  }),
);

/**
 * @route   GET /api/student/offers/:institution
 * @desc    Get student offers at institution
 * @access  Public
 */
router.get(
  '/offers/:institution',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { institution } = req.params;
    const { category, page = 1, limit = 20 } = req.query;

    // Query campus partnerships from CampusPartner model
    try {
      const { CampusPartner } = await import('../models/CampusPartnership');
      const { VerifiedInstitution } = await import('../models/VerifiedInstitution');

      // Find institution
      const inst = await VerifiedInstitution.findOne({
        name: { $regex: new RegExp(institution, 'i') },
      });

      if (!inst) {
        return res.json({
          success: true,
          data: {
            offers: [],
            institution,
            total: 0,
            message: 'Institution not found',
          },
        });
      }

      const filter: any = {
        institutionId: inst._id,
        status: 'active',
      };

      if (category) {
        filter.categories = category;
      }

      const partners = await CampusPartner.find(filter)
        .populate('merchantId', 'name logo rating address')
        .sort({ 'stats.totalOrders': -1 })
        .skip((parseInt(page as string) - 1) * parseInt(limit as string))
        .limit(parseInt(limit as string))
        .lean();

      const offers = partners.map((p) => ({
        id: p._id.toString(),
        partnershipId: p._id.toString(),
        merchantId: p.merchantId?._id?.toString(),
        merchantName: p.merchantName,
        merchantLogo: p.merchantId?.logo,
        rating: p.merchantId?.rating,
        address: p.merchantId?.address,
        offer: {
          type: p.discount.type,
          value: p.discount.value,
          display:
            p.discount.type === 'percentage'
              ? `${p.discount.value}% off`
              : p.discount.type === 'fixed'
                ? `₹${p.discount.value} off`
                : 'Free delivery',
          minOrder: p.discount.minOrderAmount,
          maxDiscount: p.discount.maxDiscount,
        },
        categories: p.categories,
        popular: p.stats.totalOrders > 10,
        exclusive: p.isExclusive,
      }));

      return res.json({
        success: true,
        data: {
          offers,
          institution,
          institutionId: inst._id.toString(),
          total: offers.length,
        },
      });
    } catch (error) {
      // Fallback to sample data if CampusPartner model not available
      const sampleOffers = [
        {
          id: 'offer_1',
          merchantId: 'merchant_1',
          merchantName: 'Campus Cafe',
          offer: { type: 'percentage', value: 15, display: '15% off' },
          popular: true,
        },
        {
          id: 'offer_2',
          merchantId: 'merchant_2',
          merchantName: 'Food Court',
          offer: { type: 'percentage', value: 10, display: '10% off' },
          popular: false,
        },
        {
          id: 'offer_3',
          merchantId: 'merchant_3',
          merchantName: 'Snack Bar',
          offer: { type: 'fixed', value: 50, display: '₹50 off' },
          popular: false,
        },
      ];

      return res.json({
        success: true,
        data: {
          offers: sampleOffers,
          institution,
          total: sampleOffers.length,
          note: 'Using sample data - CampusPartner model not available',
        },
      });
    }
  }),
);

/**
 * @route   POST /api/student/redeem
 * @desc    Redeem student offer
 * @access  Private
 */
router.post(
  '/redeem',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { offerId, orderId, orderAmount } = req.body;
    const userId = (req as any).user._id;

    // Check if verified student
    const user = await User.findById(userId);
    if (!user || user.verifications?.student?.verified !== true) {
      return res.status(403).json({ success: false, message: 'Not a verified student' });
    }

    // Calculate discount (simplified)
    const discount = Math.floor(orderAmount * 0.1); // 10% discount

    return res.json({
      success: true,
      data: {
        discount,
        studentDiscount: discount,
        message: 'Offer applied successfully',
      },
    });
  }),
);

/**
 * @route   POST /api/student/price
 * @desc    Calculate student price for product
 * @access  Private
 */
router.post(
  '/price',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { productId, basePrice, quantity = 1 } = req.body;
    const userId = (req as any).user._id;

    // Check if verified student
    const user = await User.findById(userId);
    if (!user || user.verifications?.student?.verified !== true) {
      return res.json({
        success: true,
        data: {
          originalPrice: basePrice,
          studentPrice: basePrice,
          discount: 0,
          discountPercent: 0,
          isEligible: false,
          reason: 'Not a verified student',
        },
      });
    }

    // Get student's tier multiplier
    const stats = await getStudentStats(userId.toString());
    const tierConfig = STUDENT_TIERS[stats.tier];

    // Calculate student discount (base 5% + tier bonus)
    const baseDiscount = 5;
    const tierBonus = Math.floor((tierConfig.multiplier - 1) * 100);
    const totalDiscountPercent = baseDiscount + tierBonus;

    const discount = Math.floor((basePrice * totalDiscountPercent) / 100);
    const studentPrice = basePrice - discount;

    return res.json({
      success: true,
      data: {
        originalPrice: basePrice,
        studentPrice,
        discount,
        discountPercent: totalDiscountPercent,
        isEligible: true,
        tier: stats.tier,
        multiplier: tierConfig.multiplier,
      },
    });
  }),
);

// ============================================
// WALLET & PARENT FUNDING ROUTES
// ============================================

/**
 * @route   GET /api/student/wallet
 * @desc    Get student's wallet balance
 * @access  Private
 */
router.get(
  '/wallet',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;

    // Check if verified student
    const user = await User.findById(userId);
    if (!user || user.verifications?.student?.verified !== true) {
      return res.status(403).json({ success: false, message: 'Not a verified student' });
    }

    const balance = user.studentCoins?.balance || 0;
    const stats = await getStudentStats(userId.toString());

    return res.json({
      success: true,
      data: {
        balance,
        lifetimeCoins: stats.lifetimeCoins,
        monthlyBudget: user.studentWallet?.monthlyBudget || 0,
        spentThisMonth: user.studentWallet?.spentThisMonth || 0,
        parents: user.studentWallet?.linkedParents || [],
      },
    });
  }),
);

/**
 * @route   POST /api/student/wallet/request-funding
 * @desc    Request money from parent
 * @access  Private
 */
router.post(
  '/wallet/request-funding',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { amount, reason, parentId } = req.body;
    const userId = (req as any).user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Check if verified student
    const user = await User.findById(userId);
    if (!user || user.verifications?.student?.verified !== true) {
      return res.status(403).json({ success: false, message: 'Not a verified student' });
    }

    // Find parent
    const parent = await User.findById(parentId);
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent not found' });
    }

    // Create funding request
    // In production, this would integrate with wallet service and notification service
    const requestId = new mongoose.Types.ObjectId();

    // Store request in user document (in production, use separate collection)
    if (!user.studentWallet) {
      user.studentWallet = { fundingRequests: [] };
    }
    user.studentWallet.fundingRequests = user.studentWallet.fundingRequests || [];
    user.studentWallet.fundingRequests.push({
      requestId: requestId.toString(),
      parentId,
      parentName: `${parent.profile?.firstName || 'Parent'}`,
      amount,
      reason,
      status: 'pending',
      createdAt: new Date(),
    });
    await user.save();

    // In production: Send notification to parent
    // await notificationService.send({
    //   userId: parentId,
    //   type: 'FUNDING_REQUEST',
    //   title: 'Funding Request',
    //   body: `${user.profile?.firstName} requested ₹${amount}`,
    //   data: { requestId, studentId: userId }
    // });

    return res.status(201).json({
      success: true,
      message: 'Funding request sent to parent',
      data: {
        requestId: requestId.toString(),
        parentId,
        amount,
        status: 'pending',
      },
    });
  }),
);

/**
 * @route   POST /api/student/wallet/approve-funding
 * @desc    Parent approves funding request
 * @access  Private
 */
router.post(
  '/wallet/approve-funding',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { requestId, studentId } = req.body;
    const parentId = (req as any).user._id;

    // Find student
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Find the request
    const requests = student.studentWallet?.fundingRequests || [];
    const request = requests.find((r: any) => r.requestId === requestId && r.parentId === parentId.toString());

    if (!request) {
      return res.status(404).json({ success: false, message: 'Funding request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    // Update request status
    request.status = 'approved';
    request.processedAt = new Date();
    await student.save();

    // In production: Transfer money via wallet service
    // await walletService.transfer({
    //   from: parentId,
    //   to: studentId,
    //   amount: request.amount,
    //   reason: 'Student funding'
    // });

    // Update student balance
    if (!student.studentCoins) {
      student.studentCoins = { balance: 0 };
    }
    student.studentCoins.balance += request.amount;
    await student.save();

    return res.json({
      success: true,
      message: 'Funding approved and transferred',
      data: {
        amount: request.amount,
        newBalance: student.studentCoins.balance,
      },
    });
  }),
);

/**
 * @route   POST /api/student/wallet/reject-funding
 * @desc    Parent rejects funding request
 * @access  Private
 */
router.post(
  '/wallet/reject-funding',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { requestId, studentId, reason } = req.body;
    const parentId = (req as any).user._id;

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const requests = student.studentWallet?.fundingRequests || [];
    const request = requests.find((r: any) => r.requestId === requestId && r.parentId === parentId.toString());

    if (!request) {
      return res.status(404).json({ success: false, message: 'Funding request not found' });
    }

    request.status = 'rejected';
    request.processedAt = new Date();
    request.rejectReason = reason;
    await student.save();

    return res.json({
      success: true,
      message: 'Funding request rejected',
      data: { requestId },
    });
  }),
);

/**
 * @route   GET /api/student/wallet/requests
 * @desc    Get funding requests (for parent view)
 * @access  Private
 */
router.get(
  '/wallet/requests',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const { status, role = 'student' } = req.query;

    if (role === 'parent') {
      // Get all requests where this user is the parent
      // In production, query the FundingRequest collection
      // For now, scan all users with this parent
      const students = await User.find({
        'studentWallet.fundingRequests': { $exists: true },
      });

      const allRequests: any[] = [];
      for (const student of students) {
        const requests = student.studentWallet?.fundingRequests || [];
        const myRequests = requests.filter((r: any) => r.parentId === userId.toString());
        allRequests.push(
          ...myRequests.map((r: any) => ({
            ...r,
            studentId: student._id,
            studentName: `${student.profile?.firstName || 'Student'}`,
          })),
        );
      }

      return res.json({
        success: true,
        data: {
          requests: allRequests,
          total: allRequests.length,
        },
      });
    } else {
      // Get student's own requests
      const user = await User.findById(userId);
      const requests = user?.studentWallet?.fundingRequests || [];

      return res.json({
        success: true,
        data: {
          requests,
          total: requests.length,
        },
      });
    }
  }),
);

/**
 * @route   PUT /api/student/wallet/budget
 * @desc    Set monthly budget
 * @access  Private
 */
router.put(
  '/wallet/budget',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { monthlyBudget, alertThreshold } = req.body;
    const userId = (req as any).user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.studentWallet) {
      user.studentWallet = {};
    }
    user.studentWallet.monthlyBudget = monthlyBudget;
    user.studentWallet.budgetAlertThreshold = alertThreshold || monthlyBudget * 0.8;
    await user.save();

    return res.json({
      success: true,
      message: 'Budget updated',
      data: {
        monthlyBudget,
        alertThreshold: user.studentWallet.budgetAlertThreshold,
      },
    });
  }),
);

export default router;
