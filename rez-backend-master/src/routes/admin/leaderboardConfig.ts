import { logger } from '../../config/logger';
/**
 * Admin Routes - Leaderboard Configuration
 * CRUD endpoints for managing LeaderboardConfig and prize distributions
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import LeaderboardConfig from '../../models/LeaderboardConfig';
import LeaderboardPrizeDistribution from '../../models/LeaderboardPrizeDistribution';
import { sendSuccess, sendNotFound, sendBadRequest, sendCreated } from '../../utils/response';
import { sendError, sendPaginated } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// DASHBOARD STATS
// ============================================

/**
 * GET /api/admin/leaderboard/configs/stats
 * Dashboard stats: active count, total prizes distributed, participation rate
 */
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
    const [activeCount, totalConfigs, distributions] = await Promise.all([
      LeaderboardConfig.countDocuments({ status: 'active' }),
      LeaderboardConfig.countDocuments(),
      LeaderboardPrizeDistribution.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalDistributed: { $sum: '$totalDistributed' },
            totalDistributions: { $sum: 1 },
            totalParticipants: { $sum: { $size: '$entries' } },
          },
        },
      ]),
    ]);

    const distStats = distributions[0] || {
      totalDistributed: 0,
      totalDistributions: 0,
      totalParticipants: 0,
    };

    return sendSuccess(res, {
      activeCount,
      totalConfigs,
      totalPrizesDistributed: distStats.totalDistributed,
      totalDistributions: distStats.totalDistributions,
      totalParticipants: distStats.totalParticipants,
    }, 'Leaderboard stats fetched');
  }));

// ============================================
// PRIZE HISTORY
// ============================================

/**
 * GET /api/admin/leaderboard/configs/prize-history
 * List all prize distributions with pagination
 */
router.get('/prize-history', asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.leaderboardConfigId) {
      filter.leaderboardConfigId = req.query.leaderboardConfigId;
    }

    const [distributions, total] = await Promise.all([
      LeaderboardPrizeDistribution.find(filter)
        .populate('leaderboardConfigId', 'title slug period')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LeaderboardPrizeDistribution.countDocuments(filter),
    ]);

    return sendPaginated(res, distributions, page, limit, total, 'Prize history fetched');
  }));

// ============================================
// LEADERBOARD CONFIG CRUD
// ============================================

/**
 * GET /api/admin/leaderboard/configs
 * List all leaderboard configs with pagination, search, and status filter
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.search) {
      const search = escapeRegex((req.query.search as string).trim());
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const [configs, total] = await Promise.all([
      LeaderboardConfig.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LeaderboardConfig.countDocuments(filter),
    ]);

    return sendPaginated(res, configs, page, limit, total, 'Leaderboard configs fetched');
  }));

/**
 * POST /api/admin/leaderboard/configs/refresh
 * Manually trigger leaderboard cache refresh for all active configs
 */
router.post('/refresh', asyncHandler(async (_req: Request, res: Response) => {
    const { triggerManualLeaderboardRefresh } = await import('../../jobs/leaderboardRefreshJob');
    await triggerManualLeaderboardRefresh();
    return sendSuccess(res, null, 'Leaderboard cache refreshed successfully');
  }));

/**
 * GET /api/admin/leaderboard/configs/:id
 * Get single leaderboard config
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const config = await LeaderboardConfig.findById(req.params.id).lean();
    if (!config) {
      return sendNotFound(res, 'Leaderboard config not found');
    }
    return sendSuccess(res, config, 'Leaderboard config fetched');
  }));

/**
 * POST /api/admin/leaderboard/configs
 * Create a new leaderboard config
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      slug, title, subtitle, leaderboardType, period,
      coinTransactionSources, prizePool, eligibility,
      antifraud, display, topN, isActive, status,
    } = req.body;

    if (!slug || !title || !leaderboardType || !period) {
      return sendBadRequest(res, 'slug, title, leaderboardType, and period are required');
    }

    // Check slug uniqueness
    const existing = await LeaderboardConfig.findOne({ slug });
    if (existing) {
      return sendBadRequest(res, `Leaderboard config with slug "${slug}" already exists`);
    }

    const config = await LeaderboardConfig.create({
      slug,
      title,
      subtitle,
      leaderboardType,
      period,
      coinTransactionSources: coinTransactionSources || [],
      prizePool: prizePool || [],
      eligibility,
      antifraud,
      display,
      topN,
      isActive: isActive !== undefined ? isActive : true,
      status: status || 'active',
      createdBy: (req as any).user?._id,
    });

    return sendCreated(res, config, 'Leaderboard config created');
  } catch (error: any) {
    logger.error('[Admin] Error creating leaderboard config:', error);
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    if (error.code === 11000) {
      return sendBadRequest(res, 'Duplicate slug - leaderboard config already exists');
    }
    return sendError(res, 'Failed to create leaderboard config', 500);
  }
}));

/**
 * PUT /api/admin/leaderboard/configs/:id
 * Update a leaderboard config
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      slug, title, subtitle, leaderboardType, period,
      coinTransactionSources, prizePool, eligibility,
      antifraud, display, topN, isActive, status,
    } = req.body;

    const config = await LeaderboardConfig.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(slug !== undefined && { slug }),
          ...(title !== undefined && { title }),
          ...(subtitle !== undefined && { subtitle }),
          ...(leaderboardType !== undefined && { leaderboardType }),
          ...(period !== undefined && { period }),
          ...(coinTransactionSources !== undefined && { coinTransactionSources }),
          ...(prizePool !== undefined && { prizePool }),
          ...(eligibility !== undefined && { eligibility }),
          ...(antifraud !== undefined && { antifraud }),
          ...(display !== undefined && { display }),
          ...(topN !== undefined && { topN }),
          ...(isActive !== undefined && { isActive }),
          ...(status !== undefined && { status }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!config) {
      return sendNotFound(res, 'Leaderboard config not found');
    }

    return sendSuccess(res, config, 'Leaderboard config updated');
  } catch (error: any) {
    logger.error('[Admin] Error updating leaderboard config:', error);
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    if (error.code === 11000) {
      return sendBadRequest(res, 'Duplicate slug - another config already uses this slug');
    }
    return sendError(res, 'Failed to update leaderboard config', 500);
  }
}));

/**
 * DELETE /api/admin/leaderboard/configs/:id
 * Delete a leaderboard config
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const config = await LeaderboardConfig.findByIdAndDelete(req.params.id);
    if (!config) {
      return sendNotFound(res, 'Leaderboard config not found');
    }
    return sendSuccess(res, null, 'Leaderboard config deleted');
  }));

/**
 * PATCH /api/admin/leaderboard/configs/:id/status
 * Update status (active/paused/archived)
 */
router.patch('/:id/status', asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;

    if (!status || !['active', 'paused', 'archived'].includes(status)) {
      return sendBadRequest(res, 'status must be one of: active, paused, archived');
    }

    const config = await LeaderboardConfig.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          isActive: status === 'active',
        },
      },
      { new: true, runValidators: true }
    );

    if (!config) {
      return sendNotFound(res, 'Leaderboard config not found');
    }

    return sendSuccess(res, config, `Leaderboard config status updated to ${status}`);
  }));

/**
 * GET /api/admin/leaderboard/configs/:id/analytics
 * Analytics for a specific leaderboard (participation, score distribution)
 */
router.get('/:id/analytics', asyncHandler(async (req: Request, res: Response) => {
    const config = await LeaderboardConfig.findById(req.params.id).lean();
    if (!config) {
      return sendNotFound(res, 'Leaderboard config not found');
    }

    // Get prize distributions for this leaderboard
    const distributions = await LeaderboardPrizeDistribution.find({
      leaderboardConfigId: req.params.id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Aggregate stats across distributions
    const aggregateStats = await LeaderboardPrizeDistribution.aggregate([
      { $match: { leaderboardConfigId: config._id } },
      {
        $group: {
          _id: null,
          totalCycles: { $sum: 1 },
          totalPrizesDistributed: { $sum: '$totalDistributed' },
          totalFlagged: { $sum: '$totalFlagged' },
          totalParticipants: { $sum: { $size: '$entries' } },
          avgParticipantsPerCycle: { $avg: { $size: '$entries' } },
        },
      },
    ]);

    const stats = aggregateStats[0] || {
      totalCycles: 0,
      totalPrizesDistributed: 0,
      totalFlagged: 0,
      totalParticipants: 0,
      avgParticipantsPerCycle: 0,
    };

    // Score distribution from recent distributions
    const scoreDistribution = await LeaderboardPrizeDistribution.aggregate([
      { $match: { leaderboardConfigId: config._id } },
      { $unwind: '$entries' },
      {
        $bucket: {
          groupBy: '$entries.score',
          boundaries: [0, 100, 500, 1000, 5000, 10000, 50000, Infinity],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    return sendSuccess(res, {
      config,
      stats,
      recentDistributions: distributions,
      scoreDistribution,
    }, 'Leaderboard analytics fetched');
  }));

/**
 * POST /api/admin/leaderboard/configs/:id/distribute-prizes
 * Manual prize distribution trigger
 * Runs the prize distribution pipeline for the current cycle of the given leaderboard config.
 */
router.post('/:id/distribute-prizes', asyncHandler(async (req: Request, res: Response) => {
    const config = await LeaderboardConfig.findById(req.params.id);
    if (!config) {
      return sendNotFound(res, 'Leaderboard config not found');
    }

    if (config.status !== 'active') {
      return sendBadRequest(res, 'Can only distribute prizes for active leaderboards');
    }

    if (!config.prizePool || config.prizePool.length === 0) {
      return sendBadRequest(res, 'No prize pool configured for this leaderboard');
    }

    // Import and run the distribution logic
    const mongoose = await import('mongoose');
    const leaderboardService = (await import('../../services/leaderboardService')).default;
    const leaderboardSecurityService = (await import('../../services/leaderboardSecurityService')).default;
    const { awardCoins } = await import('../../services/coinService');

    // Get the cycle boundaries for the current period
    const { start: cycleStartDate, end: cycleEndDate } = leaderboardService.getCycleBoundaries(config.period);

    // Idempotency check
    const existingDistribution = await LeaderboardPrizeDistribution.findOne({
      leaderboardConfigId: config._id,
      cycleStartDate,
      cycleEndDate,
    });

    if (existingDistribution) {
      return sendBadRequest(res, `Prizes already distributed for cycle ${cycleStartDate.toISOString()} - ${cycleEndDate.toISOString()} (status: ${existingDistribution.status})`);
    }

    // Create pending distribution record
    const distribution = await LeaderboardPrizeDistribution.create({
      leaderboardConfigId: config._id,
      cycleStartDate,
      cycleEndDate,
      period: config.period,
      status: 'processing',
      entries: [],
      totalDistributed: 0,
      totalFlagged: 0,
    });

    // Get leaderboard snapshot
    const entries = await leaderboardService.runFullAggregation(config);

    if (entries.length === 0) {
      distribution.status = 'completed';
      await distribution.save();
      return sendSuccess(res, {
        leaderboardConfigId: config._id,
        slug: config.slug,
        distributed: 0,
        flagged: 0,
        message: 'No entries in leaderboard for this cycle',
      }, 'No entries to distribute');
    }

    // Run anti-fraud checks
    let flaggedUserIds = new Set<string>();
    try {
      const fraudResults = await leaderboardSecurityService.runAntifraudChecks(entries, config);
      flaggedUserIds = new Set(fraudResults.flaggedEntries.map((e: any) => e.userId));
    } catch (err: any) {
      logger.error('[Admin Prize Dist] Anti-fraud check failed:', err.message);
    }

    // Process prize slots
    let totalDistributed = 0;
    let totalFlagged = 0;
    const prizeEntries: any[] = [];

    for (const prizeSlot of config.prizePool) {
      const slotEntries = entries.filter(
        (e: any) => e.rank >= prizeSlot.rankStart && e.rank <= prizeSlot.rankEnd
      );

      for (const entry of slotEntries) {
        const userId = entry.user.id;
        const isFlagged = flaggedUserIds.has(userId);

        const prizeEntry: any = {
          userId: new mongoose.default.Types.ObjectId(userId),
          rank: entry.rank,
          score: entry.value,
          prizeAmount: prizeSlot.prizeAmount,
          status: 'pending',
        };

        if (isFlagged) {
          prizeEntry.status = 'flagged';
          prizeEntry.flagReason = 'Flagged by anti-fraud checks';
          totalFlagged++;
          prizeEntries.push(prizeEntry);
          continue;
        }

        try {
          const idempotencyKey = `leaderboard_prize:${config._id}:${cycleStartDate.toISOString()}:${userId}`;
          const result = await awardCoins(
            userId,
            prizeSlot.prizeAmount,
            'leaderboard_prize',
            `${config.title} - Rank #${entry.rank} prize (${prizeSlot.prizeLabel})`,
            {
              leaderboardConfigId: (config._id as any).toString(),
              cycleStartDate: cycleStartDate.toISOString(),
              cycleEndDate: cycleEndDate.toISOString(),
              rank: entry.rank,
              score: entry.value,
              prizeLabel: prizeSlot.prizeLabel,
              idempotencyKey,
            }
          );

          prizeEntry.coinTransactionId = result.transactionId
            ? new mongoose.default.Types.ObjectId(result.transactionId)
            : undefined;
          prizeEntry.status = 'distributed';
          totalDistributed++;
        } catch (awardError: any) {
          prizeEntry.status = 'failed';
          prizeEntry.flagReason = `Award failed: ${awardError.message}`;
          totalFlagged++;
        }

        prizeEntries.push(prizeEntry);
      }
    }

    // Update distribution record
    distribution.entries = prizeEntries;
    distribution.totalDistributed = totalDistributed;
    distribution.totalFlagged = totalFlagged;
    distribution.distributedAt = new Date();
    distribution.status = totalFlagged > 0 && totalDistributed > 0 ? 'partial' : totalDistributed > 0 ? 'completed' : 'partial';
    await distribution.save();

    return sendSuccess(res, {
      leaderboardConfigId: config._id,
      slug: config.slug,
      distributed: totalDistributed,
      flagged: totalFlagged,
      totalEntries: entries.length,
      cycle: { start: cycleStartDate, end: cycleEndDate },
    }, `Prize distribution complete: ${totalDistributed} distributed, ${totalFlagged} flagged`);
  }));

export default router;
