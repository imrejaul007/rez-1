import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { GiftCard } from '../../models/GiftCard';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/gift-cards
 * @desc    List all gift cards (active + inactive)
 * @access  Admin
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { category, search, isActive } = req.query;
    const query: any = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.$text = { $search: search as string };

    const giftCards = await GiftCard.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: { giftCards, total: giftCards.length } });
}));

/**
 * @route   POST /api/admin/gift-cards
 * @desc    Create a new gift card in the catalog
 * @access  Admin
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, description, logo, color, category, denominations, cashbackPercentage, termsAndConditions, validityDays, storeId } = req.body;

    if (!name || !category || !denominations?.length) {
      return res.status(400).json({ success: false, message: 'Name, category, and denominations are required' });
    }

    const giftCard = await GiftCard.create({
      name, description, logo, color, category, denominations,
      cashbackPercentage: cashbackPercentage || 0,
      termsAndConditions, validityDays: validityDays || 365,
      storeId, isActive: true,
    });

    res.status(201).json({ success: true, data: giftCard, message: 'Gift card created' });
}));

/**
 * @route   PUT /api/admin/gift-cards/:id
 * @desc    Update a gift card
 * @access  Admin
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const giftCard = await GiftCard.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!giftCard) {
      return res.status(404).json({ success: false, message: 'Gift card not found' });
    }

    res.json({ success: true, data: giftCard, message: 'Gift card updated' });
}));

/**
 * @route   DELETE /api/admin/gift-cards/:id
 * @desc    Deactivate a gift card (soft delete)
 * @access  Admin
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const giftCard = await GiftCard.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!giftCard) {
      return res.status(404).json({ success: false, message: 'Gift card not found' });
    }

    res.json({ success: true, message: 'Gift card deactivated' });
}));

export default router;
