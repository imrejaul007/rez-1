/**
 * Admin Routes - Tournaments
 * CRUD for Tournament model (used by admin dashboard)
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import Tournament from '../../models/Tournament';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/tournaments
 * List all tournaments with pagination and filters
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.status && ['upcoming', 'active', 'completed', 'cancelled'].includes(req.query.status as string)) {
      filter.status = req.query.status;
    }
    if (req.query.type && ['daily', 'weekly', 'monthly', 'special'].includes(req.query.type as string)) {
      filter.type = req.query.type;
    }
    if (req.query.gameType) {
      filter.gameType = req.query.gameType;
    }
    if (req.query.featured === 'true') {
      filter.featured = true;
    }

    const [tournaments, total] = await Promise.all([
      Tournament.find(filter)
        .select('-participants')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tournament.countDocuments(filter)
    ]);

    sendSuccess(res, {
      tournaments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  }));

/**
 * GET /api/admin/tournaments/stats
 * Aggregate tournament statistics
 */
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
    const [totalTournaments, statusCounts, totalParticipants] = await Promise.all([
      Tournament.countDocuments(),
      Tournament.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Tournament.aggregate([
        { $project: { participantCount: { $size: '$participants' } } },
        { $group: { _id: null, total: { $sum: '$participantCount' } } }
      ])
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) {
      statusMap[s._id] = s.count;
    }

    sendSuccess(res, {
      totalTournaments,
      statusBreakdown: {
        upcoming: statusMap['upcoming'] || 0,
        active: statusMap['active'] || 0,
        completed: statusMap['completed'] || 0,
        cancelled: statusMap['cancelled'] || 0,
      },
      totalParticipants: totalParticipants[0]?.total || 0,
    });
  }));

/**
 * GET /api/admin/tournaments/:id
 * Get tournament details with participants
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const tournament = await Tournament.findById(req.params.id)
      .populate('participants.user', 'name email phone avatar');

    if (!tournament) {
      return sendError(res, 'Tournament not found', 404);
    }

    sendSuccess(res, { tournament });
  }));

/**
 * POST /api/admin/tournaments
 * Create a new tournament
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const {
      name, description, type, gameType, startDate, endDate,
      entryFee, maxParticipants, minParticipants, prizes, rules,
      totalPrizePool, image, featured
    } = req.body;

    if (!name || !type || !gameType || !startDate || !endDate) {
      return sendError(res, 'Name, type, gameType, startDate, and endDate are required', 400);
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return sendError(res, 'Start date must be before end date', 400);
    }

    const tournament = await Tournament.create({
      name,
      description: description || '',
      type,
      gameType,
      status: new Date(startDate) <= new Date() ? 'active' : 'upcoming',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      entryFee: entryFee || 0,
      maxParticipants: maxParticipants || 1000,
      minParticipants: minParticipants || 0,
      prizes: prizes || [],
      rules: rules || [],
      totalPrizePool: totalPrizePool || prizes?.reduce((sum: number, p: any) => sum + (p.coins || 0), 0) || 0,
      image: image || '',
      featured: featured || false,
      participants: [],
    });

    sendSuccess(res, { tournament }, 'Created', 201);
  }));

/**
 * PUT /api/admin/tournaments/:id
 * Update a tournament (only upcoming or active)
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return sendError(res, 'Tournament not found', 404);
    }

    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return sendError(res, 'Cannot edit a completed or cancelled tournament', 400);
    }

    const allowedFields = [
      'name', 'description', 'type', 'gameType', 'startDate', 'endDate',
      'entryFee', 'maxParticipants', 'minParticipants', 'prizes', 'rules',
      'totalPrizePool', 'image', 'featured'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (tournament as any)[field] = req.body[field];
      }
    }

    // Recalculate totalPrizePool if prizes changed
    if (req.body.prizes) {
      tournament.totalPrizePool = req.body.prizes.reduce((sum: number, p: any) => sum + (p.coins || 0), 0);
    }

    await tournament.save();
    sendSuccess(res, { tournament });
  }));

/**
 * DELETE /api/admin/tournaments/:id
 * Delete a tournament (only upcoming with no participants)
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return sendError(res, 'Tournament not found', 404);
    }

    if (tournament.status !== 'upcoming') {
      return sendError(res, 'Can only delete upcoming tournaments', 400);
    }

    if (tournament.participants.length > 0) {
      return sendError(res, 'Cannot delete a tournament with participants', 400);
    }

    await Tournament.findByIdAndDelete(req.params.id);
    sendSuccess(res, { message: 'Tournament deleted successfully' });
  }));

/**
 * POST /api/admin/tournaments/:id/activate
 * Force-activate an upcoming tournament
 */
router.post('/:id/activate', asyncHandler(async (req: Request, res: Response) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return sendError(res, 'Tournament not found', 404);
    }

    if (tournament.status !== 'upcoming') {
      return sendError(res, 'Can only activate upcoming tournaments', 400);
    }

    tournament.status = 'active';
    await tournament.save();
    sendSuccess(res, { tournament });
  }));

/**
 * POST /api/admin/tournaments/:id/cancel
 * Cancel a tournament
 */
router.post('/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return sendError(res, 'Tournament not found', 404);
    }

    if (tournament.status === 'completed') {
      return sendError(res, 'Cannot cancel a completed tournament', 400);
    }

    tournament.status = 'cancelled';
    await tournament.save();
    sendSuccess(res, { tournament });
  }));

/**
 * POST /api/admin/tournaments/:id/clone
 * Clone a tournament with new dates (creates a new tournament based on existing one)
 */
router.post('/:id/clone', asyncHandler(async (req: Request, res: Response) => {
    const source = await Tournament.findById(req.params.id);
    if (!source) {
      return sendError(res, 'Tournament not found', 404);
    }

    const { startDate, endDate, name } = req.body;

    // Calculate default dates: start tomorrow, same duration as original
    const originalDuration = new Date(source.endDate).getTime() - new Date(source.startDate).getTime();
    const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
    const defaultEnd = new Date(defaultStart.getTime() + originalDuration);

    const cloned = await Tournament.create({
      name: name || `${source.name} (Copy)`,
      description: source.description,
      type: source.type,
      gameType: source.gameType,
      status: 'upcoming',
      startDate: startDate ? new Date(startDate) : defaultStart,
      endDate: endDate ? new Date(endDate) : defaultEnd,
      entryFee: source.entryFee,
      maxParticipants: source.maxParticipants,
      minParticipants: source.minParticipants,
      prizes: source.prizes,
      rules: source.rules,
      totalPrizePool: source.totalPrizePool,
      image: source.image,
      featured: source.featured,
      participants: [],
    });

    sendSuccess(res, { tournament: cloned }, 'Tournament cloned', 201);
  }));

/**
 * POST /api/admin/tournaments/:id/reactivate
 * Reactivate a completed/cancelled tournament with new dates
 */
router.post('/:id/reactivate', asyncHandler(async (req: Request, res: Response) => {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return sendError(res, 'Tournament not found', 404);
    }

    if (tournament.status !== 'completed' && tournament.status !== 'cancelled') {
      return sendError(res, 'Can only reactivate completed or cancelled tournaments', 400);
    }

    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return sendError(res, 'startDate and endDate are required for reactivation', 400);
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return sendError(res, 'Start date must be before end date', 400);
    }

    tournament.startDate = new Date(startDate);
    tournament.endDate = new Date(endDate);
    tournament.status = new Date(startDate) <= new Date() ? 'active' : 'upcoming';
    // Reset participants for the new run
    tournament.participants = [];
    await tournament.save();

    sendSuccess(res, { tournament });
  }));

/**
 * GET /api/admin/tournaments/:id/participants
 * Get tournament participants with scores
 */
router.get('/:id/participants', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const tournament = await Tournament.findById(req.params.id)
      .populate('participants.user', 'name email phone avatar');

    if (!tournament) {
      return sendError(res, 'Tournament not found', 404);
    }

    // Sort participants by score descending
    const sorted = [...tournament.participants]
      .sort((a, b) => b.score - a.score)
      .map((p, idx) => ({
        rank: idx + 1,
        user: p.user,
        score: p.score,
        gamesPlayed: p.gamesPlayed,
        joinedAt: p.joinedAt,
        lastPlayedAt: p.lastPlayedAt,
        prizeAwarded: p.prizeAwarded,
        prizeDetails: p.prizeDetails,
      }));

    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit);

    sendSuccess(res, {
      participants: paginated,
      pagination: {
        page,
        limit,
        total: sorted.length,
        pages: Math.ceil(sorted.length / limit)
      }
    });
  }));

export default router;
