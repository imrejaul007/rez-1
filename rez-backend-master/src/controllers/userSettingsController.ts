import { Request, Response } from 'express';
import crypto from 'crypto';
import { UserSettings, IUserSettings } from '../models/UserSettings';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

// Get user settings
export const getUserSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  let settings = await UserSettings.findOne({ user: req.user._id })
    .populate('delivery.defaultAddressId')
    .populate('payment.defaultPaymentMethodId').lean();

  // If settings don't exist, create default settings
  if (!settings) {
    settings = await UserSettings.create({ user: req.user._id }) as any;
  }

  sendSuccess(res, settings, 'Settings retrieved successfully');
});

// Update general settings
export const updateGeneralSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { language, timezone, currency, dateFormat, timeFormat, theme } = req.body;
  const updates: Record<string, any> = {};
  if (language !== undefined) updates['general.language'] = language;
  if (timezone !== undefined) updates['general.timezone'] = timezone;
  if (currency !== undefined) updates['general.currency'] = currency;
  if (dateFormat !== undefined) updates['general.dateFormat'] = dateFormat;
  if (timeFormat !== undefined) updates['general.timeFormat'] = timeFormat;
  if (theme !== undefined) updates['general.theme'] = theme;

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'General settings updated successfully');
});

// Update notification preferences
export const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { push, email, sms, inApp } = req.body;
  const updates: Record<string, any> = {};

  // Whitelist push notification fields
  if (push) {
    const pushFields = ['enabled', 'orderUpdates', 'promotions', 'recommendations', 'priceAlerts', 'deliveryUpdates', 'paymentUpdates', 'securityAlerts', 'chatMessages'];
    for (const field of pushFields) {
      if (push[field] !== undefined) updates[`notifications.push.${field}`] = push[field];
    }
  }
  // Whitelist email notification fields
  if (email) {
    const emailFields = ['enabled', 'newsletters', 'orderReceipts', 'weeklyDigest', 'promotions', 'securityAlerts', 'accountUpdates'];
    for (const field of emailFields) {
      if (email[field] !== undefined) updates[`notifications.email.${field}`] = email[field];
    }
  }
  // Whitelist sms notification fields
  if (sms) {
    const smsFields = ['enabled', 'orderUpdates', 'deliveryAlerts', 'paymentConfirmations', 'securityAlerts', 'otpMessages'];
    for (const field of smsFields) {
      if (sms[field] !== undefined) updates[`notifications.sms.${field}`] = sms[field];
    }
  }
  // Whitelist inApp notification fields
  if (inApp) {
    const inAppFields = ['enabled', 'showBadges', 'soundEnabled', 'vibrationEnabled', 'bannerStyle'];
    for (const field of inAppFields) {
      if (inApp[field] !== undefined) updates[`notifications.inApp.${field}`] = inApp[field];
    }
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'Notification preferences updated successfully');
});

// Update privacy settings
export const updatePrivacySettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { profileVisibility, showActivity, showPurchaseHistory, allowMessaging, allowFriendRequests, dataSharing, analytics } = req.body;
  const updates: Record<string, any> = {};

  if (profileVisibility !== undefined) updates['privacy.profileVisibility'] = profileVisibility;
  if (showActivity !== undefined) updates['privacy.showActivity'] = showActivity;
  if (showPurchaseHistory !== undefined) updates['privacy.showPurchaseHistory'] = showPurchaseHistory;
  if (allowMessaging !== undefined) updates['privacy.allowMessaging'] = allowMessaging;
  if (allowFriendRequests !== undefined) updates['privacy.allowFriendRequests'] = allowFriendRequests;

  if (dataSharing) {
    const dsFields = ['shareWithPartners', 'shareForMarketing', 'shareForRecommendations', 'shareForAnalytics', 'sharePurchaseData'];
    for (const field of dsFields) {
      if (dataSharing[field] !== undefined) updates[`privacy.dataSharing.${field}`] = dataSharing[field];
    }
  }
  if (analytics) {
    const aFields = ['allowUsageTracking', 'allowCrashReporting', 'allowPerformanceTracking', 'allowLocationTracking'];
    for (const field of aFields) {
      if (analytics[field] !== undefined) updates[`privacy.analytics.${field}`] = analytics[field];
    }
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'Privacy settings updated successfully');
});

// Update security settings
export const updateSecuritySettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { sessionManagement, loginAlerts } = req.body;
  const updates: Record<string, any> = {};

  // Only allow sessionManagement and loginAlerts — twoFactorAuth and biometric have dedicated endpoints
  if (sessionManagement) {
    const smFields = ['autoLogoutTime', 'allowMultipleSessions', 'rememberMe'];
    for (const field of smFields) {
      if (sessionManagement[field] !== undefined) updates[`security.sessionManagement.${field}`] = sessionManagement[field];
    }
  }
  if (loginAlerts !== undefined) updates['security.loginAlerts'] = loginAlerts;

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'Security settings updated successfully');
});

// Enable Two-Factor Authentication
export const enableTwoFactorAuth = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { method } = req.body;

  if (!['2FA_SMS', '2FA_EMAIL', '2FA_APP'].includes(method)) {
    throw new AppError('Invalid 2FA method', 400);
  }

  // Generate cryptographically secure backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        'security.twoFactorAuth': {
          enabled: true,
          method,
          backupCodes,
          lastUpdated: new Date()
        }
      }
    },
    { new: true, upsert: true }
  );

  sendSuccess(res, {
    enabled: true,
    method,
    backupCodes,
    message: 'Two-factor authentication enabled successfully'
  }, '2FA enabled successfully');
});

// Disable Two-Factor Authentication
export const disableTwoFactorAuth = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { 
      $set: { 
        'security.twoFactorAuth': {
          enabled: false,
          method: '2FA_SMS',
          backupCodes: [],
          lastUpdated: new Date()
        }
      } 
    },
    { new: true, upsert: true }
  );

  sendSuccess(res, { enabled: false }, '2FA disabled successfully');
});

// Verify Two-Factor Authentication Code
export const verifyTwoFactorCode = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { code, method } = req.body;

  const settings = await UserSettings.findOne({ user: req.user._id }).lean();
  if (!settings || !settings.security.twoFactorAuth.enabled) {
    throw new AppError('2FA is not enabled', 400);
  }

  // Check if it's a backup code
  const isBackupCode = settings.security.twoFactorAuth.backupCodes.includes(code);
  
  if (isBackupCode) {
    // Remove used backup code
    const updatedBackupCodes = settings.security.twoFactorAuth.backupCodes.filter(
      backupCode => backupCode !== code
    );
    
    await UserSettings.findOneAndUpdate(
      { user: req.user._id },
      { $set: { 'security.twoFactorAuth.backupCodes': updatedBackupCodes } }
    );

    sendSuccess(res, { verified: true, usedBackupCode: true }, 'Backup code verified successfully');
  } else {
    if (process.env.NODE_ENV === 'development' && code.length === 6 && /^\d+$/.test(code)) {
      // Dev-only: accept any valid 6-digit code
      sendSuccess(res, { verified: true, usedBackupCode: false }, '2FA code verified (dev mode)');
    } else if (process.env.NODE_ENV === 'development') {
      throw new AppError('Invalid 2FA code', 400);
    } else {
      // In production, real TOTP verification is not implemented yet
      sendBadRequest(res, '2FA verification is not yet available. Please disable 2FA in settings.');
    }
  }
});

// Generate New Backup Codes
export const generateBackupCodes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOne({ user: req.user._id }).lean();
  if (!settings || !settings.security.twoFactorAuth.enabled) {
    throw new AppError('2FA is not enabled', 400);
  }

  // Generate cryptographically secure backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: { 'security.twoFactorAuth.backupCodes': backupCodes } }
  );

  sendSuccess(res, { backupCodes }, 'New backup codes generated successfully');
});

// Update Biometric Settings
export const updateBiometricSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { fingerprintEnabled, faceIdEnabled, voiceEnabled, availableMethods } = req.body;

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { 
      $set: { 
        'security.biometric': {
          fingerprintEnabled: fingerprintEnabled || false,
          faceIdEnabled: faceIdEnabled || false,
          voiceEnabled: voiceEnabled || false,
          availableMethods: availableMethods || []
        }
      } 
    },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.security.biometric, 'Biometric settings updated successfully');
});

// Get Security Status
export const getSecurityStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOne({ user: req.user._id }).lean();
  if (!settings) {
    throw new AppError('Settings not found', 404);
  }

  const securityStatus = {
    twoFactorAuth: {
      enabled: settings.security.twoFactorAuth.enabled,
      method: settings.security.twoFactorAuth.method,
      backupCodesCount: settings.security.twoFactorAuth.backupCodes.length,
      lastUpdated: settings.security.twoFactorAuth.lastUpdated
    },
    biometric: settings.security.biometric,
    sessionManagement: settings.security.sessionManagement,
    loginAlerts: settings.security.loginAlerts
  };

  sendSuccess(res, securityStatus, 'Security status retrieved successfully');
});

// Update delivery preferences
export const updateDeliveryPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { defaultAddressId, deliveryInstructions, deliveryTime, contactlessDelivery, deliveryNotifications } = req.body;
  const updates: Record<string, any> = {};

  if (defaultAddressId !== undefined) updates['delivery.defaultAddressId'] = defaultAddressId;
  if (deliveryInstructions !== undefined) updates['delivery.deliveryInstructions'] = deliveryInstructions;
  if (deliveryTime) {
    if (deliveryTime.preferred !== undefined) updates['delivery.deliveryTime.preferred'] = deliveryTime.preferred;
    if (deliveryTime.workingDays !== undefined) updates['delivery.deliveryTime.workingDays'] = deliveryTime.workingDays;
  }
  if (contactlessDelivery !== undefined) updates['delivery.contactlessDelivery'] = contactlessDelivery;
  if (deliveryNotifications !== undefined) updates['delivery.deliveryNotifications'] = deliveryNotifications;

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'Delivery preferences updated successfully');
});

// Update payment preferences
export const updatePaymentPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { defaultPaymentMethodId, autoPayEnabled, paymentPinEnabled, biometricPaymentEnabled, transactionLimits } = req.body;
  const updates: Record<string, any> = {};

  if (defaultPaymentMethodId !== undefined) updates['payment.defaultPaymentMethodId'] = defaultPaymentMethodId;
  if (autoPayEnabled !== undefined) updates['payment.autoPayEnabled'] = autoPayEnabled;
  if (paymentPinEnabled !== undefined) updates['payment.paymentPinEnabled'] = paymentPinEnabled;
  if (biometricPaymentEnabled !== undefined) updates['payment.biometricPaymentEnabled'] = biometricPaymentEnabled;
  if (transactionLimits) {
    const tlFields = ['dailyLimit', 'weeklyLimit', 'monthlyLimit', 'singleTransactionLimit'];
    for (const field of tlFields) {
      if (transactionLimits[field] !== undefined) updates[`payment.transactionLimits.${field}`] = transactionLimits[field];
    }
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'Payment preferences updated successfully');
});

// Update app preferences
export const updateAppPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { startupScreen, defaultView, autoRefresh, offlineMode, dataSaver, highQualityImages, animations, sounds, hapticFeedback, activeMode, modeSettings } = req.body;
  const updates: Record<string, any> = {};

  if (startupScreen !== undefined) updates['preferences.startupScreen'] = startupScreen;
  if (defaultView !== undefined) updates['preferences.defaultView'] = defaultView;
  if (autoRefresh !== undefined) updates['preferences.autoRefresh'] = autoRefresh;
  if (offlineMode !== undefined) updates['preferences.offlineMode'] = offlineMode;
  if (dataSaver !== undefined) updates['preferences.dataSaver'] = dataSaver;
  if (highQualityImages !== undefined) updates['preferences.highQualityImages'] = highQualityImages;
  if (animations !== undefined) updates['preferences.animations'] = animations;
  if (sounds !== undefined) updates['preferences.sounds'] = sounds;
  if (hapticFeedback !== undefined) updates['preferences.hapticFeedback'] = hapticFeedback;
  if (activeMode !== undefined) updates['preferences.activeMode'] = activeMode;
  if (modeSettings) {
    if (modeSettings.nearU) {
      if (modeSettings.nearU.radius !== undefined) updates['preferences.modeSettings.nearU.radius'] = modeSettings.nearU.radius;
      if (modeSettings.nearU.showNotifications !== undefined) updates['preferences.modeSettings.nearU.showNotifications'] = modeSettings.nearU.showNotifications;
    }
    if (modeSettings.mall) {
      if (modeSettings.mall.preferredCategories !== undefined) updates['preferences.modeSettings.mall.preferredCategories'] = modeSettings.mall.preferredCategories;
    }
    if (modeSettings.cash) {
      if (modeSettings.cash.minCashbackPercent !== undefined) updates['preferences.modeSettings.cash.minCashbackPercent'] = modeSettings.cash.minCashbackPercent;
    }
    if (modeSettings.prive) {
      if (modeSettings.prive.tier !== undefined) updates['preferences.modeSettings.prive.tier'] = modeSettings.prive.tier;
    }
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings, 'App preferences updated successfully');
});

// Reset settings to default
export const resetSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  // Delete existing settings and create new default ones
  await UserSettings.findOneAndDelete({ user: req.user._id });
  const settings = await UserSettings.create({ user: req.user._id });

  sendSuccess(res, settings, 'Settings reset to default successfully');
});

// ============================================================================
// COURIER PREFERENCE ENDPOINTS
// ============================================================================

// Get courier preferences
export const getCourierPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOne({ user: req.user._id }).lean();

  if (!settings) {
    throw new AppError('Settings not found', 404);
  }

  sendSuccess(res, settings.courier, 'Courier preferences retrieved successfully');
});

// Update courier preferences
export const updateCourierPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { preferredCourier, deliveryTimePreference, deliveryInstructions, alternateContact, courierNotifications } = req.body;
  const updates: Record<string, any> = {};

  if (preferredCourier !== undefined) updates['courier.preferredCourier'] = preferredCourier;
  if (deliveryTimePreference) {
    if (deliveryTimePreference.weekdays !== undefined) updates['courier.deliveryTimePreference.weekdays'] = deliveryTimePreference.weekdays;
    if (deliveryTimePreference.preferredTimeSlot) {
      if (deliveryTimePreference.preferredTimeSlot.start !== undefined) updates['courier.deliveryTimePreference.preferredTimeSlot.start'] = deliveryTimePreference.preferredTimeSlot.start;
      if (deliveryTimePreference.preferredTimeSlot.end !== undefined) updates['courier.deliveryTimePreference.preferredTimeSlot.end'] = deliveryTimePreference.preferredTimeSlot.end;
    }
    if (deliveryTimePreference.avoidWeekends !== undefined) updates['courier.deliveryTimePreference.avoidWeekends'] = deliveryTimePreference.avoidWeekends;
  }
  if (deliveryInstructions) {
    const diFields = ['contactlessDelivery', 'leaveAtDoor', 'signatureRequired', 'callBeforeDelivery', 'specificInstructions'];
    for (const field of diFields) {
      if (deliveryInstructions[field] !== undefined) updates[`courier.deliveryInstructions.${field}`] = deliveryInstructions[field];
    }
  }
  if (alternateContact) {
    const acFields = ['name', 'phone', 'relation'];
    for (const field of acFields) {
      if (alternateContact[field] !== undefined) updates[`courier.alternateContact.${field}`] = alternateContact[field];
    }
  }
  if (courierNotifications) {
    const cnFields = ['smsUpdates', 'emailUpdates', 'whatsappUpdates', 'callUpdates'];
    for (const field of cnFields) {
      if (courierNotifications[field] !== undefined) updates[`courier.courierNotifications.${field}`] = courierNotifications[field];
    }
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.courier, 'Courier preferences updated successfully');
});

// ============================================================================
// ENHANCED NOTIFICATION ENDPOINTS
// ============================================================================

// Get all notification settings
export const getNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const settings = await UserSettings.findOne({ user: req.user._id }).lean();

  if (!settings) {
    throw new AppError('Settings not found', 404);
  }

  sendSuccess(res, settings.notifications, 'Notification settings retrieved successfully');
});

// Update push notification settings
export const updatePushNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const allowedFields = ['enabled', 'orderUpdates', 'promotions', 'recommendations', 'priceAlerts', 'deliveryUpdates', 'paymentUpdates', 'securityAlerts', 'chatMessages'];
  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[`notifications.push.${field}`] = req.body[field];
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.notifications.push, 'Push notification settings updated successfully');
});

// Update email notification settings
export const updateEmailNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const allowedFields = ['enabled', 'newsletters', 'orderReceipts', 'weeklyDigest', 'promotions', 'securityAlerts', 'accountUpdates'];
  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[`notifications.email.${field}`] = req.body[field];
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.notifications.email, 'Email notification settings updated successfully');
});

// Update SMS notification settings
export const updateSMSNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const allowedFields = ['enabled', 'orderUpdates', 'deliveryAlerts', 'paymentConfirmations', 'securityAlerts', 'otpMessages'];
  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[`notifications.sms.${field}`] = req.body[field];
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.notifications.sms, 'SMS notification settings updated successfully');
});

// Update in-app notification settings
export const updateInAppNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const allowedFields = ['enabled', 'showBadges', 'soundEnabled', 'vibrationEnabled', 'bannerStyle'];
  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[`notifications.inApp.${field}`] = req.body[field];
  }

  const settings = await UserSettings.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true }
  );

  sendSuccess(res, settings.notifications.inApp, 'In-app notification settings updated successfully');
});