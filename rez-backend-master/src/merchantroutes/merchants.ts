import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/merchants/profile
// @desc    Get merchant profile
// @access  Private
router.get('/profile', (req, res) => {
  res.json({
    success: true,
    message: 'Merchant profile endpoint - to be implemented',
    data: { merchantId: req.merchantId }
  });
});

// @route   PUT /api/merchants/profile
// @desc    Update merchant profile
// @access  Private
router.put('/profile', (req, res) => {
  res.json({
    success: true,
    message: 'Update merchant profile endpoint - to be implemented'
  });
});

export default router;