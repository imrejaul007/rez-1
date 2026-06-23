/**
 * Product Routes — Bulk section (Phase 6.3)
 *
 * Extracted from the original monolithic products.ts. Handles:
 * - POST /bulk, POST /bulk-action
 * - User-side product sync (create/update/delete)
 */

import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/merchantauth";
import { Product } from "../models/Product";
import { MProduct as MerchantProduct } from "../models/MerchantProduct";
import { Store } from "../models/Store";
import { Category } from "../models/Category";
import mongoose, { Types } from "mongoose";
import { Merchant } from "../models/Merchant";
import { productBulkLimiter } from "../middleware/rateLimiter";
import { CacheInvalidator } from "../utils/cacheHelper";
import { logger } from "../config/logger";
import AuditService from "../services/AuditService";
import { createUserSideProduct, updateUserSideProduct, deleteUserSideProduct } from "./productsUserSideSync";

const router = Router();

router.use(authMiddleware);

// @route   POST /api/products/bulk
// @desc    Bulk operations on products (deprecated - use /bulk-action)
// @access  Private
router.post('/bulk', productBulkLimiter, async (req, res) => {
  try {
    const { productIds, action, data } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs are required'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }

    const updateQuery: any = { updatedAt: new Date() };

    switch (action) {
      case 'activate':
        updateQuery.status = 'active';
        break;
      case 'deactivate':
        updateQuery.status = 'inactive';
        break;
      case 'update_category':
        if (!data?.category) {
          return res.status(400).json({
            success: false,
            message: 'Category is required for category update'
          });
        }
        updateQuery.category = data.category;
        break;
      case 'update_pricing':
        if (!data?.priceAdjustment) {
          return res.status(400).json({
            success: false,
            message: 'Price adjustment data is required'
          });
        }
        // Add logic for price adjustments as needed
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    // Perform bulk action
    let affectedCount: number;
    if (action === 'delete') {
      const result = await Product.deleteMany({
        _id: { $in: productIds },
        merchantId: req.merchantId
      });
      affectedCount = result.deletedCount || 0;
    } else {
      const result = await Product.updateMany(
        { _id: { $in: productIds }, merchantId: req.merchantId },
        { $set: updateQuery }
      );
      affectedCount = result.modifiedCount || 0;
    }

    return res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      data: { affectedCount }
    });
  } catch (error: any) {
    logger.error('Bulk operation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Bulk operation failed',
      error: error.message
    });
  }
});

// @route   POST /api/products/bulk-action
// @desc    Perform bulk actions on multiple products with validation and transactions
// @access  Private
router.post('/bulk-action', productBulkLimiter, async (req, res) => {
  try {
    const { action, productIds } = req.body;

    // Validate input
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    if (productIds.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 1000 products can be processed at once'
      });
    }

    // Validate action
    const validActions = ['delete', 'activate', 'deactivate', 'archive'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }

    // Start MongoDB session for transaction
    const session = await Product.db.startSession();
    session.startTransaction();

    try {
      // Verify all products belong to merchant
      const existingProducts = await Product.find({
        _id: { $in: productIds },
        merchantId: req.merchantId
      }).session(session);

      if (existingProducts.length === 0) {
        throw new Error('No products found');
      }

      const foundIds = existingProducts.map(p => p._id.toString());
      const notFoundIds = productIds.filter((id: string) => !foundIds.includes(id));

      let result;
      let successCount = 0;
      const errors: any[] = [];

      switch (action) {
        case 'delete':
          // Delete products and sync with user-side
          result = await Product.deleteMany({
            _id: { $in: foundIds },
            merchantId: req.merchantId
          }).session(session);

          successCount = result.deletedCount || 0;

          // Delete corresponding user-side products
          for (const product of existingProducts) {
            await deleteUserSideProduct(product._id.toString());
          }
          break;

        case 'activate':
          result = await Product.updateMany(
            { _id: { $in: foundIds }, merchantId: req.merchantId },
            { $set: { status: 'active', updatedAt: new Date() } }
          ).session(session);
          successCount = result.modifiedCount || 0;

          // Update user-side products
          for (const product of existingProducts) {
            product.status = 'active';
            await updateUserSideProduct(product, req.merchantId!);
          }
          break;

        case 'deactivate':
          result = await Product.updateMany(
            { _id: { $in: foundIds }, merchantId: req.merchantId },
            { $set: { status: 'inactive', updatedAt: new Date() } }
          ).session(session);
          successCount = result.modifiedCount || 0;

          // Update user-side products
          for (const product of existingProducts) {
            product.status = 'inactive';
            await updateUserSideProduct(product, req.merchantId!);
          }
          break;

        case 'archive':
          result = await Product.updateMany(
            { _id: { $in: foundIds }, merchantId: req.merchantId },
            { $set: { status: 'archived', updatedAt: new Date() } }
          ).session(session);
          successCount = result.modifiedCount || 0;
          break;

        default:
          throw new Error('Invalid action');
      }

      // Commit transaction
      await session.commitTransaction();

      // Add errors for not found products
      if (notFoundIds.length > 0) {
        notFoundIds.forEach((id: string) => {
          errors.push({
            productId: id,
            error: 'Product not found or does not belong to merchant'
          });
        });
      }

      // Send real-time notification
      if (global.io) {
        global.io.to(`merchant-${req.merchantId}`).emit('products_bulk_action', {
          action,
          successCount,
          timestamp: new Date()
        });
      }

      // Audit log: Bulk action performed
      await AuditService.log({
        merchantId: req.merchantId!,
        action: `product.bulk_${action}`,
        resourceType: 'product',
        details: {
          metadata: {
            productIds: foundIds,
            successCount,
            failedCount: errors.length
          }
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        severity: 'info'
      });

      return res.json({
        success: successCount > 0,
        message: `Bulk ${action} completed. ${successCount} succeeded, ${errors.length} failed.`,
        data: {
          success: successCount,
          failed: errors.length,
          total: productIds.length,
          errors: errors.length > 0 ? errors : undefined
        }
      });

    } catch (error: any) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error: any) {
    logger.error('Bulk action error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action',
      error: error.message
    });
  }
});

export default router;
