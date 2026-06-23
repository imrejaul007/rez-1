import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { ProductComparison } from '../models/ProductComparison';
import { Product } from '../models/Product';
import { 
  sendSuccess, 
  sendNotFound, 
  sendBadRequest,
  sendCreated 
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Create a new product comparison
export const createProductComparison = asyncHandler(async (req: Request, res: Response) => {
  const { productIds, name } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 5) {
    throw new AppError('Comparison must include 2-5 products', 400);
  }

  try {
    // Verify all products exist and are active
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true
    }).lean();

    if (products.length !== productIds.length) {
      throw new AppError('One or more products not found or inactive', 404);
    }

    // Check if comparison already exists
    const existingComparison = await ProductComparison.findComparisonByProducts(userId, productIds);
    if (existingComparison) {
      throw new AppError('Comparison with these products already exists', 400);
    }

    // Create new comparison
    const comparison = new ProductComparison({
      user: userId,
      products: productIds,
      name: name || `Comparison ${new Date().toLocaleDateString()}`
    });

    await comparison.save();
    await comparison.populate({
      path: 'products',
      select: 'name description images pricing ratings inventory cashback store category brand weight specifications deliveryInfo',
      populate: [
        {
          path: 'store',
          select: 'name logo'
        },
        {
          path: 'category',
          select: 'name slug'
        }
      ]
    });

    sendCreated(res, {
      comparison
    }, 'Product comparison created successfully');

  } catch (error) {
    logger.error('Create product comparison error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to create product comparison', 500);
  }
});

// Get user's product comparisons
export const getUserProductComparisons = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { page = 1, limit = 20 } = req.query;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const result = await ProductComparison.getUserComparisons(userId, Number(page), Number(limit));

    sendSuccess(res, {
      comparisons: result.comparisons,
      pagination: result.pagination
    });

  } catch (error) {
    logger.error('Get user product comparisons error:', error);
    throw new AppError('Failed to fetch user product comparisons', 500);
  }
});

// Get specific product comparison by ID
export const getProductComparisonById = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const comparison = await ProductComparison.findOne({
      _id: comparisonId,
      user: userId
    }).populate({
      path: 'products',
      select: 'name description images pricing ratings inventory cashback store category brand weight specifications deliveryInfo',
      populate: [
        {
          path: 'store',
          select: 'name logo'
        },
        {
          path: 'category',
          select: 'name slug'
        }
      ]
    }).lean();

    if (!comparison) {
      return sendNotFound(res, 'Product comparison not found');
    }

    sendSuccess(res, {
      comparison
    });

  } catch (error) {
    logger.error('Get product comparison by ID error:', error);
    throw new AppError('Failed to fetch product comparison', 500);
  }
});

// Update product comparison
export const updateProductComparison = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId } = req.params;
  const { productIds, name } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const comparison = await ProductComparison.findOne({
      _id: comparisonId,
      user: userId
    }).lean();

    if (!comparison) {
      return sendNotFound(res, 'Product comparison not found');
    }

    if (productIds) {
      if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 5) {
        throw new AppError('Comparison must include 2-5 products', 400);
      }

      // Verify all products exist
      const products = await Product.find({
        _id: { $in: productIds },
        isActive: true
      }).lean();

      if (products.length !== productIds.length) {
        throw new AppError('One or more products not found or inactive', 404);
      }

      comparison.products = productIds;
    }

    if (name !== undefined) {
      comparison.name = name;
    }

    await comparison.save();
    await comparison.populate({
      path: 'products',
      select: 'name description images pricing ratings inventory cashback store category brand weight specifications deliveryInfo',
      populate: [
        {
          path: 'store',
          select: 'name logo'
        },
        {
          path: 'category',
          select: 'name slug'
        }
      ]
    });

    sendSuccess(res, {
      comparison
    }, 'Product comparison updated successfully');

  } catch (error) {
    logger.error('Update product comparison error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update product comparison', 500);
  }
});

// Delete product comparison
export const deleteProductComparison = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const comparison = await ProductComparison.findOneAndDelete({
      _id: comparisonId,
      user: userId
    });

    if (!comparison) {
      return sendNotFound(res, 'Product comparison not found');
    }

    sendSuccess(res, null, 'Product comparison deleted successfully');

  } catch (error) {
    logger.error('Delete product comparison error:', error);
    throw new AppError('Failed to delete product comparison', 500);
  }
});

// Add product to comparison
export const addProductToComparison = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId } = req.params;
  const { productId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  if (!productId) {
    throw new AppError('Product ID is required', 400);
  }

  try {
    const comparison = await ProductComparison.findOne({
      _id: comparisonId,
      user: userId
    }).lean();

    if (!comparison) {
      return sendNotFound(res, 'Product comparison not found');
    }

    if (comparison.products.length >= 5) {
      throw new AppError('Comparison cannot have more than 5 products', 400);
    }

    if (comparison.products.includes(productId as any)) {
      throw new AppError('Product already in comparison', 400);
    }

    // Verify product exists
    const product = await Product.findOne({
      _id: productId,
      isActive: true
    }).lean();

    if (!product) {
      throw new AppError('Product not found or inactive', 404);
    }

    comparison.products.push(productId as any);
    await comparison.save();
    await comparison.populate({
      path: 'products',
      select: 'name description images pricing ratings inventory cashback store category brand weight specifications deliveryInfo',
      populate: [
        {
          path: 'store',
          select: 'name logo'
        },
        {
          path: 'category',
          select: 'name slug'
        }
      ]
    });

    sendSuccess(res, {
      comparison
    }, 'Product added to comparison successfully');

  } catch (error) {
    logger.error('Add product to comparison error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to add product to comparison', 500);
  }
});

// Remove product from comparison
export const removeProductFromComparison = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId, productId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const comparison = await ProductComparison.findOne({
      _id: comparisonId,
      user: userId
    });

    if (!comparison) {
      return sendNotFound(res, 'Product comparison not found');
    }

    if (comparison.products.length <= 2) {
      throw new AppError('Comparison must have at least 2 products', 400);
    }

    comparison.products = comparison.products.filter(
      (id) => id.toString() !== productId
    );

    await comparison.save();
    await comparison.populate({
      path: 'products',
      select: 'name description images pricing ratings inventory cashback store category brand weight specifications deliveryInfo',
      populate: [
        {
          path: 'store',
          select: 'name logo'
        },
        {
          path: 'category',
          select: 'name slug'
        }
      ]
    });

    sendSuccess(res, {
      comparison
    }, 'Product removed from comparison successfully');

  } catch (error) {
    logger.error('Remove product from comparison error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to remove product from comparison', 500);
  }
});

// Get product comparison statistics
export const getProductComparisonStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const stats = await ProductComparison.getComparisonStats(userId);

    sendSuccess(res, {
      stats
    });

  } catch (error) {
    logger.error('Get product comparison stats error:', error);
    throw new AppError('Failed to fetch comparison statistics', 500);
  }
});

// Clear all product comparisons for user
export const clearAllProductComparisons = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const result = await ProductComparison.deleteMany({ user: userId });

    sendSuccess(res, {
      deletedCount: result.deletedCount
    }, 'All product comparisons cleared successfully');

  } catch (error) {
    logger.error('Clear all product comparisons error:', error);
    throw new AppError('Failed to clear product comparisons', 500);
  }
});
