/**
 * Play & Earn Routes
 *
 * Configuration endpoints for the Play & Earn page.
 * Base path: /api/play-earn
 */

import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { getShoppingMethods, getPlayEarnBatch } from '../controllers/playEarnController';

const router = Router();

// Batch endpoint — combines shared data for Play & Earn page (reduces ~18 calls to fewer)
router.get('/batch', optionalAuth, getPlayEarnBatch);

// Shopping methods config (public, no auth required)
router.get('/shopping-methods', optionalAuth, getShoppingMethods);

export default router;
