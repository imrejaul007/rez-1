import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { Review } from '../models/Review';
import { StoreComparison } from '../models/StoreComparison';
import { Store } from '../models/Store';
import { Activity } from '../models/Activity';
import { MallOffer } from '../models/MallOffer';
import { Video } from '../models/Video';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUtils';
import { escapeRegex } from '../utils/sanitize';

// Get admin explore dashboard stats
export const getExploreDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get counts
    const [
      totalReviews,
      featuredReviews,
      verifiedReviews,
      totalComparisons,
      featuredComparisons,
      activeDeals,
      totalStores,
      todayActivities
    ] = await Promise.all([
      Review.countDocuments({ isActive: true }),
      Review.countDocuments({ isActive: true, isFeaturedOnExplore: true }),
      Review.countDocuments({ isActive: true, verified: true }),
      StoreComparison.countDocuments({}),
      StoreComparison.countDocuments({ isFeaturedOnExplore: true }),
      MallOffer.countDocuments({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }),
      Store.countDocuments({ isActive: true }),
      Activity.countDocuments({ createdAt: { $gte: todayStart } })
    ]);

    sendSuccess(res, {
      reviews: {
        total: totalReviews,
        featured: featuredReviews,
        verified: verifiedReviews
      },
      comparisons: {
        total: totalComparisons,
        featured: featuredComparisons
      },
      deals: {
        active: activeDeals
      },
      stores: {
        total: totalStores
      },
      activity: {
        today: todayActivities
      }
    }, 'Admin explore stats retrieved successfully');
  } catch (error) {
    logger.error('Get admin explore stats error:', error);
    throw new AppError('Failed to fetch admin explore stats', 500);
  }
});

// Get featured reviews for explore page management
export const getFeaturedReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ isActive: true, isFeaturedOnExplore: true })
        .populate('user', 'profile.name profile.avatar')
        .populate('store', 'name logo')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments({ isActive: true, isFeaturedOnExplore: true })
    ]);

    sendSuccess(res, {
      reviews,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit)
      }
    }, 'Featured reviews retrieved successfully');
  } catch (error) {
    logger.error('Get featured reviews error:', error);
    throw new AppError('Failed to fetch featured reviews', 500);
  }
});

// Toggle review featured status on explore page
export const toggleReviewFeatured = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { featured } = req.body;

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    review.isFeaturedOnExplore = featured !== undefined ? featured : !review.isFeaturedOnExplore;
    await review.save();

    sendSuccess(res, {
      review: {
        id: review._id,
        isFeaturedOnExplore: review.isFeaturedOnExplore
      }
    }, `Review ${review.isFeaturedOnExplore ? 'featured' : 'unfeatured'} on explore page`);
  } catch (error) {
    logger.error('Toggle review featured error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to toggle review featured status', 500);
  }
});

// Get featured comparisons for explore page management
export const getFeaturedComparisons = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const [comparisons, total] = await Promise.all([
      StoreComparison.find({ isFeaturedOnExplore: true })
        .populate('stores', 'name logo cashbackRate ratings')
        .populate('user', 'profile.name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StoreComparison.countDocuments({ isFeaturedOnExplore: true })
    ]);

    sendSuccess(res, {
      comparisons,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit)
      }
    }, 'Featured comparisons retrieved successfully');
  } catch (error) {
    logger.error('Get featured comparisons error:', error);
    throw new AppError('Failed to fetch featured comparisons', 500);
  }
});

// Toggle comparison featured status on explore page
export const toggleComparisonFeatured = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId } = req.params;
  const { featured } = req.body;

  try {
    const comparison = await StoreComparison.findById(comparisonId);

    if (!comparison) {
      throw new AppError('Comparison not found', 404);
    }

    comparison.isFeaturedOnExplore = featured !== undefined ? featured : !comparison.isFeaturedOnExplore;
    await comparison.save();

    sendSuccess(res, {
      comparison: {
        id: comparison._id,
        isFeaturedOnExplore: comparison.isFeaturedOnExplore
      }
    }, `Comparison ${comparison.isFeaturedOnExplore ? 'featured' : 'unfeatured'} on explore page`);
  } catch (error) {
    logger.error('Toggle comparison featured error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to toggle comparison featured status', 500);
  }
});

// Get reviews eligible for featuring (verified, high rating)
export const getEligibleReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, minRating = 4 } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const query = {
      isActive: true,
      verified: true,
      rating: { $gte: Number(minRating) },
      isFeaturedOnExplore: false,
      moderationStatus: 'approved'
    };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('user', 'profile.name profile.avatar')
        .populate('store', 'name logo')
        .sort({ rating: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments(query)
    ]);

    sendSuccess(res, {
      reviews,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit)
      }
    }, 'Eligible reviews retrieved successfully');
  } catch (error) {
    logger.error('Get eligible reviews error:', error);
    throw new AppError('Failed to fetch eligible reviews', 500);
  }
});

// Bulk feature/unfeature reviews
export const bulkToggleReviewsFeatured = asyncHandler(async (req: Request, res: Response) => {
  const { reviewIds, featured } = req.body;

  if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
    throw new AppError('Review IDs array is required', 400);
  }

  try {
    const result = await Review.updateMany(
      { _id: { $in: reviewIds } },
      { isFeaturedOnExplore: featured }
    );

    sendSuccess(res, {
      modifiedCount: result.modifiedCount
    }, `${result.modifiedCount} reviews ${featured ? 'featured' : 'unfeatured'} successfully`);
  } catch (error) {
    logger.error('Bulk toggle reviews featured error:', error);
    throw new AppError('Failed to bulk update reviews', 500);
  }
});

// =====================================================
// VIDEO/REEL MANAGEMENT FOR EXPLORE PAGE
// =====================================================

// Get explore video stats
export const getExploreVideoStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const [
      totalVideos,
      publishedVideos,
      featuredVideos,
      trendingVideos,
      pendingVideos,
      totalViews
    ] = await Promise.all([
      Video.countDocuments({}),
      Video.countDocuments({ isPublished: true }),
      Video.countDocuments({ isFeatured: true, isPublished: true }),
      Video.countDocuments({ isTrending: true, isPublished: true }),
      Video.countDocuments({ moderationStatus: 'pending' }),
      Video.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: null, total: { $sum: '$analytics.totalViews' } } }
      ]).then(r => r[0]?.total || 0)
    ]);

    sendSuccess(res, {
      total: totalVideos,
      published: publishedVideos,
      featured: featuredVideos,
      trending: trendingVideos,
      pending: pendingVideos,
      totalViews
    }, 'Video stats retrieved successfully');
  } catch (error) {
    logger.error('Get explore video stats error:', error);
    throw new AppError('Failed to fetch video stats', 500);
  }
});

// Get all videos for admin management
export const getAdminVideos = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    status,
    contentType,
    featured,
    trending,
    search
  } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);
    const query: any = {};

    // Apply filters
    if (status === 'published') query.isPublished = true;
    if (status === 'unpublished') query.isPublished = false;
    if (status === 'pending') query.moderationStatus = 'pending';
    if (status === 'approved') query.moderationStatus = 'approved';
    if (status === 'rejected') query.moderationStatus = 'rejected';

    if (contentType) query.contentType = contentType;
    if (featured === 'true') query.isFeatured = true;
    if (trending === 'true') query.isTrending = true;

    if (search) {
      const escaped = escapeRegex(String(search).substring(0, 200));
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } }
      ];
    }

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('creator', 'profile.name profile.avatar email')
        .populate('stores', 'name logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Video.countDocuments(query)
    ]);

    const transformedVideos = videos.map((video: any) => ({
      id: video._id,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail || video.thumbnailUrl,
      videoUrl: video.videoUrl || video.processedUrl,
      duration: video.duration,
      contentType: video.contentType,
      category: video.category,
      creator: video.creator ? {
        id: video.creator._id,
        name: video.creator.profile?.name || video.creator.email,
        avatar: video.creator.profile?.avatar
      } : null,
      stores: video.stores || [],
      isPublished: video.isPublished,
      isFeatured: video.isFeatured,
      isTrending: video.isTrending,
      moderationStatus: video.moderationStatus,
      analytics: {
        views: video.analytics?.totalViews || video.engagement?.views || 0,
        likes: video.engagement?.likes || 0,
        comments: video.engagement?.comments || 0,
        shares: video.engagement?.shares || 0
      },
      createdAt: video.createdAt,
      updatedAt: video.updatedAt
    }));

    sendSuccess(res, {
      videos: transformedVideos,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit)
      }
    }, 'Videos retrieved successfully');
  } catch (error) {
    logger.error('Get admin videos error:', error);
    throw new AppError('Failed to fetch videos', 500);
  }
});

// Get single video details for admin
export const getAdminVideoById = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;

  try {
    const video = await Video.findById(videoId)
      .populate('creator', 'profile.name profile.avatar email')
      .populate('stores', 'name logo slug')
      .populate('products', 'name price images')
      .lean();

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    sendSuccess(res, { video }, 'Video retrieved successfully');
  } catch (error) {
    logger.error('Get admin video by id error:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch video', 500);
  }
});

// Create new video for explore (admin upload)
export const createAdminVideo = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    videoUrl,
    thumbnail,
    duration,
    contentType = 'ugc',
    category = 'featured',
    tags = [],
    storeIds = [],
    productIds = [],
    isPublished = false,
    isFeatured = false,
    isTrending = false
  } = req.body;

  try {
    if (!title || !videoUrl) {
      throw new AppError('Title and video URL are required', 400);
    }

    const video = new Video({
      title,
      description,
      videoUrl,
      thumbnail: thumbnail || 'https://via.placeholder.com/400x600?text=Video',
      contentType,
      category,
      tags,
      hashtags: tags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`),
      stores: storeIds,
      products: productIds,
      isPublished,
      isFeatured,
      isTrending,
      moderationStatus: 'approved',
      isApproved: true,
      privacy: 'public',
      creator: req.user?.id,
      metadata: {
        duration: duration || 30,
        format: 'mp4',
        aspectRatio: '9:16'
      },
      processing: {
        status: 'completed',
        processedUrl: videoUrl,
        thumbnailUrl: thumbnail
      },
      engagement: {
        views: 0,
        likes: [],
        shares: 0,
        comments: 0,
        saves: 0,
        reports: 0
      },
      analytics: {
        totalViews: 0,
        uniqueViews: 0,
        avgWatchTime: 0,
        completionRate: 0,
        engagementRate: 0,
        shareRate: 0,
        likeRate: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagement: 0
      }
    });

    await video.save();

    sendSuccess(res, {
      video: {
        id: video._id,
        title: video.title,
        videoUrl: video.videoUrl,
        thumbnail: video.thumbnail,
        isPublished: video.isPublished,
        isFeatured: video.isFeatured,
        isTrending: video.isTrending
      }
    }, 'Video created successfully', 201);
  } catch (error) {
    logger.error('Create admin video error:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create video', 500);
  }
});

// Update video details
export const updateAdminVideo = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const {
    title,
    description,
    videoUrl,
    thumbnail,
    duration,
    contentType,
    category,
    tags,
    storeIds,
    productIds,
    isPublished,
    isFeatured,
    isTrending,
    moderationStatus
  } = req.body;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    // Update fields if provided
    if (title !== undefined) video.title = title;
    if (description !== undefined) video.description = description;
    if (videoUrl !== undefined) {
      video.videoUrl = videoUrl;
      video.processing.processedUrl = videoUrl;
      video.processing.status = 'completed';
    }
    if (thumbnail !== undefined) {
      video.thumbnail = thumbnail;
      video.processing.thumbnailUrl = thumbnail;
    }
    if (duration !== undefined) video.metadata.duration = duration;
    if (contentType !== undefined) video.contentType = contentType;
    if (category !== undefined) video.category = category;
    if (tags !== undefined) video.tags = tags;
    if (storeIds !== undefined) video.stores = storeIds;
    if (productIds !== undefined) video.products = productIds;
    if (isPublished !== undefined) video.isPublished = isPublished;
    if (isFeatured !== undefined) video.isFeatured = isFeatured;
    if (isTrending !== undefined) video.isTrending = isTrending;
    if (moderationStatus !== undefined) {
      video.moderationStatus = moderationStatus;
      video.isApproved = moderationStatus === 'approved';
    }

    await video.save();

    sendSuccess(res, {
      video: {
        id: video._id,
        title: video.title,
        isPublished: video.isPublished,
        isFeatured: video.isFeatured,
        isTrending: video.isTrending,
        moderationStatus: video.moderationStatus
      }
    }, 'Video updated successfully');
  } catch (error) {
    logger.error('Update admin video error:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update video', 500);
  }
});

// Delete video
export const deleteAdminVideo = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;

  try {
    const video = await Video.findById(videoId).lean();

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    // Try to delete from Cloudinary if it's a Cloudinary URL
    if (video.videoUrl && video.videoUrl.includes('cloudinary.com')) {
      try {
        // Extract public ID from Cloudinary URL
        const urlParts = video.videoUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
          // Get everything after 'upload/v{version}/' and remove extension
          const publicIdWithExt = urlParts.slice(uploadIndex + 2).join('/');
          const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
          await deleteFromCloudinary(publicId);
        }
      } catch (cloudinaryError) {
        logger.error('Failed to delete from Cloudinary:', cloudinaryError);
      }
    }

    await Video.findByIdAndDelete(videoId);

    sendSuccess(res, { deleted: true }, 'Video deleted successfully');
  } catch (error) {
    logger.error('Delete admin video error:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete video', 500);
  }
});

// Toggle video featured status
export const toggleVideoFeatured = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { featured } = req.body;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    video.isFeatured = featured !== undefined ? featured : !video.isFeatured;
    await video.save();

    sendSuccess(res, {
      video: {
        id: video._id,
        isFeatured: video.isFeatured
      }
    }, `Video ${video.isFeatured ? 'featured' : 'unfeatured'} successfully`);
  } catch (error) {
    logger.error('Toggle video featured error:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to toggle video featured status', 500);
  }
});

// Toggle video trending status
export const toggleVideoTrending = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { trending } = req.body;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    video.isTrending = trending !== undefined ? trending : !video.isTrending;
    await video.save();

    sendSuccess(res, {
      video: {
        id: video._id,
        isTrending: video.isTrending
      }
    }, `Video ${video.isTrending ? 'marked as trending' : 'removed from trending'}`);
  } catch (error) {
    logger.error('Toggle video trending error:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to toggle video trending status', 500);
  }
});

// Toggle video publish status
export const toggleVideoPublished = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { published } = req.body;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    video.isPublished = published !== undefined ? published : !video.isPublished;
    if (video.isPublished && !video.publishedAt) {
      video.publishedAt = new Date();
    }
    await video.save();

    sendSuccess(res, {
      video: {
        id: video._id,
        isPublished: video.isPublished
      }
    }, `Video ${video.isPublished ? 'published' : 'unpublished'} successfully`);
  } catch (error) {
    logger.error('Toggle video published error:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to toggle video publish status', 500);
  }
});

// Bulk update videos
export const bulkUpdateVideos = asyncHandler(async (req: Request, res: Response) => {
  const { videoIds, action, value } = req.body;

  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    throw new AppError('Video IDs array is required', 400);
  }

  if (!action) {
    throw new AppError('Action is required', 400);
  }

  try {
    let updateQuery: any = {};

    switch (action) {
      case 'publish':
        updateQuery = { isPublished: true, publishedAt: new Date() };
        break;
      case 'unpublish':
        updateQuery = { isPublished: false };
        break;
      case 'feature':
        updateQuery = { isFeatured: true };
        break;
      case 'unfeature':
        updateQuery = { isFeatured: false };
        break;
      case 'trending':
        updateQuery = { isTrending: true };
        break;
      case 'untrending':
        updateQuery = { isTrending: false };
        break;
      case 'approve':
        updateQuery = { moderationStatus: 'approved', isApproved: true };
        break;
      case 'reject':
        updateQuery = { moderationStatus: 'rejected', isApproved: false };
        break;
      default:
        throw new AppError('Invalid action', 400);
    }

    const result = await Video.updateMany(
      { _id: { $in: videoIds } },
      updateQuery
    );

    sendSuccess(res, {
      modifiedCount: result.modifiedCount
    }, `${result.modifiedCount} videos updated successfully`);
  } catch (error) {
    logger.error('Bulk update videos error:', error);
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to bulk update videos', 500);
  }
});
