import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { createRateLimiter } from '../middleware/rateLimiter';
import * as controller from '../controllers/specialProgramController';

const router = Router();

// Rate limiter for program activation (5 attempts per hour per IP)
const activateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many activation attempts. Please try again later.',
});

// Public: list all programs (adds user status if authenticated via optional auth)
router.get('/', (req, res, next) => {
  // Optional authentication — try to authenticate but don't block if no token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
}, asyncHandler(controller.listPrograms));

// All routes below require authentication
router.use(authenticate);

router.get('/my-memberships', asyncHandler(controller.getUserMemberships));
router.get('/:slug/check-eligibility', asyncHandler(controller.checkEligibility));
router.post('/:slug/activate', activateLimiter, asyncHandler(controller.activateProgram));
router.get('/:slug/dashboard', asyncHandler(controller.getMemberDashboard));

export default router;
