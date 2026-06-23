import { logger } from '../../config/logger';
/**
 * Admin Routes - Bank Offers
 * CRUD for BankOffer model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import BankOffer from '../../models/BankOffer';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/bank-offers
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (req.query.status === 'active') filter.isActive = true;
  else if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.bankName) filter.bankName = { $regex: escapeRegex(req.query.bankName as string), $options: 'i' };
  if (req.query.cardType) filter.cardType = req.query.cardType;
  if (req.query.search) {
    const safeSearch = escapeRegex(req.query.search as string);
    filter.$or = [
      { bankName: { $regex: safeSearch, $options: 'i' } },
      { offerTitle: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [offers, total] = await Promise.all([
    BankOffer.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    BankOffer.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    offers,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, 'Bank offers fetched');
}));

/**
 * GET /api/admin/bank-offers/:id
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
  const offer = await BankOffer.findById(req.params.id).lean();
  if (!offer) return sendError(res, 'Bank offer not found', 404);
  return sendSuccess(res, offer, 'Bank offer fetched');
}));

/**
 * POST /api/admin/bank-offers
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { bankName, offerTitle, discountPercentage, maxDiscount, minTransactionAmount, cardType, validFrom, validUntil, terms } = req.body;

  if (!bankName || !offerTitle || discountPercentage === undefined || !maxDiscount || !minTransactionAmount || !cardType || !validFrom || !validUntil || !terms) {
    return sendError(res, 'bankName, offerTitle, discountPercentage, maxDiscount, minTransactionAmount, cardType, validFrom, validUntil, terms are required', 400);
  }

  // SECURITY: explicit allowlist — never spread req.body. Without this, an
  // admin could set fields like isInternal, _id, or override createdBy.
  const ALLOWED = [
    'bankName', 'offerTitle', 'discountPercentage', 'maxDiscount',
    'minTransactionAmount', 'cardType', 'validFrom', 'validUntil', 'terms',
    'isActive', 'banks', 'cardNetworks',
  ];
  const sanitized: Record<string, any> = {};
  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) sanitized[key] = req.body[key];
  }
  const offer = await BankOffer.create({
    ...sanitized,
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
  });

  return sendSuccess(res, offer, 'Bank offer created');
}));

/**
 * PUT /api/admin/bank-offers/:id
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
  const offer = await BankOffer.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!offer) return sendError(res, 'Bank offer not found', 404);
  return sendSuccess(res, offer, 'Bank offer updated');
}));

/**
 * PATCH /api/admin/bank-offers/:id/toggle
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
  const offer = await BankOffer.findById(req.params.id);
  if (!offer) return sendError(res, 'Bank offer not found', 404);
  offer.isActive = !offer.isActive;
  await offer.save();
  return sendSuccess(res, offer, `Bank offer ${offer.isActive ? 'activated' : 'deactivated'}`);
}));

/**
 * DELETE /api/admin/bank-offers/:id
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
  const offer = await BankOffer.findByIdAndDelete(req.params.id);
  if (!offer) return sendError(res, 'Bank offer not found', 404);
  return sendSuccess(res, null, 'Bank offer deleted');
}));

export default router;
