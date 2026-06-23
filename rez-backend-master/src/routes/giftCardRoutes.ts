import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { requireWalletFeature, WALLET_FEATURES } from '../services/walletFeatureService';
import { requireReAuth } from '../middleware/reAuth';
import {
  getCatalog,
  purchaseGiftCard,
  getMyGiftCards,
  revealGiftCardCode
} from '../controllers/giftCardController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Feature flag: disable all gift card operations if flag is off
router.use(requireWalletFeature(WALLET_FEATURES.GIFT_CARDS));

// Rate limiters
const purchaseLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many purchase requests. Please try again later.' });
const readLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: 'Too many requests.' });

router.get('/catalog', readLimiter, getCatalog);
router.post('/purchase', purchaseLimiter, purchaseGiftCard);
router.get('/mine', readLimiter, getMyGiftCards);
router.get('/:id/reveal', purchaseLimiter, requireReAuth(), revealGiftCardCode);

export default router;
