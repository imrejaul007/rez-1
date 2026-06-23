import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const merchant = req.merchant;
    if (!merchant) return res.status(401).json({ success: false });

    const rezMerchantId = String(merchant._id);
    const adBazaarUrl = process.env.ADBAZAAR_API_URL; // e.g. https://adbazaar.in

    if (!adBazaarUrl) {
      // Return empty data gracefully if not configured
      return res.json({
        success: true,
        data: { activeBookings: 0, totalScans: 0, revenueAttributed: 0, recentBookings: [] },
      });
    }

    const response = await fetch(`${adBazaarUrl}/api/merchant/summary?rezMerchantId=${rezMerchantId}`, {
      headers: { 'x-internal-key': process.env.ADBAZAAR_INTERNAL_KEY || '' },
    });

    if (!response.ok) {
      return res.json({
        success: true,
        data: { activeBookings: 0, totalScans: 0, revenueAttributed: 0, recentBookings: [] },
      });
    }

    const data = await response.json();
    return res.json({ success: true, data });
  } catch {
    return res.json({
      success: true,
      data: { activeBookings: 0, totalScans: 0, revenueAttributed: 0, recentBookings: [] },
    });
  }
});

export default router;
