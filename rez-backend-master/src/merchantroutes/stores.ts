import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { validateRequest, validateQuery, validateParams } from '../middleware/merchantvalidation';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { Merchant } from '../models/Merchant';
import Review from '../models/Review';
import { Video } from '../models/Video';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import Joi from 'joi';
import AuditService from '../services/AuditService';
import mongoose from 'mongoose';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
// P-12: Cache invalidation on store mutations
import { CacheInvalidator } from '../utils/cacheHelper';
import { logger } from '../config/logger';
import { geocodingService } from '../services/geocodingService';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const createStoreSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().max(1000).optional(),
  logo: Joi.string().allow('').optional(),
  banner: Joi.alternatives().try(
    Joi.string().allow(''),
    Joi.array().items(Joi.string().allow('')).min(1).max(10) // Support 1-10 banner images
  ).optional(),
  category: Joi.string().required(),
  location: Joi.object({
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().optional(),
    pincode: Joi.string().pattern(/^\d{6}$/).optional(),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(), // [longitude, latitude]
    deliveryRadius: Joi.number().min(0).max(500).default(5), // Allow up to 500km for regional delivery
    landmark: Joi.string().optional()
  }).required(),
  contact: Joi.object({
    phone: Joi.string().allow('').optional(),
    email: Joi.string().email().allow('').optional(),
    website: Joi.string().allow('').optional(),
    whatsapp: Joi.string().allow('').optional()
  }).optional(),
  operationalInfo: Joi.object({
    hours: Joi.object({
      monday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean().default(false)
      }).optional(),
      tuesday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean().default(false)
      }).optional(),
      wednesday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean().default(false)
      }).optional(),
      thursday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean().default(false)
      }).optional(),
      friday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean().default(false)
      }).optional(),
      saturday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean().default(false)
      }).optional(),
      sunday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean().default(false)
      }).optional()
    }).optional(),
    deliveryTime: Joi.string().optional(),
    minimumOrder: Joi.number().min(0).default(0),
    deliveryFee: Joi.number().min(0).default(0),
    freeDeliveryAbove: Joi.number().min(0).optional(),
    acceptsWalletPayment: Joi.boolean().default(true),
    paymentMethods: Joi.array().items(Joi.string()).default(['cash', 'card', 'upi', 'wallet'])
  }).optional(),
  offers: Joi.object({
    cashback: Joi.number().min(0).max(100).optional(),
    minOrderAmount: Joi.number().min(0).optional(),
    maxCashback: Joi.number().min(0).optional(),
    isPartner: Joi.boolean().default(false),
    partnerLevel: Joi.string().valid('bronze', 'silver', 'gold', 'platinum').optional()
  }).optional(),
  deliveryCategories: Joi.object({
    fastDelivery: Joi.boolean().default(false),
    budgetFriendly: Joi.boolean().default(false),
    ninetyNineStore: Joi.boolean().default(false),
    premium: Joi.boolean().default(false),
    organic: Joi.boolean().default(false),
    alliance: Joi.boolean().default(false),
    lowestPrice: Joi.boolean().default(false),
    mall: Joi.boolean().default(false),
    cashStore: Joi.boolean().default(false)
  }).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
  // Action buttons configuration for ProductPage
  actionButtons: Joi.object({
    enabled: Joi.boolean().default(true),
    buttons: Joi.array().items(Joi.object({
      id: Joi.string().valid('call', 'product', 'location', 'custom').required(),
      enabled: Joi.boolean().default(true),
      label: Joi.string().max(30).optional(),
      destination: Joi.object({
        type: Joi.string().valid('phone', 'url', 'maps', 'internal').required(),
        value: Joi.string().allow('').required()
      }).optional(),
      order: Joi.number().min(0).default(0)
    })).max(5).optional()
  }).optional(),
  // Service capabilities configuration
  serviceCapabilities: Joi.object({
    homeDelivery: Joi.object({
      enabled: Joi.boolean().default(false),
      deliveryRadius: Joi.number().min(0).optional(),
      minOrder: Joi.number().min(0).optional(),
      deliveryFee: Joi.number().min(0).optional(),
      freeDeliveryAbove: Joi.number().min(0).optional(),
      estimatedTime: Joi.string().allow('').optional(),
    }).optional(),
    driveThru: Joi.object({
      enabled: Joi.boolean().default(false),
      estimatedTime: Joi.string().allow('').optional(),
      menuType: Joi.string().valid('full', 'limited').optional(),
    }).optional(),
    tableBooking: Joi.object({
      enabled: Joi.boolean().default(false),
    }).optional(),
    dineIn: Joi.object({
      enabled: Joi.boolean().default(false),
    }).optional(),
    storePickup: Joi.object({
      enabled: Joi.boolean().default(false),
      estimatedTime: Joi.string().allow('').optional(),
    }).optional(),
  }).optional(),
  // Booking config
  bookingConfig: Joi.object({
    enabled: Joi.boolean().default(false),
    slotDuration: Joi.number().min(15).max(240).optional(),
    maxTableCapacity: Joi.number().min(1).max(100).optional(),
    advanceBookingDays: Joi.number().min(1).max(90).optional(),
    requiresAdvanceBooking: Joi.boolean().optional(),
    allowWalkIn: Joi.boolean().optional(),
    workingHours: Joi.object({
      start: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
      end: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    }).optional(),
  }).optional(),
  // Delivery Zones
  deliveryZones: Joi.array().items(Joi.object({
    _id: Joi.string().required(),
    name: Joi.string().required().max(100),
    radiusKm: Joi.number().required().min(0),
    deliveryFee: Joi.number().required().min(0),
    minOrderAmount: Joi.number().required().min(0),
    estimatedTime: Joi.number().required().min(0),
    freeDeliveryAbove: Joi.number().min(0).optional(),
    isDefault: Joi.boolean().default(false),
  })).optional(),
  // Holidays / Closures
  holidays: Joi.array().items(Joi.object({
    _id: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    reason: Joi.string().required().max(200),
    affectsAllOutlets: Joi.boolean().default(false),
  })).optional(),
});

const updateStoreSchema = createStoreSchema.fork(
  ['name', 'category', 'location'],
  (schema) => schema.optional()
);

const storeIdSchema = Joi.object({
  id: Joi.string().required()
});

// Helper function to generate unique slug
const generateSlug = async (name: string): Promise<string> => {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();

  let finalSlug = slug;
  let counter = 1;
  while (await Store.findOne({ slug: finalSlug })) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  return finalSlug;
};

/**
 * @route   POST /api/merchant/stores
 * @desc    Create a new store
 * @access  Private (Merchant)
 */
router.post('/', validateRequest(createStoreSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Verify merchant exists
    const merchant = await Merchant.findById(merchantId).lean();
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    const storeData = req.body;

    // Verify category exists
    const category = await Category.findById(storeData.category).lean();
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Generate unique slug
    const slug = await generateSlug(storeData.name);

    // Create store
    // Normalize banner to always be an array
    let bannerArray: string[] = [];
    if (storeData.banner) {
      bannerArray = Array.isArray(storeData.banner) ? storeData.banner : [storeData.banner];
    }

    // Auto-geocode: if coordinates missing but address+city exist, resolve via geocoding
    let storeCoordinates = storeData.location.coordinates;
    if (!storeCoordinates && storeData.location.address && storeData.location.city) {
      try {
        const query = `${storeData.location.address}, ${storeData.location.city}, ${storeData.location.state || ''}`.trim();
        const results = await geocodingService.searchAddresses({ query, limit: 1 });
        if (results.length > 0) {
          storeCoordinates = results[0].coordinates;
          logger.info(`Auto-geocoded store "${storeData.name}" to [${storeCoordinates}]`);
        }
      } catch (err) {
        logger.warn(`Auto-geocoding failed for store "${storeData.name}":`, err);
      }
    }

    const store = new Store({
      name: storeData.name,
      slug,
      description: storeData.description,
      logo: storeData.logo,
      banner: bannerArray,
      category: category._id,
      merchantId: merchant._id,
      location: {
        address: storeData.location.address,
        city: storeData.location.city,
        state: storeData.location.state,
        pincode: storeData.location.pincode,
        coordinates: storeCoordinates,
        deliveryRadius: storeData.location.deliveryRadius || 5,
        landmark: storeData.location.landmark
      },
      contact: storeData.contact || {},
      operationalInfo: {
        hours: storeData.operationalInfo?.hours || {},
        deliveryTime: storeData.operationalInfo?.deliveryTime || '30-45 mins',
        minimumOrder: storeData.operationalInfo?.minimumOrder || 0,
        deliveryFee: storeData.operationalInfo?.deliveryFee || 0,
        freeDeliveryAbove: storeData.operationalInfo?.freeDeliveryAbove,
        acceptsWalletPayment: storeData.operationalInfo?.acceptsWalletPayment !== undefined 
          ? storeData.operationalInfo.acceptsWalletPayment 
          : true,
        paymentMethods: storeData.operationalInfo?.paymentMethods || ['cash', 'card', 'upi', 'wallet']
      },
      offers: {
        cashback: storeData.offers?.cashback,
        minOrderAmount: storeData.offers?.minOrderAmount,
        maxCashback: storeData.offers?.maxCashback,
        isPartner: storeData.offers?.isPartner || false,
        partnerLevel: storeData.offers?.partnerLevel
      },
      tags: storeData.tags || [],
      isActive: storeData.isActive !== undefined ? storeData.isActive : true,
      isFeatured: storeData.isFeatured || false,
      isVerified: merchant.verificationStatus === 'verified',
      ratings: {
        average: 0,
        count: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      },
      analytics: {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        repeatCustomers: 0
      },
      deliveryCategories: storeData.deliveryCategories || {
        fastDelivery: false,
        budgetFriendly: false,
        ninetyNineStore: false,
        premium: false,
        organic: false,
        alliance: false,
        lowestPrice: false,
        mall: false,
        cashStore: false
      }
    });

    await store.save();

    // P-12: Invalidate store list caches so the new store appears immediately
    CacheInvalidator.invalidateStore((store._id as mongoose.Types.ObjectId).toString()).catch((err) => {
      logger.warn('[CACHE-INVALIDATION-WARN] store.created — invalidation failed:', err);
    });

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'store.created',
      resourceType: 'store',
      resourceId: (store._id as mongoose.Types.ObjectId).toString(),
      details: {
        after: store.toObject(),
        metadata: { name: store.name, slug: store.slug }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${merchantId}`).emit('store_created', {
        storeId: store._id,
        storeName: store.name
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Store created successfully',
      data: store
    });
  } catch (error: any) {
    logger.error('Create store error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create store'
    });
  }
});

/**
 * @route   GET /api/merchant/stores
 * @desc    Get all stores for the merchant
 * @access  Private (Merchant)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const { isActive, search } = req.query;

    // Build query
    const query: any = { merchantId: new mongoose.Types.ObjectId(merchantId) };
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      // Escape regex special characters to prevent ReDoS
      const escaped = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { 'location.city': { $regex: escaped, $options: 'i' } }
      ];
    }

    const stores = await Store.find(query)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      message: 'Stores retrieved successfully',
      data: stores,
      count: stores.length
    });
  } catch (error: any) {
    logger.error('Get stores error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve stores'
    });
  }
});

/**
 * @route   GET /api/merchant/stores/active
 * @desc    Get the currently active store
 * @access  Private (Merchant)
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Get the first active store (or first store if none active)
    let store = await Store.findOne({ 
      merchantId: new mongoose.Types.ObjectId(merchantId),
      isActive: true
    })
      .populate('category', 'name slug')
      .sort({ createdAt: 1 })
      .lean();

    // If no active store, get the first store
    if (!store) {
      store = await Store.findOne({ 
        merchantId: new mongoose.Types.ObjectId(merchantId)
      })
        .populate('category', 'name slug')
        .sort({ createdAt: 1 })
        .lean();
    }

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store found for this merchant'
      });
    }

    return res.json({
      success: true,
      message: 'Active store retrieved successfully',
      data: store
    });
  } catch (error: any) {
    logger.error('Get active store error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve active store'
    });
  }
});

/**
 * @route   GET /api/merchant/stores/:id
 * @desc    Get store by ID
 * @access  Private (Merchant)
 */
router.get('/:id', validateParams(storeIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const storeId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    const store = await Store.findOne({
      _id: storeId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    })
      .populate('category', 'name slug')
      .lean();

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    return res.json({
      success: true,
      message: 'Store retrieved successfully',
      data: store
    });
  } catch (error: any) {
    logger.error('Get store error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve store'
    });
  }
});

/**
 * @route   PUT /api/merchant/stores/:id
 * @desc    Update store
 * @access  Private (Merchant)
 */
router.put('/:id', validateParams(storeIdSchema), validateRequest(updateStoreSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const storeId = req.params.id;
    const updates = req.body;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Find store and verify ownership
    const store = await Store.findOne({
      _id: storeId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Store old values for audit
    const oldValues = store.toObject();

    // Update category if provided
    if (updates.category) {
      const category = await Category.findById(updates.category).lean();
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }
      store.category = category._id as mongoose.Types.ObjectId;
    }

    // Update name and slug if name changed
    if (updates.name && updates.name !== store.name) {
      store.name = updates.name;
      store.slug = await generateSlug(updates.name);
    }

    // Handle banner separately using raw MongoDB update to bypass Mongoose casting
    // Mongoose's updateOne() still tries to cast Mixed types, so we use the raw collection
    if (updates.banner !== undefined) {
      // Use raw MongoDB collection to bypass Mongoose casting entirely
      if (!mongoose.connection.db) {
        throw new Error('Database connection not available');
      }
      const collection = mongoose.connection.db.collection('stores');
      const storeObjectId = typeof store._id === 'string' 
        ? new mongoose.Types.ObjectId(store._id) 
        : store._id as mongoose.Types.ObjectId;
      
      await collection.updateOne(
        { _id: storeObjectId },
        { $set: { banner: updates.banner } }
      );
      
      // Set the banner on the in-memory store object
      store.set('banner', updates.banner);
      store.markModified('banner');
    }

    // Update other fields
    if (updates.description !== undefined) store.description = updates.description;
    if (updates.logo !== undefined) store.logo = updates.logo;
    
    if (updates.location !== undefined) {
      // Auto-geocode if coordinates missing but address+city exist
      const mergedLocation = { ...store.location, ...updates.location };
      if (!mergedLocation.coordinates && mergedLocation.address && mergedLocation.city) {
        try {
          const query = `${mergedLocation.address}, ${mergedLocation.city}, ${mergedLocation.state || ''}`.trim();
          const results = await geocodingService.searchAddresses({ query, limit: 1 });
          if (results.length > 0) {
            updates.location.coordinates = results[0].coordinates;
            logger.info(`Auto-geocoded store update "${store.name}" to [${results[0].coordinates}]`);
          }
        } catch (err) {
          logger.warn(`Auto-geocoding failed for store update "${store.name}":`, err);
        }
      }
      store.location = {
        ...store.location,
        ...updates.location
      };
    }
    if (updates.contact !== undefined) {
      store.contact = {
        ...store.contact,
        ...updates.contact
      };
    }
    if (updates.operationalInfo !== undefined) {
      // Merge operationalInfo, but handle hours specially to merge individual days
      if (updates.operationalInfo.hours) {
        store.operationalInfo = {
          ...store.operationalInfo,
          ...updates.operationalInfo,
          hours: {
            ...store.operationalInfo.hours,
            ...updates.operationalInfo.hours
          }
        };
      } else {
        store.operationalInfo = {
          ...store.operationalInfo,
          ...updates.operationalInfo
        };
      }
    }
    if (updates.offers !== undefined) {
      store.offers = {
        ...store.offers,
        ...updates.offers
      };
    }
    if (updates.deliveryCategories !== undefined) {
      store.deliveryCategories = {
        ...store.deliveryCategories,
        ...updates.deliveryCategories
      };
    }
    if (updates.tags !== undefined) store.tags = updates.tags;
    if (updates.isActive !== undefined) store.isActive = updates.isActive;
    if (updates.isFeatured !== undefined) store.isFeatured = updates.isFeatured;

    // Update action buttons configuration
    if (updates.actionButtons !== undefined) {
      (store as any).actionButtons = {
        enabled: updates.actionButtons.enabled !== undefined ? updates.actionButtons.enabled : true,
        buttons: updates.actionButtons.buttons || []
      };
    }

    // Update booking config
    if (updates.bookingConfig !== undefined) {
      (store as any).bookingConfig = {
        ...(store as any).bookingConfig,
        ...updates.bookingConfig,
        workingHours: {
          ...(store as any).bookingConfig?.workingHours,
          ...updates.bookingConfig?.workingHours,
        },
      };
    }

    // Update service capabilities (only merge sub-services that are present in updates)
    if (updates.serviceCapabilities !== undefined) {
      const existing = (store as any).serviceCapabilities || {};
      const incoming = updates.serviceCapabilities;
      (store as any).serviceCapabilities = {
        ...existing,
        ...(incoming.homeDelivery ? { homeDelivery: { ...existing.homeDelivery, ...incoming.homeDelivery } } : {}),
        ...(incoming.driveThru ? { driveThru: { ...existing.driveThru, ...incoming.driveThru } } : {}),
        ...(incoming.tableBooking ? { tableBooking: { ...existing.tableBooking, ...incoming.tableBooking } } : {}),
        ...(incoming.dineIn ? { dineIn: { ...existing.dineIn, ...incoming.dineIn } } : {}),
        ...(incoming.storePickup ? { storePickup: { ...existing.storePickup, ...incoming.storePickup } } : {}),
      };
    }

    // If banner was updated using raw MongoDB, we need to update other fields using raw MongoDB too
    // to prevent Mongoose from overwriting the banner with undefined
    if (updates.banner !== undefined && mongoose.connection.db) {
      // Banner was already updated in MongoDB using raw collection
      // Update other fields using raw MongoDB to avoid Mongoose casting issues
      const collection = mongoose.connection.db.collection('stores');
      const storeObjectId = typeof store._id === 'string' 
        ? new mongoose.Types.ObjectId(store._id) 
        : store._id as mongoose.Types.ObjectId;
      
      const fieldsToUpdate: any = {};
      
      // Build update object with all changed fields (excluding banner which was already updated)
      if (updates.name && store.name) fieldsToUpdate.name = store.name;
      if (updates.description !== undefined) fieldsToUpdate.description = store.description;
      if (updates.logo !== undefined) fieldsToUpdate.logo = store.logo;
      if (updates.location) fieldsToUpdate.location = store.location;
      if (updates.contact) fieldsToUpdate.contact = store.contact;
      if (updates.operationalInfo) fieldsToUpdate.operationalInfo = store.operationalInfo;
      if (updates.offers) fieldsToUpdate.offers = store.offers;
      if (updates.deliveryCategories) fieldsToUpdate.deliveryCategories = store.deliveryCategories;
      if (updates.tags !== undefined) fieldsToUpdate.tags = store.tags;
      if (updates.isActive !== undefined) fieldsToUpdate.isActive = store.isActive;
      if (updates.isFeatured !== undefined) fieldsToUpdate.isFeatured = store.isFeatured;
      if (updates.actionButtons !== undefined) fieldsToUpdate.actionButtons = (store as any).actionButtons;
      if (updates.bookingConfig !== undefined) fieldsToUpdate.bookingConfig = (store as any).bookingConfig;
      if (updates.serviceCapabilities !== undefined) fieldsToUpdate.serviceCapabilities = (store as any).serviceCapabilities;
      if (store.category) {
        // Ensure category is an ObjectId
        fieldsToUpdate.category = store.category instanceof mongoose.Types.ObjectId
          ? store.category
          : new mongoose.Types.ObjectId(store.category);
      }
      if (store.slug) fieldsToUpdate.slug = store.slug;

      if (Object.keys(fieldsToUpdate).length > 0) {
        await collection.updateOne({ _id: storeObjectId }, { $set: fieldsToUpdate });
      }
    } else {
      // Use raw MongoDB update to bypass Mongoose schema validation on existing data
      // (existing stores may have paymentMethods values that don't match current enum)
      if (mongoose.connection.db) {
        const collection = mongoose.connection.db.collection('stores');
        const storeObjectId = typeof store._id === 'string'
          ? new mongoose.Types.ObjectId(store._id)
          : store._id as mongoose.Types.ObjectId;

        const fieldsToUpdate: any = {};

        if (updates.name && store.name) fieldsToUpdate.name = store.name;
        if (updates.description !== undefined) fieldsToUpdate.description = store.description;
        if (updates.logo !== undefined) fieldsToUpdate.logo = store.logo;
        if (updates.location) fieldsToUpdate.location = store.location;
        if (updates.contact) fieldsToUpdate.contact = store.contact;
        if (updates.operationalInfo) fieldsToUpdate.operationalInfo = store.operationalInfo;
        if (updates.offers) fieldsToUpdate.offers = store.offers;
        if (updates.deliveryCategories) fieldsToUpdate.deliveryCategories = store.deliveryCategories;
        if (updates.tags !== undefined) fieldsToUpdate.tags = store.tags;
        if (updates.isActive !== undefined) fieldsToUpdate.isActive = store.isActive;
        if (updates.isFeatured !== undefined) fieldsToUpdate.isFeatured = store.isFeatured;
        if (updates.actionButtons !== undefined) fieldsToUpdate.actionButtons = (store as any).actionButtons;
        if (updates.bookingConfig !== undefined) fieldsToUpdate.bookingConfig = (store as any).bookingConfig;
        if (updates.serviceCapabilities !== undefined) fieldsToUpdate.serviceCapabilities = (store as any).serviceCapabilities;
        if (store.category) {
          fieldsToUpdate.category = store.category instanceof mongoose.Types.ObjectId
            ? store.category
            : new mongoose.Types.ObjectId(store.category);
        }
        if (store.slug) fieldsToUpdate.slug = store.slug;

        if (Object.keys(fieldsToUpdate).length > 0) {
          await collection.updateOne({ _id: storeObjectId }, { $set: fieldsToUpdate });
        }
      } else {
        await store.save({ validateBeforeSave: false });
      }
    }
    
    // Reload store to get final state with populated category (for response)
    // Use the reloaded Mongoose document directly (not Object.assign) to preserve methods/virtuals
    let updatedStore = await Store.findById(store._id).populate('category', 'name slug');

    // If banner was updated, get it from raw MongoDB to ensure it's correct
    if (updates.banner !== undefined && mongoose.connection.db && updatedStore) {
      const collection = mongoose.connection.db.collection('stores');
      const storeObjectId = typeof store._id === 'string'
        ? new mongoose.Types.ObjectId(store._id)
        : store._id as mongoose.Types.ObjectId;
      const rawStore = await collection.findOne({ _id: storeObjectId }, { projection: { banner: 1 } });

      if (rawStore) {
        updatedStore.set('banner', rawStore.banner);
        updatedStore.markModified('banner');
      }
    }

    // Use the reloaded store for response (falls back to original if reload failed)
    const responseStore = updatedStore || store;

    // P-12: Invalidate caches for this store so consumers get fresh data
    CacheInvalidator.invalidateStore((store._id as mongoose.Types.ObjectId).toString()).catch((err) => {
      logger.warn('[CACHE-INVALIDATION-WARN] store.updated — invalidation failed:', err);
    });

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'store.updated',
      resourceType: 'store',
      resourceId: (store._id as mongoose.Types.ObjectId).toString(),
      details: {
        before: oldValues,
        after: responseStore.toObject(),
        metadata: { name: responseStore.name }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${merchantId}`).emit('store_updated', {
        storeId: responseStore._id,
        storeName: responseStore.name
      });
    }

    return res.json({
      success: true,
      message: 'Store updated successfully',
      data: responseStore
    });
  } catch (error: any) {
    logger.error('Update store error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update store'
    });
  }
});

/**
 * @route   DELETE /api/merchant/stores/:id
 * @desc    Delete or deactivate store
 * @access  Private (Merchant)
 */
router.delete('/:id', validateParams(storeIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const storeId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Find store and verify ownership - use lean() to avoid validation on document creation
    const store = await Store.findOne({
      _id: storeId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    }).lean();

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Check if this is the only store
    const storeCount = await Store.countDocuments({
      merchantId: new mongoose.Types.ObjectId(merchantId),
      isActive: true
    });

    if (storeCount === 1 && store.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the only active store. Please create another store first or deactivate it instead.'
      });
    }

    // Soft delete: deactivate instead of hard delete using updateOne to bypass validation
    // Use lean() to return plain object and avoid Mongoose model initialization validation
    const deactivatedStore = await Store.findByIdAndUpdate(
      store._id,
      { isActive: false },
      { new: true, runValidators: false }
    ).lean();

    if (!deactivatedStore) {
      return res.status(404).json({
        success: false,
        message: 'Store not found after update'
      });
    }

    // P-12: Invalidate caches for this store so deactivation is reflected immediately
    CacheInvalidator.invalidateStore((deactivatedStore._id as mongoose.Types.ObjectId).toString()).catch((err) => {
      logger.warn('[CACHE-INVALIDATION-WARN] store.deleted — invalidation failed:', err);
    });

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'store.deleted',
      resourceType: 'store',
      resourceId: (deactivatedStore._id as mongoose.Types.ObjectId).toString(),
      details: {
        before: store,
        metadata: { name: deactivatedStore.name }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'warning'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${merchantId}`).emit('store_deleted', {
        storeId: deactivatedStore._id,
        storeName: deactivatedStore.name
      });
    }

    return res.json({
      success: true,
      message: 'Store deactivated successfully',
      data: deactivatedStore
    });
  } catch (error: any) {
    logger.error('Delete store error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete store'
    });
  }
});

/**
 * @route   POST /api/merchant/stores/:id/activate
 * @desc    Set store as active
 * @access  Private (Merchant)
 */
router.post('/:id/activate', validateParams(storeIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const storeId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Find store and verify ownership - use lean() to avoid validation on document creation
    const store = await Store.findOne({
      _id: storeId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    }).lean();

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Activate this store using updateOne to bypass full document validation
    // Note: Multiple stores can be active simultaneously for the same merchant
    // Use lean() to return plain object and avoid Mongoose model initialization validation
    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { isActive: true },
      { new: true, runValidators: false }
    ).lean();

    if (!updatedStore) {
      return res.status(404).json({
        success: false,
        message: 'Store not found after update'
      });
    }

    // P-12: Invalidate caches for this store so activation is reflected immediately
    CacheInvalidator.invalidateStore((updatedStore._id as mongoose.Types.ObjectId).toString()).catch((err) => {
      logger.warn('[CACHE-INVALIDATION-WARN] store.activated — invalidation failed:', err);
    });

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'store.activated',
      resourceType: 'store',
      resourceId: (updatedStore._id as mongoose.Types.ObjectId).toString(),
      details: {
        after: updatedStore,
        metadata: { name: updatedStore.name }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${merchantId}`).emit('store_activated', {
        storeId: updatedStore._id,
        storeName: updatedStore.name
      });
    }

    return res.json({
      success: true,
      message: 'Store activated successfully',
      data: updatedStore
    });
  } catch (error: any) {
    logger.error('Activate store error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate store'
    });
  }
});

/**
 * @route   POST /api/merchant/stores/:id/deactivate
 * @desc    Set store as inactive
 * @access  Private (Merchant)
 */
router.post('/:id/deactivate', validateParams(storeIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const storeId = req.params.id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID not found. Authentication required.'
      });
    }

    // Find store and verify ownership
    const store = await Store.findOne({
      _id: storeId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    }).lean();

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Deactivate this store
    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { isActive: false },
      { new: true, runValidators: false }
    ).lean();

    if (!updatedStore) {
      return res.status(404).json({
        success: false,
        message: 'Store not found after update'
      });
    }

    // P-12: Invalidate caches for this store so deactivation is reflected immediately
    CacheInvalidator.invalidateStore((updatedStore._id as mongoose.Types.ObjectId).toString()).catch((err) => {
      logger.warn('[CACHE-INVALIDATION-WARN] store.deactivated — invalidation failed:', err);
    });

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'store.deactivated',
      resourceType: 'store',
      resourceId: (updatedStore._id as mongoose.Types.ObjectId).toString(),
      details: {
        after: updatedStore,
        metadata: { name: updatedStore.name }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${merchantId}`).emit('store_deactivated', {
        storeId: updatedStore._id,
        storeName: updatedStore.name
      });
    }

    return res.json({
      success: true,
      message: 'Store deactivated successfully',
      data: updatedStore
    });
  } catch (error: any) {
    logger.error('Deactivate store error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to deactivate store'
    });
  }
});

/**
 * @route   GET /api/merchant/stores/:id/reviews
 * @desc    Get all reviews for a store
 * @access  Private (Merchant)
 */
router.get('/:id/reviews', validateParams(storeIdSchema), validateQuery(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  rating: Joi.number().integer().min(1).max(5).optional(),
  filter: Joi.string().valid('all', 'with_images', 'verified', '5', '4', '3', '2', '1').optional(),
  sort: Joi.string().valid('newest', 'oldest', 'rating_high', 'rating_low', 'helpful').default('newest'),
  moderationStatus: Joi.string().valid('pending', 'approved', 'rejected').optional()
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const storeId = req.params.id;

    if (!merchantId) {
      return sendBadRequest(res, 'Merchant ID not found. Authentication required.');
    }

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    }).lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Pagination
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;

    // Build query - merchants can see all reviews including pending
    const reviewQuery: any = {
      store: new mongoose.Types.ObjectId(storeId),
      isActive: true
    };
    
    // Add moderation status filter if provided
    const moderationFilter = req.query.moderationStatus as string;
    if (moderationFilter && ['pending', 'approved', 'rejected'].includes(moderationFilter)) {
      reviewQuery.moderationStatus = moderationFilter;
    }

    // Filter by rating if provided
    const rating = req.query.rating ? parseInt(req.query.rating as string) : null;
    if (rating) {
      reviewQuery.rating = rating;
    }

    // Apply filters
    const filter = req.query.filter as string;
    if (filter === 'with_images') {
      reviewQuery.images = { $exists: true, $ne: [] };
    } else if (filter === 'verified') {
      reviewQuery.verified = true;
    } else if (filter && !isNaN(parseInt(filter))) {
      reviewQuery.rating = parseInt(filter);
    }

    // Sorting
    const sort = (req.query.sort as string) || 'newest';
    let sortOptions: any = {};
    switch (sort) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'rating_high':
        sortOptions = { rating: -1, createdAt: -1 };
        break;
      case 'rating_low':
        sortOptions = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOptions = { helpful: -1, createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Query reviews
    const [reviews, totalCount] = await Promise.all([
      Review.find(reviewQuery)
        .populate('user', 'profile.firstName profile.lastName profile.avatar')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(reviewQuery)
    ]);

    // Get review stats
    const stats = await Review.getStoreRatingStats(storeId);

    return sendSuccess(res, {
      reviews: reviews.map((review: any) => {
        // Combine firstName and lastName to create full name
        const firstName = review.user?.profile?.firstName || '';
        const lastName = review.user?.profile?.lastName || '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Anonymous';
        
        return {
          id: review._id.toString(),
          _id: review._id.toString(),
          user: {
            id: review.user?._id?.toString() || review.user?.id || '',
            name: fullName,
            avatar: review.user?.profile?.avatar || review.user?.avatar,
          },
          rating: review.rating,
          title: review.title || '',
          comment: review.comment || review.text || '',
          helpful: review.helpful || 0,
          createdAt: review.createdAt,
          verified: review.verified || false,
          images: review.images || [],
          moderationStatus: review.moderationStatus || 'pending',
          moderatedBy: review.moderatedBy?.toString(),
          moderatedAt: review.moderatedAt,
          moderationReason: review.moderationReason,
          merchantResponse: review.merchantResponse ? {
            message: review.merchantResponse.message,
            respondedAt: review.merchantResponse.respondedAt,
            respondedBy: review.merchantResponse.respondedBy?.toString() || '',
          } : undefined,
        };
      }),
      stats: {
        averageRating: stats.average || 0,
        totalReviews: stats.count || 0,
        ratingBreakdown: {
          5: stats.distribution?.[5] || 0,
          4: stats.distribution?.[4] || 0,
          3: stats.distribution?.[3] || 0,
          2: stats.distribution?.[2] || 0,
          1: stats.distribution?.[1] || 0,
        },
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrevious: page > 1
      }
    }, 'Store reviews retrieved successfully');

  } catch (error: any) {
    logger.error('Get store reviews error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch store reviews'
    });
  }
});

/**
 * @route   GET /api/merchant/stores/:id/ugc
 * @desc    Get UGC content for a store
 * @access  Private (Merchant)
 */
router.get('/:id/ugc', validateParams(storeIdSchema), validateQuery(Joi.object({
  type: Joi.string().valid('photo', 'video').optional(),
  limit: Joi.number().integer().min(1).max(50).default(20),
  offset: Joi.number().integer().min(0).default(0)
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const storeId = req.params.id;

    if (!merchantId) {
      return sendBadRequest(res, 'Merchant ID not found. Authentication required.');
    }

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    }).lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Check if storeId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return sendSuccess(res, {
        content: [],
        total: 0
      }, 'UGC content retrieved successfully');
    }

    const { type, limit = 20, offset = 0 } = req.query;

    // Build query
    const query: any = {
      isPublished: true,
      isApproved: true,
      moderationStatus: 'approved',
      stores: new mongoose.Types.ObjectId(storeId)
    };

    // Filter by type if specified
    if (type === 'video') {
      query.contentType = { $in: ['ugc', 'merchant'] };
    }

    const videos = await Video.find(query)
      .populate('creator', 'profile.firstName profile.lastName profile.avatar')
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean();

    const total = await Video.countDocuments(query);

    // Transform videos to match UGC API format
    const content = videos.map((video: any) => ({
      _id: video._id,
      id: video._id.toString(),
      userId: video.creator?._id || video.creator,
      user: {
        _id: video.creator?._id || video.creator,
        profile: video.creator?.profile || { firstName: '', lastName: '', avatar: '' }
      },
      type: 'video',
      url: video.videoUrl,
      thumbnail: video.thumbnail,
      caption: video.description,
      tags: video.tags || [],
      relatedProduct: video.products?.[0] || null,
      relatedStore: video.stores?.[0] ? {
        _id: video.stores[0],
        name: store.name,
        logo: store.logo
      } : null,
      likes: video.analytics?.likes || video.engagement?.likes?.length || 0,
      comments: video.analytics?.comments || video.engagement?.comments || 0,
      shares: video.analytics?.shares || video.engagement?.shares || 0,
      views: video.analytics?.totalViews || video.analytics?.views || video.engagement?.views || 0,
      isLiked: false,
      isBookmarked: false,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt
    }));

    return sendSuccess(res, {
      content,
      total
    }, 'UGC content retrieved successfully');

  } catch (error: any) {
    logger.error('Get store UGC error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch store UGC content'
    });
  }
});

/**
 * @route   POST /api/merchant/stores/:id/reviews/:reviewId/approve
 * @desc    Approve a review and reward user with 10 rezcoins
 * @access  Private (Merchant)
 */
router.post('/:id/reviews/:reviewId/approve', validateParams(Joi.object({
  id: Joi.string().required(),
  reviewId: Joi.string().required()
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const storeId = req.params.id;
    const reviewId = req.params.reviewId;

    if (!merchantId) {
      return sendBadRequest(res, 'Merchant ID not found. Authentication required.');
    }

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    }).lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Find the review
    const review = await Review.findOne({
      _id: reviewId,
      store: new mongoose.Types.ObjectId(storeId),
      isActive: true
    });

    if (!review) {
      return sendNotFound(res, 'Review not found');
    }

    // Check if already approved
    if (review.moderationStatus === 'approved') {
      return sendBadRequest(res, 'Review is already approved');
    }

    // Update review status
    review.moderationStatus = 'approved';
    review.moderatedBy = new mongoose.Types.ObjectId(merchantId);
    review.moderatedAt = new Date();
    review.verified = true; // Mark as verified when approved
    await review.save();

    // Update store rating statistics
    const ratingStats = await Review.getStoreRatingStats(storeId);
    await Store.findByIdAndUpdate(storeId, {
      'ratings.average': ratingStats.average,
      'ratings.count': ratingStats.count,
      'ratings.distribution': ratingStats.distribution
    });

    // Reward user with 10 rezcoins via walletService
    try {
      const { walletService } = await import('../services/walletService');
      await walletService.credit({
        userId: review.user.toString(),
        amount: 10,
        source: 'review',
        description: 'Review approval reward - 10 rezcoins',
        operationType: 'review_reward',
        referenceId: `review-reward:${reviewId}`,
        referenceModel: 'Review',
        metadata: { reviewId, storeId, storeName: store.name },
      });
    } catch (walletError) {
      logger.error('Error rewarding user for review approval:', walletError);
      // Don't fail the approval if wallet operation fails, but log it
    }

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'review.approved',
      resourceType: 'review',
      resourceId: reviewId,
      details: {
        after: review.toObject(),
        metadata: { 
          storeId: storeId,
          storeName: store.name,
          reviewRating: review.rating
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    return sendSuccess(res, {
      review: {
        id: review._id.toString(),
        moderationStatus: review.moderationStatus,
        moderatedAt: review.moderatedAt
      }
    }, 'Review approved successfully. User has been rewarded with 10 rezcoins.');

  } catch (error: any) {
    logger.error('Approve review error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve review'
    });
  }
});

/**
 * @route   POST /api/merchant/stores/:id/reviews/:reviewId/reject
 * @desc    Reject a review
 * @access  Private (Merchant)
 */
router.post('/:id/reviews/:reviewId/reject', validateParams(Joi.object({
  id: Joi.string().required(),
  reviewId: Joi.string().required()
})), validateRequest(Joi.object({
  reason: Joi.string().max(500).optional()
})), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const storeId = req.params.id;
    const reviewId = req.params.reviewId;
    const { reason } = req.body;

    if (!merchantId) {
      return sendBadRequest(res, 'Merchant ID not found. Authentication required.');
    }

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: new mongoose.Types.ObjectId(merchantId)
    }).lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Find the review
    const review = await Review.findOne({
      _id: reviewId,
      store: new mongoose.Types.ObjectId(storeId),
      isActive: true
    });

    if (!review) {
      return sendNotFound(res, 'Review not found');
    }

    // Check if already rejected
    if (review.moderationStatus === 'rejected') {
      return sendBadRequest(res, 'Review is already rejected');
    }

    // Update review status
    review.moderationStatus = 'rejected';
    review.moderatedBy = new mongoose.Types.ObjectId(merchantId);
    review.moderatedAt = new Date();
    review.moderationReason = reason || 'Review does not meet our guidelines';
    await review.save();

    // Update store rating statistics (remove this review from stats)
    const ratingStats = await Review.getStoreRatingStats(storeId);
    await Store.findByIdAndUpdate(storeId, {
      'ratings.average': ratingStats.average,
      'ratings.count': ratingStats.count,
      'ratings.distribution': ratingStats.distribution
    });

    // Audit log
    await AuditService.log({
      merchantId: merchantId,
      action: 'review.rejected',
      resourceType: 'review',
      resourceId: reviewId,
      details: {
        after: review.toObject(),
        metadata: { 
          storeId: storeId,
          storeName: store.name,
          reviewRating: review.rating,
          rejectionReason: reason
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'warning'
    });

    return sendSuccess(res, {
      review: {
        id: review._id.toString(),
        moderationStatus: review.moderationStatus,
        moderatedAt: review.moderatedAt,
        moderationReason: review.moderationReason
      }
    }, 'Review rejected successfully');

  } catch (error: any) {
    logger.error('Reject review error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to reject review'
    });
  }
});

// ==================== MALL LISTING REQUESTS ====================

import { MallListingRequest } from '../models/MallListingRequest';

const requestMallListingSchema = Joi.object({
  reason: Joi.string().required().min(10).max(500),
});

/**
 * @route   POST /api/merchant/stores/:id/request-mall-listing
 * @desc    Request to have a store listed in the Mall
 * @access  Merchant (store owner)
 */
router.post('/:id/request-mall-listing', validateParams(storeIdSchema), validateRequest(requestMallListingSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant._id;
    const { id: storeId } = req.params;
    const { reason } = req.body;

    const store = await Store.findOne({ _id: storeId, merchant: merchantId });
    if (!store) {
      return sendNotFound(res, 'Store not found or unauthorized');
    }

    // Check if store is already in mall
    if (store.deliveryCategories?.mall) {
      return sendBadRequest(res, 'Store is already listed in the Mall');
    }

    // Check for existing pending request
    const existingRequest = await MallListingRequest.findOne({
      storeId,
      status: 'pending',
    });
    if (existingRequest) {
      return sendBadRequest(res, 'A pending mall listing request already exists for this store');
    }

    const request = await MallListingRequest.create({
      storeId,
      merchantId,
      reason,
    });

    return sendSuccess(res, { request }, 'Mall listing request submitted successfully');
  } catch (error: any) {
    logger.error('Request mall listing error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit mall listing request',
    });
  }
});

/**
 * @route   GET /api/merchant/stores/:id/mall-status
 * @desc    Get mall listing status for a store
 * @access  Merchant (store owner)
 */
router.get('/:id/mall-status', validateParams(storeIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant._id;
    const { id: storeId } = req.params;

    const store = await Store.findOne({ _id: storeId, merchant: merchantId })
      .select('name deliveryCategories')
      .lean();
    if (!store) {
      return sendNotFound(res, 'Store not found or unauthorized');
    }

    const isListed = !!store.deliveryCategories?.mall;

    // Get latest request
    const latestRequest = await MallListingRequest.findOne({ storeId })
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, {
      isListed,
      latestRequest: latestRequest
        ? {
            _id: latestRequest._id,
            status: latestRequest.status,
            reason: latestRequest.reason,
            adminNotes: latestRequest.adminNotes,
            createdAt: latestRequest.createdAt,
            reviewedAt: latestRequest.reviewedAt,
          }
        : null,
    });
  } catch (error: any) {
    logger.error('Get mall status error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get mall status',
    });
  }
});

export default router;

