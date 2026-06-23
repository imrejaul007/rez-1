import { Request, Response, NextFunction } from 'express';
import { Wishlist } from '../models/Wishlist';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { logger } from '../config/logger';

/**
 * Check whether a user has an active premium membership.
 *
 * Premium status is `isPremium === true` AND `premiumExpiresAt` is either
 * unset (lifetime) or in the future. A user with `nuqtaPlusTier` of
 * 'premium' or 'vip' also counts as premium — the tier field is the
 * canonical source for the Nuqta+ program, while `isPremium` is a flat
 * legacy flag. We treat either as authoritative to avoid surprise lockouts.
 */
export async function isPremiumUser(
  userId: string | mongoose.Types.ObjectId
): Promise<boolean> {
  try {
    const user = await User.findById(userId)
      .select('isPremium premiumExpiresAt nuqtaPlusTier')
      .lean();
    if (!user) return false;

    // Tier-based premium
    if (user.nuqtaPlusTier === 'premium' || user.nuqtaPlusTier === 'vip') {
      // VIP / premium tier is always active — no expiry to check.
      // (Tier expiry is handled separately by the subscription service.)
      return true;
    }

    // Flag-based premium — only counts if not expired
    if (user.isPremium === true) {
      if (!user.premiumExpiresAt) return true; // lifetime
      return new Date(user.premiumExpiresAt).getTime() > Date.now();
    }

    return false;
  } catch (error) {
    logger.error('Error checking premium status:', error);
    return false;
  }
}

/**
 * Check if user is following a store
 * @param userId - The user ID
 * @param storeId - The store ID
 * @returns Promise<boolean> - True if user follows the store
 */
export async function isFollowingStore(
  userId: string | mongoose.Types.ObjectId,
  storeId: string | mongoose.Types.ObjectId
): Promise<boolean> {
  try {
    const wishlist = await Wishlist.findOne({
      user: userId,
      'items': {
        $elemMatch: {
          itemType: 'Store',
          itemId: new mongoose.Types.ObjectId(storeId.toString())
        }
      }
    });
    return !!wishlist;
  } catch (error) {
    logger.error('Error checking follow status:', error);
    return false;
  }
}

/**
 * Get all stores that a user follows
 * @param userId - The user ID
 * @returns Promise<string[]> - Array of store IDs
 */
export async function getUserFollowedStores(
  userId: string | mongoose.Types.ObjectId
): Promise<string[]> {
  try {
    const wishlists = await Wishlist.find({
      user: userId,
      'items.itemType': 'Store'
    }).select('items');

    const storeIds: string[] = [];
    wishlists.forEach(wishlist => {
      wishlist.items.forEach(item => {
        if (item.itemType === 'Store') {
          storeIds.push(item.itemId.toString());
        }
      });
    });

    return [...new Set(storeIds)]; // Remove duplicates
  } catch (error) {
    logger.error('Error getting followed stores:', error);
    return [];
  }
}

/**
 * Middleware to add follower context to requests
 * Adds req.followedStores array with store IDs user follows
 */
export async function addFollowerContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.user?.id) {
      const followedStores = await getUserFollowedStores(req.user.id);
      (req as any).followedStores = followedStores;
    } else {
      (req as any).followedStores = [];
    }
    next();
  } catch (error) {
    logger.error('Error in addFollowerContext middleware:', error);
    (req as any).followedStores = [];
    next();
  }
}

/**
 * Filter offers based on follower-exclusive status
 * @param offers - Array of offers
 * @param userId - User ID (optional)
 * @param followedStores - Array of store IDs user follows (optional)
 * @returns Promise<any[]> - Filtered offers
 */
export async function filterExclusiveOffers(
  offers: any[],
  userId?: string,
  followedStores?: string[]
): Promise<any[]> {
  if (!offers || offers.length === 0) {
    return [];
  }

  const now = new Date();
  let userFollowedStores = followedStores;

  // Get followed stores if not provided
  if (userId && !userFollowedStores) {
    userFollowedStores = await getUserFollowedStores(userId);
  }

  const results: any[] = [];
  for (const offer of offers) {
    let visible = false;
    // If offer is not follower-exclusive, show to everyone
    if (!offer.isFollowerExclusive) {
      visible = true;
    }
    // Check if exclusive period has expired
    else if (offer.exclusiveUntil && now > new Date(offer.exclusiveUntil)) {
      visible = true; // Show to everyone after exclusive period
    }
    // If user is not authenticated, hide exclusive offers
    else if (!userId) {
      visible = false;
    }
    else {
      // Check if user follows the store
      const storeId = offer.store?.id?.toString() || offer.store?.toString();
      if (!storeId) {
        visible = false;
      } else {
        const isFollowing = userFollowedStores?.includes(storeId);

        if (offer.visibleTo === 'followers' && isFollowing) {
          visible = true;
        } else if (offer.visibleTo === 'premium') {
          // Premium user OR store follower can see premium-tagged offers.
          // We check premium first (one query) and only fall through to follower
          // check if the user is not premium.
          const premium = await isPremiumUser(userId);
          if (premium) visible = true;
          else visible = !!isFollowing;
        } else if (offer.visibleTo === 'all') {
          visible = true;
        }
      }
    }
    if (visible) results.push(offer);
  }
  return results;
}

/**
 * Middleware to check if user can access an exclusive offer
 * Use this on single offer endpoints (e.g., GET /offers/:id)
 */
export async function checkExclusiveOfferAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const offer = (req as any).offer; // Assumes offer is attached by previous middleware

    if (!offer) {
      return next();
    }

    // If not exclusive, allow access
    if (!offer.isFollowerExclusive) {
      return next();
    }

    // Check if exclusive period has expired
    const now = new Date();
    if (offer.exclusiveUntil && now > new Date(offer.exclusiveUntil)) {
      return next(); // Allow access after exclusive period
    }

    // Check if user is authenticated
    if (!req.user?.id) {
      res.status(403).json({
        success: false,
        message: 'This is a follower-exclusive offer. Please follow the store to access it.'
      });
      return;
    }

    // Check if user follows the store
    const storeId = (offer.store as any)?._id?.toString() || (offer.store as any)?.id?.toString() || offer.store?.toString();
    const isFollowing = await isFollowingStore(req.user.id, storeId);

    if (offer.visibleTo === 'followers' && !isFollowing) {
      res.status(403).json({
        success: false,
        message: 'This offer is exclusive to store followers. Please follow the store to access it.',
        requiresFollow: true,
        storeId
      });
      return;
    }

    if (offer.visibleTo === 'premium') {
      // Premium members get access regardless of follow status.
      const premium = await isPremiumUser(req.user.id);
      if (premium) {
        return next();
      }
      // Non-premium users must follow the store.
      if (!isFollowing) {
        res.status(403).json({
          success: false,
          message: 'This offer is exclusive to premium members and store followers.',
          requiresFollow: true,
          storeId
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Error in checkExclusiveOfferAccess:', error);
    next(); // Continue on error to avoid breaking the flow
  }
}
