import { logger } from '../config/logger';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Poll from '../models/Poll';
import PollVote from '../models/PollVote';
import engagementRewardService from '../services/engagementRewardService';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get active polls (public).
 * GET /api/polls/active
 */
export const getActivePolls = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;
    const now = new Date();

    const filter = {
      status: 'active',
      startsAt: { $lte: now },
      endsAt: { $gt: now },
    };

    const [polls, total] = await Promise.all([
      Poll.find(filter)
        .populate('store', 'name logo')
        .sort({ isDaily: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Poll.countDocuments(filter),
    ]);

    // Check which polls the user has already voted on
    let votedPollIds = new Set<string>();
    if (userId) {
      const votes = await PollVote.find({
        user: userId,
        poll: { $in: polls.map(p => p._id) },
      }).lean();
      votedPollIds = new Set(votes.map(v => v.poll.toString()));
    }

    res.status(200).json({
      success: true,
      data: {
        polls: polls.map((p: any) => ({
          id: p._id,
          title: p.title,
          description: p.description,
          options: p.options,
          category: p.category,
          store: p.store,
          totalVotes: p.totalVotes,
          coinsPerVote: p.coinsPerVote,
          isDaily: p.isDaily,
          tags: p.tags,
          startsAt: p.startsAt,
          endsAt: p.endsAt,
          hasVoted: votedPollIds.has(p._id.toString()),
          createdAt: p.createdAt,
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + polls.length < total,
        },
      },
    });
});

/**
 * Get today's daily poll.
 * GET /api/polls/daily
 */
export const getDailyPoll = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const now = new Date();

    const poll = await Poll.findOne({
      isDaily: true,
      status: 'active',
      startsAt: { $lte: now },
      endsAt: { $gt: now },
    })
      .populate('store', 'name logo')
      .lean();

    if (!poll) {
      return res.status(200).json({
        success: true,
        data: { poll: null },
      });
    }

    let hasVoted = false;
    let userVote = null;
    if (userId) {
      const vote = await PollVote.findOne({ poll: poll._id, user: userId }).lean();
      if (vote) {
        hasVoted = true;
        userVote = vote.optionId;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        poll: {
          id: poll._id,
          title: poll.title,
          description: poll.description,
          options: poll.options,
          category: poll.category,
          store: poll.store,
          totalVotes: poll.totalVotes,
          coinsPerVote: poll.coinsPerVote,
          isDaily: poll.isDaily,
          tags: poll.tags,
          startsAt: poll.startsAt,
          endsAt: poll.endsAt,
          hasVoted,
          userVote,
          createdAt: poll.createdAt,
        },
      },
    });
});

/**
 * Get poll detail.
 * GET /api/polls/:id
 */
export const getPollDetail = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const { id } = req.params;

    const poll = await Poll.findById(id)
      .populate('store', 'name logo')
      .lean();

    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found' });
    }

    let hasVoted = false;
    let userVote = null;
    if (userId) {
      const vote = await PollVote.findOne({ poll: poll._id, user: userId }).lean();
      if (vote) {
        hasVoted = true;
        userVote = vote.optionId;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        poll: {
          id: poll._id,
          title: poll.title,
          description: poll.description,
          options: poll.options,
          category: poll.category,
          store: poll.store,
          totalVotes: poll.totalVotes,
          coinsPerVote: poll.coinsPerVote,
          isDaily: poll.isDaily,
          tags: poll.tags,
          startsAt: poll.startsAt,
          endsAt: poll.endsAt,
          hasVoted,
          userVote,
          createdAt: poll.createdAt,
        },
      },
    });
});

/**
 * Cast a vote on a poll.
 * POST /api/polls/:id/vote
 */
export const votePoll = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    const { optionId } = req.body;

    if (!optionId) {
      return res.status(400).json({ success: false, error: 'optionId is required' });
    }

    const poll = await Poll.findById(id).lean();
    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found' });
    }

    if (poll.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Poll is not active' });
    }

    const now = new Date();
    if (now < poll.startsAt || now > poll.endsAt) {
      return res.status(400).json({ success: false, error: 'Poll is not currently open for voting' });
    }

    // Verify the optionId is valid
    const option = poll.options.find(o => o.id === optionId);
    if (!option) {
      return res.status(400).json({ success: false, error: 'Invalid option' });
    }

    // Check duplicate vote (unique index will also catch this)
    const existingVote = await PollVote.findOne({ poll: id, user: userId }).lean();
    if (existingVote) {
      return res.status(400).json({ success: false, error: 'You have already voted on this poll' });
    }

    // Grant reward
    const rewardResult = await engagementRewardService.grantReward(
      userId.toString(),
      'poll_vote',
      id,
      { pollTitle: poll.title, optionId, isDaily: poll.isDaily }
    );

    const coinsAwarded = rewardResult.success ? (rewardResult.coinsAwarded || 0) : 0;

    // Create vote — handle duplicate key error from unique index
    try {
      await PollVote.create({
        poll: new mongoose.Types.ObjectId(id),
        user: new mongoose.Types.ObjectId(userId),
        optionId,
        coinsAwarded,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, error: 'You have already voted on this poll' });
      }
      throw error;
    }

    // Update vote counts
    option.voteCount += 1;
    poll.totalVotes += 1;
    poll.markModified('options');
    await poll.save();

    res.status(200).json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        pollId: poll._id,
        optionId,
        totalVotes: poll.totalVotes,
        options: poll.options,
        coinReward: rewardResult.success
          ? { coinsAwarded: rewardResult.coinsAwarded, status: rewardResult.status, message: rewardResult.message }
          : null,
      },
    });
});

/**
 * Get user's vote history.
 * GET /api/polls/my-votes
 */
export const getMyVotes = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [votes, total] = await Promise.all([
      PollVote.find({ user: userId })
        .populate({
          path: 'poll',
          select: 'title description options totalVotes coinsPerVote isDaily endsAt status',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PollVote.countDocuments({ user: userId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        votes: votes.map((v: any) => ({
          id: v._id,
          optionId: v.optionId,
          coinsAwarded: v.coinsAwarded,
          createdAt: v.createdAt,
          poll: v.poll ? {
            id: v.poll._id,
            title: v.poll.title,
            description: v.poll.description,
            options: v.poll.options,
            totalVotes: v.poll.totalVotes,
            isDaily: v.poll.isDaily,
            status: v.poll.status,
          } : null,
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + votes.length < total,
        },
      },
    });
});

// ── Admin endpoints ──────────────────────────

/**
 * Create a poll (admin).
 * POST /api/polls
 */
export const createPoll = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id || (req as any).user?._id;
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { title, description, options, category, storeId, offerId, startsAt, endsAt, coinsPerVote, isDaily, tags } = req.body;

    if (!title || !options || options.length < 2) {
      return res.status(400).json({ success: false, error: 'Title and at least 2 options are required' });
    }

    if (!startsAt || !endsAt) {
      return res.status(400).json({ success: false, error: 'Start and end dates are required' });
    }

    const pollOptions = options.map((opt: any, idx: number) => ({
      id: `opt_${idx + 1}`,
      text: opt.text,
      imageUrl: opt.imageUrl,
      voteCount: 0,
    }));

    const poll = await Poll.create({
      title: title.trim(),
      description: description?.trim(),
      options: pollOptions,
      category,
      store: storeId ? new mongoose.Types.ObjectId(storeId) : undefined,
      offer: offerId ? new mongoose.Types.ObjectId(offerId) : undefined,
      createdBy: new mongoose.Types.ObjectId(adminId),
      status: 'active',
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      coinsPerVote: coinsPerVote || 10,
      isDaily: isDaily || false,
      tags: tags || [],
    });

    res.status(201).json({
      success: true,
      message: 'Poll created successfully',
      data: { poll },
    });
});

/**
 * Update a poll (admin).
 * PATCH /api/polls/:id
 */
export const updatePoll = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const poll = await Poll.findById(id).lean();
    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found' });
    }

    // Only allow updating certain fields
    const allowedFields = ['title', 'description', 'status', 'startsAt', 'endsAt', 'coinsPerVote', 'isDaily', 'tags', 'category'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        (poll as any)[field] = updates[field];
      }
    }

    await poll.save();

    res.status(200).json({
      success: true,
      message: 'Poll updated successfully',
      data: { poll },
    });
});

/**
 * Archive a poll (admin).
 * DELETE /api/polls/:id
 */
export const archivePoll = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const poll = await Poll.findById(id);
    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found' });
    }

    poll.status = 'archived';
    await poll.save();

    res.status(200).json({
      success: true,
      message: 'Poll archived successfully',
    });
});
