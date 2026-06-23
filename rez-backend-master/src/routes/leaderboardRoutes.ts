import { Router, Request, Response } from 'express';
import leaderboardController from '../controllers/leaderboardController';
import { authenticate } from '../middleware/auth';
import { requireGamificationFeature } from '../middleware/gamificationFeatureGate';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import { User } from '../models/User';
import redisService from '../services/redisService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// CAMPUS & COMPANY LEADERBOARDS (identity layer)
// These are NOT behind gamification feature gate
// ============================================

function anonymizeName(firstName?: string, lastName?: string): string {
  const first = firstName || 'User';
  const lastInitial = lastName ? ` ${lastName.charAt(0)}.` : '';
  return `${first}${lastInitial}`;
}

/**
 * @route   GET /api/leaderboard/campus
 * @desc    Campus savings leaderboard for a given institution
 */
router.get('/campus', asyncHandler(async (req: Request, res: Response) => {
  const { institutionName } = req.query;
  const userId = (req as any).user._id.toString();

  if (!institutionName) {
    return sendError(res, 'institutionName query param is required', 400);
  }

  const cacheKey = `campus-lb:${(institutionName as string).toLowerCase().replace(/\s+/g, '-')}`;

  const cached = await redisService.get<string>(cacheKey);
  if (cached) {
    const data = JSON.parse(cached as string);
    const userEntry = data.leaderboard.find((e: any) => e.userId === userId);
    return sendSuccess(res, { ...data, currentUserRank: userEntry?.rank || null });
  }

  const escapedName = (institutionName as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const students = await User.find({
    'verifications.student.verified': true,
    'verifications.student.instituteName': { $regex: escapedName, $options: 'i' },
    isActive: true,
  })
    .select('_id profile.firstName profile.lastName')
    .lean();

  if (students.length === 0) {
    return sendSuccess(res, {
      institutionName,
      leaderboard: [],
      totalSaved: 0,
      studentCount: 0,
      currentUserRank: null,
    });
  }

  const studentIds = students.map((s) => s._id);
  const { CoinTransaction } = await import('../models/CoinTransaction');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const earnings = await CoinTransaction.aggregate([
    { $match: { user: { $in: studentIds }, type: 'earned', createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: '$user', totalEarned: { $sum: '$amount' } } },
    { $sort: { totalEarned: -1 } },
    { $limit: 50 },
  ]);

  const COIN_TO_RUPEE = 1; // 1 coin = ₹1 (from checkoutConfig.coins.rezCoin.conversionRate)
  const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
  const leaderboard = earnings.map((e, idx) => {
    const student = studentMap.get(e._id.toString());
    return {
      rank: idx + 1,
      userId: e._id.toString(),
      name: anonymizeName((student as any)?.profile?.firstName, (student as any)?.profile?.lastName),
      totalEarned: e.totalEarned,
      totalSavedRupees: Math.floor(e.totalEarned * COIN_TO_RUPEE),
    };
  });

  const totalCoinsEarned = leaderboard.reduce((sum, e) => sum + e.totalEarned, 0);
  const totalSaved = Math.floor(totalCoinsEarned * COIN_TO_RUPEE);
  const result = { institutionName, leaderboard, totalSaved, totalCoinsEarned, studentCount: students.length };
  await redisService.set(cacheKey, JSON.stringify(result), 300);

  const userEntry = leaderboard.find((e) => e.userId === userId);
  sendSuccess(res, { ...result, currentUserRank: userEntry?.rank || null });
}));

/**
 * @route   GET /api/leaderboard/company
 * @desc    Company savings leaderboard
 */
router.get('/company', asyncHandler(async (req: Request, res: Response) => {
  const { companyName } = req.query;
  const userId = (req as any).user._id.toString();

  if (!companyName) {
    return sendError(res, 'companyName query param is required', 400);
  }

  const cacheKey = `company-lb:${(companyName as string).toLowerCase().replace(/\s+/g, '-')}`;

  const cached = await redisService.get<string>(cacheKey);
  if (cached) {
    const data = JSON.parse(cached as string);
    const userEntry = data.leaderboard.find((e: any) => e.userId === userId);
    return sendSuccess(res, { ...data, currentUserRank: userEntry?.rank || null });
  }

  const escapedName = (companyName as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const employees = await User.find({
    'verifications.corporate.verified': true,
    'verifications.corporate.companyName': { $regex: escapedName, $options: 'i' },
    isActive: true,
  })
    .select('_id profile.firstName profile.lastName')
    .lean();

  if (employees.length === 0) {
    return sendSuccess(res, {
      companyName,
      leaderboard: [],
      totalSaved: 0,
      employeeCount: 0,
      currentUserRank: null,
    });
  }

  const employeeIds = employees.map((e) => e._id);
  const { CoinTransaction } = await import('../models/CoinTransaction');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const earnings = await CoinTransaction.aggregate([
    { $match: { user: { $in: employeeIds }, type: 'earned', createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: '$user', totalEarned: { $sum: '$amount' } } },
    { $sort: { totalEarned: -1 } },
    { $limit: 50 },
  ]);

  const employeeMap = new Map(employees.map((e) => [e._id.toString(), e]));
  const COIN_TO_RUPEE = 1; // 1 coin = ₹1 (from checkoutConfig.coins.rezCoin.conversionRate)
  const leaderboard = earnings.map((e, idx) => {
    const employee = employeeMap.get(e._id.toString());
    return {
      rank: idx + 1,
      userId: e._id.toString(),
      name: anonymizeName((employee as any)?.profile?.firstName, (employee as any)?.profile?.lastName),
      totalEarned: e.totalEarned,
      totalSavedRupees: Math.floor(e.totalEarned * COIN_TO_RUPEE),
    };
  });

  const totalCoinsEarned = leaderboard.reduce((sum, e) => sum + e.totalEarned, 0);
  const totalSaved = Math.floor(totalCoinsEarned * COIN_TO_RUPEE);
  const result = { companyName, leaderboard, totalSaved, totalCoinsEarned, employeeCount: employees.length };
  await redisService.set(cacheKey, JSON.stringify(result), 300);

  const userEntry = leaderboard.find((e) => e.userId === userId);
  sendSuccess(res, { ...result, currentUserRank: userEntry?.rank || null });
}));

// ============================================
// GAMIFICATION LEADERBOARDS (feature-gated)
// ============================================
router.use(requireGamificationFeature('leaderboard', { entries: [] }));

router.get('/spending', leaderboardController.getSpendingLeaderboard.bind(leaderboardController));
router.get('/reviews', leaderboardController.getReviewLeaderboard.bind(leaderboardController));
router.get('/referrals', leaderboardController.getReferralLeaderboard.bind(leaderboardController));
router.get('/cashback', leaderboardController.getCashbackLeaderboard.bind(leaderboardController));
router.get('/streak', leaderboardController.getStreakLeaderboard.bind(leaderboardController));
router.get('/all', leaderboardController.getAllLeaderboards.bind(leaderboardController));
router.get('/my-rank', leaderboardController.getMyRank.bind(leaderboardController));

export default router;
