import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { Joi } from '../../middleware/validation';
import { setGoldPrice } from '../../controllers/goldSavingsController';

const router = Router();

// All routes require admin auth
router.use(authenticate, requireAdmin);

router.post(
  '/price',
  validate(
    Joi.object({
      pricePerGram: Joi.number().positive().required(),
      currency: Joi.string().valid('INR', 'AED', 'USD').default('INR'),
      source: Joi.string().valid('manual', 'api', 'scheduled').default('manual'),
    })
  ),
  setGoldPrice
);

export default router;
