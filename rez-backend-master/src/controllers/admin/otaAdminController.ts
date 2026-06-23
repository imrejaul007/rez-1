/**
 * OTA Hotel Admin Controller
 *
 * Admin endpoints for managing OTA hotels and viewing booking/GMV stats.
 */

import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../middleware/errorHandler';
import OtaHotel from '../../models/OtaHotel';
import OtaBooking from '../../models/OtaBooking';

/**
 * GET /api/admin/ota/overview
 * Aggregate stats: active hotels, active bookings, today's GMV, brandCoin liability
 */
export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeHotels, activeBookings, gmvAgg, liabilityAgg] = await Promise.all([
    OtaHotel.countDocuments({ isActive: true }),
    OtaBooking.countDocuments({ status: 'confirmed' }),
    OtaBooking.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart },
          status: { $in: ['confirmed', 'completed'] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
    OtaHotel.aggregate([
      { $match: { isActive: true, brandCoinEnabled: true } },
      { $group: { _id: null, total: { $sum: '$totalBrandCoinLiabilityPaise' } } },
    ]),
  ]);

  return sendSuccess(res, {
    activeHotels,
    activeBookings,
    gmvTodayPaise: gmvAgg[0]?.total ?? 0,
    brandCoinTotalLiabilityPaise: liabilityAgg[0]?.total ?? 0,
  });
});

/**
 * GET /api/admin/ota/hotels?page=N
 * Paginated hotel list (20 per page)
 */
export const getHotels = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  const [hotels, total] = await Promise.all([
    OtaHotel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OtaHotel.countDocuments(),
  ]);

  return sendSuccess(res, { hotels, total });
});

/**
 * POST /api/admin/ota/hotels/:hotelId/brand-coin
 * Toggle brandCoinEnabled for a hotel
 */
export const toggleBrandCoin = asyncHandler(async (req: Request, res: Response) => {
  const { hotelId } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return sendError(res, 'enabled must be a boolean', 400);
  }

  const hotel = await OtaHotel.findByIdAndUpdate(hotelId, { brandCoinEnabled: enabled }, { new: true });

  if (!hotel) {
    throw new AppError('Hotel not found', 404);
  }

  return sendSuccess(res, hotel, 'Brand coin status updated');
});
