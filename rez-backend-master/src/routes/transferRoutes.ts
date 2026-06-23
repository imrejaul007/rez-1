import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { requireReAuthAbove } from '../middleware/reAuth';
import { requireWalletFeature, WALLET_FEATURES } from '../services/walletFeatureService';
import {
  initiateTransfer,
  confirmTransfer,
  getTransferHistory,
  getRecentRecipients
} from '../controllers/transferController';
import { validate } from '../middleware/validation';
import { initiateTransferSchema, confirmTransferSchema } from '../validators/financialValidators';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Feature flag: disable all transfers if flag is off
router.use(requireWalletFeature(WALLET_FEATURES.TRANSFERS));

// Rate limiters for transfer operations
const transferWriteLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many transfer requests. Please try again later.' });
const transferReadLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: 'Too many requests.' });

// Transfer operations — re-auth required above configured threshold
router.post('/initiate', transferWriteLimiter, idempotencyMiddleware({ ttlSeconds: 600 }), requireReAuthAbove('transfer'), validate(initiateTransferSchema), initiateTransfer);
router.post('/confirm', transferWriteLimiter, idempotencyMiddleware({ ttlSeconds: 600 }), validate(confirmTransferSchema), confirmTransfer);

// History and recipients
router.get('/history', transferReadLimiter, getTransferHistory);
router.get('/recipients', transferReadLimiter, getRecentRecipients);

export default router;
