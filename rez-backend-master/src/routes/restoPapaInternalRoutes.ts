// @ts-nocheck
/**
 * RestoPapa Internal SSO Routes
 *
 * These routes are mounted at /api/internal/restopapa/* — a path that is
 * NOT under /api/merchant/* and therefore bypasses nginx's merchant-service
 * routing. This allows RestoPapa's rez-bridge controller to call REZ backend
 * directly for merchant SSO without the call being intercepted by nginx.
 *
 * All routes require:
 *   1. x-internal-token header (validated by requireInternalToken middleware)
 *   2. Authorization: Bearer <merchant-jwt> header (merchant identity)
 *
 * RestoPapa env vars:
 *   REZ_BACKEND_URL → set to https://api.rez.money/api
 *   The controller calls: GET ${REZ_BACKEND_URL}/internal/restopapa/merchant-profile
 *
 * Required rezbackend env vars:
 *   INTERNAL_SERVICE_TOKEN or INTERNAL_SERVICE_TOKENS_JSON — validates x-internal-token
 *   JWT_SECRET — validates the merchant JWT
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Merchant } from '../models/Merchant';
import { Store } from '../models/Store';
import { requireInternalToken } from '../middleware/internalAuth';
import { createServiceLogger } from '../config/logger';

const router = Router();
const logger = createServiceLogger('restopapa-internal');

// All routes in this file require internal auth
router.use(requireInternalToken);

/**
 * GET /api/internal/restopapa/merchant-profile
 *
 * Called by RestoPapa's rez-bridge.controller.ts to fetch the merchant profile
 * after the SSO JWT exchange. Returns merchant identity in the shape RestoPapa
 * expects: { success: true, data: { _id, userId, email, name, storeId } }
 *
 * RestoPapa calls: GET ${REZ_BACKEND_URL}/internal/restopapa/merchant-profile
 * with headers: Authorization: Bearer <merchant-jwt>, x-internal-token: <token>
 */
router.get('/merchant-profile', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization header with Bearer token required' });
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    logger.error('[RestoPapa] JWT_SECRET not configured');
    return res.status(503).json({ success: false, message: 'Server configuration error' });
  }

  let merchantId: string;
  try {
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as {
      id?: string;
      merchantId?: string;
      userId?: string;
    };
    merchantId = decoded.id || decoded.merchantId || decoded.userId || '';
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Invalid token: no merchant ID in payload' });
    }
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  try {
    const merchant = await Merchant.findById(merchantId)
      .select('-password -passwordResetToken -passwordResetExpiry')
      .lean();
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const stores = await Store.find({ merchant: merchantId }).select('name address isActive').limit(5).lean();
    const primaryStore = stores[0];

    // Return shape that RestoPapa's RezMerchantProfile interface expects
    return res.json({
      success: true,
      data: {
        _id: merchantId,
        userId: (merchant as any).userId?.toString() || merchantId,
        email: (merchant as any).email || '',
        name: (merchant as any).displayName || (merchant as any).businessName || '',
        storeId: primaryStore?._id?.toString(),
        // Extra fields RestoPapa can optionally use
        stores: stores.map((s: any) => ({
          _id: s._id.toString(),
          name: s.name,
          isActive: s.isActive,
        })),
      },
    });
  } catch (err: any) {
    logger.error('[RestoPapa] merchant-profile fetch error', { error: err.message, merchantId });
    return res.status(500).json({ success: false, message: 'Failed to fetch merchant profile' });
  }
});

export default router;
