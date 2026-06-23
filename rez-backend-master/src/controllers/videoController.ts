import { Request, Response } from 'express';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { Video } from '../models/Video';
import { User } from '../models/User';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import achievementService from '../services/achievementService';
import gamificationEventBus from '../events/gamificationEventBus';
import { sendCreated } from '../utils/response';
import { escapeRegex } from '../utils/sanitize';
import redisService from '../services/redisService';
import { withCache } from '../utils/cacheHelper';

// Video cache TTLs (seconds)
const VIDEO_CACHE_TTL = {
  TRENDING: 5 * 60,    // 5 minutes — trending changes often
  LIST: 10 * 60,       // 10 minutes — general listing
  CATEGORY: 10 * 60,   // 10 minutes — category listing
  STORE: 5 * 60,       // 5 minutes — store videos
};

// Create a new video
export const createVideo = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    title,
    description,
    videoUrl,
    thumbnailUrl,
    category,
    contentType,
    associatedArticle,
    tags,
    products,
    duration,
    isPublic = true
  } = req.body;

  try {
    logger.info('🎥 [VIDEO] Creating video for user:', userId);

    // Validate required fields
    if (!title || !videoUrl) {
      return sendBadRequest(res, 'Title and video URL are required');
    }

    // Create new video
    const video = new Video({
      title,
      description: description || '',
      videoUrl,
      thumbnail: thumbnailUrl || '',
      creator: userId,
      contentType: contentType || 'ugc',
      category: category || 'general',
      associatedArticle: associatedArticle || undefined,
      tags: tags || [],
      hashtags: tags || [], // Use tags for hashtags as well
      products: products || [],
      stores: [], // Empty stores array for now
      isPublished: isPublic,
      isApproved: contentType === 'promotional' || contentType === 'merchant',
      isFeatured: false,
      isTrending: false,
      isSponsored: false,
      moderationStatus: (contentType === 'promotional' || contentType === 'merchant') ? 'approved' : 'pending',
      analytics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagement: 0
      },
      engagement: {
        views: 0,
        likes: [],
        shares: 0
      },
      metadata: {
        duration: duration || 0,
        fileSize: 0,
        resolution: '1080p',
        format: 'mp4',
        uploadedAt: new Date(),
        lastModified: new Date()
      },
      processing: {
        status: 'completed',
        progress: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        error: null
      }
    });

    await video.save();

    // Invalidate video caches so new video appears in listings
    const { CacheInvalidator } = await import('../utils/cacheHelper');
    CacheInvalidator.invalidateVideo(String(video._id)).catch((err) => logger.warn('[Video] Cache invalidation after video upload failed', { error: err.message }));

    // Emit gamification event for video creation
    gamificationEventBus.emit('video_created', {
      userId,
      entityId: String(video._id),
      entityType: 'video',
      source: { controller: 'videoController', action: 'createVideo' }
    });

    // Populate creator info for response
    await video.populate('creator', 'profile.firstName profile.lastName profile.avatar');

    sendCreated(res, {
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        thumbnail: video.thumbnail,
        category: video.category,
        tags: video.tags,
        duration: video.metadata.duration,
        isPublished: video.isPublished,
        creator: video.creator,
        analytics: video.analytics,
        createdAt: video.createdAt
      }
    }, 'Video created successfully');

  } catch (error) {
    logger.error('❌ [VIDEO] Create video error:', error);
    throw new AppError('Failed to create video', 500);
  }
});

// Get all videos with filtering
export const getVideos = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    creator,
    contentType,
    hasProducts,
    search,
    sortBy = 'newest',
    page = 1,
    limit = 20
  } = req.query;

  try {
    // Skip cache for search queries (too many permutations)
    const cacheKey = search ? null : `video:list:${category || 'all'}:${contentType || 'all'}:${sortBy}:${page}:${limit}`;

    if (cacheKey) {
      const cached = await redisService.get<any>(cacheKey);
      if (cached) {
        return sendSuccess(res, cached, 'Videos retrieved successfully');
      }
    }

    const query: any = {
      isPublished: true,
      isApproved: true,
      moderationStatus: 'approved'
    };

    // Apply filters
    if (category) query.category = category;
    if (creator) query.creator = creator;
    if (contentType) query.contentType = contentType;
    if (hasProducts === 'true') {
      query['products.0'] = { $exists: true };
    }
    if (search) {
      const escaped = escapeRegex(search as string);
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { tags: { $in: [new RegExp(escaped, 'i')] } }
      ];
    }

    // Sorting
    const sortOptions: any = {};
    switch (sortBy) {
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'popular':
        sortOptions['analytics.views'] = -1;
        break;
      case 'trending':
        sortOptions['analytics.engagement'] = -1;
        break;
      case 'likes':
        sortOptions['analytics.likes'] = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .populate({
          path: 'products',
          select: 'name images description price inventory rating category store',
          populate: {
            path: 'store',
            select: 'name slug logo'
          }
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Video.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    const result = {
      videos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    };

    // Cache non-search results
    if (cacheKey) {
      redisService.set(cacheKey, result, VIDEO_CACHE_TTL.LIST).catch((err) => logger.warn('[Video] Cache set for video list failed', { error: err.message }));
    }

    sendSuccess(res, result, 'Videos retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch videos', 500);
  }
});

// Get single video by ID
export const getVideoById = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const userId = req.userId;

  try {
    // First try to find the video - merchant videos don't need isPublished/isApproved
    const video = await Video.findById(videoId)
      .populate('creator', 'profile.firstName profile.lastName profile.avatar profile.bio')
      .populate('stores', 'name slug logo')
      .populate({
        path: 'products',
        select: 'name images description price pricing inventory rating category store',
        populate: {
          path: 'store',
          select: 'name slug logo'
        }
      })
      .slice('comments', -20) // Limit embedded comments to latest 20; use dedicated endpoint for full pagination
      .lean();

    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    // For UGC content (not merchant), check publish/approval status
    const videoData = video as any;
    if (videoData.contentType !== 'merchant' && (!videoData.isPublished || !videoData.isApproved)) {
      return sendNotFound(res, 'Video not available');
    }

    // NOTE: View count is NOT incremented here - use the dedicated /videos/:id/view endpoint
    // This prevents double-counting when just fetching video data

    // Get the first store from stores array (for merchant videos)
    const primaryStore = videoData.stores && videoData.stores.length > 0 ? videoData.stores[0] : null;

    // Get related videos (same store for merchant, same creator for UGC)
    let otherVideos: any[] = [];
    if (videoData.contentType === 'merchant' && primaryStore) {
      // For merchant videos, get other videos from the same store
      otherVideos = await Video.find({
        stores: primaryStore._id || primaryStore,
        _id: { $ne: videoId },
        contentType: 'merchant'
      })
      .populate('stores', 'name slug logo')
      .limit(10)
      .sort({ createdAt: -1 })
      .lean();
    } else if (videoData.creator) {
      // For UGC, get other videos from the same creator
      otherVideos = await Video.find({
        creator: videoData.creator._id || videoData.creator,
        _id: { $ne: videoId },
        isPublished: true
      })
      .populate('creator', 'profile.firstName profile.lastName profile.avatar')
      .limit(10)
      .sort({ createdAt: -1 })
      .lean();
    }

    // Check if authenticated user has liked/bookmarked this video
    let userLiked = false;
    let userBookmarked = false;

    if (userId) {
      // Check likedBy array
      if (videoData.likedBy && Array.isArray(videoData.likedBy)) {
        userLiked = videoData.likedBy.some((id: any) => id && id.toString() === userId);
      }
      // Also check engagement.likes array (legacy)
      if (!userLiked && videoData.engagement?.likes && Array.isArray(videoData.engagement.likes)) {
        userLiked = videoData.engagement.likes.some((id: any) => id && id.toString() === userId);
      }

      // Check bookmarkedBy array
      if (videoData.bookmarkedBy && Array.isArray(videoData.bookmarkedBy)) {
        userBookmarked = videoData.bookmarkedBy.some((id: any) => id && id.toString() === userId);
      }
    }

    // Transform video to API response format
    const responseVideo = {
      id: videoData._id,
      title: videoData.title,
      description: videoData.description,
      videoUrl: videoData.videoUrl,
      thumbnail: videoData.thumbnail, // Use correct field name
      duration: videoData.metadata?.duration || 0,
      contentType: videoData.contentType,
      creator: videoData.creator ? {
        id: videoData.creator._id,
        name: videoData.creator.profile
          ? `${videoData.creator.profile.firstName || ''} ${videoData.creator.profile.lastName || ''}`.trim()
          : 'User',
        avatar: videoData.creator.profile?.avatar,
      } : primaryStore ? {
        id: primaryStore._id,
        name: primaryStore.name || 'Store',
        avatar: primaryStore.logo,
      } : null,
      metrics: {
        views: videoData.analytics?.totalViews || videoData.engagement?.views || 0,
        likes: videoData.analytics?.likes || (videoData.likedBy?.length || videoData.engagement?.likes?.length || 0),
        comments: videoData.analytics?.comments || videoData.engagement?.comments || 0,
        shares: videoData.analytics?.shares || videoData.engagement?.shares || 0,
      },
      engagement: {
        liked: userLiked,
        bookmarked: userBookmarked,
      },
      tags: videoData.tags || [],
      relatedProducts: (videoData.products || []).map((p: any) => ({
        id: p._id,
        name: p.name,
        price: p.pricing?.currentPrice || p.price || 0,
        thumbnail: p.images?.[0]?.url || p.images?.[0],
      })),
      createdAt: videoData.createdAt,
    };

    sendSuccess(res, {
      video: responseVideo,
      otherVideos: otherVideos.map((v: any) => ({
        id: v._id,
        title: v.title,
        thumbnail: v.thumbnail,
        duration: v.metadata?.duration || 0,
        views: v.analytics?.totalViews || v.engagement?.views || 0,
      })),
      isLiked: userLiked,
      isFollowing: false
    }, 'Video retrieved successfully');

  } catch (error) {
    logger.error('Error fetching video:', error);
    throw new AppError('Failed to fetch video', 500);
  }
});

// Get videos by category
export const getVideosByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const { page = 1, limit = 20, sortBy = 'newest' } = req.query;

  try {
    const cacheKey = `video:category:${category}:${sortBy}:${page}:${limit}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return sendSuccess(res, cached, `Videos in category "${category}" retrieved successfully`);
    }

    const query = {
      category,
      isPublished: true,
      isApproved: true
    };

    const sortOptions: any = {};
    switch (sortBy) {
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'popular':
        sortOptions['analytics.views'] = -1;
        break;
      case 'trending':
        sortOptions['analytics.engagement'] = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .populate({
          path: 'products',
          select: 'name images description price inventory rating category store',
          populate: {
            path: 'store',
            select: 'name slug logo'
          }
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Video.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    const result = {
      videos,
      category,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    };

    redisService.set(cacheKey, result, VIDEO_CACHE_TTL.CATEGORY).catch((err) => logger.warn('[Video] Cache set for category videos failed', { error: err.message }));

    sendSuccess(res, result, `Videos in category "${category}" retrieved successfully`);

  } catch (error) {
    throw new AppError('Failed to fetch videos by category', 500);
  }
});

// Get trending videos
export const getTrendingVideos = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 20, timeframe = '7d' } = req.query;
  const userId = req.userId; // From optional auth middleware

  try {
    // Cache the base data (without user-specific isLiked)
    const cacheKey = `video:trending:${timeframe}:${limit}`;
    let videos: any[] | null = await redisService.get<any[]>(cacheKey);

    if (!videos) {
      // Calculate date for timeframe
      const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : 30;

      // Progressive timeframe fallback: try requested -> 30d -> all-time
      const timeframes = [days, 30, null]; // null = no date filter
      videos = [];

      for (const tf of timeframes) {
        const query: any = { isPublished: true, isApproved: true };
        if (tf !== null) {
          const sinceDate = new Date();
          sinceDate.setDate(sinceDate.getDate() - tf);
          query.createdAt = { $gte: sinceDate };
        }

        videos = await Video.find(query)
          .populate('creator', 'profile.firstName profile.lastName profile.avatar username')
          .populate({
            path: 'products',
            select: 'name images description pricing inventory rating category store',
            populate: {
              path: 'store',
              select: 'name slug logo _id'
            }
          })
          .populate('stores', 'name slug logo _id')
          .sort({
            isTrending: -1,
            'analytics.engagement': -1,
            'analytics.views': -1,
            createdAt: -1
          })
          .limit(Number(limit))
          .lean();

        if (videos.length > 0) break;
      }

      // Cache raw data for 5 minutes
      redisService.set(cacheKey, videos, VIDEO_CACHE_TTL.TRENDING).catch((err) => logger.warn('[Video] Cache set for trending videos failed', { error: err.message }));
    }

    // Transform videos to include isLiked status and flatten data (per-user, not cached)
    const transformedVideos = videos.map((video: any) => {
      const isLiked = userId && video.engagement?.likes
        ? video.engagement.likes.some((likeId: any) => likeId.toString() === userId)
        : false;

      const store = video.stores?.[0] || video.products?.[0]?.store || null;

      return {
        ...video,
        id: video._id,
        isLiked,
        likesCount: video.engagement?.likes?.length || 0,
        commentsCount: video.engagement?.comments || 0,
        sharesCount: video.engagement?.shares || 0,
        viewsCount: video.engagement?.views || 0,
        store: store ? {
          id: store._id,
          name: store.name,
          slug: store.slug,
          logo: store.logo
        } : null,
        storeId: store?._id || null,
        storeName: store?.name || null
      };
    });

    sendSuccess(res, transformedVideos, 'Trending videos retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch trending videos', 500);
  }
});

// Get videos by creator
export const getVideosByCreator = asyncHandler(async (req: Request, res: Response) => {
  const { creatorId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    const creator = await User.findById(creatorId).select('profile.firstName profile.lastName profile.avatar profile.bio').lean();
    
    if (!creator) {
      return sendNotFound(res, 'Creator not found');
    }

    const query = { 
      creator: creatorId, 
      isPublished: true 
    };

    const skip = (Number(page) - 1) * Number(limit);

    const videos = await Video.find(query)
      .populate('creator', 'profile.firstName profile.lastName profile.avatar')
      .populate({
        path: 'products',
        select: 'name images description price inventory rating category store',
        populate: {
          path: 'store',
          select: 'name slug logo'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Video.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    // Get creator stats
    const creatorStats = await Video.aggregate([
      { $match: { creator: creator._id, isPublished: true, isApproved: true } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: '$analytics.views' },
          totalLikes: { $sum: '$analytics.likes' },
          averageViews: { $avg: '$analytics.views' }
        }
      }
    ]);

    sendSuccess(res, {
      creator,
      videos,
      stats: creatorStats[0] || { totalVideos: 0, totalViews: 0, totalLikes: 0, averageViews: 0 },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Creator videos retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch creator videos', 500);
  }
});

// Like/Unlike video (atomic — prevents race conditions and double-likes)
export const toggleVideoLike = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const userId = req.userId!;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  try {
    // Check if user already liked (read-only)
    const existing = await Video.findOne(
      { _id: videoId, likedBy: userObjectId },
      { _id: 1 }
    ).lean();

    let updated;
    let isLiked: boolean;

    if (existing) {
      // Unlike: atomic $pull
      updated = await Video.findByIdAndUpdate(
        videoId,
        {
          $pull: { likedBy: userObjectId, 'engagement.likes': userObjectId },
          $inc: { 'analytics.likes': -1 },
        },
        { new: true, select: 'likedBy analytics.likes' }
      );
      isLiked = false;
    } else {
      // Like: atomic $addToSet (prevents duplicates even on race condition)
      updated = await Video.findByIdAndUpdate(
        videoId,
        {
          $addToSet: { likedBy: userObjectId, 'engagement.likes': userObjectId },
          $inc: { 'analytics.likes': 1 },
        },
        { new: true, select: 'likedBy analytics.likes' }
      );
      isLiked = true;
    }

    if (!updated) {
      return sendNotFound(res, 'Video not found');
    }

    const totalLikes = updated.likedBy?.length || 0;

    logger.info(`✅ [toggleVideoLike] User ${userId} ${isLiked ? 'liked' : 'unliked'} video ${videoId}. Total likes: ${totalLikes}`);

    sendSuccess(res, {
      videoId: updated._id,
      isLiked,
      totalLikes,
    }, isLiked ? 'Video liked successfully' : 'Video unliked successfully');

  } catch (error) {
    logger.error('[toggleVideoLike] Error:', error);
    throw new AppError('Failed to toggle video like', 500);
  }
});

// Add comment to video
export const addVideoComment = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { comment } = req.body;
  const userId = req.userId!;

  // Validate comment input
  if (!comment || typeof comment !== 'string') {
    return res.status(400).json({ success: false, message: 'Comment text is required' });
  }
  const trimmedComment = comment.trim();
  if (trimmedComment.length === 0) {
    return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
  }
  if (trimmedComment.length > 1000) {
    return res.status(400).json({ success: false, message: 'Comment must be 1000 characters or less' });
  }

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    // Add comment
    video.comments.push({
      user: new mongoose.Types.ObjectId(userId),
      content: trimmedComment,
      timestamp: new Date()
    });

    // Update analytics
    video.analytics.comments += 1;
    const likesCount = (video.likedBy || []).length;
    video.analytics.likes = likesCount;
    video.analytics.engagement = likesCount + video.analytics.comments + (video.analytics.shares || 0);

    await video.save();

    // Get only the last added comment with user details (avoid loading all comments)
    const populatedVideo = await Video.findById(videoId)
      .populate('comments.user', 'profile.firstName profile.lastName profile.avatar')
      .select('comments')
      .slice('comments', -1)
      .lean();

    const addedComment = (populatedVideo as any).comments?.[0];

    sendSuccess(res, {
      comment: addedComment,
      totalComments: video.analytics.comments
    }, 'Comment added successfully', 201);

  } catch (error) {
    throw new AppError('Failed to add comment', 500);
  }
});

// Get video comments
export const getVideoComments = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const userId = req.userId;

  try {
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Use aggregation to paginate comments server-side instead of loading all into memory
    const result = await Video.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
      { $project: {
        totalComments: { $size: { $ifNull: ['$comments', []] } },
        comments: {
          $slice: [
            { $sortArray: { input: { $ifNull: ['$comments', []] }, sortBy: { timestamp: -1 } } },
            skip,
            limitNum
          ]
        }
      }}
    ]);

    if (!result || result.length === 0) {
      return sendNotFound(res, 'Video not found');
    }

    const { totalComments: total, comments: rawComments } = result[0];

    // Populate user details on the sliced comments
    const populated: any[] = await Video.populate(rawComments as any, {
      path: 'user',
      select: 'profile.firstName profile.lastName profile.avatar',
      model: 'User'
    }) as any;

    // Transform comments: convert likes array to count + isLiked boolean
    const comments = populated.map((c: any) => {
      const likesArray = Array.isArray(c.likes) ? c.likes : [];
      return {
        ...c,
        likes: likesArray.length,
        isLiked: userId ? likesArray.some((id: any) => id && id.toString() === userId) : false,
      };
    });

    const totalPages = Math.ceil(total / limitNum) || 1;

    sendSuccess(res, {
      comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    }, 'Video comments retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch video comments', 500);
  }
});

// Search videos
export const searchVideos = asyncHandler(async (req: Request, res: Response) => {
  const { q: searchText, page = 1, limit = 20, category, creator } = req.query;

  if (!searchText) {
    return sendBadRequest(res, 'Search query is required');
  }

  try {
    const query: any = {
      isPublished: true,
      isApproved: true,
      $or: [
        { title: { $regex: searchText, $options: 'i' } },
        { description: { $regex: searchText, $options: 'i' } },
        { tags: { $in: [new RegExp(searchText as string, 'i')] } }
      ]
    };

    if (category) query.category = category;
    if (creator) query.creator = creator;

    const skip = (Number(page) - 1) * Number(limit);

    const videos = await Video.find(query)
      .populate('creator', 'profile.firstName profile.lastName profile.avatar')
      .populate('products', 'name basePrice images')
      .sort({ 
        'analytics.engagement': -1,
        'analytics.views': -1,
        createdAt: -1
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Video.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      videos,
      searchQuery: searchText,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Video search completed successfully');

  } catch (error) {
    throw new AppError('Failed to search videos', 500);
  }
});

// Get videos by store
export const getVideosByStore = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { type, limit = 20, offset = 0 } = req.query;
  const userId = req.userId; // Optional - can be undefined for non-authenticated users

  try {
    // Check if storeId is a valid ObjectId format (24 hex characters)
    if (!mongoose.Types.ObjectId.isValid(storeId) || !/^[0-9a-fA-F]{24}$/.test(storeId)) {
      return sendSuccess(res, {
        content: [],
        total: 0
      }, 'Videos retrieved successfully');
    }

    // Check cache first
    const cacheKey = `video:store:${storeId}:${type || 'all'}:${offset}:${limit}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return sendSuccess(res, cached, 'Videos retrieved successfully');
    }

    // Build query with valid ObjectId
    const query: any = {
      isPublished: true,
      stores: new mongoose.Types.ObjectId(storeId),
      $or: [
        { contentType: 'ugc', isApproved: true, moderationStatus: 'approved' },
        { contentType: 'merchant' }
      ]
    };

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .populate({
          path: 'products',
          select: 'name images description price inventory rating category store',
          populate: {
            path: 'store',
            select: 'name slug logo'
          }
        })
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .lean(),
      Video.countDocuments(query)
    ]);

    // Return empty array if no videos found (not an error)
    if (videos.length === 0) {
      logger.info(`ℹ️ [VIDEO] No videos found for store ${storeId}, returning empty array`);
    }

    // Transform videos to match UGC API format
    const content = videos.map((video: any) => {
      // Compute user-specific like/bookmark status
      const isLiked = userId ? (
        video.likedBy?.some((id: any) => id.toString() === userId) ||
        video.engagement?.likes?.some((id: any) => id.toString() === userId) ||
        false
      ) : false;

      const isBookmarked = userId ? (
        video.bookmarkedBy?.some((id: any) => id.toString() === userId) ||
        false
      ) : false;

      return {
        _id: video._id,
        userId: video.creator?._id || video.creator,
        user: {
          _id: video.creator?._id || video.creator,
          profile: video.creator?.profile || { firstName: '', lastName: '', avatar: '' }
        },
        type: 'video',
        url: video.videoUrl,
        videoUrl: video.videoUrl,
        thumbnail: video.thumbnail,
        caption: video.description,
        description: video.description,
        tags: video.tags || [],
        relatedProduct: video.products?.[0] || null,
        relatedStore: video.stores?.[0] ? {
          _id: video.stores[0],
          name: '',
          logo: ''
        } : null,
        likes: video.analytics?.likes || video.likedBy?.length || video.engagement?.likes?.length || 0,
        comments: video.analytics?.comments || video.engagement?.comments || 0,
        shares: video.analytics?.shares || video.engagement?.shares || 0,
        views: video.analytics?.totalViews || video.analytics?.views || video.engagement?.views || 0,
        isLiked,
        isBookmarked,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt
      };
    });

    const result = { content, total };

    // Cache the result (user-specific fields are computed per-request above)
    redisService.set(cacheKey, result, VIDEO_CACHE_TTL.STORE).catch((err) => logger.warn('[Video] Cache set for store videos failed', { error: err.message }));

    sendSuccess(res, result, 'Videos retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch store videos', 500);
  }
});

// Report video
export const reportVideo = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { reason, details } = req.body;
  const userId = req.userId!;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    // Use the reportVideo method from the model
    await video.reportVideo(userId, reason, details);

    logger.info(`✅ [VIDEO] Video ${videoId} reported by user ${userId} for reason: ${reason}`);

    sendSuccess(res, {
      videoId: video._id,
      reportCount: video.reportCount,
      isReported: video.isReported
    }, 'Video reported successfully. Thank you for helping keep our community safe.');

  } catch (error) {
    logger.error('❌ [VIDEO] Report video error:', error);
    throw new AppError('Failed to report video', 500);
  }
});

// Toggle bookmark on video
export const toggleVideoBookmark = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const userId = req.userId!;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    // Use the toggleBookmark method from the model
    const isBookmarked = await video.toggleBookmark(userId);

    logger.info(`✅ [VIDEO] Video ${videoId} ${isBookmarked ? 'bookmarked' : 'unbookmarked'} by user ${userId}`);

    sendSuccess(res, {
      videoId: video._id,
      isBookmarked,
      totalBookmarks: video.bookmarkedBy?.length || 0
    }, isBookmarked ? 'Video bookmarked successfully' : 'Bookmark removed successfully');

  } catch (error) {
    logger.error('❌ [VIDEO] Toggle bookmark error:', error);
    throw new AppError('Failed to toggle bookmark', 500);
  }
});

// Track video view
export const trackVideoView = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const userId = req.userId; // Optional - can be undefined for non-authenticated users

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    // Use the incrementViews method from the model
    await video.incrementViews(userId || undefined);

    logger.info(`✅ [VIDEO] View tracked for video ${videoId}${userId ? ` by user ${userId}` : ' (anonymous)'}`);

    sendSuccess(res, {
      videoId: video._id,
      views: video.engagement.views
    }, 'View tracked successfully');

  } catch (error) {
    logger.error('❌ [VIDEO] Track view error:', error);
    throw new AppError('Failed to track view', 500);
  }
});

// Share video - increment share count
export const shareVideo = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    // Use the share method from the model if it exists, otherwise manual increment
    if (typeof video.share === 'function') {
      await video.share();
    } else {
      if (!video.engagement) {
        video.engagement = { views: 0, likes: [], shares: 0, comments: 0, saves: 0, reports: 0 } as any;
      }
      video.engagement.shares = (video.engagement.shares || 0) + 1;
      if (!video.analytics) {
        video.analytics = {} as any;
      }
      video.analytics.shares = (video.analytics.shares || 0) + 1;
      await video.save();
    }

    logger.info(`✅ [VIDEO] Video ${videoId} shared. Total shares: ${video.engagement.shares}`);

    sendSuccess(res, {
      videoId: video._id,
      shares: video.engagement.shares
    }, 'Video shared successfully');

  } catch (error) {
    logger.error('❌ [VIDEO] Share video error:', error);
    throw new AppError('Failed to share video', 500);
  }
});

// Toggle like on a comment (atomic — prevents race conditions)
export const toggleCommentLike = asyncHandler(async (req: Request, res: Response) => {
  const { videoId, commentId } = req.params;
  const userId = req.userId!;
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const commentObjectId = new mongoose.Types.ObjectId(commentId);

  try {
    // Check if already liked
    const existing = await Video.findOne(
      { _id: videoId, 'comments._id': commentObjectId, 'comments.likes': userObjectId },
      { _id: 1 }
    ).lean();

    let updated;
    let isLiked: boolean;

    if (existing) {
      // Unlike: atomic $pull from comment's likes array
      updated = await Video.findOneAndUpdate(
        { _id: videoId, 'comments._id': commentObjectId },
        { $pull: { 'comments.$.likes': userObjectId } },
        { new: true, select: 'comments' }
      );
      isLiked = false;
    } else {
      // Like: atomic $addToSet
      updated = await Video.findOneAndUpdate(
        { _id: videoId, 'comments._id': commentObjectId },
        { $addToSet: { 'comments.$.likes': userObjectId } },
        { new: true, select: 'comments' }
      );
      isLiked = true;
    }

    if (!updated) {
      return sendNotFound(res, 'Video or comment not found');
    }

    const comment = (updated.comments as any[])?.find(
      (c: any) => c._id.toString() === commentId
    );
    const likesCount = comment?.likes?.length || 0;

    logger.info(`✅ [VIDEO] Comment ${commentId} ${isLiked ? 'liked' : 'unliked'} by user ${userId}`);

    sendSuccess(res, {
      commentId,
      isLiked,
      likesCount,
    }, isLiked ? 'Comment liked' : 'Comment unliked');

  } catch (error) {
    logger.error('❌ [VIDEO] Toggle comment like error:', error);
    throw new AppError('Failed to toggle comment like', 500);
  }
});