import express, { Request, Response } from 'express';
import { Types } from 'mongoose';
import { VerifiedInstitution } from '../../models/VerifiedInstitution';
import UserZoneVerification from '../../models/UserZoneVerification';
import { User } from '../../models/User';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';

const router = express.Router();

router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/admin/institutions
 * @desc    List institutions with optional type/search filter
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    type,
    search,
    page = '1',
    limit = '20',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter: any = {};
  if (type) filter.type = type;
  if (search) {
    const escaped = escapeRegex(search as string);
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { aliases: { $regex: escaped, $options: 'i' } },
      { city: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [institutions, total] = await Promise.all([
    VerifiedInstitution.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    VerifiedInstitution.countDocuments(filter),
  ]);

  // Enrich with verified/pending counts
  const enriched = await Promise.all(
    institutions.map(async (inst) => {
      const [verifiedCount, pendingCount] = await Promise.all([
        UserZoneVerification.countDocuments({
          'submittedData.instituteName': { $regex: escapeRegex(inst.name), $options: 'i' },
          status: 'approved',
        }),
        UserZoneVerification.countDocuments({
          'submittedData.instituteName': { $regex: escapeRegex(inst.name), $options: 'i' },
          status: 'pending',
        }),
      ]);
      return { ...inst, verifiedCount, pendingCount };
    })
  );

  sendSuccess(res, {
    institutions: enriched,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
  });
}));

/**
 * @route   GET /api/admin/institutions/:id
 * @desc    Get single institution
 * @access  Admin
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid institution ID', 400);
  }

  const institution = await VerifiedInstitution.findById(req.params.id).lean();
  if (!institution) {
    return sendError(res, 'Institution not found', 404);
  }

  sendSuccess(res, { institution });
}));

/**
 * @route   POST /api/admin/institutions
 * @desc    Create a new institution
 * @access  Admin
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { name, type, emailDomains, aliases, city, state, autoVerifyEnabled, logoUrl } = req.body;

  if (!name || !type || !city) {
    return sendError(res, 'name, type, and city are required', 400);
  }

  const institution = await VerifiedInstitution.create({
    name,
    type,
    emailDomains: emailDomains || [],
    aliases: aliases || [],
    city,
    state,
    autoVerifyEnabled: autoVerifyEnabled !== false,
    logoUrl,
    addedBy: (req as any).user._id,
  });

  sendSuccess(res, { institution }, 'Institution created successfully');
}));

/**
 * @route   PUT /api/admin/institutions/:id
 * @desc    Update an institution
 * @access  Admin
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid institution ID', 400);
  }

  const { name, type, emailDomains, aliases, city, state, autoVerifyEnabled, logoUrl } = req.body;

  const institution = await VerifiedInstitution.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        ...(name && { name }),
        ...(type && { type }),
        ...(emailDomains && { emailDomains }),
        ...(aliases && { aliases }),
        ...(city && { city }),
        ...(state !== undefined && { state }),
        ...(autoVerifyEnabled !== undefined && { autoVerifyEnabled }),
        ...(logoUrl !== undefined && { logoUrl }),
      },
    },
    { new: true, runValidators: true }
  );

  if (!institution) {
    return sendError(res, 'Institution not found', 404);
  }

  sendSuccess(res, { institution }, 'Institution updated successfully');
}));

/**
 * @route   DELETE /api/admin/institutions/:id
 * @desc    Soft-delete (deactivate) an institution
 * @access  Admin
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid institution ID', 400);
  }

  const institution = await VerifiedInstitution.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false } },
    { new: true }
  );

  if (!institution) {
    return sendError(res, 'Institution not found', 404);
  }

  sendSuccess(res, { institution }, 'Institution deactivated');
}));

export default router;
