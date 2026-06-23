// @ts-nocheck
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { CustomerCredit } from '../models/CustomerCredit';
import { User } from '../models/User';
import mongoose from 'mongoose';

const router = Router();

// GET /api/consumer/khata — all credit balances for this consumer
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id).select('phoneNumber').lean();
    if (!user?.phoneNumber) return res.json({ success: true, data: [] });

    const credits = await CustomerCredit.find({ customerPhone: user.phoneNumber })
      .populate('merchantId', 'businessName')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, data: credits });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/consumer/khata/:merchantId — transaction history with one merchant
router.get('/:merchantId', requireAuth, async (req: any, res) => {
  try {
    // RACHEL: attack surface — sequential ID validation: validate ObjectId format
    const { merchantId } = req.params;
    if (!mongoose.isValidObjectId(merchantId)) {
      return res.status(400).json({ success: false, error: 'Invalid merchant ID format' });
    }

    const user = await User.findById(req.user.id).select('phoneNumber').lean();
    if (!user?.phoneNumber) return res.json({ success: true, data: null });

    const credit = await CustomerCredit.findOne({
      merchantId: merchantId,
      customerPhone: user.phoneNumber,
    })
      .populate('merchantId', 'businessName')
      .lean();

    res.json({ success: true, data: credit || null });
  } catch (err: any) {
    // RACHEL: attack surface — verbose error responses: hide implementation details
    res.status(500).json({ success: false, error: 'An error occurred while retrieving credit information' });
  }
});

export default router;
