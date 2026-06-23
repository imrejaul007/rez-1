import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import { validateRequest, validateQuery, validateParams } from '../middleware/merchantvalidation';
import { Store } from '../models/Store';
import Discount from '../models/Discount';
import Joi from 'joi';
import mongoose from 'mongoose';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const createDiscountSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().max(500).optional(),
  type: Joi.string().valid('percentage', 'fixed').required(),
  value: Joi.number().required().min(0),
  minOrderValue: Joi.number().min(0).default(0),
  maxDiscountAmount: Joi.number().min(0).optional(),
  storeId: Joi.string().optional(), // If provided, scope = 'store', else scope = 'merchant'
  applicableOn: Joi.string().valid('bill_payment', 'card_payment').required(),
  validFrom: Joi.date().required(),
  validUntil: Joi.date().required().min(Joi.ref('validFrom')),
  usageLimit: Joi.number().min(1).optional(),
  usageLimitPerUser: Joi.number().min(1).default(1),
  priority: Joi.number().min(0).max(100).default(0),
  restrictions: Joi.object({
    isOfflineOnly: Joi.boolean().default(false),
    notValidAboveStoreDiscount: Joi.boolean().default(false),
    singleVoucherPerBill: Joi.boolean().default(true),
  }).optional(),
  metadata: Joi.object({
    displayText: Joi.string().optional(),
    icon: Joi.string().optional(),
    backgroundColor: Joi.string().optional(),
  }).optional(),
  // Card Offer Specific Fields
  paymentMethod: Joi.string().valid('upi', 'card', 'all').optional(),
  cardType: Joi.string().valid('credit', 'debit', 'all').optional(),
  bankNames: Joi.array().items(Joi.string()).optional(),
  cardBins: Joi.array().items(Joi.string().regex(/^\d{6}$/)).optional(),
});

const updateDiscountSchema = createDiscountSchema.fork(
  ['name', 'type', 'value', 'validFrom', 'validUntil'],
  (schema) => schema.optional()
);

/**
 * @route   GET /api/merchant/discounts
 * @desc    Get all discounts for merchant's stores
 * @access  Private (Merchant)
 */
router.get('/', validateQuery(Joi.object({
  storeId: Joi.string().optional(),
  scope: Joi.string().valid('merchant', 'store').optional(),
  isActive: Joi.boolean().optional(),
  applicableOn: Joi.string().valid('bill_payment', 'card_payment').optional(),
  paymentMethod: Joi.string().valid('upi', 'card', 'all').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Build query - only merchant's discounts
    const query: any = {
      merchantId: new mongoose.Types.ObjectId(merchantId),
    };

    // Filter by applicableOn if provided
    if (req.query.applicableOn) {
      query.applicableOn = req.query.applicableOn;
    }

    // Filter by paymentMethod if provided (for card offers)
    if (req.query.paymentMethod) {
      query.paymentMethod = req.query.paymentMethod === 'all' 
        ? { $in: ['all', 'card', 'upi'] } 
        : req.query.paymentMethod;
    }

    // Filter by storeId if provided
    if (req.query.storeId) {
      const storeId = new mongoose.Types.ObjectId(req.query.storeId as string);
      
      // Verify store belongs to merchant
      const store = await Store.findOne({
        _id: storeId,
        merchantId: new mongoose.Types.ObjectId(merchantId)
      });
      
      if (!store) {
        return res.status(403).json({
          success: false,
          message: 'Store not found or access denied'
        });
      }
      
      query.storeId = storeId;
      query.scope = 'store';
    } else if (req.query.scope) {
      // Filter by scope (merchant or store)
      query.scope = req.query.scope;
      if (req.query.scope === 'merchant') {
        // Merchant-level discounts don't have storeId
        query.storeId = { $exists: false };
      }
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Execute query
    const [discounts, total] = await Promise.all([
      Discount.find(query)
        .populate('storeId', 'name slug')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Discount.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: {
        discounts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching merchant discounts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch discounts',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/merchant/discounts/:id
 * @desc    Get single discount by ID
 * @access  Private (Merchant)
 */
router.get('/:id', validateParams(Joi.object({
  id: Joi.string().required()
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const discountId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Find discount and verify ownership
    const discount = await Discount.findOne({
      _id: discountId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    })
      .populate('storeId', 'name slug')
      .lean();

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found or access denied'
      });
    }

    return res.json({
      success: true,
      data: discount
    });
  } catch (error: any) {
    logger.error('Error fetching discount:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch discount',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/merchant/discounts
 * @desc    Create new discount
 * @access  Private (Merchant)
 */
router.post('/', validateRequest(createDiscountSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const discountData: any = { ...req.body };
    const merchantObjectId = new mongoose.Types.ObjectId(merchantId);

    // Determine scope and set IDs
    let scope: 'merchant' | 'store' = 'merchant';
    let storeId: mongoose.Types.ObjectId | undefined;

    if (discountData.storeId) {
      // Validate store belongs to merchant
      const store = await Store.findOne({
        _id: discountData.storeId,
        merchantId: merchantObjectId
      });

      if (!store) {
        return res.status(400).json({
          success: false,
          message: 'Store not found or does not belong to this merchant'
        });
      }

      scope = 'store';
      storeId = new mongoose.Types.ObjectId(discountData.storeId);
    }

    // Create discount
    const discount = new Discount({
      name: discountData.name,
      description: discountData.description,
      type: discountData.type,
      value: discountData.value,
      minOrderValue: discountData.minOrderValue || 0,
      maxDiscountAmount: discountData.maxDiscountAmount,
      applicableOn: discountData.applicableOn || 'bill_payment', // Use provided applicableOn or default to bill_payment
      validFrom: new Date(discountData.validFrom),
      validUntil: new Date(discountData.validUntil),
      usageLimit: discountData.usageLimit,
      usageLimitPerUser: discountData.usageLimitPerUser || 1,
      priority: discountData.priority || 0,
      restrictions: {
        isOfflineOnly: discountData.restrictions?.isOfflineOnly || false,
        notValidAboveStoreDiscount: discountData.restrictions?.notValidAboveStoreDiscount || false,
        singleVoucherPerBill: discountData.restrictions?.singleVoucherPerBill !== false, // Default true
      },
      metadata: discountData.metadata || {},
      // Card Offer Specific Fields
      paymentMethod: discountData.paymentMethod,
      cardType: discountData.cardType,
      bankNames: discountData.bankNames,
      cardBins: discountData.cardBins,
      merchantId: merchantObjectId,
      storeId: storeId,
      scope: scope,
      createdBy: merchantObjectId,
      createdByType: 'merchant',
      isActive: true,
      usedCount: 0
    });

    await discount.save();

    // Populate store info for response
    if (storeId) {
      await discount.populate('storeId', 'name slug');
    }

    return res.status(201).json({
      success: true,
      data: discount,
      message: 'Discount created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating discount:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create discount',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/merchant/discounts/:id
 * @desc    Update existing discount
 * @access  Private (Merchant)
 */
router.put('/:id', validateParams(Joi.object({
  id: Joi.string().required()
})), validateRequest(updateDiscountSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const discountId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Find discount and verify ownership
    const discount = await Discount.findOne({
      _id: discountId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found or access denied'
      });
    }

    // Prevent changing scope after creation
    const updateData: any = { ...req.body };
    delete (updateData as any).scope;
    delete (updateData as any).merchantId;
    delete (updateData as any).createdBy;
    delete (updateData as any).createdByType;

    // Handle storeId update (if changing from merchant-level to store-level)
    if (updateData.storeId && !discount.storeId) {
      // Validate store belongs to merchant
      const store = await Store.findOne({
        _id: updateData.storeId,
        merchantId: new mongoose.Types.ObjectId(merchantId)
      });

      if (!store) {
        return res.status(400).json({
          success: false,
          message: 'Store not found or does not belong to this merchant'
        });
      }

      updateData.storeId = new mongoose.Types.ObjectId(updateData.storeId);
      updateData.scope = 'store';
    } else if (updateData.storeId === null && discount.storeId) {
      // Changing from store-level to merchant-level
      updateData.storeId = undefined;
      updateData.scope = 'merchant';
    }

    // Convert date strings to Date objects
    if (updateData.validFrom) {
      updateData.validFrom = new Date(updateData.validFrom);
    }
    if (updateData.validUntil) {
      updateData.validUntil = new Date(updateData.validUntil);
    }

    // Update discount
    Object.assign(discount, updateData);
    await discount.save();

    // Populate store info for response
    if (discount.storeId) {
      await discount.populate('storeId', 'name slug');
    }

    return res.json({
      success: true,
      data: discount,
      message: 'Discount updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating discount:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update discount',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/merchant/discounts/:id
 * @desc    Delete discount permanently (hard delete)
 * @access  Private (Merchant)
 */
router.delete('/:id', validateParams(Joi.object({
  id: Joi.string().required()
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const discountId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Find discount and verify ownership
    const discount = await Discount.findOne({
      _id: discountId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found or access denied'
      });
    }

    // Hard delete - permanently remove the discount from database
    await Discount.deleteOne({
      _id: discountId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    return res.json({
      success: true,
      message: 'Discount deleted successfully',
      data: {
        _id: discount._id
      }
    });
  } catch (error: any) {
    logger.error('Error deleting discount:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete discount',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/merchant/discounts/:id/analytics
 * @desc    Get discount analytics
 * @access  Private (Merchant)
 */
router.get('/:id/analytics', validateParams(Joi.object({
  id: Joi.string().required()
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const discountId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Find discount and verify ownership
    const discount = await Discount.findOne({
      _id: discountId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    }).lean();

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found or access denied'
      });
    }

    // Get usage statistics (if DiscountUsage model exists)
    // For now, return basic stats from discount document
    const analytics = {
      discount: {
        _id: discount._id,
        name: discount.name,
        type: discount.type,
        value: discount.value,
        scope: discount.scope,
        storeId: discount.storeId
      },
      usage: {
        totalUses: discount.usedCount || 0,
        usageLimit: discount.usageLimit || null,
        usageLimitPerUser: discount.usageLimitPerUser || 1,
        remainingUses: discount.usageLimit 
          ? Math.max(0, discount.usageLimit - (discount.usedCount || 0))
          : null
      },
      validity: {
        validFrom: discount.validFrom,
        validUntil: discount.validUntil,
        isCurrentlyValid: new Date() >= discount.validFrom && new Date() <= discount.validUntil && discount.isActive
      },
      status: {
        isActive: discount.isActive,
        priority: discount.priority
      }
    };

    return res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    logger.error('Error fetching discount analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch discount analytics',
      error: error.message
    });
  }
});

export default router;


