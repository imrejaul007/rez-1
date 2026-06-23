import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { logger } from '../config/logger';
import { validateRequest } from '../middleware/merchantvalidation';
import TeamInvitationService from '../services/TeamInvitationService';
import { Merchant } from '../models/Merchant';

const router = Router();

// Validation schemas
const acceptInvitationSchema = Joi.object({
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().min(6).required().valid(Joi.ref('password')).messages({
    'any.only': 'Passwords do not match'
  })
});

/**
 * @route   GET /api/merchant/team-public/validate-invitation/:token
 * @desc    Validate invitation token
 * @access  Public
 */
router.get('/validate-invitation/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const result = await TeamInvitationService.validateInvitationToken(token);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Invalid invitation token'
      });
    }

    // Get merchant details
    const merchant = await Merchant.findById(result.merchantUser!.merchantId);

    return res.json({
      success: true,
      data: {
        valid: true,
        invitation: {
          name: result.merchantUser!.name,
          email: result.merchantUser!.email,
          role: result.merchantUser!.role,
          businessName: merchant?.businessName || 'Unknown Business',
          expiresAt: result.merchantUser!.invitationExpiry
        }
      }
    });
  } catch (error: any) {
    logger.error('Error validating invitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate invitation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/merchant/team-public/accept-invitation/:token
 * @desc    Accept invitation and set password
 * @access  Public
 */
router.post('/accept-invitation/:token', validateRequest(acceptInvitationSchema), async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const result = await TeamInvitationService.acceptInvitation(token, password);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.json({
      success: true,
      message: 'Invitation accepted successfully! You can now login with your credentials.',
      data: {
        email: result.merchantUser!.email,
        name: result.merchantUser!.name,
        role: result.merchantUser!.role
      }
    });
  } catch (error: any) {
    logger.error('Error accepting invitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept invitation',
      error: error.message
    });
  }
});

export default router;
