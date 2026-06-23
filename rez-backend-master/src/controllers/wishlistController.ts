import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { Wishlist, IDiscountSnapshot } from '../models/Wishlist';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import Discount from '../models/Discount';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { escapeRegex } from '../utils/sanitize';
import * as storeFollowService from '../services/storeFollowService';
import { recordNewFollow, recordUnfollow } from '../services/followerAnalyticsService';
import redisService from '../services/redisService';

// Get user's wishlists
export const getUserWishlists = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { category, page = 1, limit = 20 } = req.query;

  try {
    const query: any = { user: userId };
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const wishlists = await Wishlist.find(query)
      .populate('items.itemId', 'name images basePrice salePrice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Wishlist.countDocuments(query);

    sendSuccess(res, {
      wishlists,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }, 'Wishlists retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch wishlists', 500);
  }
});

// Create new wishlist
export const createWishlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { name, description, category, isPublic } = req.body;

  try {
    const wishlist = new Wishlist({
      user: userId,
      name,
      description,
      category: category || 'personal',
      isPublic: isPublic || false
    });

    await wishlist.save();

    sendSuccess(res, wishlist, 'Wishlist created successfully', 201);
  } catch (error) {
    throw new AppError('Failed to create wishlist', 500);
  }
});

// Get single wishlist
export const getWishlistById = asyncHandler(async (req: Request, res: Response) => {
  const { wishlistId } = req.params;
  const userId = req.userId;

  try {
    const wishlist = await Wishlist.findById(wishlistId)
      .populate('user', 'profile.firstName profile.lastName profile.avatar')
      .populate('items.itemId', 'name images basePrice salePrice store')
      .populate('items.itemId.store', 'name slug')
      .lean();

    if (!wishlist) {
      return sendNotFound(res, 'Wishlist not found');
    }

    // Check if user can access this wishlist
    if (!wishlist.isPublic && (!userId || (wishlist as any).user._id.toString() !== userId)) {
      return sendNotFound(res, 'Wishlist not found');
    }

    sendSuccess(res, wishlist, 'Wishlist retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch wishlist', 500);
  }
});

// Add item to wishlist
export const addToWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { wishlistId } = req.params;
  const userId = req.userId!;
  const { itemType: rawItemType, itemId, priority, notes, targetPrice, notifyOnPriceChange, notifyOnAvailability, tags, discountSnapshot: clientSnapshot } = req.body;

  try {
    // Normalize itemType to match backend schema (capitalize first letter)
    const itemType = rawItemType.charAt(0).toUpperCase() + rawItemType.slice(1).toLowerCase();

    // Validate itemType - now includes 'Discount'
    const validTypes = ['Product', 'Store', 'Video', 'Discount'];
    if (!validTypes.includes(itemType)) {
      return sendBadRequest(res, `Invalid itemType. Must be one of: ${validTypes.join(', ')}`);
    }

    const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId }).lean();

    if (!wishlist) {
      return sendNotFound(res, 'Wishlist not found');
    }

    // Check if item already exists in wishlist
    const existingItem = wishlist.items.find(item =>
      item.itemType === itemType && item.itemId.toString() === itemId
    );

    if (existingItem) {
      return sendBadRequest(res, 'Item already exists in wishlist');
    }

    // Verify item exists and prepare snapshot data
    let discountSnapshot: IDiscountSnapshot | undefined;

    if (itemType === 'Product') {
      const product = await Product.findById(itemId).lean();
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }
    } else if (itemType === 'Store') {
      const store = await Store.findById(itemId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }
    } else if (itemType === 'Discount') {
      // Fetch discount and create snapshot
      const discount = await Discount.findById(itemId).populate('storeId', 'name').lean();
      if (!discount) {
        return sendNotFound(res, 'Discount not found');
      }

      // Create discount snapshot to preserve deal info
      discountSnapshot = {
        discountId: discount._id,
        name: discount.name,
        description: discount.description,
        type: discount.type as 'percentage' | 'fixed' | 'flat',
        value: discount.value,
        minOrderValue: discount.minOrderValue,
        maxDiscount: discount.maxDiscountAmount,
        validFrom: discount.validFrom,
        validUntil: discount.validUntil,
        storeId: discount.storeId || clientSnapshot?.storeId,
        storeName: (discount.storeId as any)?.name || clientSnapshot?.storeName,
        productId: discount.applicableProducts?.[0] || clientSnapshot?.productId,
        productName: clientSnapshot?.productName,
        savedAt: new Date()
      };
    }

    // Add item to wishlist
    const newItem: any = {
      itemType: itemType as 'Product' | 'Store' | 'Video' | 'Discount',
      itemId,
      addedAt: new Date(),
      priority: priority || 'medium',
      notes,
      targetPrice,
      notifyOnPriceChange: notifyOnPriceChange !== false,
      notifyOnAvailability: notifyOnAvailability !== false,
      tags: tags || []
    };

    // Add discount snapshot if saving a deal
    if (discountSnapshot) {
      newItem.discountSnapshot = discountSnapshot;
    }

    wishlist.items.push(newItem);
    await wishlist.save();

    // If the item is a Store, increment the followers count and record analytics
    if (itemType === 'Store') {
      try {
        await storeFollowService.incrementFollowers(itemId);
        // Record follow event for analytics
        recordNewFollow(itemId).catch(err =>
          logger.error('[WishlistController] Failed to record follow analytics:', err)
        );
      } catch (error) {
        logger.error('[WishlistController] Failed to increment store followers:', error);
        // Don't fail the entire request if followers update fails
      }
    }

    const populatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.itemId', 'name images basePrice salePrice')
      .lean();

    // Invalidate wishlist status cache for this user
    redisService.delPattern(`wishlist:status:${userId}:*`).catch((err) => logger.warn('[Wishlist] Cache invalidation for wishlist status after add failed', { error: err.message }));

    sendSuccess(res, populatedWishlist, 'Item added to wishlist successfully');
  } catch (error) {
    throw new AppError('Failed to add item to wishlist', 500);
  }
});

// Remove item from wishlist
export const removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { wishlistId, itemId } = req.params;
  const userId = req.userId!;

  try {
    const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId }).lean();

    if (!wishlist) {
      return sendNotFound(res, 'Wishlist not found');
    }

    const itemIndex = wishlist.items.findIndex(item =>
      item.itemId.toString() === itemId
    );

    if (itemIndex === -1) {
      return sendNotFound(res, 'Item not found in wishlist');
    }

    // Store the item info before removing it
    const removedItem = wishlist.items[itemIndex];

    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    // If the removed item is a Store, decrement the followers count and record analytics
    if (removedItem.itemType === 'Store') {
      try {
        await storeFollowService.decrementFollowers(removedItem.itemId.toString());
        // Record unfollow event for analytics
        recordUnfollow(removedItem.itemId).catch(err =>
          logger.error('[WishlistController] Failed to record unfollow analytics:', err)
        );
      } catch (error) {
        logger.error('[WishlistController] Failed to decrement store followers:', error);
        // Don't fail the entire request if followers update fails
      }
    }

    // Invalidate wishlist status cache
    redisService.delPattern(`wishlist:status:${userId}:*`).catch((err) => logger.warn('[Wishlist] Cache invalidation for wishlist status after remove failed', { error: err.message }));

    sendSuccess(res, null, 'Item removed from wishlist successfully');
  } catch (error) {
    throw new AppError('Failed to remove item from wishlist', 500);
  }
});

// Update wishlist item
export const updateWishlistItem = asyncHandler(async (req: Request, res: Response) => {
  const { wishlistId, itemId } = req.params;
  const userId = req.userId!;
  const { priority, notes, targetPrice, notifyOnPriceChange, notifyOnAvailability, tags } = req.body;

  try {
    const wishlist = await Wishlist.findOne({ _id: wishlistId, user: userId }).lean();
    
    if (!wishlist) {
      return sendNotFound(res, 'Wishlist not found');
    }

    const item = wishlist.items.find(item => 
      item.itemId.toString() === itemId
    );

    if (!item) {
      return sendNotFound(res, 'Item not found in wishlist');
    }

    // Update item properties
    if (priority) item.priority = priority;
    if (notes !== undefined) item.notes = notes;
    if (targetPrice !== undefined) item.targetPrice = targetPrice;
    if (notifyOnPriceChange !== undefined) item.notifyOnPriceChange = notifyOnPriceChange;
    if (notifyOnAvailability !== undefined) item.notifyOnAvailability = notifyOnAvailability;
    if (tags) item.tags = tags;

    await wishlist.save();

    const populatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.itemId', 'name images basePrice salePrice')
      .lean();

    sendSuccess(res, populatedWishlist, 'Wishlist item updated successfully');
  } catch (error) {
    throw new AppError('Failed to update wishlist item', 500);
  }
});

// Delete wishlist
export const deleteWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { wishlistId } = req.params;
  const userId = req.userId!;

  try {
    const wishlist = await Wishlist.findOneAndDelete({ _id: wishlistId, user: userId });
    
    if (!wishlist) {
      return sendNotFound(res, 'Wishlist not found');
    }

    sendSuccess(res, null, 'Wishlist deleted successfully');
  } catch (error) {
    throw new AppError('Failed to delete wishlist', 500);
  }
});

// Get public wishlists
export const getPublicWishlists = asyncHandler(async (req: Request, res: Response) => {
  const { category, search, page = 1, limit = 20 } = req.query;

  try {
    const query: any = { isPublic: true };
    if (category) query.category = category;
    if (search) {
      const escaped = escapeRegex(search as string);
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const wishlists = await Wishlist.find(query)
      .populate('user', 'profile.firstName profile.lastName profile.avatar')
      .populate('items.itemId', 'name images basePrice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Wishlist.countDocuments(query);

    sendSuccess(res, {
      wishlists,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }, 'Public wishlists retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch public wishlists', 500);
  }
});

// Get default wishlist (or create one if it doesn't exist)
export const getDefaultWishlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    // First, try to find an existing default wishlist
    let wishlist = await Wishlist.findOne({ user: userId, isDefault: true })
      .populate('items.itemId', 'name images basePrice salePrice')
      .lean();

    // If no default wishlist exists, create one
    if (!wishlist) {
      const newWishlist = new Wishlist({
        user: userId,
        name: 'My Wishlist',
        description: 'My default wishlist',
        category: 'personal',
        isDefault: true,
        isPublic: false
      });

      await newWishlist.save();

      wishlist = await Wishlist.findById(newWishlist._id)
        .populate('items.itemId', 'name images basePrice salePrice')
        .lean();
    }

    sendSuccess(res, wishlist, 'Default wishlist retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch default wishlist', 500);
  }
});

// Check if an item is in user's wishlist (cached 60s)
export const checkWishlistStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { itemType, itemId } = req.query;

  try {
    if (!itemType || !itemId) {
      return sendBadRequest(res, 'itemType and itemId are required');
    }

    // Normalize itemType to match backend schema (capitalize first letter)
    const normalizedItemType = (itemType as string).charAt(0).toUpperCase() + (itemType as string).slice(1).toLowerCase();

    // Validate itemType - now includes 'Discount'
    const validTypes = ['Product', 'Store', 'Video', 'Discount'];
    if (!validTypes.includes(normalizedItemType)) {
      return sendBadRequest(res, `Invalid itemType. Must be one of: ${validTypes.join(', ')}`);
    }

    // Check cache first
    const cacheKey = `wishlist:status:${userId}:${normalizedItemType}:${itemId}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached !== null) {
      return sendSuccess(res, cached);
    }

    // Find any wishlist belonging to the user that contains this item
    const wishlist = await Wishlist.findOne({
      user: userId,
      'items.itemType': normalizedItemType,
      'items.itemId': itemId
    }).lean();

    let result: any;
    if (wishlist) {
      const item = (wishlist as any).items.find((i: any) =>
        i.itemType === normalizedItemType && i.itemId.toString() === itemId
      );

      result = {
        inWishlist: true,
        wishlistItemId: item?._id?.toString(),
        wishlistId: (wishlist as any)._id.toString(),
        addedAt: item?.addedAt
      };
    } else {
      result = { inWishlist: false };
    }

    redisService.set(cacheKey, result, 60).catch((err) => logger.warn('[Wishlist] Cache set for wishlist status failed', { error: err.message })); // 60s cache
    sendSuccess(res, result, result.inWishlist ? 'Item is in wishlist' : 'Item is not in wishlist');
  } catch (error) {
    throw new AppError('Failed to check wishlist status', 500);
  }
});

// Remove item from wishlist by itemType and itemId (for convenience)
export const removeItemByTypeAndId = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { itemType, itemId } = req.body;

  try {
    if (!itemType || !itemId) {
      return sendBadRequest(res, 'itemType and itemId are required');
    }

    // Normalize itemType to match backend schema
    const normalizedItemType = (itemType as string).charAt(0).toUpperCase() + (itemType as string).slice(1).toLowerCase();

    // Find wishlist containing this item and remove it
    const wishlist = await Wishlist.findOneAndUpdate(
      {
        user: userId,
        'items.itemType': normalizedItemType,
        'items.itemId': itemId
      },
      {
        $pull: { items: { itemType: normalizedItemType, itemId: itemId } }
      },
      { new: true }
    );

    if (!wishlist) {
      return sendNotFound(res, 'Item not found in any wishlist');
    }

    // If the removed item is a Store, decrement the followers count
    if (normalizedItemType === 'Store') {
      try {
        await storeFollowService.decrementFollowers(itemId);
      } catch (error) {
        logger.error('[WishlistController] Failed to decrement store followers:', error);
        // Don't fail the entire request if followers update fails
      }
    }

    // Invalidate wishlist status cache
    redisService.delPattern(`wishlist:status:${userId}:*`).catch((err) => logger.warn('[Wishlist] Cache invalidation for wishlist status after remove failed', { error: err.message }));

    sendSuccess(res, null, 'Item removed from wishlist successfully');
  } catch (error) {
    throw new AppError('Failed to remove item from wishlist', 500);
  }
});