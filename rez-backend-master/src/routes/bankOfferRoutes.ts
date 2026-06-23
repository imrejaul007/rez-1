/**
 * User-Facing Routes - Bank Offers
 * Public/authenticated read-only access to active bank offers
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { optionalAuth } from '../middleware/auth';
import BankOffer from '../models/BankOffer';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Optional auth — bank offers are viewable by anyone, but auth allows personalization later
router.use(optionalAuth);

/**
 * GET /api/bank-offers
 * List active bank offers for users (paginated)
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const skip = (page - 1) * limit;

  const now = new Date();
  const filter: Record<string, any> = {
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  };

  if (req.query.cardType && req.query.cardType !== 'all') {
    filter.cardType = req.query.cardType;
  }

  const [offers, total] = await Promise.all([
    BankOffer.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-usageCount -totalUsageLimit -usageLimitPerUser -createdAt -updatedAt -__v')
      .lean(),
    BankOffer.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  return sendSuccess(res, {
    offers,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  }, 'Bank offers fetched');
}));

/**
 * GET /api/bank-offers/:id
 * Get single bank offer detail
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid offer ID', 400);
  }

  const now = new Date();
  const offer = await BankOffer.findOne({
    _id: req.params.id,
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  })
    .select('-usageCount -totalUsageLimit -usageLimitPerUser -__v')
    .lean();

  if (!offer) {
    return sendError(res, 'Bank offer not found or no longer active', 404);
  }

  return sendSuccess(res, offer, 'Bank offer fetched');
}));

export default router;
