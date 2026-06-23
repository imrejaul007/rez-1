// Security Routes
// Routes for device verification, fraud detection, and security checks

import { Router } from 'express';
import {
  verifyDevice,
  checkBlacklist,
  reportSuspicious,
  verifyCaptcha,
  getIpInfo,
  checkMultiAccount
} from '../controllers/securityController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Verify device fingerprint and get trust score
router.post('/verify-device',
  validateBody(Joi.object({
    deviceId: Joi.string().required(),
    platform: Joi.string().valid('ios', 'android', 'web').required(),
    osVersion: Joi.string().optional(),
    appVersion: Joi.string().optional(),
    deviceModel: Joi.string().optional(),
    deviceName: Joi.string().optional()
  })),
  verifyDevice
);

// Check if device/IP is blacklisted
router.post('/check-blacklist',
  validateBody(Joi.object({
    deviceId: Joi.string().optional(),
    ip: Joi.string().optional()
  })),
  checkBlacklist
);

// Report suspicious activity
router.post('/report-suspicious',
  validateBody(Joi.object({
    type: Joi.string().required(),
    details: Joi.object().optional()
  })),
  reportSuspicious
);

// Verify captcha token
router.post('/verify-captcha',
  validateBody(Joi.object({
    token: Joi.string().required(),
    action: Joi.string().optional()
  })),
  verifyCaptcha
);

// Get IP information (geolocation, VPN detection)
router.post('/ip-info',
  validateBody(Joi.object({
    ip: Joi.string().optional()
  })),
  getIpInfo
);

// GET variant for frontend compatibility
router.get('/ip-info', getIpInfo);

// Check for multi-account patterns
router.post('/check-multi-account',
  validateBody(Joi.object({
    deviceId: Joi.string().optional(),
    ip: Joi.string().optional()
  })),
  checkMultiAccount
);

export default router;
