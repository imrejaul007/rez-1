import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { StoreComparison } from '../models/StoreComparison';
import { Store } from '../models/Store';
import { 
  sendSuccess, 
  sendNotFound, 
  sendBadRequest,
  sendCreated 
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Create a new store comparison
export const createComparison = asyncHandler(async (req: Request, res: Response) => {
  const { storeIds, name } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  if (!Array.isArray(storeIds) || storeIds.length < 2 || storeIds.length > 5) {
    throw new AppError('Comparison must include 2-5 stores', 400);
  }

  try {
    // Verify all stores exist and are active
    const stores = await Store.find({
      _id: { $in: storeIds },
      isActive: true
    }).lean();

    if (stores.length !== storeIds.length) {
      throw new AppError('One or more stores not found or inactive', 404);
    }

    // Check if comparison already exists
    const existingComparison = await StoreComparison.findComparisonByStores(userId, storeIds);
    if (existingComparison) {
      throw new AppError('Comparison with these stores already exists', 400);
    }

    // Create new comparison
    const comparison = new StoreComparison({
      user: userId,
      stores: storeIds,
      name: name || `Comparison ${new Date().toLocaleDateString()}`
    });

    await comparison.save();
    await comparison.populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');

    sendCreated(res, {
      comparison
    }, 'Store comparison created successfully');

  } catch (error) {
    logger.error('Create comparison error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to create store comparison', 500);
  }
});

// Get user's store comparisons
export const getUserComparisons = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { page = 1, limit = 20 } = req.query;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const result = await StoreComparison.getUserComparisons(userId, Number(page), Number(limit));

    sendSuccess(res, {
      comparisons: result.comparisons,
      pagination: result.pagination
    });

  } catch (error) {
    logger.error('Get user comparisons error:', error);
    throw new AppError('Failed to fetch user comparisons', 500);
  }
});

// Get specific comparison by ID
export const getComparisonById = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const comparison = await StoreComparison.findOne({
      _id: comparisonId,
      user: userId
    }).populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified').lean();

    if (!comparison) {
      throw new AppError('Comparison not found', 404);
    }

    sendSuccess(res, {
      comparison
    });

  } catch (error) {
    logger.error('Get comparison by ID error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch comparison', 500);
  }
});

// Update comparison (add/remove stores or rename)
export const updateComparison = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId } = req.params;
  const { storeIds, name } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const comparison = await StoreComparison.findOne({
      _id: comparisonId,
      user: userId
    }).lean();

    if (!comparison) {
      throw new AppError('Comparison not found', 404);
    }

    // Update stores if provided
    if (storeIds) {
      if (!Array.isArray(storeIds) || storeIds.length < 2 || storeIds.length > 5) {
        throw new AppError('Comparison must include 2-5 stores', 400);
      }

      // Verify all stores exist and are active
      const stores = await Store.find({
        _id: { $in: storeIds },
        isActive: true
      }).lean();

      if (stores.length !== storeIds.length) {
        throw new AppError('One or more stores not found or inactive', 404);
      }

      comparison.stores = storeIds;
    }

    // Update name if provided
    if (name) {
      comparison.name = name;
    }

    await comparison.save();
    await comparison.populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');

    sendSuccess(res, {
      comparison
    }, 'Comparison updated successfully');

  } catch (error) {
    logger.error('Update comparison error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update comparison', 500);
  }
});

// Delete comparison
export const deleteComparison = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const comparison = await StoreComparison.findOneAndDelete({
      _id: comparisonId,
      user: userId
    });

    if (!comparison) {
      throw new AppError('Comparison not found', 404);
    }

    sendSuccess(res, null, 'Comparison deleted successfully');

  } catch (error) {
    logger.error('Delete comparison error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to delete comparison', 500);
  }
});

// Add store to comparison
export const addStoreToComparison = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId } = req.params;
  const { storeId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const comparison = await StoreComparison.findOne({
      _id: comparisonId,
      user: userId
    }).lean();

    if (!comparison) {
      throw new AppError('Comparison not found', 404);
    }

    // Check if store is already in comparison
    if (comparison.stores.includes(storeId)) {
      throw new AppError('Store is already in this comparison', 400);
    }

    // Check if comparison has reached maximum stores
    if (comparison.stores.length >= 5) {
      throw new AppError('Comparison can have maximum 5 stores', 400);
    }

    // Verify store exists and is active
    const store = await Store.findOne({
      _id: storeId,
      isActive: true
    }).lean();

    if (!store) {
      throw new AppError('Store not found or inactive', 404);
    }

    // Add store to comparison
    comparison.stores.push(storeId);
    await comparison.save();
    await comparison.populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');

    sendSuccess(res, {
      comparison
    }, 'Store added to comparison successfully');

  } catch (error) {
    logger.error('Add store to comparison error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to add store to comparison', 500);
  }
});

// Remove store from comparison
export const removeStoreFromComparison = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId, storeId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const comparison = await StoreComparison.findOne({
      _id: comparisonId,
      user: userId
    });

    if (!comparison) {
      throw new AppError('Comparison not found', 404);
    }

    // Check if comparison has minimum stores
    if (comparison.stores.length <= 2) {
      throw new AppError('Comparison must have at least 2 stores', 400);
    }

    // Remove store from comparison
    comparison.stores = comparison.stores.filter(id => id.toString() !== storeId);
    await comparison.save();
    await comparison.populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');

    sendSuccess(res, {
      comparison
    }, 'Store removed from comparison successfully');

  } catch (error) {
    logger.error('Remove store from comparison error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to remove store from comparison', 500);
  }
});

// Get comparison statistics
export const getComparisonStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const stats = await StoreComparison.getComparisonStats(userId);

    sendSuccess(res, {
      stats
    });

  } catch (error) {
    logger.error('Get comparison stats error:', error);
    throw new AppError('Failed to fetch comparison statistics', 500);
  }
});

// Clear all comparisons
export const clearAllComparisons = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const result = await StoreComparison.deleteMany({ user: userId });

    sendSuccess(res, {
      deletedCount: result.deletedCount
    }, 'All comparisons cleared successfully');

  } catch (error) {
    logger.error('Clear all comparisons error:', error);
    throw new AppError('Failed to clear all comparisons', 500);
  }
});
