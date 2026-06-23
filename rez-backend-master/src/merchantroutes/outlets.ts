import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import { validateRequest, validateQuery, validateParams } from '../middleware/merchantvalidation';
import Outlet from '../models/Outlet';
import { Store } from '../models/Store';
import Joi from 'joi';
import mongoose from 'mongoose';

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware);

// Validation schemas
const createOutletSchema = Joi.object({
  storeId: Joi.string().required().messages({
    'string.empty': 'Store ID is required',
    'any.required': 'Store ID is required'
  }),
  name: Joi.string().required().trim().min(2).max(100).messages({
    'string.empty': 'Outlet name is required',
    'string.min': 'Outlet name must be at least 2 characters',
    'string.max': 'Outlet name must be less than 100 characters'
  }),
  address: Joi.string().required().trim().min(5).max(500).messages({
    'string.empty': 'Address is required',
    'string.min': 'Address must be at least 5 characters'
  }),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required().messages({
      'array.length': 'Coordinates must have exactly 2 values [longitude, latitude]'
    })
  }).required().messages({
    'any.required': 'Location is required'
  }),
  phone: Joi.string().trim().min(10).max(15).required().messages({
    'string.empty': 'Phone number is required',
    'string.min': 'Phone number must be at least 10 digits'
  }),
  email: Joi.string().email().trim().optional().allow(''),
  openingHours: Joi.object({
    open: Joi.string().required().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).messages({
      'string.pattern.base': 'Opening time must be in HH:MM format'
    }),
    close: Joi.string().required().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).messages({
      'string.pattern.base': 'Closing time must be in HH:MM format'
    })
  }).required(),
  isActive: Joi.boolean().default(true)
}).custom((value, helpers) => {
  // Validate coordinates are in valid range
  const [lng, lat] = value.location.coordinates;
  if (lng < -180 || lng > 180) {
    return helpers.error('any.custom', { message: 'Longitude must be between -180 and 180' });
  }
  if (lat < -90 || lat > 90) {
    return helpers.error('any.custom', { message: 'Latitude must be between -90 and 90' });
  }
  return value;
});

const updateOutletSchema = createOutletSchema.fork(
  ['storeId', 'name', 'address', 'location', 'phone', 'openingHours'],
  (schema) => schema.optional()
);

const outletIdSchema = Joi.object({
  id: Joi.string().required()
});

const listOutletsQuerySchema = Joi.object({
  storeId: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

/**
 * Helper function to transform simple opening hours to model format
 */
function transformOpeningHours(simpleHours: { open: string; close: string }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days.map(day => ({
    day,
    open: simpleHours.open,
    close: simpleHours.close,
    isClosed: false
  }));
}

/**
 * Helper function to transform model hours to simple format
 */
function simplifyOpeningHours(modelHours: any[]) {
  if (!modelHours || modelHours.length === 0) {
    return { open: '09:00', close: '21:00' };
  }
  // Return the first day's hours (assuming same hours daily)
  const firstDay = modelHours[0];
  return {
    open: firstDay.open || '09:00',
    close: firstDay.close || '21:00'
  };
}

/**
 * @route   GET /api/merchant/outlets
 * @desc    Get all outlets for merchant's stores
 * @access  Private (Merchant)
 */
router.get('/', validateQuery(listOutletsQuerySchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const { storeId, isActive, page = 1, limit = 20 } = req.query;

    // Get all stores for this merchant
    const merchantStores = await Store.find({ merchantId }).select('_id name');
    const storeIds = merchantStores.map(store => store._id);

    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: {
          outlets: [],
          pagination: {
            page: 1,
            limit: Number(limit),
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          }
        }
      });
    }

    // Build query
    const query: any = {
      store: storeId ? new mongoose.Types.ObjectId(storeId as string) : { $in: storeIds }
    };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);
    const [outlets, total] = await Promise.all([
      Outlet.find(query)
        .populate('store', 'name logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Outlet.countDocuments(query)
    ]);

    // Transform outlets to include simplified opening hours
    const transformedOutlets = outlets.map(outlet => ({
      ...outlet,
      openingHoursSimple: simplifyOpeningHours(outlet.openingHours)
    }));

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        outlets: transformedOutlets,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrevious: Number(page) > 1
        }
      }
    });
  } catch (error: any) {
    logger.error('[MERCHANT OUTLETS] Error fetching outlets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch outlets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/merchant/outlets/:id
 * @desc    Get single outlet by ID
 * @access  Private (Merchant)
 */
router.get('/:id', validateParams(outletIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const { id } = req.params;

    // Get merchant's stores
    const merchantStores = await Store.find({ merchantId }).select('_id');
    const storeIds = merchantStores.map(store => store._id);

    const outlet = await Outlet.findOne({
      _id: id,
      store: { $in: storeIds }
    }).populate('store', 'name logo');

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Outlet not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...outlet.toObject(),
        openingHoursSimple: simplifyOpeningHours(outlet.openingHours)
      }
    });
  } catch (error: any) {
    logger.error('[MERCHANT OUTLETS] Error fetching outlet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch outlet',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/merchant/outlets
 * @desc    Create a new outlet
 * @access  Private (Merchant)
 */
router.post('/', validateRequest(createOutletSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const outletData = req.body;

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: outletData.storeId,
      merchantId
    });

    if (!store) {
      return res.status(400).json({
        success: false,
        message: 'Store not found or does not belong to this merchant'
      });
    }

    // Transform simple opening hours to model format
    const openingHours = transformOpeningHours(outletData.openingHours);

    // Create outlet
    const outlet = new Outlet({
      store: outletData.storeId,
      name: outletData.name,
      address: outletData.address,
      location: {
        type: 'Point',
        coordinates: outletData.location.coordinates
      },
      phone: outletData.phone,
      email: outletData.email || undefined,
      openingHours,
      isActive: outletData.isActive ?? true
    });

    await outlet.save();

    // Populate store for response
    await outlet.populate('store', 'name logo');

    res.status(201).json({
      success: true,
      message: 'Outlet created successfully',
      data: {
        ...outlet.toObject(),
        openingHoursSimple: simplifyOpeningHours(outlet.openingHours)
      }
    });
  } catch (error: any) {
    logger.error('[MERCHANT OUTLETS] Error creating outlet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create outlet',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/merchant/outlets/:id
 * @desc    Update an existing outlet
 * @access  Private (Merchant)
 */
router.put('/:id', validateParams(outletIdSchema), validateRequest(updateOutletSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const { id } = req.params;
    const updateData = req.body;

    // Get merchant's stores
    const merchantStores = await Store.find({ merchantId }).select('_id');
    const storeIds = merchantStores.map(store => store._id);

    // Find outlet
    const outlet = await Outlet.findOne({
      _id: id,
      store: { $in: storeIds }
    });

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Outlet not found'
      });
    }

    // If storeId is being changed, verify new store belongs to merchant
    if (updateData.storeId && updateData.storeId !== outlet.store.toString()) {
      const newStore = await Store.findOne({
        _id: updateData.storeId,
        merchantId
      });

      if (!newStore) {
        return res.status(400).json({
          success: false,
          message: 'New store not found or does not belong to this merchant'
        });
      }

      outlet.store = updateData.storeId;
    }

    // Update fields
    if (updateData.name) outlet.name = updateData.name;
    if (updateData.address) outlet.address = updateData.address;
    if (updateData.location) {
      outlet.location = {
        type: 'Point',
        coordinates: updateData.location.coordinates
      };
    }
    if (updateData.phone) outlet.phone = updateData.phone;
    if (updateData.email !== undefined) outlet.email = updateData.email || undefined;
    if (updateData.openingHours) {
      outlet.openingHours = transformOpeningHours(updateData.openingHours);
    }
    if (updateData.isActive !== undefined) outlet.isActive = updateData.isActive;

    await outlet.save();

    // Populate store for response
    await outlet.populate('store', 'name logo');

    res.json({
      success: true,
      message: 'Outlet updated successfully',
      data: {
        ...outlet.toObject(),
        openingHoursSimple: simplifyOpeningHours(outlet.openingHours)
      }
    });
  } catch (error: any) {
    logger.error('[MERCHANT OUTLETS] Error updating outlet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update outlet',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/merchant/outlets/:id
 * @desc    Delete an outlet
 * @access  Private (Merchant)
 */
router.delete('/:id', validateParams(outletIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const { id } = req.params;

    // Get merchant's stores
    const merchantStores = await Store.find({ merchantId }).select('_id');
    const storeIds = merchantStores.map(store => store._id);

    // Find and delete outlet
    const outlet = await Outlet.findOneAndDelete({
      _id: id,
      store: { $in: storeIds }
    });

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Outlet not found'
      });
    }

    res.json({
      success: true,
      message: 'Outlet deleted successfully'
    });
  } catch (error: any) {
    logger.error('[MERCHANT OUTLETS] Error deleting outlet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete outlet',
      error: error.message
    });
  }
});

/**
 * @route   PATCH /api/merchant/outlets/:id/toggle-active
 * @desc    Toggle outlet active status
 * @access  Private (Merchant)
 */
router.patch('/:id/toggle-active', validateParams(outletIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const { id } = req.params;

    // Get merchant's stores
    const merchantStores = await Store.find({ merchantId }).select('_id');
    const storeIds = merchantStores.map(store => store._id);

    // Find outlet
    const outlet = await Outlet.findOne({
      _id: id,
      store: { $in: storeIds }
    });

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Outlet not found'
      });
    }

    // Toggle active status
    outlet.isActive = !outlet.isActive;
    await outlet.save();

    res.json({
      success: true,
      message: `Outlet ${outlet.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: outlet._id,
        isActive: outlet.isActive
      }
    });
  } catch (error: any) {
    logger.error('[MERCHANT OUTLETS] Error toggling outlet status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle outlet status',
      error: error.message
    });
  }
});

export default router;
