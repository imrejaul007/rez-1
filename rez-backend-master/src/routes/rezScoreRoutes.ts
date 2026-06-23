// @ts-nocheck
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import rezScoreService from '../services/rezScoreService';
import RezScore, { REZ_SCORE_TIERS, getTierFromScore } from '../models/RezScore';

const router = Router();

router.use(requireAuth);
router.use(generalLimiter);

/**
 * GET /api/score
 * Returns the authenticated user's current REZ Score with tier, pillars, and percentile.
 * Triggers a recalculation if the score has never been computed for this user.
 */
router.get(
  '/',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Return existing score or trigger initial calculation
    let scoreDoc = await RezScore.findOne({ userId }).lean();
    if (!scoreDoc) {
      scoreDoc = (await rezScoreService.calculateScore(userId)) as any;
    }

    const doc = scoreDoc as any;
    const tier = doc.tier;
    const tierInfo = REZ_SCORE_TIERS[tier as keyof typeof REZ_SCORE_TIERS];

    // Shape response to match frontend RezScore interface
    const shaped = {
      score: doc.totalScore,
      tier,
      tierMinScore: tierInfo?.min ?? 0,
      tierMaxScore: tierInfo?.max ?? 999,
      lastMonthScore: doc.previousScore,
      trend: doc.trend,
      trendPoints: doc.totalScore - doc.previousScore,
      peerPercentile: doc.percentile,
      lastCalculated: doc.lastCalculated,
      pillars: [
        {
          name: 'savingsRate',
          score: doc.pillars?.savingsRate ?? 0,
          weight: 0.3,
          description: 'Coins earned per rupee spent',
        },
        {
          name: 'visitFrequency',
          score: doc.pillars?.visitFrequency ?? 0,
          weight: 0.25,
          description: 'Store visits last 30 days',
        },
        {
          name: 'streakConsistency',
          score: doc.pillars?.streakConsistency ?? 0,
          weight: 0.2,
          description: 'Savings streak consistency',
        },
        {
          name: 'merchantDiversity',
          score: doc.pillars?.merchantDiversity ?? 0,
          weight: 0.15,
          description: 'Unique merchants visited',
        },
        {
          name: 'communityContribution',
          score: doc.pillars?.communityContribution ?? 0,
          weight: 0.1,
          description: 'Reviews, referrals, and shares',
        },
      ],
    };

    return res.json({ success: true, data: shaped });
  }),
);

/**
 * GET /api/score/boosters
 * Returns up to 3 actionable suggestions to improve the user's REZ Score.
 */
router.get(
  '/boosters',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const boosters = await rezScoreService.getScoreBoosters(userId);
    return res.json({ success: true, data: boosters });
  }),
);

/**
 * GET /api/score/history
 * Returns score trend over time.
 * Currently returns the current score with trend indicator (up/down/stable).
 * Full history will be available after multiple calculation cycles accumulate data.
 */
router.get(
  '/history',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const scoreDoc = await RezScore.findOne({ userId })
      .select('totalScore tier previousScore trend lastCalculated percentile scoreHistory')
      .lean();

    if (!scoreDoc) {
      return res.json({ success: true, data: { history: [], currentScore: 0, trend: 'stable' } });
    }

    // Build history from snapshots + append current score as latest entry
    const rawSnapshots: Array<{ score: number; tier: string; date: any }> = (scoreDoc as any).scoreHistory ?? [];
    const allEntries = [
      ...rawSnapshots,
      {
        score: (scoreDoc as any).totalScore,
        tier: (scoreDoc as any).tier,
        date: (scoreDoc as any).lastCalculated,
      },
    ];
    // Add change delta vs previous entry
    const history = allEntries.map((entry, idx) => ({
      score: entry.score,
      tier: entry.tier,
      date: entry.date,
      change: idx === 0 ? 0 : entry.score - allEntries[idx - 1].score,
    }));

    return res.json({
      success: true,
      data: {
        currentScore: (scoreDoc as any).totalScore,
        previousScore: (scoreDoc as any).previousScore,
        trend: (scoreDoc as any).trend,
        tier: (scoreDoc as any).tier,
        percentile: (scoreDoc as any).percentile,
        lastCalculated: (scoreDoc as any).lastCalculated,
        history,
      },
    });
  }),
);

/**
 * GET /api/score/percentile
 * Returns the user's rank percentile among all active REZ users.
 */
router.get(
  '/percentile',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const percentileData = await rezScoreService.getPercentile(userId);
    return res.json({ success: true, data: percentileData });
  }),
);

export default router;
