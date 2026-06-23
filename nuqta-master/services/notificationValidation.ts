// Notification Validation Service
// Provides validation utilities for notification data and settings

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface NotificationData {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'promotional';
  category?: 'order' | 'earning' | 'general' | 'promotional' | 'social' | 'security' | 'system' | 'reminder';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  deliveryChannels?: ('push' | 'email' | 'sms' | 'in_app')[];
  data?: Record<string, any>;
}

export interface NotificationSettings {
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

class NotificationValidationService {
  // Validate notification data
  validateNotificationData(data: NotificationData): ValidationResult {
    const errors: string[] = [];

    // Title validation
    if (!data.title || typeof data.title !== 'string') {
      errors.push('Title is required and must be a string');
    } else if (data.title.trim().length === 0) {
      errors.push('Title cannot be empty');
    } else if (data.title.length > 100) {
      errors.push('Title must be less than 100 characters');
    }

    // Message validation
    if (!data.message || typeof data.message !== 'string') {
      errors.push('Message is required and must be a string');
    } else if (data.message.trim().length === 0) {
      errors.push('Message cannot be empty');
    } else if (data.message.length > 500) {
      errors.push('Message must be less than 500 characters');
    }

    // Type validation
    if (data.type && !['info', 'success', 'warning', 'error', 'promotional'].includes(data.type)) {
      errors.push('Invalid notification type');
    }

    // Category validation
    if (data.category && !['order', 'earning', 'general', 'promotional', 'social', 'security', 'system', 'reminder'].includes(data.category)) {
      errors.push('Invalid notification category');
    }

    // Priority validation
    if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
      errors.push('Invalid notification priority');
    }

    // Delivery channels validation
    if (data.deliveryChannels) {
      if (!Array.isArray(data.deliveryChannels)) {
        errors.push('Delivery channels must be an array');
      } else {
        const validChannels = ['push', 'email', 'sms', 'in_app'];
        const invalidChannels = data.deliveryChannels.filter(channel => !validChannels.includes(channel));
        if (invalidChannels.length > 0) {
          errors.push(`Invalid delivery channels: ${invalidChannels.join(', ')}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate notification settings
  validateNotificationSettings(settings: NotificationSettings): ValidationResult {
    const errors: string[] = [];

    // Push settings validation
    if (!settings.push || typeof settings.push !== 'object') {
      errors.push('Push notification settings are required');
    } else {
      const pushSettings = settings.push;
      const pushFields = ['enabled', 'orderUpdates', 'promotions', 'recommendations', 'priceAlerts', 'deliveryUpdates', 'paymentUpdates', 'securityAlerts', 'chatMessages'];
      
      pushFields.forEach(field => {
        if (typeof pushSettings[field as keyof typeof pushSettings] !== 'boolean') {
          errors.push(`Push setting '${field}' must be a boolean`);
        }
      });
    }

    // Email settings validation
    if (!settings.email || typeof settings.email !== 'object') {
      errors.push('Email notification settings are required');
    } else {
      const emailSettings = settings.email;
      const emailFields = ['enabled', 'newsletters', 'orderReceipts', 'weeklyDigest', 'promotions', 'securityAlerts', 'accountUpdates'];
      
      emailFields.forEach(field => {
        if (typeof emailSettings[field as keyof typeof emailSettings] !== 'boolean') {
          errors.push(`Email setting '${field}' must be a boolean`);
        }
      });
    }

    // SMS settings validation
    if (!settings.sms || typeof settings.sms !== 'object') {
      errors.push('SMS notification settings are required');
    } else {
      const smsSettings = settings.sms;
      const smsFields = ['enabled', 'orderUpdates', 'deliveryAlerts', 'paymentConfirmations', 'securityAlerts', 'otpMessages'];
      
      smsFields.forEach(field => {
        if (typeof smsSettings[field as keyof typeof smsSettings] !== 'boolean') {
          errors.push(`SMS setting '${field}' must be a boolean`);
        }
      });
    }

    // In-app settings validation
    if (!settings.inApp || typeof settings.inApp !== 'object') {
      errors.push('In-app notification settings are required');
    } else {
      const inAppSettings = settings.inApp;
      
      if (typeof inAppSettings.enabled !== 'boolean') {
        errors.push('In-app setting "enabled" must be a boolean');
      }
      if (typeof inAppSettings.showBadges !== 'boolean') {
        errors.push('In-app setting "showBadges" must be a boolean');
      }
      if (typeof inAppSettings.soundEnabled !== 'boolean') {
        errors.push('In-app setting "soundEnabled" must be a boolean');
      }
      if (typeof inAppSettings.vibrationEnabled !== 'boolean') {
        errors.push('In-app setting "vibrationEnabled" must be a boolean');
      }
      if (!['BANNER', 'ALERT', 'SILENT'].includes(inAppSettings.bannerStyle)) {
        errors.push('In-app setting "bannerStyle" must be one of: BANNER, ALERT, SILENT');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize notification data
  sanitizeNotificationData(data: any): NotificationData {
    return {
      title: this.sanitizeString(data.title, 'Untitled', 100),
      message: this.sanitizeString(data.message, 'No message', 500),
      type: this.sanitizeEnum(data.type, ['info', 'success', 'warning', 'error', 'promotional'] as const, 'info'),
      category: this.sanitizeEnum(
        data.category,
        ['order', 'earning', 'general', 'promotional', 'social', 'security', 'system', 'reminder'] as const,
        'general'
      ),
      priority: this.sanitizeEnum(data.priority, ['low', 'medium', 'high', 'urgent'] as const, 'medium'),
      deliveryChannels: this.sanitizeArray(
        data.deliveryChannels,
        ['push', 'email', 'sms', 'in_app'] as const,
        ['in_app']
      ),
      data: this.sanitizeObject(data.data, {})
    };
  }

  // Sanitize notification settings
  sanitizeNotificationSettings(settings: any): NotificationSettings {
    const defaultSettings: NotificationSettings = {
      push: {
        enabled: true,
        orderUpdates: true,
        promotions: false,
        recommendations: true,
        priceAlerts: true,
        deliveryUpdates: true,
        paymentUpdates: true,
        securityAlerts: true,
        chatMessages: true
      },
      email: {
        enabled: true,
        newsletters: false,
        orderReceipts: true,
        weeklyDigest: true,
        promotions: false,
        securityAlerts: true,
        accountUpdates: true
      },
      sms: {
        enabled: true,
        orderUpdates: true,
        deliveryAlerts: true,
        paymentConfirmations: true,
        securityAlerts: true,
        otpMessages: true
      },
      inApp: {
        enabled: true,
        showBadges: true,
        soundEnabled: true,
        vibrationEnabled: true,
        bannerStyle: 'BANNER'
      }
    };

    if (!settings || typeof settings !== 'object') {
      return defaultSettings;
    }

    return {
      push: this.sanitizeObject(settings.push, defaultSettings.push),
      email: this.sanitizeObject(settings.email, defaultSettings.email),
      sms: this.sanitizeObject(settings.sms, defaultSettings.sms),
      inApp: {
        ...defaultSettings.inApp,
        ...this.sanitizeObject(settings.inApp, {}),
        bannerStyle: this.sanitizeEnum(settings.inApp?.bannerStyle, ['BANNER', 'ALERT', 'SILENT'], 'BANNER')
      }
    };
  }

  // Helper methods
  private sanitizeString(value: any, defaultValue: string, maxLength: number): string {
    if (typeof value !== 'string') {
      return defaultValue;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? defaultValue : trimmed.substring(0, maxLength);
  }

  private sanitizeEnum<T extends string>(value: any, validValues: T[], defaultValue: T): T {
    return (validValues as readonly string[]).includes(value) ? (value as T) : defaultValue;
  }

  private sanitizeArray<T extends string>(value: any, validValues: readonly T[], defaultValue: T[]): T[] {
    if (!Array.isArray(value)) {
      return defaultValue;
    }
    return value.filter((item): item is T => (validValues as readonly string[]).includes(item));
  }

  private sanitizeObject(value: any, defaultValue: any): any {
    if (typeof value !== 'object' || value === null) {
      return defaultValue;
    }
    return { ...defaultValue, ...value };
  }

  // Validate API response
  validateApiResponse(response: any): ValidationResult {
    const errors: string[] = [];

    if (!response || typeof response !== 'object') {
      errors.push('Response must be an object');
      return { isValid: false, errors };
    }

    if (typeof response.success !== 'boolean') {
      errors.push('Response must have a success boolean field');
    }

    if (response.success && !response.data) {
      errors.push('Successful response must have data field');
    }

    if (!response.success && !response.error) {
      errors.push('Failed response should have error field');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const notificationValidationService = new NotificationValidationService();
export default notificationValidationService;
