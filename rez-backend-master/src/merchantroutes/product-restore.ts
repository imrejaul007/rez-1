import { Router } from 'express';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { validateParams } from '../middleware/merchantvalidation';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import Joi from 'joi';
import mongoose from 'mongoose';
import AuditService from '../services/AuditService';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const productIdSchema = Joi.object({
  id: Joi.string().required()
});

// @route   POST /api/products/:id/restore
// @desc    Restore soft-deleted product
// @access  Private
router.post('/:id/restore', validateParams(productIdSchema), async (req, res) => {
  try {
    const productId = req.params.id;
    const merchantId = req.merchantId;

    logger.info('🔄 [RESTORE PRODUCT] Request received:');
    logger.info('   Product ID:', productId);
    logger.info('   Merchant ID:', merchantId);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      logger.info('❌ [RESTORE PRODUCT] Invalid product ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);
    const merchantObjectId = new mongoose.Types.ObjectId(merchantId);

    // Find DELETED product - explicitly query for deleted products
    let product = await Product.findOne({
      _id: productObjectId,
      merchantId: merchantObjectId,
      isDeleted: true // Only find deleted products
    });

    // If not found by merchantId, try finding through stores
    if (!product) {
      logger.info('🔍 [RESTORE PRODUCT] Product not found by merchantId, checking through stores...');

      const merchantStores = await Store.find({ merchantId: merchantObjectId }).select('_id');
      const storeIds = merchantStores.map(store => store._id);

      if (storeIds.length > 0) {
        product = await Product.findOne({
          _id: productObjectId,
          store: { $in: storeIds },
          isDeleted: true // Only find deleted products
        });

        if (product) {
          logger.info('✅ [RESTORE PRODUCT] Product found via store relationship');
        }
      }
    } else {
      logger.info('✅ [RESTORE PRODUCT] Product found via merchantId');
    }

    if (!product) {
      logger.info('❌ [RESTORE PRODUCT] Product not found or not deleted');
      return res.status(404).json({
        success: false,
        message: 'Product not found or not deleted'
      });
    }

    logger.info('✅ [RESTORE PRODUCT] Deleted product found:', product.name);
    logger.info('   Deleted At:', product.deletedAt);

    // Check if product can be restored (within 30 days)
    if (product.deletedAt) {
      const daysSinceDeletion = Math.floor(
        (Date.now() - product.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      logger.info('   Days since deletion:', daysSinceDeletion);

      if (daysSinceDeletion > 30) {
        return res.status(400).json({
          success: false,
          message: `Product was deleted ${daysSinceDeletion} days ago and cannot be restored (30-day limit exceeded)`
        });
      }
    }

    // Restore the product
    await product.restore();

    logger.info(`✅ Product "${product.name}" (ID: ${product._id}) restored successfully`);

    // Restore corresponding user-side product
    await restoreUserSideProduct(product.sku);

    // Audit log: Product restored
    await AuditService.log({
      merchantId: merchantId!,
      action: 'product.restored',
      resourceType: 'product',
      resourceId: product._id,
      details: {
        metadata: {
          name: product.name,
          sku: product.sku,
          restoredAt: new Date()
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${req.merchantId}`).emit('product_restored', {
        productId: product._id,
        productName: product.name
      });
    }

    return res.json({
      success: true,
      message: 'Product restored successfully',
      data: {
        product: product.toObject ? product.toObject() : product
      }
    });
  } catch (error: any) {
    logger.error('Restore product error:', error);

    // Handle specific error for restoration time limit
    if (error.message && error.message.includes('Cannot restore product deleted more than 30 days ago')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to restore product',
      error: error.message
    });
  }
});

// @route   GET /api/products/deleted
// @desc    Get all soft-deleted products for merchant
// @access  Private
router.get('/deleted', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    logger.info('📋 [GET DELETED PRODUCTS] Request received:');
    logger.info('   Merchant ID:', merchantId);
    logger.info('   Page:', page, 'Limit:', limit);

    const merchantObjectId = new mongoose.Types.ObjectId(merchantId);

    // Find all stores belonging to this merchant
    const merchantStores = await Store.find({ merchantId: merchantObjectId }).select('_id');
    const storeIds = merchantStores.map(store => store._id);

    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: {
          products: [],
          pagination: {
            totalCount: 0,
            page,
            limit,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          }
        }
      });
    }

    // Query for deleted products
    const query: any = {
      store: { $in: storeIds },
      isDeleted: true
    };

    const [products, totalCount] = await Promise.all([
      Product.find(query)
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);

    logger.info(`✅ Found ${totalCount} deleted products`);

    const totalPages = Math.ceil(totalCount / limit);

    // Add restoration eligibility info
    const productsWithEligibility = products.map(product => {
      const productObj = product.toObject ? product.toObject() : product;
      let canRestore = false;
      let daysUntilPermanent = 0;

      if (product.deletedAt) {
        const daysSinceDeletion = Math.floor(
          (Date.now() - product.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        canRestore = daysSinceDeletion <= 30;
        daysUntilPermanent = Math.max(0, 30 - daysSinceDeletion);
      }

      return {
        ...productObj,
        canRestore,
        daysUntilPermanent
      };
    });

    return res.json({
      success: true,
      data: {
        products: productsWithEligibility,
        pagination: {
          totalCount,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      }
    });
  } catch (error: any) {
    logger.error('Get deleted products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch deleted products',
      error: error.message
    });
  }
});

// Helper function to restore user-side product
async function restoreUserSideProduct(sku: string): Promise<void> {
  const session = await Product.db.startSession();
  session.startTransaction();

  try {
    // Find the corresponding deleted user-side product by SKU
    const userProduct = await Product.findOne({
      sku,
      isDeleted: true
    }).session(session);

    if (!userProduct) {
      await session.abortTransaction();
      logger.info(`⚠️ No corresponding deleted user-side product found for SKU "${sku}"`);
      return;
    }

    // Restore the user-side product
    await userProduct.restore();
    await session.commitTransaction();

    logger.info(`🔄 Restored user-side product with SKU "${sku}"`);

    // Emit Socket.IO event after successful restoration
    if (global.io) {
      global.io.emit('product_synced', {
        action: 'restored',
        productSku: sku,
        productName: userProduct.name,
        restoredAt: new Date(),
        timestamp: new Date()
      });
    }
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error restoring user-side product:', error);
  } finally {
    session.endSession();
  }
}

export default router;
