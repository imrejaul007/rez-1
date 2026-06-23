import { Router } from 'express';
import { getSocialProofStats } from '../controllers/statsController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Get social proof stats
router.get('/social',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string()
  })),
  getSocialProofStats
);

export default router;





