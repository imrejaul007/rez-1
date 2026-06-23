import { logger } from '../config/logger';
import { Request, Response } from 'express';
import partnerService from '../services/partnerService';
import Partner, { PARTNER_LEVELS } from '../models/Partner';
import { asyncHandler } from '../utils/asyncHandler';
import { sendError } from '../utils/response';

/**
 * Partner Controller
 * Handles HTTP requests for partner program endpoints
 */

/**
 * @route   GET /api/partner/benefits
 * @desc    Get partner benefits for all levels
 * @access  Private
 */
export const getPartnerBenefits = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const partnerBenefitsService = require('../services/partnerBenefitsService').default;
    const Partner = require('../models/Partner').default;

    // Get user's current partner level
    const partner = await Partner.findOne({ userId }).lean();
    const currentLevel = partner?.currentLevel?.level || 1;
    const currentBenefits = await partnerBenefitsService.getPartnerBenefits(userId);

    // Get all level benefits
    const allLevels = partnerBenefitsService.getAllLevelBenefits();

    res.status(200).json({
      success: true,
      data: {
        currentLevel,
        currentBenefits,
        allLevels,
        levels: allLevels // For frontend compatibility
      }
    });
});

/**
 * @route   GET /api/partner/dashboard
 * @desc    Get complete partner dashboard data
 * @access  Private
 */
export const getPartnerDashboard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const dashboardData = await partnerService.getPartnerDashboardSafe(userId);

    res.status(200).json({
      success: true,
      data: dashboardData
    });
});

/**
 * @route   POST /api/partner/enroll
 * @desc    Explicitly enroll user in partner program
 * @access  Private
 */
export const enrollPartner = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Explicit enrollment — creates partner if not exists
    await partnerService.getOrCreatePartner(userId);

    // Return full dashboard after enrollment
    const dashboardData = await partnerService.getPartnerDashboard(userId);

    res.status(200).json({
      success: true,
      data: { enrolled: true, ...dashboardData }
    });
});

/**
 * @route   GET /api/partner/profile
 * @desc    Get partner profile
 * @access  Private
 */
export const getPartnerProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const partner = await Partner.findOne({ userId });
    if (!partner) {
      return sendError(res, 'Not enrolled in partner program', 404);
    }
    const daysRemaining = partner.getDaysRemaining();

    res.status(200).json({
      success: true,
      data: {
        profile: {
          _id: partner._id,
          userId: partner.userId,
          name: partner.name,
          email: partner.email,
          avatar: partner.avatar,
          level: {
            level: partner.currentLevel.level,
            name: partner.currentLevel.name,
            requirements: partner.currentLevel.requirements
          },
          ordersThisLevel: partner.ordersThisLevel,
          totalOrders: partner.totalOrders,
          daysRemaining,
          validUntil: partner.validUntil.toISOString().split('T')[0],
          earnings: partner.earnings
        }
      }
    });
});

/**
 * @route   GET /api/partner/earnings
 * @desc    Get partner earnings details
 * @access  Private
 */
export const getPartnerEarnings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const partner = await partnerService.getOrCreatePartner(userId);

    // Mock transaction data - in production, fetch from a transactions collection
    const transactions = [
      {
        _id: 'txn1',
        amount: 500,
        type: 'commission' as const,
        status: 'paid' as const,
        description: 'Level upgrade bonus',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: 'txn2',
        amount: 100,
        type: 'bonus' as const,
        status: 'pending' as const,
        description: 'Milestone reward',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        totalEarnings: partner.earnings.total,
        pendingEarnings: partner.earnings.pending,
        paidEarnings: partner.earnings.paid,
        thisMonth: partner.earnings.thisMonth,
        lastMonth: partner.earnings.lastMonth,
        transactions
      }
    });
});

/**
 * @route   GET /api/partner/milestones
 * @desc    Get partner milestones
 * @access  Private
 */
export const getPartnerMilestones = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const partner = await partnerService.getOrCreatePartner(userId);

    const milestones = partner.milestones.map((m: any) => ({
      id: `milestone-${m.orderCount}`,
      orderCount: m.orderCount,
      reward: m.reward,
      achieved: m.achieved,
      claimedAt: m.claimedAt
    }));

    res.status(200).json({
      success: true,
      data: { milestones }
    });
});

/**
 * @route   POST /api/partner/milestones/:milestoneId/claim
 * @desc    Claim milestone reward
 * @access  Private
 */
export const claimMilestoneReward = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { milestoneId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Extract order count from milestoneId (format: "milestone-5")
    const orderCount = parseInt(milestoneId.split('-')[1]);

    if (isNaN(orderCount)) {
      res.status(400).json({
        success: false,
        error: 'Invalid milestone ID'
      });
      return;
    }

    const partner = await partnerService.claimMilestoneReward(userId, orderCount);

    const milestone = partner.milestones.find(m => m.orderCount === orderCount);

    res.status(200).json({
      success: true,
      message: 'Milestone reward claimed successfully',
      data: {
        milestone: {
          id: `milestone-${milestone?.orderCount}`,
          orderCount: milestone?.orderCount,
          reward: milestone?.reward,
          achieved: milestone?.achieved,
          claimedAt: milestone?.claimedAt
        }
      }
    });
});

/**
 * @route   GET /api/partner/tasks
 * @desc    Get partner tasks
 * @access  Private
 */
export const getPartnerTasks = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const partner = await partnerService.getOrCreatePartner(userId);

    const tasks = partner.tasks.map((t: any) => ({
      id: t.title,
      title: t.title,
      description: t.description,
      type: t.type, // Add the missing type field
      reward: {
        ...t.reward,
        isClaimed: t.claimed // Map claimed to reward.isClaimed for frontend compatibility
      },
      progress: t.progress,
      isCompleted: t.completed, // Map completed to isCompleted for frontend compatibility
      completed: t.completed, // Keep for backward compatibility
      claimed: t.claimed // Keep for backward compatibility
    }));

    res.status(200).json({
      success: true,
      data: { tasks }
    });
});

/**
 * @route   POST /api/partner/tasks/:taskId/claim
 * @desc    Claim task reward
 * @access  Private
 */
export const claimTaskReward = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { taskId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // taskId is the task title
    const partner = await partnerService.claimTaskReward(userId, decodeURIComponent(taskId));

    const task = partner.tasks.find(t => t.title === decodeURIComponent(taskId));

    res.status(200).json({
      success: true,
      message: 'Task reward claimed successfully',
      data: {
        task: {
          id: task?.title,
          title: task?.title,
          description: task?.description,
          reward: task?.reward,
          progress: task?.progress,
          completed: task?.completed,
          claimed: task?.claimed
        }
      }
    });
});

/**
 * @route   GET /api/partner/jackpot
 * @desc    Get jackpot progress
 * @access  Private
 */
export const getJackpotProgress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const partner = await partnerService.getOrCreatePartner(userId);

    const milestones = partner.jackpotProgress.map((j: any) => ({
      id: j.title,
      spendAmount: j.spendAmount,
      title: j.title,
      description: j.description,
      reward: j.reward,
      achieved: j.achieved
    }));

    res.status(200).json({
      success: true,
      data: {
        currentSpent: partner.totalSpent,
        milestones
      }
    });
});

/**
 * @route   POST /api/partner/jackpot/:spendAmount/claim
 * @desc    Claim jackpot milestone reward
 * @access  Private
 */
export const claimJackpotReward = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { spendAmount } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const amount = parseInt(spendAmount);
    if (isNaN(amount)) {
      res.status(400).json({
        success: false,
        error: 'Invalid spend amount'
      });
      return;
    }

    const partner = await partnerService.claimJackpotReward(userId, amount);
    const jackpot = partner.jackpotProgress.find((j: any) => j.spendAmount === amount);

    res.status(200).json({
      success: true,
      message: 'Jackpot reward claimed successfully',
      data: {
        jackpot: {
          id: jackpot?.title,
          spendAmount: jackpot?.spendAmount,
          title: jackpot?.title,
          reward: jackpot?.reward,
          claimedAt: jackpot?.claimedAt
        }
      }
    });
});

/**
 * @route   GET /api/partner/offers
 * @desc    Get claimable offers
 * @access  Private
 */
export const getPartnerOffers = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const partner = await partnerService.getOrCreatePartner(userId);

    const offers = partner.claimableOffers.map((o: any) => ({
      id: o.title,
      title: o.title,
      description: o.description,
      discount: o.discount,
      category: o.category,
      validUntil: o.validUntil.toISOString().split('T')[0],
      termsAndConditions: o.termsAndConditions,
      claimed: o.claimed,
      voucherCode: o.voucherCode
    }));

    res.status(200).json({
      success: true,
      data: { offers }
    });
});

/**
 * @route   POST /api/partner/offers/:offerId/claim
 * @desc    Claim partner offer
 * @access  Private
 */
export const claimPartnerOffer = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { offerId } = req.body; // Get from body instead of params

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    logger.info('🎫 [CONTROLLER] Claiming offer:', offerId);

    // No need to decode - coming from body as plain string
    const { partner, voucherCode } = await partnerService.claimOffer(
      userId,
      offerId
    );

    const offer = partner.claimableOffers.find(o => o.title === offerId);

    res.status(200).json({
      success: true,
      message: 'Offer claimed successfully',
      data: {
        voucher: {
          code: voucherCode,
          expiryDate: offer?.validUntil.toISOString().split('T')[0] || ''
        }
      }
    });
});

/**
 * @route   POST /api/partner/tasks/:taskType/update
 * @desc    Update task progress
 * @access  Private
 */
export const updateTaskProgress = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { taskType } = req.params;
    const { progress } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const partner = await partnerService.updateTaskProgress(userId, taskType, progress);

    const task = partner.tasks.find((t: any) => t.type === taskType);

    res.status(200).json({
      success: true,
      message: 'Task progress updated successfully',
      data: {
        task: {
          id: task?.title,
          title: task?.title,
          description: task?.description,
          type: task?.type,
          progress: task?.progress,
          completed: task?.completed
        }
      }
    });
});

/**
 * @route   GET /api/partner/faqs
 * @desc    Get partner FAQs
 * @access  Private
 */
export const getPartnerFAQs = asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.query;

    const dashboardData = await partnerService.getPartnerDashboard(req.user?.id || '');
    let faqs = dashboardData.faqs;

    // Filter by category if provided
    if (category && typeof category === 'string') {
      faqs = faqs.filter((faq: any) => faq.category === category);
    }

    res.status(200).json({
      success: true,
      data: { faqs }
    });
});

/**
 * @route   GET /api/partner/levels
 * @desc    Get all partner levels and their benefits
 * @access  Private
 */
export const getPartnerLevels = asyncHandler(async (req: Request, res: Response) => {
    const levels = Object.values(PARTNER_LEVELS).map(level => ({
      level: level.level,
      name: level.name,
      requirements: level.requirements,
      benefits: level.benefits
    }));

    res.status(200).json({
      success: true,
      data: { levels }
    });
});

/**
 * @route   POST /api/partner/payout/request
 * @desc    Request payout of earnings
 * @access  Private
 */
export const requestPayout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { amount, method } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    if (!amount || !method) {
      res.status(400).json({
        success: false,
        error: 'Amount and payment method are required'
      });
      return;
    }

    const result = await partnerService.requestPayout(userId, amount, method);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        payoutId: result.payoutId
      }
    });
});

/**
 * @route   GET /api/partner/stats
 * @desc    Get partner statistics and rankings
 * @access  Private
 */
export const getPartnerStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const stats = await partnerService.getPartnerStats(userId);

    res.status(200).json({
      success: true,
      data: stats
    });
});
