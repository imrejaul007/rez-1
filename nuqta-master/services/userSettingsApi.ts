// User Settings API Service
// Handles user preferences, notifications, privacy, security settings

import apiClient, { ApiResponse } from './apiClient';

// Notification Preferences
export interface NotificationPreferences {
  push: {
    enabled: boolean;
    orderUpdates: boolean;
    promotions: boolean;
    recommendations: boolean;
    priceAlerts: boolean;
    deliveryUpdates: boolean;
    paymentUpdates: boolean;
    securityAlerts: boolean;
    chatMessages: boolean;
  };
  email: {
    enabled: boolean;
    newsletters: boolean;
    orderReceipts: boolean;
    weeklyDigest: boolean;
    promotions: boolean;
    securityAlerts: boolean;
    accountUpdates: boolean;
  };
  sms: {
    enabled: boolean;
    orderUpdates: boolean;
    deliveryAlerts: boolean;
    paymentConfirmations: boolean;
    securityAlerts: boolean;
    otpMessages: boolean;
  };
  inApp: {
    enabled: boolean;
    showBadges: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    bannerStyle: 'BANNER' | 'ALERT' | 'SILENT';
  };
}

// Privacy Settings
export interface PrivacySettings {
  profileVisibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  showActivity: boolean;
  showPurchaseHistory: boolean;
  allowMessaging: boolean;
  allowFriendRequests: boolean;
  dataSharing: {
    shareWithPartners: boolean;
    shareForMarketing: boolean;
    shareForRecommendations: boolean;
    shareForAnalytics: boolean;
    sharePurchaseData: boolean;
  };
  analytics: {
    allowUsageTracking: boolean;
    allowCrashReporting: boolean;
    allowPerformanceTracking: boolean;
    allowLocationTracking: boolean;
  };
}

// Security Settings
export interface SecuritySettings {
  twoFactorAuth: {
    enabled: boolean;
    method: '2FA_SMS' | '2FA_EMAIL' | '2FA_APP';
    backupCodes: string[];
    lastUpdated?: string;
  };
  biometric: {
    fingerprintEnabled: boolean;
    faceIdEnabled: boolean;
    voiceEnabled: boolean;
    availableMethods: ('FINGERPRINT' | 'FACE_ID' | 'VOICE')[];
  };
  sessionManagement: {
    autoLogoutTime: number;
    allowMultipleSessions: boolean;
    rememberMe: boolean;
  };
  loginAlerts: boolean;
}

// Delivery Preferences
export interface DeliveryPreferences {
  defaultAddressId?: string;
  deliveryInstructions?: string;
  deliveryTime: {
    preferred: 'ASAP' | 'SCHEDULED';
    workingDays: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
  };
  contactlessDelivery: boolean;
  deliveryNotifications: boolean;
}

// Payment Preferences
export interface PaymentPreferences {
  defaultPaymentMethodId?: string;
  autoPayEnabled: boolean;
  paymentPinEnabled: boolean;
  biometricPaymentEnabled: boolean;
  transactionLimits: {
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
    singleTransactionLimit: number;
  };
}

// App Preferences
export interface AppPreferences {
  startupScreen: 'HOME' | 'EXPLORE' | 'LAST_VIEWED';
  defaultView: 'CARD' | 'LIST' | 'GRID';
  autoRefresh: boolean;
  offlineMode: boolean;
  dataSaver: boolean;
  highQualityImages: boolean;
  animations: boolean;
  sounds: boolean;
  hapticFeedback: boolean;
}

// General Settings
export interface GeneralSettings {
  language: 'en' | 'hi' | 'te' | 'ta' | 'bn' | 'es' | 'fr' | 'de' | 'zh' | 'ja';
  currency: 'INR' | 'USD' | 'GBP' | 'CAD' | 'AUD' | 'EUR' | 'BRL' | 'CNY' | 'JPY';
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  theme: 'light' | 'dark' | 'auto';
}

// Courier Preferences
export interface CourierPreferences {
  preferredCourier: 'any' | 'delhivery' | 'bluedart' | 'ekart' | 'dtdc' | 'fedex';
  deliveryTimePreference: {
    weekdays: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
    preferredTimeSlot: {
      start: string;
      end: string;
    };
    avoidWeekends: boolean;
  };
  deliveryInstructions: {
    contactlessDelivery: boolean;
    leaveAtDoor: boolean;
    signatureRequired: boolean;
    callBeforeDelivery: boolean;
    specificInstructions?: string;
  };
  alternateContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  courierNotifications: {
    smsUpdates: boolean;
    emailUpdates: boolean;
    whatsappUpdates: boolean;
    callUpdates: boolean;
  };
}

// Complete User Settings
export interface UserSettings {
  id: string;
  userId: string;
  general: GeneralSettings;
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  security: SecuritySettings;
  delivery: DeliveryPreferences;
  payment: PaymentPreferences;
  preferences: AppPreferences;
  courier: CourierPreferences;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

class UserSettingsApiService {
  private baseUrl = '/user-settings';

  // In-memory cache to prevent duplicate calls from SecurityContext + AppPreferencesContext
  private settingsCache: { data: ApiResponse<UserSettings>; timestamp: number } | null = null;
  private inflight: Promise<ApiResponse<UserSettings>> | null = null;
  private CACHE_TTL = 30_000; // 30 seconds

  // Get user settings (cached — deduplicates concurrent calls)
  async getUserSettings(): Promise<ApiResponse<UserSettings>> {
    // Return cached data if still fresh
    if (this.settingsCache && Date.now() - this.settingsCache.timestamp < this.CACHE_TTL) {
      return this.settingsCache.data;
    }
    // Deduplicate concurrent in-flight requests
    if (this.inflight) return this.inflight;

    this.inflight = apiClient.get<UserSettings>(this.baseUrl).then(response => {
      this.settingsCache = { data: response, timestamp: Date.now() };
      this.inflight = null;
      return response;
    }).catch(err => {
      this.inflight = null;
      throw err;
    });
    return this.inflight;
  }

  // Invalidate cache after any write operation
  private invalidateCache() {
    this.settingsCache = null;
  }

  // Update general settings
  async updateGeneralSettings(data: Partial<GeneralSettings>): Promise<ApiResponse<UserSettings>> {
    this.invalidateCache();
    return apiClient.put(`${this.baseUrl}/general`, data);
  }

  // Update notification preferences
  async updateNotificationPreferences(data: Partial<NotificationPreferences>): Promise<ApiResponse<UserSettings>> {
    this.invalidateCache();
    return apiClient.put(`${this.baseUrl}/notifications`, data);
  }

  // Update privacy settings
  async updatePrivacySettings(data: Partial<PrivacySettings>): Promise<ApiResponse<UserSettings>> {
    this.invalidateCache();
    return apiClient.put(`${this.baseUrl}/privacy`, data);
  }

  // Update security settings
  async updateSecuritySettings(data: Partial<SecuritySettings>): Promise<ApiResponse<UserSettings>> {
    this.invalidateCache();
    return apiClient.put(`${this.baseUrl}/security`, data);
  }

  // Security-specific methods
  async getSecurityStatus(): Promise<ApiResponse<any>> {
    return apiClient.get(`${this.baseUrl}/security/status`);
  }

  async enableTwoFactorAuth(method: '2FA_SMS' | '2FA_EMAIL' | '2FA_APP'): Promise<ApiResponse<any>> {
    return apiClient.post(`${this.baseUrl}/security/2fa/enable`, { method });
  }

  async disableTwoFactorAuth(): Promise<ApiResponse<any>> {
    return apiClient.post(`${this.baseUrl}/security/2fa/disable`);
  }

  async verifyTwoFactorCode(code: string, method: string): Promise<ApiResponse<any>> {
    return apiClient.post(`${this.baseUrl}/security/2fa/verify`, { code, method });
  }

  async generateBackupCodes(): Promise<ApiResponse<{ backupCodes: string[] }>> {
    return apiClient.post(`${this.baseUrl}/security/2fa/backup-codes`);
  }

  async updateBiometricSettings(settings: {
    fingerprintEnabled: boolean;
    faceIdEnabled: boolean;
    voiceEnabled: boolean;
    availableMethods: ('FINGERPRINT' | 'FACE_ID' | 'VOICE')[];
  }): Promise<ApiResponse<any>> {
    return apiClient.put(`${this.baseUrl}/security/biometric`, settings);
  }

  // Update delivery preferences
  async updateDeliveryPreferences(data: Partial<DeliveryPreferences>): Promise<ApiResponse<UserSettings>> {
    this.invalidateCache();
    return apiClient.put(`${this.baseUrl}/delivery`, data);
  }

  // Update payment preferences
  async updatePaymentPreferences(data: Partial<PaymentPreferences>): Promise<ApiResponse<UserSettings>> {
    this.invalidateCache();
    return apiClient.put(`${this.baseUrl}/payment`, data);
  }

  // Update app preferences
  async updateAppPreferences(data: Partial<AppPreferences>): Promise<ApiResponse<UserSettings>> {
    this.invalidateCache();
    return apiClient.put(`${this.baseUrl}/preferences`, data);
  }

  // Update courier preferences
  async updateCourierPreferences(data: Partial<CourierPreferences>): Promise<ApiResponse<UserSettings>> {
    this.invalidateCache();
    return apiClient.put(`${this.baseUrl}/courier`, data);
  }

  // Generic update method (for any settings)
  async updateSettings(data: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    this.invalidateCache();
    return apiClient.put(this.baseUrl, data);
  }

  // Reset settings to default
  async resetSettings(): Promise<ApiResponse<UserSettings>> {
    this.invalidateCache();
    return apiClient.post(`${this.baseUrl}/reset`, {});
  }
}

export const userSettingsApi = new UserSettingsApiService();
export default userSettingsApi;