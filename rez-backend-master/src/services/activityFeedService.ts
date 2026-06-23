import { logger } from '../config/logger';
import { Activity } from '../models/Activity';
import Follow from '../models/Follow';
import ActivityInteraction from '../models/ActivityInteraction';
import mongoose from 'mongoose';
import redisService from './redisService';

// Cache TTLs (seconds)
const FEED_CACHE_TTL = 60;        // 60s for user-specific feeds
const PROFILE_CACHE_TTL = 60;     // 60s for user's own activities
const SUGGESTED_CACHE_TTL = 300;  // 5min for suggested users (shared/expensive)
const FOLLOW_COUNT_CACHE_TTL = 120; // 2min for follow counts

/**
 * Get activity feed for user (activities from people they follow)
 */
export async function getActivityFeed(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ activities: any[]; total: number }> {
  try {
    // Check cache first
    const cacheKey = `feed:user:${userId}:${page}:${limit}`;
    try {
      const cached = await redisService.get<{ activities: any[]; total: number }>(cacheKey);
      if (cached) return cached;
    } catch { /* Redis unavailable — continue with DB */ }

    // Get list of users this user follows
    const following = await Follow.find({ follower: userId }).select('following').lean();
    const followingIds = following.map(f => f.following);

    // Include user's own activities
    followingIds.push(new mongoose.Types.ObjectId(userId));

    const skip = (page - 1) * limit;
    const filter = { user: { $in: followingIds } };

    // Fetch activities and total count in parallel
    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate('user', 'name profilePicture email')
        .populate('relatedEntity.id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments(filter),
    ]);

    // Get interaction status for current user
    const activityIds = activities.map(a => a._id);
    const userInteractions = await ActivityInteraction.find({
      activity: { $in: activityIds },
      user: userId
    }).lean();

    const interactionMap = new Map();
    userInteractions.forEach(interaction => {
      const key = `${interaction.activity}_${interaction.type}`;
      interactionMap.set(key, true);
    });

    // Add interaction flags and transform for social feed
    const enriched = activities.map(activity => ({
      ...activity,
      hasLiked: interactionMap.has(`${activity._id}_like`),
      hasCommented: interactionMap.has(`${activity._id}_comment`),
      // Format for social feed display
      feedContent: {
        title: activity.title,
        description: activity.description,
        amount: activity.amount,
        icon: activity.icon,
        color: activity.color,
        type: activity.type
      }
    }));

    const result = { activities: enriched, total };

    // Cache result (fire-and-forget)
    redisService.set(cacheKey, result, FEED_CACHE_TTL).catch((err) => logger.warn('[ActivityFeed] Cache set for feed failed', { error: err.message }));

    return result;
  } catch (error) {
    logger.error('Error fetching activity feed:', error);
    throw error;
  }
}

/**
 * Get user's own activities (for profile page)
 */
export async function getUserActivities(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ activities: any[]; total: number }> {
  try {
    const cacheKey = `feed:profile:${userId}:${page}:${limit}`;
    try {
      const cached = await redisService.get<{ activities: any[]; total: number }>(cacheKey);
      if (cached) return cached;
    } catch { /* Redis unavailable */ }

    const skip = (page - 1) * limit;
    const filter = { user: userId };

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate('relatedEntity.id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments(filter),
    ]);

    const result = { activities, total };
    redisService.set(cacheKey, result, PROFILE_CACHE_TTL).catch((err) => logger.warn('[ActivityFeed] Cache set for profile feed failed', { error: err.message }));

    return result;
  } catch (error) {
    logger.error('Error fetching user activities:', error);
    throw error;
  }
}

/**
 * Create activity for social feed
 */
export async function createSocialActivity(
  userId: string,
  type: string,
  data: {
    title: string;
    description?: string;
    amount?: number;
    icon?: string;
    color?: string;
    relatedEntity?: { id: string; type: string };
    metadata?: Record<string, any>;
  }
): Promise<any> {
  try {
    const activity = await Activity.create({
      user: userId,
      type,
      title: data.title,
      description: data.description,
      amount: data.amount,
      icon: data.icon || 'information-circle',
      color: data.color || '#6B7280',
      relatedEntity: data.relatedEntity,
      metadata: data.metadata
    });

    const populatedActivity = await Activity.findById(activity._id)
      .populate('user', 'name profilePicture email')
      .lean();

    // Invalidate feed caches for this user
    invalidateFeedCache(userId).catch((err) => logger.warn('[ActivityFeed] Feed cache invalidation after create activity failed', { error: err.message }));

    return populatedActivity;
  } catch (error) {
    logger.error('Error creating social activity:', error);
    throw error;
  }
}

/**
 * Like/Unlike activity
 */
export async function toggleLike(activityId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
  try {
    const existingLike = await ActivityInteraction.findOne({
      activity: activityId,
      user: userId,
      type: 'like'
    }).lean();

    let likesCount = 0;

    if (existingLike) {
      // Unlike
      await existingLike.deleteOne();

      // Get updated count
      likesCount = await ActivityInteraction.countDocuments({
        activity: activityId,
        type: 'like'
      });

      invalidateFeedCache(userId).catch((err) => logger.warn('[ActivityFeed] Feed cache invalidation after unlike failed', { error: err.message }));
      return { liked: false, likesCount };
    } else {
      // Like
      await ActivityInteraction.create({
        activity: activityId,
        user: userId,
        type: 'like'
      });

      // Get updated count
      likesCount = await ActivityInteraction.countDocuments({
        activity: activityId,
        type: 'like'
      });

      invalidateFeedCache(userId).catch((err) => logger.warn('[ActivityFeed] Feed cache invalidation after like failed', { error: err.message }));
      return { liked: true, likesCount };
    }
  } catch (error) {
    logger.error('Error toggling like:', error);
    throw error;
  }
}

/**
 * Get likes count for activity
 */
export async function getLikesCount(activityId: string): Promise<number> {
  try {
    return await ActivityInteraction.countDocuments({
      activity: activityId,
      type: 'like'
    });
  } catch (error) {
    logger.error('Error getting likes count:', error);
    throw error;
  }
}

/**
 * Get comments for activity
 */
export async function getActivityComments(
  activityId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ comments: any[]; total: number }> {
  try {
    const skip = (page - 1) * limit;
    const filter = { activity: activityId, type: 'comment' as const };

    const [comments, total] = await Promise.all([
      ActivityInteraction.find(filter)
        .populate('user', 'name profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityInteraction.countDocuments(filter),
    ]);

    return { comments, total };
  } catch (error) {
    logger.error('Error fetching comments:', error);
    throw error;
  }
}

/**
 * Add comment to activity
 */
export async function addComment(
  activityId: string,
  userId: string,
  comment: string
): Promise<any> {
  try {
    if (!comment || comment.trim().length === 0) {
      throw new Error('Comment cannot be empty');
    }

    const interaction = await ActivityInteraction.create({
      activity: activityId,
      user: userId,
      type: 'comment',
      comment: comment.trim()
    });

    const populatedComment = await ActivityInteraction.findById(interaction._id)
      .populate('user', 'name profilePicture')
      .lean();

    invalidateFeedCache(userId).catch((err) => logger.warn('[ActivityFeed] Feed cache invalidation after comment failed', { error: err.message }));

    return populatedComment;
  } catch (error) {
    logger.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Follow/Unfollow user
 */
export async function toggleFollow(
  followerId: string,
  followingId: string
): Promise<{ following: boolean; followersCount: number }> {
  try {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: followingId
    }).lean();

    let followersCount = 0;

    if (existingFollow) {
      // Unfollow
      await existingFollow.deleteOne();

      // Get updated follower count
      followersCount = await Follow.countDocuments({ following: followingId });

      // Invalidate caches for both users
      invalidateFeedCache(followerId).catch((err) => logger.warn('[ActivityFeed] Feed cache invalidation after unfollow failed', { error: err.message }));
      invalidateFollowCache(followerId, followingId).catch((err) => logger.warn('[ActivityFeed] Follow cache invalidation after unfollow failed', { error: err.message }));

      return { following: false, followersCount };
    } else {
      // Follow
      await Follow.create({
        follower: followerId,
        following: followingId
      });

      // Get updated follower count
      followersCount = await Follow.countDocuments({ following: followingId });

      // Invalidate caches for both users
      invalidateFeedCache(followerId).catch((err) => logger.warn('[ActivityFeed] Feed cache invalidation after follow failed', { error: err.message }));
      invalidateFollowCache(followerId, followingId).catch((err) => logger.warn('[ActivityFeed] Follow cache invalidation after follow failed', { error: err.message }));

      return { following: true, followersCount };
    }
  } catch (error) {
    logger.error('Error toggling follow:', error);
    throw error;
  }
}

/**
 * Check if user is following another user
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  try {
    const follow = await Follow.findOne({
      follower: followerId,
      following: followingId
    }).lean();

    return !!follow;
  } catch (error) {
    logger.error('Error checking follow status:', error);
    throw error;
  }
}

/**
 * Get user's followers
 */
export async function getFollowers(
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ followers: any[]; total: number }> {
  try {
    const skip = (page - 1) * limit;
    const filter = { following: userId };

    const [followerDocs, total] = await Promise.all([
      Follow.find(filter)
        .populate('follower', 'profile.firstName profile.lastName profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Follow.countDocuments(filter),
    ]);

    return { followers: followerDocs.map(f => f.follower), total };
  } catch (error) {
    logger.error('Error fetching followers:', error);
    throw error;
  }
}

/**
 * Get user's following list
 */
export async function getFollowing(
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ following: any[]; total: number }> {
  try {
    const skip = (page - 1) * limit;
    const filter = { follower: userId };

    const [followingDocs, total] = await Promise.all([
      Follow.find(filter)
        .populate('following', 'name profilePicture email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Follow.countDocuments(filter),
    ]);

    return { following: followingDocs.map(f => f.following), total };
  } catch (error) {
    logger.error('Error fetching following:', error);
    throw error;
  }
}

/**
 * Get follower/following counts for user
 */
export async function getFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
  try {
    const cacheKey = `follow:counts:${userId}`;
    try {
      const cached = await redisService.get<{ followersCount: number; followingCount: number }>(cacheKey);
      if (cached) return cached;
    } catch { /* Redis unavailable */ }

    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId })
    ]);

    const result = { followersCount, followingCount };
    redisService.set(cacheKey, result, FOLLOW_COUNT_CACHE_TTL).catch((err) => logger.warn('[ActivityFeed] Cache set for follow counts failed', { error: err.message }));

    return result;
  } catch (error) {
    logger.error('Error fetching follow counts:', error);
    throw error;
  }
}

/**
 * Get suggested users to follow (users with most followers that current user doesn't follow)
 */
export async function getSuggestedUsers(userId: string, limit: number = 10): Promise<any[]> {
  try {
    const cacheKey = `feed:suggested:${userId}:${limit}`;
    try {
      const cached = await redisService.get<any[]>(cacheKey);
      if (cached) return cached;
    } catch { /* Redis unavailable */ }

    // Get users current user already follows
    const following = await Follow.find({ follower: userId }).select('following').lean();
    const followingIds = following.map(f => f.following.toString());
    followingIds.push(userId); // Exclude self

    // Get users with most followers
    const suggestedUsers = await Follow.aggregate([
      {
        $match: {
          following: { $nin: followingIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: '$following',
          followersCount: { $sum: 1 }
        }
      },
      {
        $sort: { followersCount: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: '$user._id',
          name: '$user.name',
          profilePicture: '$user.profilePicture',
          email: '$user.email',
          followersCount: 1
        }
      }
    ]);

    redisService.set(cacheKey, suggestedUsers, SUGGESTED_CACHE_TTL).catch((err) => logger.warn('[ActivityFeed] Cache set for suggested users failed', { error: err.message }));

    return suggestedUsers;
  } catch (error) {
    logger.error('Error fetching suggested users:', error);
    throw error;
  }
}

/**
 * Share activity
 */
export async function shareActivity(activityId: string, userId: string): Promise<void> {
  try {
    await ActivityInteraction.create({
      activity: activityId,
      user: userId,
      type: 'share'
    });
  } catch (error) {
    logger.error('Error sharing activity:', error);
    throw error;
  }
}

/**
 * Get activity statistics
 */
export async function getActivityStats(activityId: string): Promise<{
  likes: number;
  comments: number;
  shares: number;
}> {
  try {
    const [likes, comments, shares] = await Promise.all([
      ActivityInteraction.countDocuments({ activity: activityId, type: 'like' }),
      ActivityInteraction.countDocuments({ activity: activityId, type: 'comment' }),
      ActivityInteraction.countDocuments({ activity: activityId, type: 'share' })
    ]);

    return { likes, comments, shares };
  } catch (error) {
    logger.error('Error fetching activity stats:', error);
    throw error;
  }
}

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

/**
 * Invalidate all feed-related caches for a user.
 * Called after creating activities, liking, commenting, or following.
 */
async function invalidateFeedCache(userId: string): Promise<void> {
  try {
    await Promise.all([
      redisService.delPattern(`feed:user:${userId}:*`),
      redisService.delPattern(`feed:profile:${userId}:*`),
    ]);
  } catch {
    // Redis unavailable — caches will expire via TTL
  }
}

/**
 * Invalidate follow-related caches for both follower and followee.
 */
async function invalidateFollowCache(followerId: string, followingId: string): Promise<void> {
  try {
    await Promise.all([
      redisService.del(`follow:counts:${followerId}`),
      redisService.del(`follow:counts:${followingId}`),
      redisService.delPattern(`feed:suggested:${followerId}:*`),
    ]);
  } catch {
    // Redis unavailable — caches will expire via TTL
  }
}
