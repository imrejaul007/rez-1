/**
 * Privacy Utilities
 * GDPR-compliant data anonymization functions
 */

/**
 * Anonymize email address
 * Converts: mukul@gmail.com → m***@gmail.com
 *
 * @param email - Full email address
 * @returns Anonymized email address
 */
export const anonymizeEmail = (email: string | null | undefined): string => {
  if (!email || typeof email !== 'string') {
    return 'N/A';
  }

  try {
    const [local, domain] = email.split('@');

    if (!local || !domain) {
      return 'Invalid email';
    }

    // Show first character + *** for local part
    const anonymizedLocal = local.length > 0 ? `${local[0]}***` : '***';

    return `${anonymizedLocal}@${domain}`;
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Anonymize phone number
 * Converts: +91 9876543210 → +91 ******3210
 *
 * @param phone - Full phone number
 * @returns Anonymized phone number
 */
export const anonymizePhone = (phone: string | null | undefined): string => {
  if (!phone || typeof phone !== 'string') {
    return 'N/A';
  }

  try {
    // Remove spaces and special characters for processing
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Keep country code and last 4 digits
    if (cleanPhone.length <= 4) {
      return '****';
    }

    const lastFour = cleanPhone.slice(-4);
    const prefix = cleanPhone.startsWith('+') ? cleanPhone.substring(0, 3) : '';

    if (prefix) {
      return `${prefix} ******${lastFour}`;
    }

    return `******${lastFour}`;
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Anonymize name
 * Converts: Mukul Kumar → M*** K***
 *
 * @param name - Full name
 * @returns Anonymized name
 */
export const anonymizeName = (name: string | null | undefined): string => {
  if (!name || typeof name !== 'string') {
    return 'Anonymous User';
  }

  try {
    const nameParts = name.trim().split(' ');

    const anonymizedParts = nameParts.map(part => {
      if (part.length === 0) return '';
      return `${part[0]}***`;
    });

    return anonymizedParts.filter(Boolean).join(' ');
  } catch (error) {
    return 'Anonymous User';
  }
};

/**
 * Check if user data should be anonymized based on privacy settings
 *
 * @param userId - User ID to check
 * @param currentUserId - Current logged in user ID
 * @returns Whether to anonymize the data
 */
export const shouldAnonymize = (
  userId: string | undefined,
  currentUserId: string | undefined
): boolean => {
  // Don't anonymize if it's the current user's own data
  if (userId && currentUserId && userId === currentUserId) {
    return false;
  }

  // Anonymize all other users' data (GDPR compliance)
  return true;
};

/**
 * Get privacy-compliant display text
 *
 * @param value - Original value
 * @param type - Type of data (email, phone, name)
 * @returns Privacy-safe display text
 */
export const getPrivacySafeText = (
  value: string | null | undefined,
  type: 'email' | 'phone' | 'name'
): string => {
  switch (type) {
    case 'email':
      return anonymizeEmail(value);
    case 'phone':
      return anonymizePhone(value);
    case 'name':
      return anonymizeName(value);
    default:
      return 'N/A';
  }
};

/**
 * GDPR: Get user consent status for data display
 * This should be integrated with your consent management system
 *
 * @param userId - User ID
 * @returns Consent status
 */
export const hasDataSharingConsent = async (userId: string): Promise<boolean> => {
  // TODO: Integrate with actual consent management system
  // For now, default to false (always anonymize)
  return false;
};

/**
 * Log privacy compliance event
 * Track when PII is accessed for audit purposes
 *
 * @param action - Action performed
 * @param dataType - Type of data accessed
 * @param userId - User whose data was accessed
 */
export const logPrivacyEvent = (
  action: 'view' | 'copy' | 'share',
  dataType: 'email' | 'phone' | 'name' | 'referral_code',
  userId?: string
): void => {
  // TODO: Send to analytics/audit system
  if (__DEV__) {
    console.log('[Privacy Audit]', {
      action,
      dataType,
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
    });
  }
};
