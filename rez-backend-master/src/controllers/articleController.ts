import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Article } from '../models/Article';
import { logger } from '../config/logger';
import { User } from '../models/User';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { escapeRegex } from '../utils/sanitize';
import { withCache } from '../utils/cacheHelper';
import { CacheTTL } from '../config/redis';

// Helper function to format view count for frontend
const formatViewCount = (views: number): string => {
  if (views >= 100000) {
    return `${(views / 100000).toFixed(1)}L`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}k`;
  }
  return views.toString();
};

// Create a new article
export const createArticle = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    title,
    excerpt,
    content,
    coverImage,
    category,
    tags,
    products,
    stores,
    isPublished = false,
    scheduledAt
  } = req.body;

  try {
    logger.info('📝 [ARTICLE] Creating article for user:', userId);

    // Validate required fields
    if (!title || !excerpt || !content || !coverImage) {
      return sendBadRequest(res, 'Title, excerpt, content, and cover image are required');
    }

    // Get user to determine authorType
    const user = await User.findById(userId).lean();
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Determine author type based on user role
    const authorType = user.role === 'merchant' ? 'merchant' : 'user';

    // Create new article
    const article = new Article({
      title,
      excerpt,
      content,
      coverImage,
      author: userId,
      authorType,
      category,
      tags: tags || [],
      products: products || [],
      stores: stores || [],
      isPublished,
      isApproved: false, // Requires manual approval
      isFeatured: false,
      moderationStatus: 'pending', // Changed from 'approved' to 'pending' for moderation workflow
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      engagement: {
        likes: [],
        bookmarks: [],
        shares: 0,
        comments: 0
      },
      analytics: {
        totalViews: 0,
        uniqueViews: 0,
        avgReadTime: 0,
        completionRate: 0,
        engagementRate: 0,
        shareRate: 0,
        likeRate: 0,
        viewsByDate: new Map(),
        deviceBreakdown: {
          mobile: 0,
          tablet: 0,
          desktop: 0
        }
      }
    });

    await article.save();

    logger.info('✅ [ARTICLE] Article created successfully:', article._id);

    // Populate author info for response
    await article.populate('author', 'profile.firstName profile.lastName profile.avatar');

    sendCreated(res, {
      article: {
        id: article._id,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        coverImage: article.coverImage,
        author: article.author,
        authorType: article.authorType,
        category: article.category,
        tags: article.tags,
        readTime: article.readTime,
        isPublished: article.isPublished,
        viewCount: article.viewCount,
        analytics: article.analytics,
        createdAt: article.createdAt
      }
    }, 'Article created successfully');

  } catch (error) {
    logger.error('❌ [ARTICLE] Create article error:', error);
    throw new AppError('Failed to create article', 500);
  }
});

// Get all articles with filtering
export const getArticles = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    author,
    isPublished,
    isFeatured,
    sortBy = 'newest',
    page = 1,
    limit = 20
  } = req.query;

  try {
    const query: any = {};

    // Only show published and approved articles by default
    if (isPublished !== undefined) {
      query.isPublished = isPublished === 'true';
    } else {
      query.isPublished = true;
    }
    query.isApproved = true;
    query.moderationStatus = 'approved';

    // Apply filters
    if (category) query.category = category;
    if (author) query.author = author;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';

    // Sorting
    const sortOptions: any = {};
    switch (sortBy) {
      case 'newest':
        sortOptions.publishedAt = -1;
        break;
      case 'popular':
        sortOptions['analytics.totalViews'] = -1;
        break;
      case 'trending':
        sortOptions['analytics.engagementRate'] = -1;
        break;
      default:
        sortOptions.publishedAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const cacheKey = `articles:list:${JSON.stringify(query)}:${sortBy}:${page}:${limit}`;
    const { articles, total } = await withCache(cacheKey, 1800, async () => {
      const [articleResults, countResult] = await Promise.all([
        Article.find(query)
          .populate('author', 'profile.firstName profile.lastName profile.avatar')
          .populate('products', 'name images pricing')
          .populate('stores', 'name slug logo')
          .sort(sortOptions)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Article.countDocuments(query)
      ]);
      return { articles: articleResults, total: countResult };
    });

    const totalPages = Math.ceil(total / Number(limit));

    // Transform articles to include id and viewCount fields for frontend compatibility
    const transformedArticles = articles.map((article: any) => ({
      ...article,
      id: article._id.toString(),
      viewCount: formatViewCount(article.analytics?.totalViews || 0),
      author: article.author ? {
        id: article.author._id?.toString(),
        name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
        avatar: article.author.profile?.avatar || '',
        role: article.authorType || 'user'
      } : undefined
    }));

    sendSuccess(res, {
      articles: transformedArticles,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Articles retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch articles', 500);
  }
});

// Get single article by ID
export const getArticleById = asyncHandler(async (req: Request, res: Response) => {
  const { articleId } = req.params;
  const userId = req.userId;

  try {
    const articleCacheKey = `article:detail:${articleId}`;
    const article = await withCache(articleCacheKey, 3600, () =>
      Article.findById(articleId)
        .populate('author', 'profile.firstName profile.lastName profile.avatar profile.bio role')
        .populate('products', 'name images pricing description store')
        .populate('stores', 'name slug logo')
        .lean()
    );

    if (!article) {
      return sendNotFound(res, 'Article not found');
    }

    // Check if user can view this article
    if (!article.isPublished && article.author._id.toString() !== userId) {
      return sendNotFound(res, 'Article not found');
    }

    // Increment view count
    await Article.findByIdAndUpdate(articleId, {
      $inc: { 'analytics.totalViews': 1 }
    });

    // Get author's other articles
    const otherArticles = await Article.find({
      author: (article as any).author._id,
      _id: { $ne: articleId },
      isPublished: true,
      isApproved: true
    })
      .populate('author', 'profile.firstName profile.lastName profile.avatar')
      .limit(5)
      .sort({ publishedAt: -1 })
      .lean();

    // Check if user liked/bookmarked this article
    let isLiked = false;
    let isBookmarked = false;
    if (userId) {
      const fullArticle = await Article.findById(articleId).lean();
      if (fullArticle) {
        isLiked = fullArticle.engagement.likes.some(
          (id: mongoose.Types.ObjectId) => id.toString() === userId
        );
        isBookmarked = fullArticle.engagement.bookmarks.some(
          (id: mongoose.Types.ObjectId) => id.toString() === userId
        );
      }
    }

    // Transform article to include id and viewCount fields for frontend compatibility
    const transformedArticle = {
      ...(article as any),
      id: (article as any)._id.toString(),
      viewCount: formatViewCount((article as any).analytics?.totalViews || 0),
      author: (article as any).author ? {
        id: (article as any).author._id?.toString(),
        name: `${(article as any).author.profile?.firstName || ''} ${(article as any).author.profile?.lastName || ''}`.trim() || 'Unknown',
        avatar: (article as any).author.profile?.avatar || '',
        role: (article as any).authorType || 'user'
      } : undefined
    };

    // Transform other articles
    const transformedOtherArticles = otherArticles.map((a: any) => ({
      ...a,
      id: a._id.toString(),
      viewCount: formatViewCount(a.analytics?.totalViews || 0),
      author: a.author ? {
        id: a.author._id?.toString(),
        name: `${a.author.profile?.firstName || ''} ${a.author.profile?.lastName || ''}`.trim() || 'Unknown',
        avatar: a.author.profile?.avatar || '',
        role: a.authorType || 'user'
      } : undefined
    }));

    sendSuccess(res, {
      article: transformedArticle,
      otherArticles: transformedOtherArticles,
      isLiked,
      isBookmarked
    }, 'Article retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch article', 500);
  }
});

// Update article
export const updateArticle = asyncHandler(async (req: Request, res: Response) => {
  const { articleId } = req.params;
  const userId = req.userId!;
  const updates = req.body;

  try {
    const article = await Article.findById(articleId);

    if (!article) {
      return sendNotFound(res, 'Article not found');
    }

    // Check ownership
    if (article.author.toString() !== userId) {
      throw new AppError('You are not authorized to update this article', 403);
    }

    // Update fields
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        (article as any)[key] = updates[key];
      }
    });

    await article.save();

    await article.populate('author', 'profile.firstName profile.lastName profile.avatar');

    sendSuccess(res, {
      article
    }, 'Article updated successfully');

  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update article', 500);
  }
});

// Delete article
export const deleteArticle = asyncHandler(async (req: Request, res: Response) => {
  const { articleId } = req.params;
  const userId = req.userId!;

  try {
    const article = await Article.findById(articleId).lean();

    if (!article) {
      return sendNotFound(res, 'Article not found');
    }

    // Check ownership
    if (article.author.toString() !== userId) {
      throw new AppError('You are not authorized to delete this article', 403);
    }

    await Article.findByIdAndDelete(articleId);

    sendSuccess(res, {
      message: 'Article deleted successfully'
    }, 'Article deleted successfully');

  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete article', 500);
  }
});

// Get articles by category
export const getArticlesByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const { page = 1, limit = 20, sortBy = 'newest' } = req.query;

  try {
    const query = {
      category,
      isPublished: true,
      isApproved: true
    };

    const sortOptions: any = {};
    switch (sortBy) {
      case 'newest':
        sortOptions.publishedAt = -1;
        break;
      case 'popular':
        sortOptions['analytics.totalViews'] = -1;
        break;
      case 'trending':
        sortOptions['analytics.engagementRate'] = -1;
        break;
      default:
        sortOptions.publishedAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const cacheKey = `articles:category:${category}:${sortBy}:${page}:${limit}`;
    const { articles, total } = await withCache(cacheKey, 1800, async () => {
      const [articleResults, countResult] = await Promise.all([
        Article.find(query)
          .populate('author', 'profile.firstName profile.lastName profile.avatar')
          .populate('products', 'name images pricing')
          .sort(sortOptions)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Article.countDocuments(query)
      ]);
      return { articles: articleResults, total: countResult };
    });

    const totalPages = Math.ceil(total / Number(limit));

    // Transform articles to include id and viewCount fields for frontend compatibility
    const transformedArticles = articles.map((article: any) => ({
      ...article,
      id: article._id.toString(),
      viewCount: formatViewCount(article.analytics?.totalViews || 0),
      author: article.author ? {
        id: article.author._id?.toString(),
        name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
        avatar: article.author.profile?.avatar || '',
        role: article.authorType || 'user'
      } : undefined
    }));

    sendSuccess(res, {
      articles: transformedArticles,
      category,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, `Articles in category "${category}" retrieved successfully`);

  } catch (error) {
    throw new AppError('Failed to fetch articles by category', 500);
  }
});

// Get trending articles
export const getTrendingArticles = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10, timeframe = '7d' } = req.query;

  try {
    // Calculate date based on timeframe
    const now = new Date();
    let startDate = new Date();
    switch (timeframe) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const trendingCacheKey = `articles:trending:${timeframe}:${limit}`;
    const articles = await withCache(trendingCacheKey, 1800, () =>
      Article.find({
        isPublished: true,
        isApproved: true,
        publishedAt: { $gte: startDate }
      })
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ 'analytics.totalViews': -1, 'analytics.engagementRate': -1 })
        .limit(Number(limit))
        .lean()
    );

    // Transform articles to include id and viewCount fields for frontend compatibility
    const transformedArticles = articles.map((article: any) => ({
      ...article,
      id: article._id.toString(),
      viewCount: formatViewCount(article.analytics?.totalViews || 0),
      author: article.author ? {
        id: article.author._id?.toString(),
        name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
        avatar: article.author.profile?.avatar || '',
        role: article.authorType || 'user'
      } : undefined
    }));

    sendSuccess(res, {
      articles: transformedArticles,
      timeframe
    }, 'Trending articles retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch trending articles', 500);
  }
});

// Get featured articles
export const getFeaturedArticles = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    const featuredCacheKey = `articles:featured:${limit}`;
    const articles = await withCache(featuredCacheKey, 1800, () =>
      Article.find({
        isFeatured: true,
        isPublished: true,
        isApproved: true
      })
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ publishedAt: -1 })
        .limit(Number(limit))
        .lean()
    );

    // Transform articles to include id and viewCount fields for frontend compatibility
    const transformedArticles = articles.map((article: any) => ({
      ...article,
      id: article._id.toString(),
      viewCount: formatViewCount(article.analytics?.totalViews || 0),
      author: article.author ? {
        id: article.author._id?.toString(),
        name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
        avatar: article.author.profile?.avatar || '',
        role: article.authorType || 'user'
      } : undefined
    }));

    sendSuccess(res, {
      articles: transformedArticles
    }, 'Featured articles retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch featured articles', 500);
  }
});

// Search articles
export const searchArticles = asyncHandler(async (req: Request, res: Response) => {
  const { q, category, author, page = 1, limit = 20 } = req.query;

  try {
    const query: any = {
      isPublished: true,
      isApproved: true
    };

    // Text search
    if (q) {
      const escaped = escapeRegex(String(q).substring(0, 200));
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { excerpt: { $regex: escaped, $options: 'i' } },
        { content: { $regex: escaped, $options: 'i' } },
        { tags: { $in: [new RegExp(escaped, 'i')] } }
      ];
    }

    // Apply filters
    if (category) query.category = category;
    if (author) query.author = author;

    const skip = (Number(page) - 1) * Number(limit);

    const [articles, total] = await Promise.all([
      Article.find(query)
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .populate('products', 'name images pricing')
        .sort({ 'analytics.totalViews': -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Article.countDocuments(query),
    ]);
    const totalPages = Math.ceil(total / Number(limit));

    // Transform articles to include id and viewCount fields for frontend compatibility
    const transformedArticles = articles.map((article: any) => ({
      ...article,
      id: article._id.toString(),
      viewCount: formatViewCount(article.analytics?.totalViews || 0),
      author: article.author ? {
        id: article.author._id?.toString(),
        name: `${article.author.profile?.firstName || ''} ${article.author.profile?.lastName || ''}`.trim() || 'Unknown',
        avatar: article.author.profile?.avatar || '',
        role: article.authorType || 'user'
      } : undefined
    }));

    sendSuccess(res, {
      articles: transformedArticles,
      searchQuery: q,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Search results retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to search articles', 500);
  }
});

// Toggle article like
export const toggleArticleLike = asyncHandler(async (req: Request, res: Response) => {
  const { articleId } = req.params;
  const userId = req.userId!;

  try {
    const article = await Article.findById(articleId).lean();

    if (!article) {
      return sendNotFound(res, 'Article not found');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const isLiked = article.engagement.likes.some(
      (id: mongoose.Types.ObjectId) => id.equals(userObjectId)
    );

    if (isLiked) {
      // Unlike
      article.engagement.likes = article.engagement.likes.filter(
        (id: mongoose.Types.ObjectId) => !id.equals(userObjectId)
      );
    } else {
      // Like
      article.engagement.likes.push(userObjectId);
    }

    // Update analytics
    await article.updateAnalytics();

    sendSuccess(res, {
      isLiked: !isLiked,
      likeCount: article.engagement.likes.length
    }, `Article ${isLiked ? 'unliked' : 'liked'} successfully`);

  } catch (error) {
    throw new AppError('Failed to toggle article like', 500);
  }
});

// Toggle article bookmark
export const toggleArticleBookmark = asyncHandler(async (req: Request, res: Response) => {
  const { articleId } = req.params;
  const userId = req.userId!;

  try {
    const article = await Article.findById(articleId).lean();

    if (!article) {
      return sendNotFound(res, 'Article not found');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const isBookmarked = article.engagement.bookmarks.some(
      (id: mongoose.Types.ObjectId) => id.equals(userObjectId)
    );

    if (isBookmarked) {
      // Remove bookmark
      article.engagement.bookmarks = article.engagement.bookmarks.filter(
        (id: mongoose.Types.ObjectId) => !id.equals(userObjectId)
      );
    } else {
      // Add bookmark
      article.engagement.bookmarks.push(userObjectId);
    }

    await article.save();

    sendSuccess(res, {
      isBookmarked: !isBookmarked,
      bookmarkCount: article.engagement.bookmarks.length
    }, `Article ${isBookmarked ? 'unbookmarked' : 'bookmarked'} successfully`);

  } catch (error) {
    throw new AppError('Failed to toggle article bookmark', 500);
  }
});

// Increment article share
export const incrementArticleShare = asyncHandler(async (req: Request, res: Response) => {
  const { articleId } = req.params;

  try {
    const article = await Article.findById(articleId).lean();

    if (!article) {
      return sendNotFound(res, 'Article not found');
    }

    article.engagement.shares += 1;
    await article.updateAnalytics();

    sendSuccess(res, {
      shareCount: article.engagement.shares
    }, 'Article share recorded successfully');

  } catch (error) {
    throw new AppError('Failed to record article share', 500);
  }
});
