import mongoose, { Schema, Document, Types } from 'mongoose';

// Notification Preferences
export interface INotificationPreferences {
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
export interface IPrivacySettings {
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
export interface ISecuritySettings {
  twoFactorAuth: {
    enabled: boolean;
    method: '2FA_SMS' | '2FA_EMAIL' | '2FA_APP';
    backupCodes: string[];
    lastUpdated?: Date;
  };
  biometric: {
    fingerprintEnabled: boolean;
    faceIdEnabled: boolean;
    voiceEnabled: boolean;
    availableMethods: ('FINGERPRINT' | 'FACE_ID' | 'VOICE')[];
  };
  sessionManagement: {
    autoLogoutTime: number; // minutes
    allowMultipleSessions: boolean;
    rememberMe: boolean;
  };
  loginAlerts: boolean;
}

// Delivery Preferences
export interface IDeliveryPreferences {
  defaultAddressId?: Types.ObjectId;
  deliveryInstructions?: string;
  deliveryTime: {
    preferred: 'ASAP' | 'SCHEDULED';
    workingDays: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
  };
  contactlessDelivery: boolean;
  deliveryNotifications: boolean;
}

// Payment Preferences
export interface IPaymentPreferences {
  defaultPaymentMethodId?: Types.ObjectId;
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

// Mode Types for 4-mode system
export type ModeId = 'near-u' | 'mall' | 'cash' | 'prive';

// Mode-specific settings
export interface IModeSettings {
  nearU: {
    radius?: number; // km
    showNotifications?: boolean;
  };
  mall: {
    preferredCategories?: string[];
  };
  cash: {
    minCashbackPercent?: number;
  };
  prive: {
    tier?: 'none' | 'entry' | 'elite';
    lastEligibilityCheck?: Date;
  };
}

// App Preferences
export interface IAppPreferences {
  startupScreen: 'HOME' | 'EXPLORE' | 'LAST_VIEWED';
  defaultView: 'CARD' | 'LIST' | 'GRID';
  autoRefresh: boolean;
  offlineMode: boolean;
  dataSaver: boolean;
  highQualityImages: boolean;
  animations: boolean;
  sounds: boolean;
  hapticFeedback: boolean;
  activeMode: ModeId;
  modeSettings: IModeSettings;
}

// General Settings
export interface IGeneralSettings {
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  theme: 'light' | 'dark' | 'auto';
}

// Courier Preferences
export interface ICourierPreferences {
  preferredCourier: 'any' | 'delhivery' | 'bluedart' | 'ekart' | 'dtdc' | 'fedex';
  deliveryTimePreference: {
    weekdays: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
    preferredTimeSlot: {
      start: string; // '09:00'
      end: string;   // '18:00'
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

// User Settings Interface
export interface IUserSettings extends Document {
  user: Types.ObjectId;
  general: IGeneralSettings;
  notifications: INotificationPreferences;
  privacy: IPrivacySettings;
  security: ISecuritySettings;
  delivery: IDeliveryPreferences;
  payment: IPaymentPreferences;
  preferences: IAppPreferences;
  courier: ICourierPreferences;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User Settings Schema
const UserSettingsSchema = new Schema<IUserSettings>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  general: {
    language: {
      type: String,
      enum: ['en', 'hi', 'te', 'ta', 'bn', 'es', 'fr', 'de', 'zh', 'ja'],
      default: 'en'
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'GBP', 'CAD', 'AUD', 'EUR', 'BRL', 'CNY', 'JPY'],
      default: 'INR'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '12h'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },
  notifications: {
    push: {
      enabled: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      recommendations: { type: Boolean, default: true },
      priceAlerts: { type: Boolean, default: true },
      deliveryUpdates: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      chatMessages: { type: Boolean, default: true }
    },
    email: {
      enabled: { type: Boolean, default: true },
      newsletters: { type: Boolean, default: false },
      orderReceipts: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      securityAlerts: { type: Boolean, default: true },
      accountUpdates: { type: Boolean, default: true }
    },
    sms: {
      enabled: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      deliveryAlerts: { type: Boolean, default: true },
      paymentConfirmations: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      otpMessages: { type: Boolean, default: true }
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      showBadges: { type: Boolean, default: true },
      soundEnabled: { type: Boolean, default: true },
      vibrationEnabled: { type: Boolean, default: true },
      bannerStyle: {
        type: String,
        enum: ['BANNER', 'ALERT', 'SILENT'],
        default: 'BANNER'
      }
    }
  },
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'],
      default: 'FRIENDS'
    },
    showActivity: { type: Boolean, default: false },
    showPurchaseHistory: { type: Boolean, default: false },
    allowMessaging: { type: Boolean, default: true },
    allowFriendRequests: { type: Boolean, default: true },
    dataSharing: {
      shareWithPartners: { type: Boolean, default: false },
      shareForMarketing: { type: Boolean, default: false },
      shareForRecommendations: { type: Boolean, default: true },
      shareForAnalytics: { type: Boolean, default: false },
      sharePurchaseData: { type: Boolean, default: false }
    },
    analytics: {
      allowUsageTracking: { type: Boolean, default: true },
      allowCrashReporting: { type: Boolean, default: true },
      allowPerformanceTracking: { type: Boolean, default: true },
      allowLocationTracking: { type: Boolean, default: false }
    }
  },
  security: {
    twoFactorAuth: {
      enabled: { type: Boolean, default: false },
      method: {
        type: String,
        enum: ['2FA_SMS', '2FA_EMAIL', '2FA_APP'],
        default: '2FA_SMS'
      },
      backupCodes: [{ type: String }],
      lastUpdated: Date
    },
    biometric: {
      fingerprintEnabled: { type: Boolean, default: false },
      faceIdEnabled: { type: Boolean, default: false },
      voiceEnabled: { type: Boolean, default: false },
      availableMethods: [{
        type: String,
        enum: ['FINGERPRINT', 'FACE_ID', 'VOICE']
      }]
    },
    sessionManagement: {
      autoLogoutTime: {
        type: Number,
        default: 30,
        min: 5,
        max: 120
      },
      allowMultipleSessions: { type: Boolean, default: true },
      rememberMe: { type: Boolean, default: true }
    },
    loginAlerts: { type: Boolean, default: true }
  },
  delivery: {
    defaultAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'Address'
    },
    deliveryInstructions: String,
    deliveryTime: {
      preferred: {
        type: String,
        enum: ['ASAP', 'SCHEDULED'],
        default: 'ASAP'
      },
      workingDays: [{
        type: String,
        enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
      }]
    },
    contactlessDelivery: { type: Boolean, default: true },
    deliveryNotifications: { type: Boolean, default: true }
  },
  payment: {
    defaultPaymentMethodId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentMethod'
    },
    autoPayEnabled: { type: Boolean, default: false },
    paymentPinEnabled: { type: Boolean, default: true },
    biometricPaymentEnabled: { type: Boolean, default: true },
    transactionLimits: {
      dailyLimit: { type: Number, default: 5000 },
      weeklyLimit: { type: Number, default: 25000 },
      monthlyLimit: { type: Number, default: 100000 },
      singleTransactionLimit: { type: Number, default: 10000 }
    }
  },
  preferences: {
    startupScreen: {
      type: String,
      enum: ['HOME', 'EXPLORE', 'LAST_VIEWED'],
      default: 'HOME'
    },
    defaultView: {
      type: String,
      enum: ['CARD', 'LIST', 'GRID'],
      default: 'CARD'
    },
    autoRefresh: { type: Boolean, default: true },
    offlineMode: { type: Boolean, default: false },
    dataSaver: { type: Boolean, default: false },
    highQualityImages: { type: Boolean, default: true },
    animations: { type: Boolean, default: true },
    sounds: { type: Boolean, default: true },
    hapticFeedback: { type: Boolean, default: true },
    // 4-Mode System
    activeMode: {
      type: String,
      enum: ['near-u', 'mall', 'cash', 'prive'],
      default: 'near-u'
    },
    modeSettings: {
      nearU: {
        radius: { type: Number, default: 10 }, // km
        showNotifications: { type: Boolean, default: true }
      },
      mall: {
        preferredCategories: [{ type: String }]
      },
      cash: {
        minCashbackPercent: { type: Number, default: 0 }
      },
      prive: {
        tier: {
          type: String,
          enum: ['none', 'entry', 'elite'],
          default: 'none'
        },
        lastEligibilityCheck: { type: Date }
      }
    }
  },
  courier: {
    preferredCourier: {
      type: String,
      enum: ['any', 'delhivery', 'bluedart', 'ekart', 'dtdc', 'fedex'],
      default: 'any'
    },
    deliveryTimePreference: {
      weekdays: [{
        type: String,
        enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        default: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      }],
      preferredTimeSlot: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' }
      },
      avoidWeekends: { type: Boolean, default: false }
    },
    deliveryInstructions: {
      contactlessDelivery: { type: Boolean, default: true },
      leaveAtDoor: { type: Boolean, default: false },
      signatureRequired: { type: Boolean, default: false },
      callBeforeDelivery: { type: Boolean, default: true },
      specificInstructions: { type: String, default: '' }
    },
    alternateContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String }
    },
    courierNotifications: {
      smsUpdates: { type: Boolean, default: true },
      emailUpdates: { type: Boolean, default: true },
      whatsappUpdates: { type: Boolean, default: false },
      callUpdates: { type: Boolean, default: false }
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
UserSettingsSchema.index({ user: 1 });

// Pre-save hook to update lastUpdated
UserSettingsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);