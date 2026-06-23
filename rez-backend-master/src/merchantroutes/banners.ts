import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { Store } from '../models/Store';
import Joi from 'joi';
import mongoose from 'mongoose';
import { sendSuccess, sendBadRequest, sendNotFound } from '../utils/response';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Promotional Banner sub-document interface (stored inside Store.promotionalBanners)
// Schema is defined inline below via Store updates

const bannerSchema = Joi.object({
  title: Joi.string().required().min(2).max(100),
  imageUrl: Joi.string().required(),
  linkUrl: Joi.string().allow('').optional(),
  target: Joi.string().valid('store_page', 'home_page', 'category_page').default('store_page'),
  startDate: Joi.date().required(),
  endDate: Joi.date().required().min(Joi.ref('startDate')),
  isActive: Joi.boolean().default(true),
});

const updateBannerSchema = bannerSchema.fork(
  ['title', 'imageUrl', 'startDate', 'endDate'],
  (schema) => schema.optional()
);

/**
 * @route   GET /api/merchant/banners
 * @desc    Get all promotional banners for the merchant's stores
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const { storeId, status } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const query: any = { merchantId };
    if (storeId) {
      query._id = storeId;
    }

    const stores = await Store.find(query)
      .select('name promotionalBanners')
      .lean();

    // Flatten banners from all stores
    const now = new Date();
    let allBanners: any[] = [];

    for (const store of stores) {
      const banners = (store as any).promotionalBanners || [];
      for (const banner of banners) {
        let bannerStatus = 'scheduled';
        const startDate = new Date(banner.startDate);
        const endDate = new Date(banner.endDate);

        if (endDate < now) {
          bannerStatus = 'expired';
        } else if (startDate <= now && endDate >= now && banner.isActive) {
          bannerStatus = 'active';
        } else if (!banner.isActive) {
          bannerStatus = 'inactive';
        }

        allBanners.push({
          ...banner,
          storeId: store._id,
          storeName: store.name,
          status: bannerStatus,
        });
      }
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      allBanners = allBanners.filter(b => b.status === status);
    }

    // Sort by startDate descending
    allBanners.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    // Paginate
    const totalItems = allBanners.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedBanners = allBanners.slice((page - 1) * limit, page * limit);

    return sendSuccess(res, {
      banners: paginatedBanners,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching banners:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch banners' });
  }
});

/**
 * @route   POST /api/merchant/banners
 * @desc    Create a promotional banner for a store
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = bannerSchema.validate(req.body);
    if (error) {
      return sendBadRequest(res, error.details[0].message);
    }

    const { storeId } = req.body;
    if (!storeId) {
      return sendBadRequest(res, 'storeId is required');
    }

    const store = await Store.findOne({ _id: storeId, merchantId: req.merchantId });
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    const bannerId = new mongoose.Types.ObjectId().toString();
    const newBanner = {
      _id: bannerId,
      title: value.title,
      imageUrl: value.imageUrl,
      linkUrl: value.linkUrl || '',
      target: value.target,
      startDate: value.startDate,
      endDate: value.endDate,
      isActive: value.isActive,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Push the banner into the promotionalBanners array
    await Store.findByIdAndUpdate(storeId, {
      $push: { promotionalBanners: newBanner },
    });

    return sendSuccess(res, { banner: newBanner }, 'Banner created successfully', 201);
  } catch (error: any) {
    logger.error('Error creating banner:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create banner' });
  }
});

/**
 * @route   PUT /api/merchant/banners/:bannerId
 * @desc    Update a promotional banner
 */
router.put('/:bannerId', async (req: Request, res: Response) => {
  try {
    const { bannerId } = req.params;
    const { error, value } = updateBannerSchema.validate(req.body);
    if (error) {
      return sendBadRequest(res, error.details[0].message);
    }

    const { storeId } = req.body;
    if (!storeId) {
      return sendBadRequest(res, 'storeId is required');
    }

    const store = await Store.findOne({ _id: storeId, merchantId: req.merchantId });
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    const updateFields: any = {};
    if (value.title) updateFields['promotionalBanners.$.title'] = value.title;
    if (value.imageUrl) updateFields['promotionalBanners.$.imageUrl'] = value.imageUrl;
    if (value.linkUrl !== undefined) updateFields['promotionalBanners.$.linkUrl'] = value.linkUrl;
    if (value.target) updateFields['promotionalBanners.$.target'] = value.target;
    if (value.startDate) updateFields['promotionalBanners.$.startDate'] = value.startDate;
    if (value.endDate) updateFields['promotionalBanners.$.endDate'] = value.endDate;
    if (value.isActive !== undefined) updateFields['promotionalBanners.$.isActive'] = value.isActive;
    updateFields['promotionalBanners.$.updatedAt'] = new Date();

    const result = await Store.findOneAndUpdate(
      { _id: storeId, merchantId: req.merchantId, 'promotionalBanners._id': bannerId },
      { $set: updateFields },
      { new: true }
    );

    if (!result) {
      return sendNotFound(res, 'Banner not found');
    }

    const updatedBanner = (result as any).promotionalBanners?.find(
      (b: any) => b._id?.toString() === bannerId
    );

    return sendSuccess(res, { banner: updatedBanner }, 'Banner updated successfully');
  } catch (error: any) {
    logger.error('Error updating banner:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update banner' });
  }
});

/**
 * @route   DELETE /api/merchant/banners/:bannerId
 * @desc    Delete a promotional banner
 */
router.delete('/:bannerId', async (req: Request, res: Response) => {
  try {
    const { bannerId } = req.params;
    const { storeId } = req.query;
    if (!storeId) {
      return sendBadRequest(res, 'storeId query parameter is required');
    }

    const result = await Store.findOneAndUpdate(
      { _id: storeId, merchantId: req.merchantId },
      { $pull: { promotionalBanners: { _id: bannerId } } },
      { new: true }
    );

    if (!result) {
      return sendNotFound(res, 'Store or banner not found');
    }

    return sendSuccess(res, null, 'Banner deleted successfully');
  } catch (error: any) {
    logger.error('Error deleting banner:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete banner' });
  }
});

export default router;
