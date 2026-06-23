import { Request, Response } from 'express';
import creatorService from '../services/creatorService';
import {
  sendSuccess,
  sendNotFound,
  sendError,
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * Get featured creators
 * GET /api/creators/featured
 */
export const getFeaturedCreators = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 6 } = req.query;
  const result = await creatorService.getFeaturedCreators(Number(limit));
  return sendSuccess(res, result, 'Featured creators fetched');
});

/**
 * Get trending picks from all creators
 * GET /api/creators/trending-picks
 */
export const getTrendingPicks = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10, category } = req.query;
  const result = await creatorService.getTrendingPicks(Number(limit), category as string);
  return sendSuccess(res, result, 'Trending picks fetched');
});

/**
 * Get all approved creators with filters
 * GET /api/creators/all
 */
export const getAllCreators = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 20, page = 1, category, sort, search } = req.query;
  const result = await creatorService.getApprovedCreators({
    limit: Number(limit),
    page: Number(page),
    category: category as string,
    sort: sort as string,
    search: search as string,
  });
  return sendSuccess(res, result, 'Creators fetched');
});

/**
 * Get single pick detail
 * GET /api/creators/picks/:pickId
 */
export const getPickDetail = asyncHandler(async (req: Request, res: Response) => {
  const { pickId } = req.params;
  const pick = await creatorService.getPickById(pickId);
  if (!pick) return sendNotFound(res, 'Pick not found');
  return sendSuccess(res, pick, 'Pick fetched');
});

/**
 * Track pick view
 * POST /api/creators/picks/:pickId/view
 */
export const trackPickView = asyncHandler(async (req: Request, res: Response) => {
  const { pickId } = req.params;
  const viewerUserId = (req as any).user?.id || (req as any).user?._id;
  await creatorService.trackPickView(pickId, viewerUserId?.toString());
  return sendSuccess(res, null, 'View tracked');
});

/**
 * Track pick click (product link)
 * POST /api/creators/picks/:pickId/click
 */
export const trackPickClick = asyncHandler(async (req: Request, res: Response) => {
  const { pickId } = req.params;
  const viewerUserId = (req as any).user?.id || (req as any).user?._id;
  await creatorService.trackPickClick(pickId, viewerUserId?.toString());
  return sendSuccess(res, null, 'Click tracked');
});

/**
 * Toggle pick like
 * POST /api/creators/picks/:pickId/like
 */
export const togglePickLike = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const { pickId } = req.params;
  const isLiked = await creatorService.togglePickLike(pickId, userId);
  return sendSuccess(res, { isLiked }, isLiked ? 'Pick liked' : 'Pick unliked');
});

/**
 * Toggle pick bookmark
 * POST /api/creators/picks/:pickId/bookmark
 */
export const togglePickBookmark = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const { pickId } = req.params;
  const isBookmarked = await creatorService.togglePickBookmark(pickId, userId);
  return sendSuccess(res, { isBookmarked }, isBookmarked ? 'Pick bookmarked' : 'Bookmark removed');
});

/**
 * Get creator by user ID
 * GET /api/creators/:id
 */
export const getCreatorById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const profile = await creatorService.getCreatorProfileByUserId(id);
  if (!profile) return sendNotFound(res, 'Creator not found');
  return sendSuccess(res, profile, 'Creator fetched');
});

/**
 * Get creator's product picks
 * GET /api/creators/:id/picks
 */
export const getCreatorPicks = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = 10 } = req.query;

  // Find creator profile by user ID
  const profile = await creatorService.getCreatorProfileByUserId(id);
  if (!profile) return sendNotFound(res, 'Creator not found');

  const result = await creatorService.getCreatorPicksByProfileId(
    (profile as any)._id.toString(),
    Number(limit)
  );
  return sendSuccess(res, result, 'Creator picks fetched');
});

/**
 * Get creator's stats
 * GET /api/creators/:id/stats
 */
export const getCreatorStats = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const profile = await creatorService.getCreatorProfileByUserId(id);
  if (!profile) return sendNotFound(res, 'Creator not found');

  return sendSuccess(res, {
    videos: (profile as any).stats?.totalPicks || 0,
    views: (profile as any).stats?.totalViews || 0,
    likes: (profile as any).stats?.totalLikes || 0,
    shares: 0,
    comments: 0,
    engagementRate: (profile as any).stats?.engagementRate || 0,
    followers: (profile as any).stats?.totalFollowers || 0,
    following: 0,
  }, 'Creator stats fetched');
});

// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================

/**
 * Check creator eligibility
 * GET /api/creators/eligibility
 */
export const checkEligibility = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const result = await creatorService.checkEligibility(userId);
  return sendSuccess(res, result, 'Eligibility checked');
});

/**
 * Apply as creator
 * POST /api/creators/apply
 */
export const applyAsCreator = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const { displayName, bio, category, tags, socialLinks } = req.body;

  if (!displayName || !category) {
    return sendError(res, 'Display name and category are required', 400);
  }

  try {
    const profile = await creatorService.applyAsCreator(userId, {
      displayName,
      bio: bio || '',
      category,
      tags,
      socialLinks,
    });
    return sendSuccess(res, profile, 'Application submitted successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Get my creator profile
 * GET /api/creators/my-profile
 */
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const profile = await creatorService.getCreatorProfileByUserId(userId);
  if (!profile) return sendSuccess(res, null, 'No creator profile found');
  return sendSuccess(res, profile, 'Profile fetched');
});

/**
 * Update my creator profile
 * PUT /api/creators/my-profile
 */
export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const { displayName, bio, avatar, coverImage, tags, socialLinks } = req.body;

  try {
    const profile = await creatorService.updateCreatorProfile(userId, {
      displayName,
      bio,
      avatar,
      coverImage,
      tags,
      socialLinks,
    });
    return sendSuccess(res, profile, 'Profile updated');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Submit a new pick
 * POST /api/creators/picks
 */
export const submitPick = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const { productId, title, description, image, videoUrl, tags, videoId } = req.body;

  if (!productId || !title) {
    return sendError(res, 'Product ID and title are required', 400);
  }

  try {
    const pick = await creatorService.submitPick(userId, {
      productId,
      title,
      description,
      image,
      videoUrl,
      tags,
      videoId,
    });
    return sendSuccess(res, pick, 'Pick submitted for review');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Get my picks
 * GET /api/creators/my-picks
 */
export const getMyPicks = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const { limit = 20, page = 1, status } = req.query;
  const result = await creatorService.getMyPicks(userId, {
    limit: Number(limit),
    page: Number(page),
    status: status as string,
  });
  return sendSuccess(res, result, 'My picks fetched');
});

/**
 * Get my earnings
 * GET /api/creators/my-earnings
 */
export const getMyEarnings = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const result = await creatorService.getMyEarnings(userId);
  return sendSuccess(res, result, 'Earnings fetched');
});

/**
 * Delete my pick
 * DELETE /api/creators/my-picks/:pickId
 */
export const deleteMyPick = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const { pickId } = req.params;

  try {
    const result = await creatorService.deleteMyPick(userId, pickId);
    return sendSuccess(res, result, result.archived ? 'Pick archived' : 'Pick deleted');
  } catch (error: any) {
    const statusCode = error.message.includes('only delete your own') ? 403 : 400;
    return sendError(res, error.message, statusCode);
  }
});

/**
 * Update my pick
 * PATCH /api/creators/my-picks/:pickId
 */
export const updateMyPick = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return sendError(res, 'Authentication required', 401);

  const { pickId } = req.params;
  const { title, description, tags, image, videoUrl } = req.body;

  try {
    const pick = await creatorService.updateMyPick(userId, pickId, {
      title,
      description,
      tags,
      image,
      videoUrl,
    });
    return sendSuccess(res, pick, 'Pick updated');
  } catch (error: any) {
    const statusCode = error.message.includes('only edit your own') ? 403 : 400;
    return sendError(res, error.message, statusCode);
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get creator applications (admin)
 * GET /admin/creators
 */
export const adminGetCreators = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 20, search } = req.query;
  const result = await creatorService.getCreatorApplications(
    status as string,
    Number(page),
    Number(limit),
    search as string
  );
  return sendSuccess(res, result, 'Creator applications fetched');
});

/**
 * Approve creator (admin)
 * PATCH /admin/creators/:id/approve
 */
export const adminApproveCreator = asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id || (req as any).user?._id;
  const { id } = req.params;

  try {
    const profile = await creatorService.approveCreator(id, adminId);
    return sendSuccess(res, profile, 'Creator approved');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Reject creator (admin)
 * PATCH /admin/creators/:id/reject
 */
export const adminRejectCreator = asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id || (req as any).user?._id;
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const profile = await creatorService.rejectCreator(id, adminId, reason || 'Rejected by admin');
    return sendSuccess(res, profile, 'Creator rejected');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Toggle featured (admin)
 * PATCH /admin/creators/:id/feature
 */
export const adminToggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const isFeatured = await creatorService.toggleFeatured(id);
    return sendSuccess(res, { isFeatured }, isFeatured ? 'Creator featured' : 'Creator unfeatured');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Update creator tier (admin)
 * PATCH /admin/creators/:id/tier
 */
export const adminUpdateTier = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tier } = req.body;

  if (!['starter', 'bronze', 'silver', 'gold', 'platinum'].includes(tier)) {
    return sendError(res, 'Invalid tier', 400);
  }

  await creatorService.updateCreatorTier(id, tier);
  return sendSuccess(res, { tier }, 'Tier updated');
});

/**
 * Suspend creator (admin)
 * PATCH /admin/creators/:id/suspend
 */
export const adminSuspendCreator = asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id || (req as any).user?._id;
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const profile = await creatorService.suspendCreator(id, adminId, reason || 'Suspended by admin');
    return sendSuccess(res, profile, 'Creator suspended');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Unsuspend creator (admin)
 * PATCH /admin/creators/:id/unsuspend
 */
export const adminUnsuspendCreator = asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id || (req as any).user?._id;
  const { id } = req.params;

  try {
    const profile = await creatorService.unsuspendCreator(id, adminId);
    return sendSuccess(res, profile, 'Creator unsuspended');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Get creator program stats (admin)
 * GET /admin/creators/stats
 */
export const adminGetStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await creatorService.getCreatorProgramStats();
  return sendSuccess(res, stats, 'Creator program stats fetched');
});

/**
 * Get all picks for moderation (admin)
 * GET /admin/creators/picks
 */
export const adminGetPicks = asyncHandler(async (req: Request, res: Response) => {
  const { status = 'pending', page = 1, limit = 20 } = req.query;

  // Import CreatorPick model directly for admin queries
  const { CreatorPick } = require('../models/CreatorPick');

  const query: any = {};
  if (status !== 'all') query.moderationStatus = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [rawPicks, total] = await Promise.all([
    CreatorPick.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('product', 'name pricing images brand')
      .populate({
        path: 'creator',
        select: 'displayName avatar user',
        populate: { path: 'user', select: 'profile.firstName profile.lastName' },
      })
      .lean(),
    CreatorPick.countDocuments(query),
  ]);

  // Flatten populated data to match admin frontend expectations
  const picks = rawPicks.map((pick: any) => ({
    id: pick._id?.toString(),
    title: pick.title || '',
    productImage: pick.product?.images?.[0] || '',
    productPrice: pick.product?.pricing?.selling || pick.product?.pricing?.original || 0,
    productBrand: pick.product?.brand || '',
    creatorName: pick.creator?.displayName || '',
    creatorId: pick.creator?._id?.toString() || '',
    status: pick.status,
    moderationStatus: pick.moderationStatus,
    isPublished: pick.isPublished,
    views: pick.engagement?.views || 0,
    likes: Array.isArray(pick.engagement?.likes) ? pick.engagement.likes.length : 0,
    clicks: pick.engagement?.clicks || 0,
    purchases: pick.conversions?.totalPurchases || 0,
    trendingScore: pick.trendingScore || 0,
    createdAt: pick.createdAt,
  }));

  return sendSuccess(res, { picks, total }, 'Picks fetched');
});

/**
 * Moderate a pick (admin)
 * PATCH /admin/creators/picks/:pickId/moderate
 */
export const adminModeratePick = asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id || (req as any).user?._id;
  const { pickId } = req.params;
  const { action, reason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return sendError(res, 'Action must be approve or reject', 400);
  }

  try {
    await creatorService.moderatePick(pickId, action, adminId, reason);
    return sendSuccess(res, null, `Pick ${action}d`);
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Get creator program config (admin)
 * GET /admin/creators/config
 */
export const adminGetConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await creatorService.getCreatorConfig();
  return sendSuccess(res, config, 'Config fetched');
});

/**
 * Update creator program config (admin)
 * PUT /admin/creators/config
 */
export const adminUpdateConfig = asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id || (req as any).user?._id;

  const EarningConfig = require('../models/EarningConfig').default;

  let config = await EarningConfig.findOne();
  if (!config) {
    config = new EarningConfig({ updatedBy: adminId });
  }

  config.creatorProgram = { ...config.creatorProgram, ...req.body };
  config.updatedBy = adminId;
  await config.save();

  // Invalidate config cache
  const redisService = require('../services/redisService').default;
  await redisService.del('creator:program:config');

  return sendSuccess(res, config.creatorProgram, 'Config updated');
});

/**
 * Get conversions (admin)
 * GET /admin/creators/conversions
 */
export const adminGetConversions = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;

  const { CreatorConversion } = require('../models/CreatorConversion');

  const query: any = {};
  if (status && status !== 'all') query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [rawConversions, total] = await Promise.all([
    CreatorConversion.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('product', 'name images')
      .populate('buyer', 'profile.firstName profile.lastName')
      .populate({
        path: 'creator',
        select: 'displayName avatar user',
        populate: { path: 'user', select: 'profile.firstName profile.lastName' },
      })
      .lean(),
    CreatorConversion.countDocuments(query),
  ]);

  // Flatten populated data to match admin frontend expectations
  const conversions = rawConversions.map((conv: any) => ({
    id: conv._id?.toString(),
    pickTitle: conv.product?.name || 'Unknown Product',
    creatorName: conv.creator?.displayName || '',
    buyerName: conv.buyer
      ? `${conv.buyer.profile?.firstName || ''} ${conv.buyer.profile?.lastName || ''}`.trim()
      : 'Unknown',
    purchaseAmount: conv.purchaseAmount || 0,
    commissionAmount: conv.commissionAmount || 0,
    status: conv.status,
    createdAt: conv.createdAt,
  }));

  return sendSuccess(res, { conversions, total }, 'Conversions fetched');
});
