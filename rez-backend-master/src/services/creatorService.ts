import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { CreatorProfile, ICreatorProfile, CreatorTier } from '../models/CreatorProfile';
import { CreatorPick, ICreatorPick } from '../models/CreatorPick';
import { CreatorConversion } from '../models/CreatorConversion';
import { User } from '../models/User';
import { Video } from '../models/Video';
import { Product } from '../models/Product';
import Follow from '../models/Follow';
import { Store } from '../models/Store';
import EarningConfig, { ICreatorProgramConfig } from '../models/EarningConfig';
import { awardCoins } from './coinService';
import redisService from './redisService';
import merchantNotificationService from './merchantNotificationService';
import { escapeRegex } from '../utils/sanitize';

// ============================================
// CACHE KEYS
// ============================================

const CACHE_KEYS = {
  programConfig: 'creator:program:config',
  featuredCreators: (limit: number) => `creator:featured:${limit}`,
  trendingPicks: (limit: number, category?: string) => `creator:trending:${limit}:${category || 'all'}`,
  creatorProfile: (userId: string) => `creator:profile:${userId}`,
  creatorPicks: (creatorId: string, limit: number) => `creator:picks:${creatorId}:${limit}`,
  pickDetail: (pickId: string) => `creator:pick:${pickId}`,
  allCreators: (params: string) => `creator:all:${params}`,
};

// ============================================
// CONFIG HELPERS
// ============================================

const DEFAULT_CONFIG: ICreatorProgramConfig = {
  enabled: true,
  defaultCommissionRate: 5,
  tierRates: { starter: 2, bronze: 3, silver: 5, gold: 7, platinum: 10 },
  minPicksForTier: { bronze: 10, silver: 50, gold: 200, platinum: 500 },
  coinsPerConversion: 10,
  maxDailyEarnings: 5000,
  pendingPeriodDays: 7,
  attributionWindowHours: 24,
  autoApproveCreators: false,
  minFollowersToApply: 0,
  minVideosToApply: 1,
  featuredCreatorLimit: 6,
  trendingPickLimit: 20,
  trendingAlgorithm: 'hybrid',
};

async function getCreatorConfig(): Promise<ICreatorProgramConfig> {
  const cached = await redisService.get<ICreatorProgramConfig>(CACHE_KEYS.programConfig);
  if (cached) return cached;

  const config = await EarningConfig.findOne().lean();
  const programConfig = config?.creatorProgram || DEFAULT_CONFIG;

  await redisService.set(CACHE_KEYS.programConfig, programConfig, 300);
  return programConfig;
}

function getCommissionRate(tier: CreatorTier, config: ICreatorProgramConfig, overrideRate?: number): number {
  if (overrideRate !== undefined && overrideRate !== null) return overrideRate;
  return config.tierRates[tier] || config.defaultCommissionRate;
}

// ============================================
// CREATOR APPLICATION
// ============================================

export async function applyAsCreator(
  userId: string,
  data: {
    displayName: string;
    bio: string;
    category: string;
    tags?: string[];
    socialLinks?: { platform: string; url: string }[];
  }
): Promise<ICreatorProfile> {
  const config = await getCreatorConfig();

  if (!config.enabled) {
    throw new Error('Creator program is currently disabled');
  }

  // Check if already applied
  // NOTE: Cannot use .lean() — rejected re-applications call .save() below
  const existing = await CreatorProfile.findOne({ user: userId });
  if (existing) {
    if (existing.status === 'approved') throw new Error('You are already an approved creator');
    if (existing.status === 'pending') throw new Error('Your application is already under review');
    if (existing.status === 'rejected') {
      // Allow re-application if rejected more than 30 days ago
      const daysSinceRejection = (Date.now() - existing.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceRejection < 30) {
        throw new Error(`You can re-apply after ${Math.ceil(30 - daysSinceRejection)} days`);
      }
      // Update existing profile for re-application
      existing.status = 'pending';
      existing.displayName = data.displayName;
      existing.bio = data.bio;
      existing.category = data.category as any;
      existing.tags = data.tags || [];
      existing.socialLinks = data.socialLinks || [];
      existing.applicationDate = new Date();
      existing.rejectionReason = undefined;
      await existing.save();
      return existing;
    }
  }

  // Get user info for avatar
  const user = await User.findById(userId)
    .select('profile.avatar profile.firstName profile.lastName')
    .lean() as any;

  if (!user) throw new Error('User not found');

  // Check eligibility
  if (config.minVideosToApply > 0) {
    const videoCount = await Video.countDocuments({
      creator: userId,
      isPublished: true,
    });
    if (videoCount < config.minVideosToApply) {
      throw new Error(`You need at least ${config.minVideosToApply} published video(s) to apply`);
    }
  }

  if (config.minFollowersToApply > 0) {
    const followerCount = await Follow.countDocuments({ following: userId });
    if (followerCount < config.minFollowersToApply) {
      throw new Error(`You need at least ${config.minFollowersToApply} follower(s) to apply`);
    }
  }

  const profile = await CreatorProfile.create({
    user: userId,
    status: config.autoApproveCreators ? 'approved' : 'pending',
    applicationDate: new Date(),
    approvedDate: config.autoApproveCreators ? new Date() : undefined,
    displayName: data.displayName,
    bio: data.bio,
    avatar: user.profile?.avatar || '',
    category: data.category,
    tags: data.tags || [],
    socialLinks: data.socialLinks || [],
    tier: 'starter',
  });

  return profile;
}

// ============================================
// CREATOR APPROVAL / REJECTION
// ============================================

export async function approveCreator(creatorProfileId: string, adminId: string): Promise<ICreatorProfile> {
  const profile = await CreatorProfile.findById(creatorProfileId);
  if (!profile) throw new Error('Creator profile not found');
  if (profile.status === 'approved') throw new Error('Creator is already approved');
  if (profile.status === 'suspended') throw new Error('Cannot approve a suspended creator. Unsuspend first.');

  profile.status = 'approved';
  profile.approvedDate = new Date();
  profile.approvedBy = new mongoose.Types.ObjectId(adminId);
  await profile.save();

  // Invalidate caches
  await redisService.del(CACHE_KEYS.creatorProfile(profile.user.toString()));

  return profile;
}

export async function rejectCreator(
  creatorProfileId: string,
  adminId: string,
  reason: string
): Promise<ICreatorProfile> {
  const profile = await CreatorProfile.findById(creatorProfileId);
  if (!profile) throw new Error('Creator profile not found');

  profile.status = 'rejected';
  profile.rejectedBy = new mongoose.Types.ObjectId(adminId);
  profile.rejectionReason = reason;
  await profile.save();

  await redisService.del(CACHE_KEYS.creatorProfile(profile.user.toString()));

  return profile;
}

export async function suspendCreator(creatorProfileId: string, adminId: string, reason: string): Promise<ICreatorProfile> {
  const profile = await CreatorProfile.findById(creatorProfileId);
  if (!profile) throw new Error('Creator profile not found');

  profile.status = 'suspended';
  profile.suspendedBy = new mongoose.Types.ObjectId(adminId);
  profile.suspensionReason = reason;
  await profile.save();

  // Unpublish all picks
  await CreatorPick.updateMany(
    { creator: creatorProfileId, isPublished: true },
    { isPublished: false }
  );

  await redisService.del(CACHE_KEYS.creatorProfile(profile.user.toString()));

  // Invalidate featured cache in case creator was featured
  for (let i = 1; i <= 20; i++) {
    await redisService.del(CACHE_KEYS.featuredCreators(i));
  }

  return profile;
}

export async function unsuspendCreator(creatorProfileId: string, adminId: string): Promise<ICreatorProfile> {
  const profile = await CreatorProfile.findById(creatorProfileId);
  if (!profile) throw new Error('Creator profile not found');
  if (profile.status !== 'suspended') throw new Error('Creator is not suspended');

  profile.status = 'approved';
  profile.approvedBy = new mongoose.Types.ObjectId(adminId);
  profile.approvedDate = new Date();
  await profile.save();

  // Remove suspension fields from DB
  await CreatorProfile.updateOne(
    { _id: profile._id },
    { $unset: { suspensionReason: 1, suspendedBy: 1 } }
  );

  await redisService.del(CACHE_KEYS.creatorProfile(profile.user.toString()));
  return profile;
}

// ============================================
// CREATOR PROFILE
// ============================================

export async function getCreatorProfileByUserId(userId: string): Promise<ICreatorProfile | null> {
  const cached = await redisService.get<any>(CACHE_KEYS.creatorProfile(userId));
  if (cached) return cached;

  const profile = await CreatorProfile.findOne({ user: userId })
    .populate('user', 'profile.firstName profile.lastName profile.avatar auth.isVerified')
    .lean();

  if (profile) {
    await redisService.set(CACHE_KEYS.creatorProfile(userId), profile, 600);
  }

  return profile as unknown as ICreatorProfile | null;
}

export async function updateCreatorProfile(
  userId: string,
  updates: Partial<Pick<ICreatorProfile, 'displayName' | 'bio' | 'avatar' | 'coverImage' | 'tags' | 'socialLinks'>>
): Promise<ICreatorProfile> {
  const profile = await CreatorProfile.findOne({ user: userId });
  if (!profile) throw new Error('Creator profile not found');
  if (profile.status !== 'approved') throw new Error('Only approved creators can update their profile');

  // Validate & sanitize URLs
  const urlRegex = /^https?:\/\/.+/i;
  const dangerousProtocol = /^(javascript|data|file|vbscript):/i;

  if (updates.avatar) {
    if (dangerousProtocol.test(updates.avatar) || !urlRegex.test(updates.avatar) || updates.avatar.length > 2048) {
      throw new Error('Invalid avatar URL');
    }
  }
  if (updates.coverImage) {
    if (dangerousProtocol.test(updates.coverImage) || !urlRegex.test(updates.coverImage) || updates.coverImage.length > 2048) {
      throw new Error('Invalid cover image URL');
    }
  }
  if (updates.socialLinks && Array.isArray(updates.socialLinks)) {
    for (const link of updates.socialLinks) {
      if (link.url && (dangerousProtocol.test(link.url) || !urlRegex.test(link.url))) {
        throw new Error(`Invalid URL for social link: ${link.platform}`);
      }
    }
  }

  // Sanitize text fields
  if (updates.displayName) {
    updates.displayName = updates.displayName.replace(/<[^>]*>/g, '').trim().substring(0, 50);
  }
  if (updates.bio) {
    updates.bio = updates.bio.replace(/<[^>]*>/g, '').trim().substring(0, 500);
  }

  Object.assign(profile, updates);
  await profile.save();

  await redisService.del(CACHE_KEYS.creatorProfile(userId));
  return profile;
}

// ============================================
// FEATURED CREATORS
// ============================================

export async function getFeaturedCreators(limit: number = 6): Promise<{
  creators: any[];
  total: number;
}> {
  const cacheKey = CACHE_KEYS.featuredCreators(limit);
  const cached = await redisService.get<any>(cacheKey);
  if (cached) return cached;

  // First try featured creators (admin-curated)
  let creators = await CreatorProfile.find({
    status: 'approved',
    isFeatured: true,
  })
    .sort({ featuredOrder: 1 })
    .limit(limit)
    .populate('user', 'profile.firstName profile.lastName profile.avatar auth.isVerified')
    .lean();

  // Fallback: top creators by views
  if (creators.length < limit) {
    const featuredIds = creators.map(c => c._id);
    const additional = await CreatorProfile.find({
      status: 'approved',
      _id: { $nin: featuredIds },
    })
      .sort({ 'stats.totalViews': -1 })
      .limit(limit - creators.length)
      .populate('user', 'profile.firstName profile.lastName profile.avatar auth.isVerified')
      .lean();

    creators = [...creators, ...additional];
  }

  const formattedCreators = creators.map((c: any) => ({
    id: (c.user?._id || c.user)?.toString(),
    profileId: c._id?.toString(),
    name: c.displayName || `${c.user?.profile?.firstName || ''} ${c.user?.profile?.lastName || ''}`.trim() || 'Creator',
    avatar: c.avatar || c.user?.profile?.avatar || '',
    bio: c.bio || '',
    verified: c.isVerified || c.user?.auth?.isVerified || false,
    rating: Math.min(5, Math.max(1, (c.stats?.engagementRate || 50) / 20)),
    totalPicks: c.stats?.totalPicks || 0,
    totalViews: c.stats?.totalViews || 0,
    totalLikes: c.stats?.totalLikes || 0,
    followers: c.stats?.totalFollowers || 0,
    tier: c.tier,
    category: c.category,
  }));

  const result = { creators: formattedCreators, total: formattedCreators.length };
  await redisService.set(cacheKey, result, 300);
  return result;
}

// ============================================
// ALL CREATORS (with filters)
// ============================================

export async function getApprovedCreators(params: {
  limit?: number;
  page?: number;
  category?: string;
  sort?: string;
  search?: string;
}): Promise<{ creators: any[]; total: number; page: number; totalPages: number }> {
  const { limit = 20, page = 1, category, sort = 'trending', search } = params;

  const cacheKey = CACHE_KEYS.allCreators(`${page}:${limit}:${category || 'all'}:${sort}:${search || ''}`);
  const cached = await redisService.get<any>(cacheKey);
  if (cached) return cached;

  const query: any = { status: 'approved' };
  if (category && category !== 'all') {
    query.category = category;
  }
  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [
      { displayName: { $regex: escaped, $options: 'i' } },
      { bio: { $regex: escaped, $options: 'i' } },
      { tags: { $regex: escaped, $options: 'i' } },
    ];
  }

  let sortObj: any = {};
  switch (sort) {
    case 'followers': sortObj = { 'stats.totalFollowers': -1 }; break;
    case 'rating': sortObj = { 'stats.engagementRate': -1 }; break;
    case 'newest': sortObj = { createdAt: -1 }; break;
    case 'trending':
    default: sortObj = { 'stats.totalViews': -1, 'stats.totalConversions': -1 }; break;
  }

  const skip = (page - 1) * limit;
  const [creators, total] = await Promise.all([
    CreatorProfile.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate('user', 'profile.firstName profile.lastName profile.avatar auth.isVerified')
      .lean(),
    CreatorProfile.countDocuments(query),
  ]);

  const formattedCreators = creators.map((c: any) => ({
    id: (c.user?._id || c.user)?.toString(),
    profileId: c._id?.toString(),
    name: c.displayName || `${c.user?.profile?.firstName || ''} ${c.user?.profile?.lastName || ''}`.trim() || 'Creator',
    avatar: c.avatar || c.user?.profile?.avatar || '',
    bio: c.bio || '',
    verified: c.isVerified || c.user?.auth?.isVerified || false,
    rating: Math.min(5, Math.max(1, (c.stats?.engagementRate || 50) / 20)),
    totalPicks: c.stats?.totalPicks || 0,
    totalViews: c.stats?.totalViews || 0,
    followers: c.stats?.totalFollowers || 0,
    tier: c.tier,
    category: c.category,
    tags: c.tags || [],
    isFeatured: c.isFeatured,
  }));

  const result = {
    creators: formattedCreators,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };

  await redisService.set(cacheKey, result, 180);
  return result;
}

// ============================================
// TRENDING PICKS
// ============================================

export async function getTrendingPicks(
  limit: number = 10,
  category?: string
): Promise<{ picks: any[]; total: number }> {
  const cacheKey = CACHE_KEYS.trendingPicks(limit, category);
  const cached = await redisService.get<any>(cacheKey);
  if (cached) return cached;

  const query: any = {
    isPublished: true,
    moderationStatus: 'approved',
    status: 'approved',
  };

  // Category filter on creator profile
  let creatorIds: string[] | undefined;
  if (category && category !== 'all') {
    const creatorsInCategory = await CreatorProfile.find(
      { status: 'approved', category },
      { _id: 1 }
    ).lean();
    creatorIds = creatorsInCategory.map(c => c._id.toString());
    query.creator = { $in: creatorIds };
  }

  const picks = await CreatorPick.find(query)
    .sort({ trendingScore: -1, 'engagement.views': -1 })
    .limit(limit)
    .populate('product', 'name pricing images brand tags')
    .populate('store', 'name logo')
    .populate({
      path: 'creator',
      select: 'user displayName avatar isVerified tier',
      populate: {
        path: 'user',
        select: 'profile.firstName profile.lastName profile.avatar auth.isVerified',
      },
    })
    .lean();

  const formattedPicks = picks.map((pick: any) => {
    const product = pick.product;
    const creator = pick.creator;
    return {
      id: pick._id,
      title: pick.title,
      productImage: pick.image || product?.images?.[0] || '',
      productPrice: product?.pricing?.selling || product?.pricing?.original || 0,
      productBrand: product?.brand || '',
      productId: product?._id?.toString() || null,
      tag: pick.tags?.[0] ? `#${pick.tags[0]}` : '#trending',
      views: pick.engagement?.views || 0,
      purchases: pick.conversions?.totalPurchases || 0,
      likes: pick.engagement?.likes?.length || 0,
      clicks: pick.engagement?.clicks || 0,
      trendingScore: pick.trendingScore || 0,
      commissionRate: pick.commissionRate,
      estimatedCoins: Math.max(1, Math.round((product?.pricing?.selling || 0) * (pick.commissionRate / 100))),
      videoUrl: pick.videoUrl || undefined,
      store: pick.store ? {
        id: (pick.store as any)._id?.toString() || pick.store?.toString(),
        name: (pick.store as any).name || '',
        logo: (pick.store as any).logo || '',
      } : null,
      creator: creator ? {
        id: (creator.user?._id || creator.user)?.toString(),
        profileId: creator._id?.toString(),
        name: creator.displayName || `${creator.user?.profile?.firstName || ''} ${creator.user?.profile?.lastName || ''}`.trim(),
        avatar: creator.avatar || creator.user?.profile?.avatar || '',
        verified: creator.isVerified || creator.user?.auth?.isVerified || false,
        tier: creator.tier,
      } : null,
    };
  });

  const result = { picks: formattedPicks, total: formattedPicks.length };
  await redisService.set(cacheKey, result, 300);
  return result;
}

// ============================================
// SINGLE PICK
// ============================================

export async function getPickById(pickId: string): Promise<any | null> {
  const cacheKey = CACHE_KEYS.pickDetail(pickId);
  const cached = await redisService.get<any>(cacheKey);
  if (cached) return cached;

  const pick = await CreatorPick.findById(pickId)
    .populate('product', 'name pricing images brand tags description')
    .populate('store', 'name logo')
    .populate({
      path: 'creator',
      select: 'user displayName avatar bio isVerified tier stats category',
      populate: {
        path: 'user',
        select: 'profile.firstName profile.lastName profile.avatar auth.isVerified',
      },
    })
    .lean() as any;

  if (!pick) return null;

  const product = pick.product;
  const creator = pick.creator;

  const result = {
    id: pick._id,
    title: pick.title,
    description: pick.description || '',
    productImage: pick.image || product?.images?.[0] || '',
    productPrice: product?.pricing?.selling || product?.pricing?.original || 0,
    productBrand: product?.brand || '',
    productId: product?._id,
    tag: pick.tags?.[0] ? `#${pick.tags[0]}` : '#trending',
    tags: pick.tags || [],
    views: pick.engagement?.views || 0,
    purchases: pick.conversions?.totalPurchases || 0,
    likes: pick.engagement?.likes?.length || 0,
    shares: pick.engagement?.shares || 0,
    clicks: pick.engagement?.clicks || 0,
    commissionRate: pick.commissionRate,
    estimatedCoins: Math.max(1, Math.round((product?.pricing?.selling || 0) * (pick.commissionRate / 100))),
    videoUrl: pick.videoUrl || undefined,
    creator: creator ? {
      id: (creator.user?._id || creator.user)?.toString(),
      profileId: creator._id?.toString(),
      name: creator.displayName || `${creator.user?.profile?.firstName || ''} ${creator.user?.profile?.lastName || ''}`.trim(),
      avatar: creator.avatar || creator.user?.profile?.avatar || '',
      verified: creator.isVerified || creator.user?.auth?.isVerified || false,
      tier: creator.tier,
      bio: creator.bio || '',
      category: creator.category,
      stats: creator.stats,
    } : null,
    store: pick.store ? {
      id: (pick.store as any)._id?.toString(),
      name: (pick.store as any).name,
      logo: (pick.store as any).logo,
    } : null,
    createdAt: pick.createdAt,
  };

  await redisService.set(cacheKey, result, 300);
  return result;
}

// ============================================
// CREATOR PICKS MANAGEMENT
// ============================================

export async function submitPick(
  userId: string,
  data: {
    productId: string;
    title: string;
    description?: string;
    image?: string;
    videoUrl?: string;
    tags?: string[];
    videoId?: string;
  }
): Promise<ICreatorPick> {
  const profile = await CreatorProfile.findOne({ user: userId, status: 'approved' }).lean();
  if (!profile) throw new Error('You must be an approved creator to submit picks');

  const config = await getCreatorConfig();

  // Verify product exists
  const product = await Product.findById(data.productId).select('store').lean() as any;
  if (!product) throw new Error('Product not found');

  const commissionRate = getCommissionRate(profile.tier, config, profile.commissionRate);

  // Check if product's store has a merchant — if so, route through merchant approval first
  let pickStatus: string = 'pending_review';
  let merchantApproval: any = undefined;
  const storeId = product?.store;

  if (storeId) {
    const store = await Store.findById(storeId).select('merchantId name').lean() as any;
    if (store?.merchantId) {
      pickStatus = 'pending_merchant';
      merchantApproval = {
        status: 'pending',
        merchantId: store.merchantId,
        storeId: store._id,
      };
    }
  }

  const pick = await CreatorPick.create({
    creator: profile._id,
    product: data.productId,
    store: storeId || undefined,
    video: data.videoId || undefined,
    title: data.title,
    description: data.description || '',
    image: data.image || '',
    videoUrl: data.videoUrl || undefined,
    tags: data.tags || [],
    commissionRate,
    status: pickStatus,
    moderationStatus: 'pending',
    isPublished: false,
    ...(merchantApproval ? { merchantApproval } : {}),
  });

  // Notify merchant if pick requires their approval
  if (merchantApproval) {
    try {
      const productDoc = await Product.findById(data.productId).select('name').lean() as any;
      await merchantNotificationService.notifyNewCreatorPick({
        merchantId: merchantApproval.merchantId.toString(),
        storeId: merchantApproval.storeId.toString(),
        pickTitle: data.title,
        creatorName: profile.displayName,
        productName: productDoc?.name || 'Unknown Product',
        pickId: (pick._id as any).toString(),
      });
    } catch (err) {
      logger.error('[CreatorService] Failed to notify merchant about new pick:', err);
    }
  }

  return pick;
}

export async function getMyPicks(
  userId: string,
  params: { limit?: number; page?: number; status?: string } = {}
): Promise<{ picks: any[]; total: number }> {
  const { limit = 20, page = 1, status } = params;

  const profile = await CreatorProfile.findOne({ user: userId }).lean();
  if (!profile) return { picks: [], total: 0 };

  const query: any = { creator: profile._id };
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [picks, total] = await Promise.all([
    CreatorPick.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('product', 'name pricing images brand')
      .lean(),
    CreatorPick.countDocuments(query),
  ]);

  const formattedPicks = picks.map((pick: any) => ({
    id: pick._id,
    title: pick.title,
    productImage: pick.image || pick.product?.images?.[0] || '',
    productPrice: pick.product?.pricing?.selling || 0,
    productBrand: pick.product?.brand || '',
    tags: pick.tags,
    views: pick.engagement?.views || 0,
    likes: pick.engagement?.likes?.length || 0,
    clicks: pick.engagement?.clicks || 0,
    purchases: pick.conversions?.totalPurchases || 0,
    earnings: pick.conversions?.totalCommissionEarned || 0,
    videoUrl: pick.videoUrl || undefined,
    status: pick.status,
    moderationStatus: pick.moderationStatus,
    isPublished: pick.isPublished,
    createdAt: pick.createdAt,
    merchantApproval: pick.merchantApproval ? {
      status: pick.merchantApproval.status,
      rejectionReason: pick.merchantApproval.rejectionReason,
      reward: pick.merchantApproval.reward ? {
        type: pick.merchantApproval.reward.type,
        amount: pick.merchantApproval.reward.amount,
      } : undefined,
    } : undefined,
  }));

  return { picks: formattedPicks, total };
}

export async function getCreatorPicksByProfileId(
  creatorProfileId: string,
  limit: number = 10
): Promise<{ picks: any[]; total: number }> {
  const cacheKey = CACHE_KEYS.creatorPicks(creatorProfileId, limit);
  const cached = await redisService.get<any>(cacheKey);
  if (cached) return cached;

  const [picks, total] = await Promise.all([
    CreatorPick.find({
      creator: creatorProfileId,
      isPublished: true,
      moderationStatus: 'approved',
      status: 'approved',
    })
      .sort({ 'engagement.views': -1 })
      .limit(limit)
      .populate('product', 'name pricing images brand tags')
      .lean(),
    CreatorPick.countDocuments({
      creator: creatorProfileId,
      isPublished: true,
      moderationStatus: 'approved',
      status: 'approved',
    }),
  ]);

  const formattedPicks = picks.map((pick: any) => ({
    id: pick._id,
    title: pick.title,
    productImage: pick.image || pick.product?.images?.[0] || '',
    productPrice: pick.product?.pricing?.selling || pick.product?.pricing?.original || 0,
    productBrand: pick.product?.brand || '',
    tag: pick.tags?.[0] ? `#${pick.tags[0]}` : '#picks',
    views: pick.engagement?.views || 0,
    purchases: pick.conversions?.totalPurchases || 0,
    likes: pick.engagement?.likes?.length || 0,
    videoUrl: pick.videoUrl || undefined,
  }));

  const result = { picks: formattedPicks, total };
  await redisService.set(cacheKey, result, 300);
  return result;
}

// ============================================
// DELETE / UPDATE MY PICKS
// ============================================

export async function deleteMyPick(
  userId: string,
  pickId: string
): Promise<{ deleted: boolean; archived: boolean }> {
  const profile = await CreatorProfile.findOne({ user: userId }).lean();
  if (!profile) throw new Error('Creator profile not found');

  const pick = await CreatorPick.findById(pickId);
  if (!pick) throw new Error('Pick not found');

  // Verify ownership
  if (pick.creator.toString() !== (profile._id as any).toString()) {
    throw new Error('You can only delete your own picks');
  }

  // For approved/published picks: archive instead of hard delete
  if (pick.status === 'approved' || pick.isPublished) {
    pick.status = 'archived' as any;
    pick.isPublished = false;
    await pick.save();

    // Decrement stats if was published
    if (profile.stats?.totalPicks && profile.stats.totalPicks > 0) {
      await CreatorProfile.updateOne(
        { _id: profile._id },
        { $inc: { 'stats.totalPicks': -1 } }
      );
    }

    // Invalidate caches
    await redisService.del(CACHE_KEYS.creatorProfile(userId));
    await redisService.del(CACHE_KEYS.pickDetail(pickId));
    for (let i = 1; i <= 50; i++) {
      await redisService.del(CACHE_KEYS.trendingPicks(i));
    }

    return { deleted: true, archived: true };
  }

  // For draft/rejected/archived/pending picks: hard delete
  if (['draft', 'rejected', 'archived', 'pending_review', 'pending_merchant'].includes(pick.status)) {
    await CreatorPick.deleteOne({ _id: pickId });

    await redisService.del(CACHE_KEYS.pickDetail(pickId));
    return { deleted: true, archived: false };
  }

  throw new Error('Cannot delete this pick in its current status');
}

export async function updateMyPick(
  userId: string,
  pickId: string,
  updates: {
    title?: string;
    description?: string;
    tags?: string[];
    image?: string;
    videoUrl?: string;
  }
): Promise<ICreatorPick> {
  const profile = await CreatorProfile.findOne({ user: userId }).lean();
  if (!profile) throw new Error('Creator profile not found');

  const pick = await CreatorPick.findById(pickId);
  if (!pick) throw new Error('Pick not found');

  // Verify ownership
  if (pick.creator.toString() !== (profile._id as any).toString()) {
    throw new Error('You can only edit your own picks');
  }

  // Only allow updates for draft or rejected picks
  if (!['draft', 'rejected'].includes(pick.status)) {
    throw new Error('Can only edit picks in draft or rejected status');
  }

  // Sanitize text fields
  if (updates.title) {
    updates.title = updates.title.replace(/<[^>]*>/g, '').trim().substring(0, 200);
    if (!updates.title) throw new Error('Title cannot be empty');
  }
  if (updates.description) {
    updates.description = updates.description.replace(/<[^>]*>/g, '').trim().substring(0, 2000);
  }

  // Apply updates
  if (updates.title) pick.title = updates.title;
  if (updates.description !== undefined) pick.description = updates.description;
  if (updates.tags) pick.tags = updates.tags;
  if (updates.image) pick.image = updates.image;
  if (updates.videoUrl !== undefined) pick.videoUrl = updates.videoUrl;

  // If was rejected, reset to draft so creator can resubmit
  if (pick.status === 'rejected') {
    pick.status = 'draft' as any;
    pick.moderationStatus = 'pending';
    pick.rejectionReason = undefined;
  }

  await pick.save();

  await redisService.del(CACHE_KEYS.pickDetail(pickId));
  return pick;
}

// ============================================
// EARNINGS
// ============================================

export async function getMyEarnings(userId: string): Promise<{
  totalEarnings: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  totalConversions: number;
  merchantRewards: number;
  tier: string;
  commissionRate: number;
  recentConversions: any[];
}> {
  const profile = await CreatorProfile.findOne({ user: userId }).lean();
  if (!profile) {
    return {
      totalEarnings: 0,
      pendingEarnings: 0,
      thisMonthEarnings: 0,
      totalConversions: 0,
      merchantRewards: 0,
      tier: 'starter',
      commissionRate: 2,
      recentConversions: [],
    };
  }

  const config = await getCreatorConfig();
  const commissionRate = getCommissionRate(profile.tier as CreatorTier, config, profile.commissionRate);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalPaid, pendingConversions, monthlyConversions, recentConversions, merchantRewards, monthlyMerchantRewards] = await Promise.all([
    CreatorConversion.aggregate([
      { $match: { creator: profile._id, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]),
    CreatorConversion.aggregate([
      { $match: { creator: profile._id, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]),
    CreatorConversion.aggregate([
      { $match: { creator: profile._id, status: 'paid', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]),
    CreatorConversion.find({ creator: profile._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('product', 'name images')
      .populate('buyer', 'profile.firstName profile.lastName')
      .lean(),
    // Merchant approval rewards (coins given when merchant approves a pick)
    CreatorPick.aggregate([
      { $match: { creator: profile._id, 'merchantApproval.status': 'approved', 'merchantApproval.reward': { $exists: true } } },
      { $group: { _id: null, total: { $sum: '$merchantApproval.reward.amount' } } },
    ]),
    // Monthly merchant rewards
    CreatorPick.aggregate([
      { $match: { creator: profile._id, 'merchantApproval.status': 'approved', 'merchantApproval.reward': { $exists: true }, 'merchantApproval.reward.awardedAt': { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$merchantApproval.reward.amount' } } },
    ]),
  ]);

  const totalMerchantRewards = merchantRewards[0]?.total || 0;
  const monthlyMerchantRewardTotal = monthlyMerchantRewards[0]?.total || 0;

  return {
    totalEarnings: (totalPaid[0]?.total || 0) + totalMerchantRewards,
    pendingEarnings: pendingConversions[0]?.total || 0,
    thisMonthEarnings: (monthlyConversions[0]?.total || 0) + monthlyMerchantRewardTotal,
    totalConversions: profile.stats?.totalConversions || 0,
    merchantRewards: totalMerchantRewards,
    tier: profile.tier,
    commissionRate,
    recentConversions: recentConversions.map((c: any) => ({
      id: c._id,
      product: c.product?.name || 'Unknown Product',
      productImage: c.product?.images?.[0] || '',
      buyer: c.buyer
        ? `${c.buyer?.profile?.firstName || ''} ${c.buyer?.profile?.lastName || ''}`.trim()
        : 'Anonymous',
      amount: c.purchaseAmount,
      commission: c.commissionAmount,
      status: c.status,
      createdAt: c.createdAt,
    })),
  };
}

// ============================================
// ELIGIBILITY CHECK
// ============================================

export async function checkEligibility(userId: string): Promise<{
  eligible: boolean;
  requirements: {
    label: string;
    met: boolean;
    current: number;
    required: number;
  }[];
  existingProfile?: {
    status: string;
    rejectionReason?: string;
  };
}> {
  const config = await getCreatorConfig();

  if (!config.enabled) {
    return {
      eligible: false,
      requirements: [{ label: 'Creator program is currently disabled', met: false, current: 0, required: 1 }],
    };
  }

  const existing = await CreatorProfile.findOne({ user: userId }).lean();
  if (existing) {
    return {
      eligible: existing.status === 'rejected',
      requirements: [],
      existingProfile: {
        status: existing.status,
        rejectionReason: existing.rejectionReason,
      },
    };
  }

  const [videoCount, followerCount] = await Promise.all([
    Video.countDocuments({ creator: userId, isPublished: true }),
    Follow.countDocuments({ following: userId }),
  ]);

  const requirements = [];

  if (config.minVideosToApply > 0) {
    requirements.push({
      label: 'Published videos',
      met: videoCount >= config.minVideosToApply,
      current: videoCount,
      required: config.minVideosToApply,
    });
  }

  if (config.minFollowersToApply > 0) {
    requirements.push({
      label: 'Followers',
      met: followerCount >= config.minFollowersToApply,
      current: followerCount,
      required: config.minFollowersToApply,
    });
  }

  const eligible = requirements.every(r => r.met);

  return { eligible, requirements };
}

// ============================================
// CONVERSION PROCESSING
// ============================================

export async function processConversion(
  pickId: string,
  orderId: string,
  buyerId: string,
  purchaseAmount: number,
  ipAddress?: string,
  deviceFingerprint?: string
): Promise<void> {
  const pick = await CreatorPick.findById(pickId)
    .populate('creator', 'user tier commissionRate')
    .lean() as any;

  if (!pick) return;

  const creator = pick.creator;
  if (!creator) return;

  // Anti-fraud: self-purchase check
  if (creator.user.toString() === buyerId) {
    logger.info(`[CREATOR] Self-purchase blocked: creator=${creator.user}, buyer=${buyerId}`);
    return;
  }

  // Check for duplicate conversion
  const existingConversion = await CreatorConversion.findOne({ order: orderId, pick: pickId }).lean();
  if (existingConversion) {
    logger.info(`[CREATOR] Duplicate conversion blocked: order=${orderId}, pick=${pickId}`);
    return;
  }

  const config = await getCreatorConfig();

  // Check daily earnings cap
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEarnings = await CreatorConversion.aggregate([
    {
      $match: {
        creator: creator._id,
        createdAt: { $gte: todayStart },
        status: { $ne: 'cancelled' },
      },
    },
    { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
  ]);

  const commissionRate = getCommissionRate(creator.tier, config, creator.commissionRate);
  const commissionAmount = Math.round(purchaseAmount * (commissionRate / 100));

  if ((todayEarnings[0]?.total || 0) + commissionAmount > config.maxDailyEarnings) {
    logger.info(`[CREATOR] Daily earnings cap reached for creator=${creator._id}`);
    return;
  }

  // Create conversion
  await CreatorConversion.create({
    pick: pickId,
    creator: creator._id,
    buyer: buyerId,
    order: orderId,
    product: pick.product,
    purchaseAmount,
    commissionRate,
    commissionAmount,
    status: 'pending',
    purchaseTimestamp: new Date(),
    attributionWindowHours: config.attributionWindowHours,
    ipAddress,
    deviceFingerprint,
  });

  // Update pick conversion stats atomically
  await CreatorPick.updateOne(
    { _id: pickId },
    {
      $inc: {
        'conversions.totalPurchases': 1,
        'conversions.totalRevenue': purchaseAmount,
        'conversions.totalCommissionEarned': commissionAmount,
      },
    }
  );
}

// ============================================
// CONFIRM PENDING CONVERSIONS (Background Job)
// ============================================

export async function confirmPendingConversions(): Promise<{ confirmed: number; failed: number }> {
  const config = await getCreatorConfig();
  const cutoffDate = new Date(Date.now() - config.pendingPeriodDays * 24 * 60 * 60 * 1000);

  // Get IDs of eligible conversions (lightweight query)
  const pendingIds = await CreatorConversion.find({
    status: 'pending',
    createdAt: { $lte: cutoffDate },
  })
    .select('_id')
    .limit(100)
    .lean();

  let confirmed = 0;
  let failed = 0;

  for (const { _id } of pendingIds) {
    try {
      // Atomically claim the conversion to prevent double-credit
      const conversion = await CreatorConversion.findOneAndUpdate(
        { _id, status: 'pending' },
        { $set: { status: 'confirming' } },
        { new: true }
      ).populate('creator', 'user');

      if (!conversion) {
        // Already claimed by another job run — skip
        continue;
      }

      const creator = conversion.creator as any;
      const userId = creator?.user?.toString();

      if (!userId) {
        // Revert to pending so it can be retried
        await CreatorConversion.updateOne({ _id }, { $set: { status: 'pending' } });
        failed++;
        continue;
      }

      // Award coins
      const coinTx = await awardCoins(
        userId,
        conversion.commissionAmount,
        'creator_commission',
        `Creator commission for pick conversion (${conversion.commissionRate}%)`,
        {
          pickId: conversion.pick.toString(),
          orderId: conversion.order.toString(),
          conversionId: _id.toString(),
        }
      );

      // Finalize as paid
      conversion.status = 'paid';
      conversion.paidAt = new Date();
      conversion.coinTransactionId = coinTx._id;
      conversion.statusHistory.push({
        status: 'paid',
        timestamp: new Date(),
        reason: 'Auto-confirmed after pending period',
      });
      await conversion.save();

      confirmed++;
    } catch (error: any) {
      logger.error(`[CREATOR] Error confirming conversion ${_id}:`, error.message);
      // Revert to pending so it can be retried next run
      try {
        await CreatorConversion.updateOne({ _id, status: 'confirming' }, { $set: { status: 'pending' } });
      } catch (revertErr) { logger.warn('[Creator] Failed to revert conversion to pending', { conversionId: _id, error: (revertErr as Error).message }); }
      failed++;
    }
  }

  return { confirmed, failed };
}

// ============================================
// COMPUTE TRENDING SCORES (Background Job)
// ============================================

export async function computeTrendingScores(): Promise<number> {
  const picks = await CreatorPick.find({
    isPublished: true,
    moderationStatus: 'approved',
    status: 'approved',
  }).select('engagement conversions createdAt trendingScore').lean();

  const now = Date.now();
  let updated = 0;

  for (const pick of picks) {
    const ageInHours = Math.max(1, (now - pick.createdAt.getTime()) / (1000 * 60 * 60));
    const views = pick.engagement?.views || 0;
    const likes = pick.engagement?.likes?.length || 0;
    const shares = pick.engagement?.shares || 0;
    const conversions = pick.conversions?.totalPurchases || 0;
    const clicks = pick.engagement?.clicks || 0;

    // Hybrid trending formula with time decay
    const rawScore = views * 1 + likes * 5 + shares * 10 + conversions * 50 + clicks * 2;
    const trendingScore = Math.round((rawScore / Math.pow(ageInHours, 1.5)) * 1000);
    const isTrending = trendingScore > 100;

    if (pick.trendingScore !== trendingScore || pick.isTrending !== isTrending) {
      await CreatorPick.updateOne(
        { _id: pick._id },
        { trendingScore, isTrending }
      );
      updated++;
    }
  }

  return updated;
}

// ============================================
// REFRESH CREATOR STATS (Background Job)
// ============================================

export async function refreshCreatorStats(creatorProfileId?: string): Promise<number> {
  const query: any = { status: 'approved' };
  if (creatorProfileId) query._id = creatorProfileId;

  const profiles = await CreatorProfile.find(query).select('_id user').lean();
  let updated = 0;

  for (const profile of profiles) {
    try {
      const [pickStats, followerCount, conversionStats] = await Promise.all([
        CreatorPick.aggregate([
          { $match: { creator: profile._id, isPublished: true, moderationStatus: 'approved' } },
          {
            $group: {
              _id: null,
              totalPicks: { $sum: 1 },
              totalViews: { $sum: '$engagement.views' },
              totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
            },
          },
        ]),
        Follow.countDocuments({ following: profile.user }),
        CreatorConversion.aggregate([
          { $match: { creator: profile._id, status: 'paid' } },
          {
            $group: {
              _id: null,
              totalConversions: { $sum: 1 },
              totalEarnings: { $sum: '$commissionAmount' },
            },
          },
        ]),
      ]);

      const totalPicks = pickStats[0]?.totalPicks || 0;
      const totalViews = pickStats[0]?.totalViews || 0;
      const totalLikes = pickStats[0]?.totalLikes || 0;
      const totalConversions = conversionStats[0]?.totalConversions || 0;
      const totalEarnings = conversionStats[0]?.totalEarnings || 0;
      const engagementRate = totalViews > 0
        ? Math.round(((totalLikes + totalConversions * 5) / totalViews) * 100)
        : 0;

      await CreatorProfile.updateOne(
        { _id: profile._id },
        {
          $set: {
            'stats.totalPicks': totalPicks,
            'stats.totalViews': totalViews,
            'stats.totalLikes': totalLikes,
            'stats.totalFollowers': followerCount,
            'stats.totalConversions': totalConversions,
            'stats.totalEarnings': totalEarnings,
            'stats.engagementRate': engagementRate,
            'stats.lastUpdated': new Date(),
          },
        }
      );

      // Invalidate cache
      await redisService.del(CACHE_KEYS.creatorProfile(profile.user.toString()));
      updated++;
    } catch (error: any) {
      logger.error(`[CREATOR] Error refreshing stats for ${profile._id}:`, error.message);
    }
  }

  return updated;
}

// ============================================
// TIER CALCULATION (Background Job)
// ============================================

export async function calculateTiers(): Promise<number> {
  const config = await getCreatorConfig();
  const profiles = await CreatorProfile.find({ status: 'approved' })
    .select('_id tier stats.totalPicks').lean();

  let upgraded = 0;

  for (const profile of profiles) {
    const picks = profile.stats?.totalPicks || 0;
    let newTier: CreatorTier = 'starter';

    if (picks >= config.minPicksForTier.platinum) newTier = 'platinum';
    else if (picks >= config.minPicksForTier.gold) newTier = 'gold';
    else if (picks >= config.minPicksForTier.silver) newTier = 'silver';
    else if (picks >= config.minPicksForTier.bronze) newTier = 'bronze';

    if (profile.tier !== newTier) {
      await CreatorProfile.updateOne({ _id: profile._id }, { tier: newTier });
      upgraded++;
    }
  }

  return upgraded;
}

// ============================================
// PICK ENGAGEMENT TRACKING
// ============================================

export async function trackPickView(pickId: string, viewerUserId?: string): Promise<void> {
  // Don't count creator's own views
  if (viewerUserId) {
    const pick = await CreatorPick.findById(pickId).populate('creator', 'user').lean() as any;
    if (pick?.creator?.user?.toString() === viewerUserId) {
      return; // Skip self-views
    }
  }
  await CreatorPick.updateOne(
    { _id: pickId },
    { $inc: { 'engagement.views': 1 } }
  );
}

export async function trackPickClick(pickId: string, viewerUserId?: string): Promise<void> {
  // Don't count creator's own clicks
  if (viewerUserId) {
    const pick = await CreatorPick.findById(pickId).populate('creator', 'user').lean() as any;
    if (pick?.creator?.user?.toString() === viewerUserId) {
      return; // Skip self-clicks
    }
  }
  await CreatorPick.updateOne(
    { _id: pickId },
    { $inc: { 'engagement.clicks': 1 } }
  );
}

export async function togglePickLike(pickId: string, userId: string): Promise<boolean> {
  // NOTE: Cannot use .lean() — toggleLike is an instance method
  const pick = await CreatorPick.findById(pickId);
  if (!pick) throw new Error('Pick not found');
  return pick.toggleLike(new mongoose.Types.ObjectId(userId));
}

export async function togglePickBookmark(pickId: string, userId: string): Promise<boolean> {
  // NOTE: Cannot use .lean() — toggleBookmark is an instance method
  const pick = await CreatorPick.findById(pickId);
  if (!pick) throw new Error('Pick not found');
  return pick.toggleBookmark(new mongoose.Types.ObjectId(userId));
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

export async function getCreatorApplications(
  status?: string,
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{ applications: any[]; total: number }> {
  const query: any = {};
  if (status) query.status = status;
  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [
      { displayName: { $regex: escaped, $options: 'i' } },
      { bio: { $regex: escaped, $options: 'i' } },
      { category: { $regex: escaped, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [rawApplications, total] = await Promise.all([
    CreatorProfile.find(query)
      .sort({ applicationDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'profile.firstName profile.lastName profile.avatar phoneNumber email')
      .lean(),
    CreatorProfile.countDocuments(query),
  ]);

  // Flatten to match admin frontend expectations
  const applications = rawApplications.map((app: any) => ({
    ...app,
    id: app._id?.toString(),
    userId: app.user?._id?.toString() || '',
    avatar: app.avatar || app.user?.profile?.avatar || '',
  }));

  return { applications, total };
}

export async function toggleFeatured(creatorProfileId: string): Promise<boolean> {
  const profile = await CreatorProfile.findById(creatorProfileId);
  if (!profile) throw new Error('Creator profile not found');
  if (profile.status !== 'approved') throw new Error('Can only feature approved creators');

  profile.isFeatured = !profile.isFeatured;
  if (profile.isFeatured && !profile.featuredOrder) {
    const maxOrder = await CreatorProfile.findOne({ isFeatured: true })
      .sort({ featuredOrder: -1 })
      .select('featuredOrder')
      .lean();
    profile.featuredOrder = ((maxOrder as any)?.featuredOrder || 0) + 1;
  }

  await profile.save();

  // Invalidate featured cache
  for (let i = 1; i <= 20; i++) {
    await redisService.del(CACHE_KEYS.featuredCreators(i));
  }

  return profile.isFeatured;
}

export async function updateCreatorTier(creatorProfileId: string, tier: CreatorTier): Promise<void> {
  const profile = await CreatorProfile.findById(creatorProfileId);
  if (!profile) throw new Error('Creator profile not found');
  if (profile.status !== 'approved') throw new Error('Can only update tier for approved creators');

  profile.tier = tier;
  await profile.save();

  // Invalidate caches
  await redisService.del(CACHE_KEYS.creatorProfile(profile.user.toString()));
  for (let i = 1; i <= 20; i++) {
    await redisService.del(CACHE_KEYS.featuredCreators(i));
  }
}

export async function moderatePick(
  pickId: string,
  action: 'approve' | 'reject',
  adminId: string,
  reason?: string
): Promise<void> {
  const pick = await CreatorPick.findById(pickId);
  if (!pick) throw new Error('Pick not found');

  // Block admin from approving picks that haven't been merchant-reviewed yet
  if (action === 'approve' && pick.status === 'pending_merchant') {
    throw new Error('This pick is awaiting merchant approval first. The merchant must review it before admin moderation.');
  }

  if (action === 'approve') {
    pick.moderationStatus = 'approved';
    pick.status = 'approved';
    pick.isPublished = true;
    pick.moderatedBy = new mongoose.Types.ObjectId(adminId);
  } else {
    pick.moderationStatus = 'rejected';
    pick.status = 'rejected';
    pick.isPublished = false;
    pick.moderatedBy = new mongoose.Types.ObjectId(adminId);
    pick.rejectionReason = reason || 'Rejected by admin';
  }

  await pick.save();

  // Invalidate trending cache
  for (let i = 1; i <= 50; i++) {
    await redisService.del(CACHE_KEYS.trendingPicks(i));
  }
}

export async function getCreatorProgramStats(): Promise<{
  totalCreators: number;
  approvedCreators: number;
  pendingApplications: number;
  suspendedCreators: number;
  rejectedCreators: number;
  totalPicks: number;
  pendingPicks: number;
  merchantPendingPicks: number;
  totalConversions: number;
  totalCommissionPaid: number;
  creatorsByTier: Record<string, number>;
}> {
  const [
    approvedCreators,
    pendingApplications,
    suspendedCreators,
    rejectedCreators,
    totalPicks,
    pendingPicks,
    merchantPendingPicks,
    conversionStats,
    tierStats,
  ] = await Promise.all([
    CreatorProfile.countDocuments({ status: 'approved' }),
    CreatorProfile.countDocuments({ status: 'pending' }),
    CreatorProfile.countDocuments({ status: 'suspended' }),
    CreatorProfile.countDocuments({ status: 'rejected' }),
    CreatorPick.countDocuments({ isPublished: true, moderationStatus: 'approved' }),
    CreatorPick.countDocuments({ moderationStatus: 'pending' }),
    CreatorPick.countDocuments({ status: 'pending_merchant' }),
    CreatorConversion.aggregate([
      { $match: { status: 'paid' } },
      {
        $group: {
          _id: null,
          totalConversions: { $sum: 1 },
          totalCommissionPaid: { $sum: '$commissionAmount' },
        },
      },
    ]),
    CreatorProfile.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$tier', count: { $sum: 1 } } },
    ]),
  ]);

  const creatorsByTier: Record<string, number> = {};
  tierStats.forEach((t: any) => {
    creatorsByTier[t._id] = t.count;
  });

  const totalCreators = approvedCreators + pendingApplications + suspendedCreators + rejectedCreators;

  return {
    totalCreators,
    approvedCreators,
    pendingApplications,
    suspendedCreators,
    rejectedCreators,
    totalPicks,
    pendingPicks,
    merchantPendingPicks,
    totalConversions: conversionStats[0]?.totalConversions || 0,
    totalCommissionPaid: conversionStats[0]?.totalCommissionPaid || 0,
    creatorsByTier,
  };
}

// ============================================
// EXPORT
// ============================================

export default {
  applyAsCreator,
  approveCreator,
  rejectCreator,
  suspendCreator,
  unsuspendCreator,
  getCreatorProfileByUserId,
  updateCreatorProfile,
  getFeaturedCreators,
  getApprovedCreators,
  getTrendingPicks,
  getPickById,
  submitPick,
  getMyPicks,
  deleteMyPick,
  updateMyPick,
  getCreatorPicksByProfileId,
  getMyEarnings,
  checkEligibility,
  processConversion,
  confirmPendingConversions,
  computeTrendingScores,
  refreshCreatorStats,
  calculateTiers,
  trackPickView,
  trackPickClick,
  togglePickLike,
  togglePickBookmark,
  getCreatorApplications,
  toggleFeatured,
  updateCreatorTier,
  moderatePick,
  getCreatorProgramStats,
  getCreatorConfig,
};
