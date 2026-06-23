import { Router } from 'express';
import {
  getUserSettings,
  updateGeneralSettings,
  updateNotificationPreferences,
  updatePrivacySettings,
  updateSecuritySettings,
  updateDeliveryPreferences,
  updatePaymentPreferences,
  updateAppPreferences,
  resetSettings,
  getCourierPreferences,
  updateCourierPreferences,
  getNotificationSettings,
  updatePushNotifications,
  updateEmailNotifications,
  updateSMSNotifications,
  updateInAppNotifications,
  enableTwoFactorAuth,
  disableTwoFactorAuth,
  verifyTwoFactorCode,
  generateBackupCodes,
  updateBiometricSettings,
  getSecurityStatus
} from '../controllers/userSettingsController';
import { authenticate } from '../middleware/auth';
import { generalLimiter, profileUpdateLimiter } from '../middleware/rateLimiter';
import { validateBody, Joi } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(generalLimiter);

// Settings routes
router.get('/', getUserSettings);
router.put('/general', updateGeneralSettings);
router.put('/notifications', updateNotificationPreferences);
router.put('/privacy', profileUpdateLimiter, validateBody(Joi.object({
  profileVisibility: Joi.string().valid('PUBLIC', 'FRIENDS', 'PRIVATE'),
  showActivity: Joi.boolean(),
  showPurchaseHistory: Joi.boolean(),
  allowMessaging: Joi.boolean(),
  allowFriendRequests: Joi.boolean(),
  dataSharing: Joi.object().optional(),
  analytics: Joi.object().optional(),
}).min(1)), updatePrivacySettings);
router.put('/security', updateSecuritySettings);
router.put('/delivery', updateDeliveryPreferences);

// Security-specific routes
router.get('/security/status', getSecurityStatus);
router.post('/security/2fa/enable', enableTwoFactorAuth);
router.post('/security/2fa/disable', disableTwoFactorAuth);
router.post('/security/2fa/verify', verifyTwoFactorCode);
router.post('/security/2fa/backup-codes', generateBackupCodes);
router.put('/security/biometric', updateBiometricSettings);
router.put('/payment', updatePaymentPreferences);
router.put('/preferences', updateAppPreferences);
router.post('/reset', resetSettings);

// Courier preference routes
router.get('/courier', getCourierPreferences);
router.put('/courier', updateCourierPreferences);

// Enhanced notification routes
router.get('/notifications/all', getNotificationSettings);
router.put('/notifications/push', updatePushNotifications);
router.put('/notifications/email', updateEmailNotifications);
router.put('/notifications/sms', updateSMSNotifications);
router.put('/notifications/inapp', updateInAppNotifications);

export default router;