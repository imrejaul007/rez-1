import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import { validateRequest, validateQuery, validateParams } from '../middleware/merchantvalidation';
import { Store } from '../models/Store';
import Offer from '../models/Offer';
import { IOffer } from '../models/Offer';
import Joi from 'joi';
import AuditService from '../services/AuditService';
import mongoose from 'mongoose';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const createOfferSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  subtitle: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional(),
  image: Joi.string().uri().required(),
  category: Joi.string().valid('mega', 'student', 'new_arrival', 'trending', 'food', 'fashion', 'electronics', 'general').default('general'),
  type: Joi.string().valid('cashback', 'discount', 'voucher', 'combo', 'special', 'walk_in').default('walk_in'),
  cashbackPercentage: Joi.number().min(0).max(100).required(),
  originalPrice: Joi.number().min(0).optional(),
  discountedPrice: Joi.number().min(0).optional(),
  storeId: Joi.string().required(),
  validity: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required().min(Joi.ref('startDate')),
    isActive: Joi.boolean().default(true),
  }).required(),
  restrictions: Joi.object({
    minOrderValue: Joi.number().min(0).optional(),
    maxDiscountAmount: Joi.number().min(0).optional(),
    applicableOn: Joi.array().items(Joi.string()).optional(),
    excludedProducts: Joi.array().items(Joi.string()).optional(),
    usageLimitPerUser: Joi.number().min(1).optional(),
    usageLimit: Joi.number().min(1).optional(),
  }).optional(),
  metadata: Joi.object({
    isNew: Joi.boolean().default(false),
    isTrending: Joi.boolean().default(false),
    isBestSeller: Joi.boolean().default(false),
    isSpecial: Joi.boolean().default(false),
    priority: Joi.number().min(0).max(100).default(0),
    tags: Joi.array().items(Joi.string()).optional(),
    featured: Joi.boolean().default(false),
  }).optional(),
});

const updateOfferSchema = createOfferSchema.fork(
  ['title', 'image', 'storeId', 'validity'],
  (schema) => schema.optional()
);

/**
 * @route   GET /api/merchant/offers
 * @desc    Get all offers for merchant's stores
 * @access  Private (Merchant)
 */
router.get('/', validateQuery(Joi.object({
  store: Joi.string().optional(),
  type: Joi.string().valid('cashback', 'discount', 'voucher', 'combo', 'special', 'walk_in').optional(),
  active: Joi.boolean().optional(),
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

    // Get all stores belonging to this merchant
    const stores = await Store.find({ merchantId: new mongoose.Types.ObjectId(merchantId) });
    const storeIds = stores.map(s => s._id);

    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: {
          items: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false,
          }
        }
      });
    }

    // Build query
    const query: any = {
      'store.id': { $in: storeIds },
    };

    // Filter by store if provided
    if (req.query.store) {
      const storeId = new mongoose.Types.ObjectId(req.query.store as string);
      // Verify store belongs to merchant
      const store = stores.find((s: any) => (s._id as mongoose.Types.ObjectId).toString() === storeId.toString());
      if (!store) {
        return res.status(403).json({
          success: false,
          message: 'Store not found or access denied'
        });
      }
      query['store.id'] = storeId;
    }

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Filter by active status
    if (req.query.active !== undefined) {
      query['validity.isActive'] = req.query.active === 'true';
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Execute query
    const [offers, total] = await Promise.all([
      Offer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Offer.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        items: offers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrevious: page > 1,
        }
      }
    });
  } catch (error: any) {
    logger.error('Get merchant offers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/merchant/offers
 * @desc    Create a new offer for a store
 * @access  Private (Merchant)
 */
router.post('/', validateRequest(createOfferSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const offerData = req.body;

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: offerData.storeId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!store) {
      return res.status(403).json({
        success: false,
        message: 'Store not found or access denied'
      });
    }

    // Get store location for offer
    const storeLocation = store.location?.coordinates || [0, 0];

    // Create offer
    const offer = new Offer({
      title: offerData.title,
      subtitle: offerData.subtitle,
      description: offerData.description,
      image: offerData.image,
      category: offerData.category || 'general',
      type: offerData.type || 'walk_in',
      cashbackPercentage: offerData.cashbackPercentage,
      originalPrice: offerData.originalPrice,
      discountedPrice: offerData.discountedPrice,
      location: {
        type: 'Point',
        coordinates: storeLocation,
      },
      store: {
        id: store._id,
        name: store.name,
        logo: store.logo,
        rating: store.ratings?.average || 0,
        verified: store.isVerified || false,
      },
      validity: {
        startDate: new Date(offerData.validity.startDate),
        endDate: new Date(offerData.validity.endDate),
        isActive: offerData.validity.isActive !== undefined ? offerData.validity.isActive : true,
      },
      restrictions: offerData.restrictions || {},
      metadata: {
        ...offerData.metadata,
        priority: offerData.metadata?.priority || 0,
        tags: offerData.metadata?.tags || [],
      },
      engagement: {
        likesCount: 0,
        sharesCount: 0,
        viewsCount: 0,
      },
      createdBy: new mongoose.Types.ObjectId(merchantId),
    });

    await offer.save();

    // Update store's offers.discounts array
    if (!store.offers.discounts) {
      store.offers.discounts = [];
    }
    store.offers.discounts.push(offer._id);
    await store.save();

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'offer.created',
      resourceType: 'offer',
      resourceId: offer._id.toString(),
      details: {
        metadata: {
          offerTitle: offer.title,
          storeId: (store._id as mongoose.Types.ObjectId).toString(),
          storeName: store.name,
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    return res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer
    });
  } catch (error: any) {
    logger.error('Create offer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create offer',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/merchant/offers/:id
 * @desc    Get a single offer by ID
 * @access  Private (Merchant)
 */
router.get('/:id', validateParams(Joi.object({
  id: Joi.string().required()
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const offerId = req.params.id;

    // Get offer
    const offer = await Offer.findById(offerId).lean();

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Verify offer belongs to merchant's store
    const store = await Store.findOne({
      _id: offer.store.id,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!store) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    return res.json({
      success: true,
      data: offer
    });
  } catch (error: any) {
    logger.error('Get offer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch offer',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/merchant/offers/:id
 * @desc    Update an offer
 * @access  Private (Merchant)
 */
router.put('/:id', validateParams(Joi.object({
  id: Joi.string().required()
})), validateRequest(updateOfferSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const offerId = req.params.id;
    const updateData = req.body;

    // Get offer
    const offer = await Offer.findById(offerId);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Verify offer belongs to merchant's store
    const store = await Store.findOne({
      _id: offer.store.id,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!store) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // If storeId is being updated, verify new store belongs to merchant
    if (updateData.storeId && updateData.storeId !== offer.store.id.toString()) {
      const newStore = await Store.findOne({
        _id: updateData.storeId,
        merchantId: new mongoose.Types.ObjectId(merchantId)
      });

      if (!newStore) {
        return res.status(403).json({
          success: false,
          message: 'New store not found or access denied'
        });
      }

      // Remove from old store
      if (store.offers.discounts) {
        store.offers.discounts = store.offers.discounts.filter(
          (id: mongoose.Types.ObjectId) => id.toString() !== offerId
        );
        await store.save();
      }

      // Add to new store
      if (!newStore.offers.discounts) {
        newStore.offers.discounts = [];
      }
      newStore.offers.discounts.push(offer._id);
      await newStore.save();

      // Update offer store info
      offer.store = {
        id: newStore._id as mongoose.Types.ObjectId,
        name: newStore.name,
        logo: newStore.logo,
        rating: newStore.ratings?.average || 0,
        verified: newStore.isVerified || false,
      };
    }

    // Update offer fields
    if (updateData.title) offer.title = updateData.title;
    if (updateData.subtitle !== undefined) offer.subtitle = updateData.subtitle;
    if (updateData.description !== undefined) offer.description = updateData.description;
    if (updateData.image) offer.image = updateData.image;
    if (updateData.category) offer.category = updateData.category;
    if (updateData.type) offer.type = updateData.type;
    if (updateData.cashbackPercentage !== undefined) offer.cashbackPercentage = updateData.cashbackPercentage;
    if (updateData.originalPrice !== undefined) offer.originalPrice = updateData.originalPrice;
    if (updateData.discountedPrice !== undefined) offer.discountedPrice = updateData.discountedPrice;
    if (updateData.validity) {
      if (updateData.validity.startDate) offer.validity.startDate = new Date(updateData.validity.startDate);
      if (updateData.validity.endDate) offer.validity.endDate = new Date(updateData.validity.endDate);
      if (updateData.validity.isActive !== undefined) offer.validity.isActive = updateData.validity.isActive;
    }
    if (updateData.restrictions) {
      offer.restrictions = { ...offer.restrictions, ...updateData.restrictions };
    }
    if (updateData.metadata) {
      offer.metadata = { ...offer.metadata, ...updateData.metadata };
    }

    await offer.save();

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'offer.updated',
      resourceType: 'offer',
      resourceId: offer._id.toString(),
      details: {
        metadata: {
          offerTitle: offer.title,
          storeId: (store._id as mongoose.Types.ObjectId).toString(),
          storeName: store.name,
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    return res.json({
      success: true,
      message: 'Offer updated successfully',
      data: offer
    });
  } catch (error: any) {
    logger.error('Update offer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update offer',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/merchant/offers/:id
 * @desc    Delete an offer
 * @access  Private (Merchant)
 */
router.delete('/:id', validateParams(Joi.object({
  id: Joi.string().required()
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const offerId = req.params.id;

    // Get offer
    const offer = await Offer.findById(offerId);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    // Verify offer belongs to merchant's store
    const store = await Store.findOne({
      _id: offer.store.id,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!store) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Remove from store's offers.discounts array
    if (store.offers.discounts) {
      store.offers.discounts = store.offers.discounts.filter(
        (id: mongoose.Types.ObjectId) => id.toString() !== offerId
      );
      await store.save();
    }

    // Delete offer
    await Offer.findByIdAndDelete(offerId);

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'offer.deleted',
      resourceType: 'offer',
      resourceId: offerId,
      details: {
        metadata: {
          offerTitle: offer.title,
          storeId: (store._id as mongoose.Types.ObjectId).toString(),
          storeName: store.name,
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    return res.json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error: any) {
    logger.error('Delete offer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete offer',
      error: error.message
    });
  }
});

export default router;

