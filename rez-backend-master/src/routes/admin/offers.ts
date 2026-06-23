import { logger } from '../../config/logger';
import express, { Request, Response } from 'express';
import Joi from 'joi';
import { Types } from 'mongoose';
import Offer from '../../models/Offer';
import { Store } from '../../models/Store';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const offerSchema = Joi.object({
  title: Joi.string().max(100).required(),
  subtitle: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional(),
  image: Joi.string().uri().required(),
  category: Joi.string().valid(
    'mega', 'student', 'new_arrival', 'trending', 'food',
    'fashion', 'electronics', 'general', 'entertainment', 'beauty', 'wellness'
  ).required(),
  type: Joi.string().valid('cashback', 'discount', 'voucher', 'combo', 'special', 'walk_in').required(),
  cashbackPercentage: Joi.number().min(0).max(100).required(),
  originalPrice: Joi.number().min(0).optional(),
  discountedPrice: Joi.number().min(0).optional(),
  storeId: Joi.string().required(),
  exclusiveZone: Joi.string().valid(
    'corporate', 'women', 'birthday', 'student', 'senior',
    'defence', 'healthcare', 'teacher', 'government', 'differently-abled', 'first-time'
  ).optional().allow(null),
  eligibilityRequirement: Joi.string().max(200).optional(),
  validity: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    isActive: Joi.boolean().default(true),
  }).required(),
  metadata: Joi.object({
    priority: Joi.number().default(0),
    tags: Joi.array().items(Joi.string()).default([]),
    isNew: Joi.boolean().default(false),
    isTrending: Joi.boolean().default(false),
    featured: Joi.boolean().default(false),
  }).optional(),
  restrictions: Joi.object({
    minOrderValue: Joi.number().min(0).optional(),
    maxDiscountAmount: Joi.number().min(0).optional(),
    usageLimitPerUser: Joi.number().min(1).optional(),
    usageLimit: Joi.number().min(1).optional(),
  }).optional(),
  isFreeDelivery: Joi.boolean().default(false),
  bogoType: Joi.string().valid('buy1get1', 'buy2get1', 'buy1get50', 'buy2get50').optional(),
  bogoDetails: Joi.string().max(200).optional(),
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @route   GET /api/admin/offers
 * @desc    Get all offers (with filters)
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      exclusiveZone,
      category,
      type,
      isActive,
      search,
    } = req.query;

    const query: any = {};

    // Filter by exclusive zone
    if (exclusiveZone) {
      if (exclusiveZone === 'all-exclusive') {
        query.exclusiveZone = { $exists: true, $ne: null };
      } else if (exclusiveZone === 'none') {
        query.$or = [
          { exclusiveZone: { $exists: false } },
          { exclusiveZone: null }
        ];
      } else {
        query.exclusiveZone = exclusiveZone;
      }
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query['validity.isActive'] = isActive === 'true';
    }

    // Search
    if (search) {
      const escapedSearch = escapeRegex(search as string);
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { subtitle: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { 'store.name': { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [offers, total] = await Promise.all([
      Offer.find(query)
        .sort({ 'metadata.priority': -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Offer.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        offers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasNext: skip + offers.length < total,
          hasPrev: Number(page) > 1,
        },
      },
    });
  }));

/**
 * @route   GET /api/admin/offers/stats
 * @desc    Get offer statistics
 * @access  Admin
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();

    const [total, active, expired, byZone, byCategory] = await Promise.all([
      Offer.countDocuments({}),
      Offer.countDocuments({
        'validity.isActive': true,
        'validity.endDate': { $gte: now },
      }),
      Offer.countDocuments({
        'validity.endDate': { $lt: now },
      }),
      Offer.aggregate([
        { $match: { exclusiveZone: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$exclusiveZone',
            count: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$validity.isActive', true] },
                    { $gte: ['$validity.endDate', now] }
                  ]},
                  1, 0
                ]
              }
            }
          }
        }
      ]),
      Offer.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        total,
        active,
        expired,
        inactive: total - active - expired,
        byZone: byZone.reduce((acc, item) => {
          acc[item._id] = { count: item.count, active: item.active };
          return acc;
        }, {} as Record<string, { count: number; active: number }>),
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  }));

/**
 * @route   GET /api/admin/offers/stores
 * @desc    Get list of stores for dropdown
 * @access  Admin
 */
router.get('/stores', asyncHandler(async (req: Request, res: Response) => {
    const stores = await Store.find({ isActive: true })
      .select('_id name logo')
      .sort({ name: 1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      data: stores,
    });
  }));

/**
 * @route   GET /api/admin/offers/pending-approval
 * @desc    Get offers awaiting admin approval
 * @access  Admin
 */
router.get('/pending-approval', asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = { $or: [{ adminApproved: false }, { adminApproved: { $exists: false } }] };

    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Offer.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        offers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  }));

/**
 * @route   GET /api/admin/offers/:id
 * @desc    Get single offer details
 * @access  Admin
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer ID',
      });
    }

    const offer = await Offer.findById(id).lean();

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    return res.json({
      success: true,
      data: offer,
    });
  }));

/**
 * @route   POST /api/admin/offers
 * @desc    Create new offer
 * @access  Admin
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user._id;

    // Validate request body
    const { error, value } = offerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Get store details
    const store = await Store.findById(value.storeId).lean();
    if (!store) {
      return res.status(400).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Build offer document
    const offerData = {
      title: value.title,
      subtitle: value.subtitle,
      description: value.description,
      image: value.image,
      category: value.category,
      type: value.type,
      cashbackPercentage: value.cashbackPercentage,
      originalPrice: value.originalPrice,
      discountedPrice: value.discountedPrice,
      store: {
        id: store._id,
        name: store.name,
        logo: store.logo,
        rating: (store as any).ratings?.average || 4.5,
        verified: (store as any).isVerified || true,
      },
      location: {
        type: 'Point' as const,
        coordinates: (store as any).location?.coordinates || [77.5946, 12.9716],
      },
      validity: value.validity,
      metadata: value.metadata || { priority: 0, tags: [] },
      restrictions: value.restrictions || {},
      exclusiveZone: value.exclusiveZone || undefined,
      eligibilityRequirement: value.eligibilityRequirement,
      isFreeDelivery: value.isFreeDelivery || false,
      bogoType: value.bogoType,
      bogoDetails: value.bogoDetails,
      createdBy: adminId,
      adminApproved: true,
    };

    const offer = new Offer(offerData);
    await offer.save();

    return res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer,
    });
  }));

/**
 * @route   PUT /api/admin/offers/:id
 * @desc    Update offer
 * @access  Admin
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer ID',
      });
    }

    // Validate request body
    const { error, value } = offerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Get store details if storeId changed
    const store = await Store.findById(value.storeId).lean();
    if (!store) {
      return res.status(400).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Build update object
    const updateData: any = {
      title: value.title,
      subtitle: value.subtitle,
      description: value.description,
      image: value.image,
      category: value.category,
      type: value.type,
      cashbackPercentage: value.cashbackPercentage,
      originalPrice: value.originalPrice,
      discountedPrice: value.discountedPrice,
      store: {
        id: store._id,
        name: store.name,
        logo: store.logo,
        rating: (store as any).ratings?.average || 4.5,
        verified: (store as any).isVerified || true,
      },
      validity: value.validity,
      metadata: value.metadata || { priority: 0, tags: [] },
      restrictions: value.restrictions || {},
      eligibilityRequirement: value.eligibilityRequirement,
      isFreeDelivery: value.isFreeDelivery || false,
      bogoType: value.bogoType,
      bogoDetails: value.bogoDetails,
    };

    // Handle exclusiveZone - explicitly set or unset
    if (value.exclusiveZone) {
      updateData.exclusiveZone = value.exclusiveZone;
    } else {
      updateData.$unset = { exclusiveZone: 1 };
    }

    const offer = await Offer.findByIdAndUpdate(
      id,
      value.exclusiveZone ? updateData : { ...updateData, $unset: { exclusiveZone: 1 } },
      { new: true }
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    return res.json({
      success: true,
      message: 'Offer updated successfully',
      data: offer,
    });
  }));

/**
 * @route   PATCH /api/admin/offers/:id/toggle
 * @desc    Toggle offer active status
 * @access  Admin
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer ID',
      });
    }

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    offer.validity.isActive = !offer.validity.isActive;
    await offer.save();

    return res.json({
      success: true,
      message: `Offer ${offer.validity.isActive ? 'activated' : 'deactivated'}`,
      data: { isActive: offer.validity.isActive },
    });
  }));

/**
 * @route   PUT /api/admin/offers/:id/approve
 * @desc    Approve a merchant-created offer
 * @access  Admin
 */
router.put('/:id/approve', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req as any).user._id;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid offer ID' });
    }

    const offer = await Offer.findByIdAndUpdate(
      id,
      { $set: { adminApproved: true, adminNotes: req.body.notes || '', approvedBy: adminId, approvedAt: new Date() } },
      { new: true }
    );

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    return res.json({
      success: true,
      message: 'Offer approved successfully',
      data: offer,
    });
  }));

/**
 * @route   PUT /api/admin/offers/:id/reject
 * @desc    Reject a merchant-created offer
 * @access  Admin
 */
router.put('/:id/reject', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req as any).user._id;
    const { reason } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid offer ID' });
    }

    const offer = await Offer.findByIdAndUpdate(
      id,
      { $set: { adminApproved: false, adminNotes: reason || 'Rejected by admin', rejectedBy: adminId, rejectedAt: new Date() } },
      { new: true }
    );

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    return res.json({
      success: true,
      message: 'Offer rejected',
      data: offer,
    });
  }));

/**
 * @route   DELETE /api/admin/offers/:id
 * @desc    Delete offer
 * @access  Admin
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer ID',
      });
    }

    const offer = await Offer.findByIdAndDelete(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    return res.json({
      success: true,
      message: 'Offer deleted successfully',
    });
  }));

export default router;
