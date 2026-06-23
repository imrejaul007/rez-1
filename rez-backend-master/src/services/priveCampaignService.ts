/**
 * Privé Campaign Service
 *
 * Business logic for social cashback campaigns:
 *  - Campaign listing & detail with per-user status enrichment
 *  - Join, submit, approve/reject flows
 *  - Atomic coin/cashback crediting via MongoDB sessions
 */

import mongoose from 'mongoose';
import { PriveCampaign } from '../models/PriveCampaign';
import { PriveSubmission } from '../models/PriveSubmission';
import { CoinTransaction } from '../models/CoinTransaction';
import priveAccessService from './priveAccessService';
import { logger } from '../config/logger';

const TIER_LEVELS: Record<string, number> = {
  entry: 1,
  signature: 2,
  elite: 3,
};

// ── Helpers ──

type UserCampaignStatus =
  | 'eligible'
  | 'joined'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'slots_full'
  | 'expired'
  | 'tier_insufficient';

async function getUserStatusForCampaign(
  campaign: any,
  userId: string,
  userTier: string
): Promise<{ userStatus: UserCampaignStatus; userSubmissionStatus: string | null }> {
  // Check tier
  const userLevel = TIER_LEVELS[userTier] ?? 0;
  const requiredLevel = TIER_LEVELS[campaign.minPriveTier] ?? 0;
  if (userLevel < requiredLevel) {
    return { userStatus: 'tier_insufficient', userSubmissionStatus: null };
  }

  // Check expired
  if (new Date() > new Date(campaign.validTo)) {
    return { userStatus: 'expired', userSubmissionStatus: null };
  }

  // Check submission
  const submission = await PriveSubmission.findOne({
    campaignId: campaign._id,
    userId,
  }).lean();

  if (submission) {
    if (submission.status === 'approved') {
      return { userStatus: 'approved', userSubmissionStatus: 'approved' };
    }
    if (submission.status === 'rejected') {
      return { userStatus: 'rejected', userSubmissionStatus: 'rejected' };
    }
    if (submission.status === 'pending') {
      return { userStatus: 'submitted', userSubmissionStatus: 'pending' };
    }
  }

  // Check if user joined (has submission record means joined)
  // If no submission, check slots
  const slotsRemaining = campaign.slots - (campaign.slotsUsed || 0);
  if (slotsRemaining <= 0) {
    return { userStatus: 'slots_full', userSubmissionStatus: null };
  }

  return { userStatus: 'eligible', userSubmissionStatus: null };
}

// ── Public API ──

/**
 * P3-01: List active campaigns with user-specific status
 */
export async function getActiveCampaigns(
  userId: string,
  filters: { status?: string; tier?: string; page?: number; limit?: number; type?: string }
): Promise<{ campaigns: any[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 50);
  const now = new Date();

  const query: any = {
    status: 'active',
    isActive: true,
    validFrom: { $lte: now },
    validTo: { $gte: now },
  };

  if (filters.tier) {
    query.minPriveTier = filters.tier;
  }

  const [campaigns, total] = await Promise.all([
    PriveCampaign.find(query)
      .sort({ validTo: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PriveCampaign.countDocuments(query),
  ]);

  // Get user tier for status enrichment
  let userTier = 'none';
  try {
    const access = await priveAccessService.checkAccess(userId);
    if (access.hasAccess) {
      userTier = access.effectiveTier;
    }
  } catch {
    // If prive access check fails, user gets 'none' tier
  }

  // Enrich with per-user status
  const enriched = await Promise.all(
    campaigns.map(async (c) => {
      const { userStatus, userSubmissionStatus } = await getUserStatusForCampaign(c, userId, userTier);
      const slotsRemaining = c.slots - (c.slotsUsed || 0);
      const endsInMs = new Date(c.validTo).getTime() - now.getTime();
      return {
        ...c,
        slotsRemaining,
        endsInHours: Math.max(0, Math.round(endsInMs / (1000 * 60 * 60))),
        userStatus,
        userSubmissionStatus,
      };
    })
  );

  return {
    campaigns: enriched,
    pagination: {
      page,
      limit,
      total,
      hasMore: page * limit < total,
    },
  };
}

/**
 * P3-02: Get single campaign detail with user status
 */
export async function getCampaignById(campaignId: string, userId: string): Promise<any> {
  const campaign = await PriveCampaign.findById(campaignId).lean();
  if (!campaign) return null;

  let userTier = 'none';
  try {
    const access = await priveAccessService.checkAccess(userId);
    if (access.hasAccess) userTier = access.effectiveTier;
  } catch { /* ignore */ }

  const { userStatus, userSubmissionStatus } = await getUserStatusForCampaign(campaign, userId, userTier);
  const slotsRemaining = campaign.slots - (campaign.slotsUsed || 0);
  const budgetRemaining = campaign.budget - (campaign.budgetUsed || 0);

  return {
    ...campaign,
    slotsRemaining,
    budgetRemaining,
    userStatus,
    userSubmissionStatus,
  };
}

/**
 * P3-03: Join a campaign (reserve a slot atomically)
 */
export async function joinCampaign(campaignId: string, userId: string) {
  // Check prive access
  const access = await priveAccessService.checkAccess(userId);
  if (!access.hasAccess) {
    return { error: 'PRIVE_ACCESS_REQUIRED', message: 'You need Privé access to join campaigns', status: 403 };
  }

  // Check campaign exists and is active
  const campaign = await PriveCampaign.findById(campaignId);
  if (!campaign || campaign.status !== 'active' || !campaign.isActive) {
    return { error: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found or inactive', status: 404 };
  }

  // Check tier
  const userLevel = TIER_LEVELS[access.effectiveTier] ?? 0;
  const requiredLevel = TIER_LEVELS[campaign.minPriveTier] ?? 0;
  if (userLevel < requiredLevel) {
    return { error: 'TIER_INSUFFICIENT', message: `Requires ${campaign.minPriveTier} tier or higher`, status: 400 };
  }

  // Check if expired
  if (new Date() > campaign.validTo) {
    return { error: 'CAMPAIGN_EXPIRED', message: 'This campaign has expired', status: 400 };
  }

  // Check if already joined (submission exists)
  const existing = await PriveSubmission.findOne({ campaignId, userId });
  if (existing) {
    return { error: 'ALREADY_JOINED', message: 'You have already joined this campaign', status: 400 };
  }

  // Atomic slot reservation: only succeed if slotsUsed < slots
  const updated = await PriveCampaign.findOneAndUpdate(
    {
      _id: campaignId,
      $expr: { $lt: ['$slotsUsed', '$slots'] },
    },
    { $inc: { slotsUsed: 1 } },
    { new: true }
  );

  if (!updated) {
    return { error: 'SLOTS_FULL', message: 'No slots remaining for this campaign', status: 400 };
  }

  return {
    success: true,
    data: {
      joined: true,
      campaignId,
      message: `You've joined! ${campaign.taskSteps?.[0] || 'Complete the task'} and post within the deadline.`,
      submissionDeadline: campaign.validTo,
    },
  };
}

/**
 * P3-04: Submit a social media post for a campaign
 */
export async function submitPost(
  campaignId: string,
  userId: string,
  data: { postUrl: string; postScreenshotUrl?: string; orderId?: string; notes?: string }
) {
  // Validate campaign
  const campaign = await PriveCampaign.findById(campaignId).lean();
  if (!campaign || campaign.status !== 'active') {
    return { error: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found or inactive', status: 404 };
  }

  if (new Date() > new Date(campaign.validTo)) {
    return { error: 'CAMPAIGN_EXPIRED', message: 'This campaign has expired', status: 400 };
  }

  // Check if already submitted
  const existing = await PriveSubmission.findOne({ campaignId, userId });
  if (existing) {
    return { error: 'ALREADY_SUBMITTED', message: 'You have already submitted for this campaign', status: 400 };
  }

  // Validate post URL (basic Instagram check)
  const urlRegex = /^https?:\/\/(www\.)?(instagram\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com)\//;
  if (!urlRegex.test(data.postUrl)) {
    return { error: 'POST_URL_INVALID', message: 'Please submit a valid social media post URL', status: 400 };
  }

  // Create submission
  const submission = await PriveSubmission.create({
    campaignId,
    userId,
    postUrl: data.postUrl,
    postScreenshotUrl: data.postScreenshotUrl || '',
    orderId: data.orderId || undefined,
    notes: data.notes || '',
    status: 'pending',
    submittedAt: new Date(),
  });

  // Award instant coins if campaign has coinAmount
  let coinsAlreadyEarned = 0;
  if (campaign.reward.coinAmount > 0) {
    try {
      await CoinTransaction.createTransaction(
        userId,
        'earned',
        campaign.reward.coinAmount,
        'prive_campaign',
        `Coins earned from campaign: ${campaign.title}`,
        {
          idempotencyKey: `prive-campaign-coins:${campaignId}:${userId}`,
          campaignId,
          referenceId: submission._id.toString(),
        }
      );
      coinsAlreadyEarned = campaign.reward.coinAmount;
      submission.coinsEarned = coinsAlreadyEarned;
      await submission.save();
    } catch (err) {
      logger.error('[PriveCampaign] Error awarding coins on submission:', err);
    }
  }

  const pendingCashback = Math.min(
    (campaign.reward.cashbackPercent / 100) * campaign.requirements.minPurchaseAmount,
    campaign.reward.cashbackCap
  );

  return {
    success: true,
    data: {
      submission: {
        _id: submission._id,
        campaignId,
        status: 'pending',
        submittedAt: submission.submittedAt,
        estimatedReviewTime: '24-48 hours',
        coinsAlreadyEarned,
        pendingCashback,
      },
    },
    message: "Post submitted! We'll review within 24-48 hours and credit your cashback.",
  };
}

/**
 * P3-05: Get user's submission status for a campaign
 */
export async function getSubmissionStatus(campaignId: string, userId: string) {
  const submission = await PriveSubmission.findOne({ campaignId, userId })
    .populate('campaignId', 'title merchantName reward')
    .lean();

  if (!submission) return null;

  const campaign = submission.campaignId as any;
  return {
    submission: {
      _id: submission._id,
      campaignId: campaign?._id || campaignId,
      campaignTitle: campaign?.title || '',
      status: submission.status,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      cashbackIssued: submission.status === 'approved',
      cashbackAmount: submission.cashbackIssued,
      coinsEarned: submission.coinsEarned,
      postUrl: submission.postUrl,
      reviewerNote: submission.reviewerNote,
    },
  };
}

/**
 * P3-06 (campaign-specific): Get user's Privé campaign earnings
 */
export async function getCampaignEarnings(
  userId: string,
  page: number = 1,
  limit: number = 20,
  month?: string
) {
  const matchFilter: any = {
    user: new mongoose.Types.ObjectId(userId),
    source: 'prive_campaign',
  };

  if (month) {
    // month = "2026-03"
    const [year, m] = month.split('-').map(Number);
    matchFilter.createdAt = {
      $gte: new Date(year, m - 1, 1),
      $lt: new Date(year, m, 1),
    };
  }

  const [transactions, total, summaryResult] = await Promise.all([
    CoinTransaction.find(matchFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CoinTransaction.countDocuments(matchFilter),
    CoinTransaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), source: 'prive_campaign' } },
      {
        $group: {
          _id: null,
          totalCoinsEarned: { $sum: { $cond: [{ $in: ['$type', ['earned', 'bonus']] }, '$amount', 0] } },
          campaignsCompleted: { $addToSet: '$metadata.campaignId' },
        },
      },
    ]),
  ]);

  // Get pending cashback from pending submissions
  const pendingSubmissions = await PriveSubmission.find({ userId, status: 'pending' })
    .populate('campaignId', 'reward')
    .lean();

  let pendingCashback = 0;
  for (const sub of pendingSubmissions) {
    const campaign = sub.campaignId as any;
    if (campaign?.reward) {
      pendingCashback += Math.min(
        (campaign.reward.cashbackPercent / 100) * (campaign.reward.cashbackCap || 0),
        campaign.reward.cashbackCap
      );
    }
  }

  const summary = summaryResult[0] || { totalCoinsEarned: 0, campaignsCompleted: [] };

  // Build month total
  let thisMonth = 0;
  if (month) {
    thisMonth = transactions.reduce((acc, t) => {
      if (t.type === 'earned' || t.type === 'bonus') return acc + t.amount;
      return acc;
    }, 0);
  }

  return {
    summary: {
      totalCashbackEarned: 0, // Cashback tracked separately, placeholder
      totalCoinsEarned: summary.totalCoinsEarned,
      campaignsCompleted: summary.campaignsCompleted?.length || 0,
      pendingCashback,
      thisMonth,
    },
    earnings: transactions.map((t: any) => ({
      _id: t._id,
      type: 'campaign_cashback',
      campaignTitle: t.description?.replace('Coins earned from campaign: ', '') || '',
      merchantName: '',
      cashbackAmount: t.type === 'earned' ? t.amount : 0,
      coinsAmount: t.amount,
      status: 'credited',
      creditedAt: t.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      hasMore: page * limit < total,
    },
  };
}

/**
 * Approve a submission — credit cashback + coins atomically
 */
export async function approveSubmission(
  submissionId: string,
  reviewerId: string,
  note?: string
) {
  const submission = await PriveSubmission.findById(submissionId);
  if (!submission) {
    return { error: 'NOT_FOUND', message: 'Submission not found', status: 404 };
  }
  if (submission.status !== 'pending') {
    return { error: 'INVALID_STATUS', message: `Submission is already ${submission.status}`, status: 400 };
  }

  const campaign = await PriveCampaign.findById(submission.campaignId);
  if (!campaign) {
    return { error: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found', status: 404 };
  }

  const cashbackAmount = Math.min(
    (campaign.reward.cashbackPercent / 100) * campaign.requirements.minPurchaseAmount,
    campaign.reward.cashbackCap
  );

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Credit cashback as coins
    if (cashbackAmount > 0) {
      await CoinTransaction.createTransaction(
        submission.userId.toString(),
        'earned',
        cashbackAmount,
        'prive_campaign',
        `Cashback from Privé campaign: ${campaign.title}`,
        {
          idempotencyKey: `prive-campaign-cashback:${submission.campaignId}:${submission.userId}`,
          campaignId: submission.campaignId.toString(),
          submissionId: submission._id.toString(),
        },
        null,
        session
      );
    }

    // Update campaign budget
    await PriveCampaign.findByIdAndUpdate(
      campaign._id,
      { $inc: { budgetUsed: cashbackAmount } },
      { session }
    );

    // Update submission
    submission.status = 'approved';
    submission.reviewedAt = new Date();
    submission.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
    submission.reviewerNote = note || '';
    submission.cashbackIssued = cashbackAmount;
    await submission.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    logger.error('[PriveCampaign] approveSubmission transaction failed:', err);
    throw err;
  } finally {
    await session.endSession();
  }

  return {
    success: true,
    data: {
      submissionId: submission._id,
      status: 'approved',
      cashbackIssued: cashbackAmount,
      coinsIssued: submission.coinsEarned,
      userId: submission.userId,
      notificationSent: true,
    },
  };
}

/**
 * Reject a submission
 */
export async function rejectSubmission(
  submissionId: string,
  reviewerId: string,
  reason: string,
  note?: string
) {
  const submission = await PriveSubmission.findById(submissionId);
  if (!submission) {
    return { error: 'NOT_FOUND', message: 'Submission not found', status: 404 };
  }
  if (submission.status !== 'pending') {
    return { error: 'INVALID_STATUS', message: `Submission is already ${submission.status}`, status: 400 };
  }

  submission.status = 'rejected';
  submission.reviewedAt = new Date();
  submission.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
  submission.reviewerNote = note || '';
  submission.rejectionReason = reason as any;
  await submission.save();

  // Release slot back
  await PriveCampaign.findByIdAndUpdate(submission.campaignId, {
    $inc: { slotsUsed: -1 },
  });

  return {
    success: true,
    data: {
      submissionId: submission._id,
      status: 'rejected',
      reason,
    },
  };
}

/**
 * Merchant: Get campaigns for merchant's stores
 */
export async function getMerchantCampaigns(
  merchantId: string,
  storeIds: string[],
  page: number = 1,
  limit: number = 20
): Promise<{ campaigns: any[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }> {
  const objectIds = storeIds.map((id) => new mongoose.Types.ObjectId(id));
  const filter: any = { merchantId: { $in: objectIds } };

  const [campaigns, total] = await Promise.all([
    PriveCampaign.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PriveCampaign.countDocuments(filter),
  ]);

  // Enrich with submission stats
  const enriched = await Promise.all(
    campaigns.map(async (c) => {
      const [pending, approved, rejected, reachResult] = await Promise.all([
        PriveSubmission.countDocuments({ campaignId: c._id, status: 'pending' }),
        PriveSubmission.countDocuments({ campaignId: c._id, status: 'approved' }),
        PriveSubmission.countDocuments({ campaignId: c._id, status: 'rejected' }),
        PriveSubmission.aggregate([
          { $match: { campaignId: c._id, status: 'approved' } },
          { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              totalReach: { $sum: { $ifNull: ['$user.profile.socialFollowers', 0] } },
            },
          },
        ]),
      ]);

      return {
        ...c,
        slotsRemaining: c.slots - (c.slotsUsed || 0),
        budgetRemaining: c.budget - (c.budgetUsed || 0),
        submissionsPending: pending,
        submissionsApproved: approved,
        submissionsRejected: rejected,
        totalReach: reachResult[0]?.totalReach || 0,
        avgEngagement: 0, // Placeholder — would need post analytics integration
      };
    })
  );

  return {
    campaigns: enriched,
    pagination: { page, limit, total, hasMore: page * limit < total },
  };
}

/**
 * Merchant: Create a new campaign
 */
export async function createMerchantCampaign(
  merchantId: string,
  storeId: string,
  storeName: string,
  storeLogo: string,
  data: any
) {
  const campaign = await PriveCampaign.create({
    merchantId: storeId,
    merchantName: storeName,
    merchantLogo: storeLogo,
    title: data.title,
    description: data.description,
    taskType: data.taskType,
    taskSteps: data.taskSteps || [],
    requirements: data.requirements || {},
    reward: data.reward,
    slots: data.slots,
    budget: data.budget,
    validFrom: new Date(data.validFrom),
    validTo: new Date(data.validTo),
    minPriveTier: data.minPriveTier || 'entry',
    status: 'pending_approval',
    examplePosts: data.examplePosts || [],
  });

  return {
    campaign: {
      _id: campaign._id,
      status: 'pending_approval',
      message: 'Campaign submitted for admin approval. Usually takes 24 hours.',
    },
  };
}

/**
 * Merchant/Admin: Get submissions list
 */
export async function getSubmissions(
  filters: {
    campaignId?: string;
    merchantStoreIds?: string[];
    status?: string;
    page?: number;
    limit?: number;
  }
) {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 50);
  const query: any = {};

  if (filters.status) query.status = filters.status;

  if (filters.campaignId) {
    query.campaignId = filters.campaignId;
  } else if (filters.merchantStoreIds?.length) {
    const campaigns = await PriveCampaign.find({
      merchantId: { $in: filters.merchantStoreIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).select('_id').lean();
    query.campaignId = { $in: campaigns.map((c) => c._id) };
  }

  const [submissions, total, statsResult] = await Promise.all([
    PriveSubmission.find(query)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'fullName phoneNumber profile.avatar profile.socialFollowers')
      .populate('campaignId', 'title merchantName reward')
      .lean(),
    PriveSubmission.countDocuments(query),
    PriveSubmission.aggregate([
      { $match: filters.campaignId ? { campaignId: new mongoose.Types.ObjectId(filters.campaignId) } : {} },
      {
        $group: {
          _id: null,
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approvedToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'approved'] },
                    { $gte: ['$reviewedAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          rejectedToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'rejected'] },
                    { $gte: ['$reviewedAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalPendingCashback: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$cashbackIssued', 0] },
          },
        },
      },
    ]),
  ]);

  const stats = statsResult[0] || { pending: 0, approvedToday: 0, rejectedToday: 0, totalPendingCashback: 0 };

  // Enrich submissions with user details
  const enriched = submissions.map((s: any) => {
    const user = s.userId as any;
    const campaign = s.campaignId as any;
    return {
      _id: s._id,
      userId: user?._id,
      userName: user?.fullName || 'Unknown',
      userAvatar: user?.profile?.avatar || '',
      userFollowers: user?.profile?.socialFollowers || 0,
      userTier: '', // Would need access check per user — omit for perf
      campaignId: campaign?._id,
      campaignTitle: campaign?.title || '',
      merchantName: campaign?.merchantName || '',
      postUrl: s.postUrl,
      postScreenshotUrl: s.postScreenshotUrl,
      submittedAt: s.submittedAt,
      status: s.status,
      estimatedCashback: s.cashbackIssued || 0,
      fraudScore: s.fraudScore,
      autoFlags: s.autoFlags,
    };
  });

  return {
    submissions: enriched,
    stats,
    pagination: { page, limit, total, hasMore: page * limit < total },
  };
}

export default {
  getActiveCampaigns,
  getCampaignById,
  joinCampaign,
  submitPost,
  getSubmissionStatus,
  getCampaignEarnings,
  approveSubmission,
  rejectSubmission,
  getMerchantCampaigns,
  createMerchantCampaign,
  getSubmissions,
};
