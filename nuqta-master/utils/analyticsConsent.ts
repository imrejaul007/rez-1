/**
 * Analytics Consent Management
 *
 * GDPR/Privacy compliance for analytics tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsConsent } from '@/services/analytics/types';
import { analytics } from '@/services/analytics/AnalyticsService';

const CONSENT_KEY = '@analytics:consent';
const CONSENT_VERSION = '1.0.0';

export class AnalyticsConsentManager {
  private static instance: AnalyticsConsentManager;
  private currentConsent: AnalyticsConsent | null = null;

  private constructor() {
    this.loadConsent();
  }

  static getInstance(): AnalyticsConsentManager {
    if (!AnalyticsConsentManager.instance) {
      AnalyticsConsentManager.instance = new AnalyticsConsentManager();
    }
    return AnalyticsConsentManager.instance;
  }

  /**
   * Request consent from user
   */
  async requestConsent(
    categories: Partial<AnalyticsConsent['categories']> = {}
  ): Promise<AnalyticsConsent> {
    const consent: AnalyticsConsent = {
      granted: true,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
      categories: {
        necessary: true, // Always true
        analytics: categories.analytics !== false,
        marketing: categories.marketing === true,
        personalization: categories.personalization !== false,
      },
    };

    await this.saveConsent(consent);
    await this.applyConsent(consent);

    return consent;
  }

  /**
   * Grant all consent
   */
  async grantAll(): Promise<void> {
    await this.requestConsent({
      analytics: true,
      marketing: true,
      personalization: true,
    });
  }

  /**
   * Revoke all consent (except necessary)
   */
  async revokeAll(): Promise<void> {
    const consent: AnalyticsConsent = {
      granted: false,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
      categories: {
        necessary: true,
        analytics: false,
        marketing: false,
        personalization: false,
      },
    };

    await this.saveConsent(consent);
    await this.applyConsent(consent);
  }

  /**
   * Update specific consent category
   */
  async updateCategory(
    category: keyof AnalyticsConsent['categories'],
    granted: boolean
  ): Promise<void> {
    if (!this.currentConsent) {
      await this.loadConsent();
    }

    if (category === 'necessary') {
      return;
    }

    const consent: AnalyticsConsent = {
      ...(this.currentConsent || this.getDefaultConsent()),
      timestamp: Date.now(),
    };

    consent.categories[category] = granted;
    consent.granted = consent.categories.analytics || consent.categories.marketing || consent.categories.personalization;

    await this.saveConsent(consent);
    await this.applyConsent(consent);
  }

  /**
   * Get current consent
   */
  async getConsent(): Promise<AnalyticsConsent> {
    if (!this.currentConsent) {
      await this.loadConsent();
    }

    return this.currentConsent || this.getDefaultConsent();
  }

  /**
   * Check if user has granted consent
   */
  async hasConsent(): Promise<boolean> {
    const consent = await this.getConsent();
    return consent.granted;
  }

  /**
   * Check if specific category is granted
   */
  async hasCategoryConsent(category: keyof AnalyticsConsent['categories']): Promise<boolean> {
    const consent = await this.getConsent();
    return consent.categories[category];
  }

  /**
   * Check if consent is required (first time or version change)
   */
  async isConsentRequired(): Promise<boolean> {
    const consent = await this.getConsent();

    // No consent stored yet
    if (!consent.timestamp) {
      return true;
    }

    // Version changed
    if (consent.version !== CONSENT_VERSION) {
      return true;
    }

    return false;
  }

  /**
   * Load consent from storage
   */
  private async loadConsent(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(CONSENT_KEY);
      if (stored) {
        this.currentConsent = JSON.parse(stored);
      } else {
        this.currentConsent = this.getDefaultConsent();
      }
    } catch (error) {
      this.currentConsent = this.getDefaultConsent();
    }
  }

  /**
   * Save consent to storage
   */
  private async saveConsent(consent: AnalyticsConsent): Promise<void> {
    try {
      this.currentConsent = consent;
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Apply consent settings to analytics
   */
  private async applyConsent(consent: AnalyticsConsent): Promise<void> {
    // Update analytics service
    await analytics.setConsent(consent.granted && consent.categories.analytics);

    // Track consent change
    if (consent.categories.analytics) {
      analytics.trackEvent('consent_updated', {
        granted: consent.granted,
        categories: consent.categories,
        version: consent.version,
      });
    }

  }

  /**
   * Get default consent (opt-out by default for privacy)
   */
  private getDefaultConsent(): AnalyticsConsent {
    return {
      granted: false,
      timestamp: 0,
      version: CONSENT_VERSION,
      categories: {
        necessary: true,
        analytics: false,
        marketing: false,
        personalization: false,
      },
    };
  }

  /**
   * Export consent data (GDPR compliance)
   */
  async exportConsentData(): Promise<string> {
    const consent = await this.getConsent();
    return JSON.stringify(consent, null, 2);
  }

  /**
   * Delete all consent data (GDPR right to be forgotten)
   */
  async deleteConsentData(): Promise<void> {
    await AsyncStorage.removeItem(CONSENT_KEY);
    this.currentConsent = null;
  }
}

// Export singleton
export const consentManager = AnalyticsConsentManager.getInstance();
export default consentManager;
