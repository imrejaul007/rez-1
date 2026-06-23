import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { ServiceBooking } from '../../models/ServiceBooking';
import { Product } from '../../models/Product';
import { ServiceCategory } from '../../models/ServiceCategory';
import travelCashbackService from '../../services/travelCashbackService';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

const TRAVEL_SLUGS = ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'];

/**
 * GET /api/admin/travel/dashboard
 * Travel management dashboard stats
 */
router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
    // Get travel category IDs
    const travelCategories = await ServiceCategory.find({
      slug: { $in: TRAVEL_SLUGS },
    }).select('_id name slug cashbackPercentage').lean();

    const categoryIds = travelCategories.map((c: any) => c._id);

    // Aggregate booking stats
    const [bookingStats, revenueStats, cashbackStats, recentBookings] = await Promise.all([
      // Total bookings by status
      ServiceBooking.aggregate([
        { $match: { serviceCategory: { $in: categoryIds } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Revenue
      ServiceBooking.aggregate([
        { $match: { serviceCategory: { $in: categoryIds }, paymentStatus: 'paid' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$pricing.total' },
            avgBookingValue: { $avg: '$pricing.total' },
          },
        },
      ]),

      // Cashback stats
      ServiceBooking.aggregate([
        { $match: { serviceCategory: { $in: categoryIds } } },
        {
          $group: {
            _id: '$cashbackStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$pricing.cashbackEarned' },
          },
        },
      ]),

      // Recent bookings
      ServiceBooking.find({ serviceCategory: { $in: categoryIds } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('service', 'name images')
        .populate('serviceCategory', 'name slug icon')
        .populate('user', 'name phone')
        .lean(),
    ]);

    // Format stats
    const statusCounts: Record<string, number> = {};
    bookingStats.forEach((s: any) => {
      statusCounts[s._id] = s.count;
    });

    const cashbackByStatus: Record<string, { count: number; amount: number }> = {};
    cashbackStats.forEach((s: any) => {
      cashbackByStatus[s._id || 'pending'] = { count: s.count, amount: s.totalAmount };
    });

    const totalBookings = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    // Revenue by category
    const revByCat = await ServiceBooking.aggregate([
      { $match: { serviceCategory: { $in: categoryIds }, paymentStatus: 'paid' } },
      {
        $group: {
          _id: '$serviceCategory',
          revenue: { $sum: '$pricing.total' },
          count: { $sum: 1 },
        },
      },
    ]);

    const revenueByCategory = revByCat.map((r: any) => {
      const cat = travelCategories.find((c: any) => c._id.toString() === r._id.toString());
      return {
        categoryId: r._id,
        categoryName: cat?.name || 'Unknown',
        categorySlug: cat?.slug || '',
        revenue: r.revenue,
        bookingCount: r.count,
      };
    });

    sendSuccess(res, {
      totalBookings,
      statusCounts,
      revenue: {
        total: revenueStats[0]?.totalRevenue || 0,
        average: revenueStats[0]?.avgBookingValue || 0,
      },
      cashback: cashbackByStatus,
      revenueByCategory,
      categories: travelCategories,
      recentBookings,
    });
}));

/**
 * GET /api/admin/travel/categories
 * List travel service categories with stats
 */
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
    const categories = await ServiceCategory.find({
      slug: { $in: TRAVEL_SLUGS },
    }).lean();

    // Get service counts per category
    const categoryCounts = await Product.aggregate([
      {
        $match: {
          serviceCategory: {
            $in: categories.map((c: any) => c._id),
          },
          productType: 'service',
        },
      },
      { $group: { _id: '$serviceCategory', count: { $sum: 1 } } },
    ]);

    const countMap: Record<string, number> = {};
    categoryCounts.forEach((c: any) => {
      countMap[c._id.toString()] = c.count;
    });

    const result = categories.map((cat: any) => ({
      ...cat,
      serviceCount: countMap[cat._id.toString()] || 0,
    }));

    sendSuccess(res, result);
}));

/**
 * PUT /api/admin/travel/categories/:id
 * Update travel category settings
 */
router.put('/categories/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cashbackPercentage, maxCashback, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid category ID', 400);
    }

    const category = await ServiceCategory.findById(id);
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    if (cashbackPercentage !== undefined) category.cashbackPercentage = cashbackPercentage;
    if (maxCashback !== undefined) (category as any).maxCashback = maxCashback;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    sendSuccess(res, category);
}));

/**
 * GET /api/admin/travel/services
 * List travel services (products)
 */
router.get('/services', asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      isActive,
    } = req.query;

    const travelCategories = await ServiceCategory.find({
      slug: { $in: TRAVEL_SLUGS },
    }).select('_id').lean();

    const categoryIds = travelCategories.map((c: any) => c._id);

    const query: any = {
      productType: 'service',
      serviceCategory: { $in: categoryIds },
    };

    if (category) {
      query.serviceCategory = new mongoose.Types.ObjectId(category as string);
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (search) {
      const escapedSearch = escapeRegex(search as string);
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [services, total] = await Promise.all([
      Product.find(query)
        .populate('serviceCategory', 'name slug icon cashbackPercentage')
        .populate('store', 'name logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    sendSuccess(res, {
      services,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
}));

/**
 * PUT /api/admin/travel/services/:id
 * Update travel service
 */
router.put('/services/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid service ID', 400);
    }

    const service = await Product.findById(id);
    if (!service) {
      return sendError(res, 'Service not found', 404);
    }

    // Allow updating specific fields
    const allowedFields = ['isActive', 'isFeatured', 'pricing', 'name', 'description'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        (service as any)[field] = updates[field];
      }
    }

    await service.save();
    sendSuccess(res, service);
}));

/**
 * GET /api/admin/travel/bookings
 * List travel bookings with filters
 */
router.get('/bookings', asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      status,
      cashbackStatus,
      category,
      search,
      dateFrom,
      dateTo,
    } = req.query;

    const travelCategories = await ServiceCategory.find({
      slug: { $in: TRAVEL_SLUGS },
    }).select('_id').lean();

    const categoryIds = travelCategories.map((c: any) => c._id);

    const query: any = {
      serviceCategory: { $in: categoryIds },
    };

    if (status) query.status = status;
    if (cashbackStatus) query.cashbackStatus = cashbackStatus;
    if (category) {
      query.serviceCategory = new mongoose.Types.ObjectId(category as string);
    }
    if (search) {
      const escapedSearch = escapeRegex(search as string);
      query.$or = [
        { bookingNumber: { $regex: escapedSearch, $options: 'i' } },
        { pnr: { $regex: escapedSearch, $options: 'i' } },
        { customerName: { $regex: escapedSearch, $options: 'i' } },
        { customerPhone: { $regex: escapedSearch, $options: 'i' } },
      ];
    }
    if (dateFrom || dateTo) {
      query.bookingDate = {};
      if (dateFrom) query.bookingDate.$gte = new Date(dateFrom as string);
      if (dateTo) query.bookingDate.$lte = new Date(dateTo as string);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      ServiceBooking.find(query)
        .populate('service', 'name images')
        .populate('serviceCategory', 'name slug icon')
        .populate('user', 'name phone email')
        .populate('store', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ServiceBooking.countDocuments(query),
    ]);

    sendSuccess(res, {
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
}));

/**
 * GET /api/admin/travel/bookings/:id
 * Get single booking detail
 */
router.get('/bookings/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid booking ID', 400);
    }

    const booking = await ServiceBooking.findById(id)
      .populate('service', 'name images pricing')
      .populate('serviceCategory', 'name slug icon cashbackPercentage')
      .populate('user', 'name phone email')
      .populate('store', 'name logo location')
      .lean();

    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    sendSuccess(res, booking);
}));

/**
 * PUT /api/admin/travel/bookings/:id/status
 * Admin status override
 */
router.put('/bookings/:id/status', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid booking ID', 400);
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const booking = await ServiceBooking.findById(id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    booking.status = status;
    if (status === 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancellationReason = 'Cancelled by admin';
    }
    if (status === 'completed' && !booking.completedAt) {
      booking.completedAt = new Date();
    }

    await booking.save();
    sendSuccess(res, booking);
}));

/**
 * PUT /api/admin/travel/bookings/:id/cashback
 * Admin cashback override (force credit or clawback)
 */
router.put('/bookings/:id/cashback', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { action } = req.body; // 'credit' or 'clawback'

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid booking ID', 400);
    }

    if (!['credit', 'clawback'].includes(action)) {
      return sendError(res, 'Action must be "credit" or "clawback"', 400);
    }

    const booking = await ServiceBooking.findById(id)
      .populate('serviceCategory', 'slug');

    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    if (action === 'credit') {
      if (booking.cashbackStatus === 'credited') {
        return sendError(res, 'Cashback already credited', 400);
      }
      await travelCashbackService.creditCashbackForBooking(booking);
    } else {
      if (booking.cashbackStatus === 'clawed_back') {
        return sendError(res, 'Cashback already clawed back', 400);
      }
      await travelCashbackService.handleRefund(id, 'Admin override clawback');
    }

    // Re-fetch updated booking
    const updated = await ServiceBooking.findById(id).lean();
    sendSuccess(res, updated);
}));

/**
 * PUT /api/admin/travel/bookings/:id/pnr
 * Update PNR, eTicketUrl, externalReference
 */
router.put('/bookings/:id/pnr', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { pnr, eTicketUrl, externalReference } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid booking ID', 400);
    }

    const booking = await ServiceBooking.findById(id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    if (pnr !== undefined) booking.pnr = pnr;
    if (eTicketUrl !== undefined) booking.eTicketUrl = eTicketUrl;
    if (externalReference !== undefined) booking.externalReference = externalReference;

    await booking.save();
    sendSuccess(res, booking);
}));

export default router;
