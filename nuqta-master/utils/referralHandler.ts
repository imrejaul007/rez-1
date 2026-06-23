import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

const STORAGE_KEYS = {
  REFERRAL_CODE: 'pending_referral_code',
  REFERRAL_SOURCE: 'referral_source',
  REFERRAL_TIMESTAMP: 'referral_timestamp',
};

export interface ReferralData {
  code: string;
  source: string;
  timestamp: string;
}

/**
 * Referral Handler - Deep Linking Support
 * Handles referral codes from deep links and stores them for sign-up attribution
 */
class ReferralHandler {
  /**
   * Parse referral code from deep link URL
   * Supports formats:
   * - rezapp://ref/ABC123
   * - https://rez.app/ref/ABC123
   * - rezapp://join/ABC123
   * - https://rez.app/join/ABC123
   */
  static parseReferralFromUrl(url: string): string | null {
    try {
      const patterns = [
        /\/ref\/([A-Z0-9]+)/i,
        /\/join\/([A-Z0-9]+)/i,
        /[?&]ref=([A-Z0-9]+)/i,
        /[?&]referral=([A-Z0-9]+)/i,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1].toUpperCase();
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Store referral code in AsyncStorage for later attribution
   */
  static async storeReferralCode(code: string, source: string = 'deeplink'): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.REFERRAL_CODE, code],
        [STORAGE_KEYS.REFERRAL_SOURCE, source],
        [STORAGE_KEYS.REFERRAL_TIMESTAMP, new Date().toISOString()],
      ]);

    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Retrieve stored referral code
   */
  static async getStoredReferralCode(): Promise<ReferralData | null> {
    try {
      const data = await AsyncStorage.multiGet([
        STORAGE_KEYS.REFERRAL_CODE,
        STORAGE_KEYS.REFERRAL_SOURCE,
        STORAGE_KEYS.REFERRAL_TIMESTAMP,
      ]);

      const code = data[0][1];
      const source = data[1][1] || 'unknown';
      const timestamp = data[2][1] || new Date().toISOString();

      if (!code) return null;

      return {
        code,
        source,
        timestamp,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear stored referral code after successful attribution
   */
  static async clearReferralCode(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.REFERRAL_CODE,
        STORAGE_KEYS.REFERRAL_SOURCE,
        STORAGE_KEYS.REFERRAL_TIMESTAMP,
      ]);

    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Handle deep link on app launch
   */
  static async handleDeepLink(url: string): Promise<boolean> {

    const referralCode = this.parseReferralFromUrl(url);

    if (referralCode) {
      await this.storeReferralCode(referralCode, 'deeplink');
      return true;
    }

    return false;
  }

  /**
   * Initialize deep linking listeners
   * Should be called in app _layout.tsx
   */
  static initializeDeepLinking(onReferralDetected?: (code: string) => void): () => void {
    const handleUrl = async ({ url }: { url: string }) => {
      const hasReferral = await this.handleDeepLink(url);

      if (hasReferral) {
        const referralData = await this.getStoredReferralCode();
        if (referralData && onReferralDetected) {
          onReferralDetected(referralData.code);
        }
      }
    };

    // Handle initial URL (app opened via link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    // Handle URLs when app is already open
    const subscription = Linking.addEventListener('url', handleUrl);

    // Return cleanup function
    return () => {
      subscription.remove();
    };
  }

  /**
   * Generate referral link for sharing
   */
  static generateReferralLink(code: string, platform: 'native' | 'web' = 'native'): string {
    if (platform === 'native') {
      return `rez://ref/${code}`;
    } else {
      return `https://rez.app/ref/${code}`;
    }
  }

  /**
   * Track referral source for analytics
   */
  static async trackReferralSource(source: string, metadata?: any): Promise<void> {
    try {

      // TODO: Implement analytics tracking
      // Example: analytics.track('referral_source', { source, ...metadata });
    } catch (_error) {
      // silently handle
    }
  }
}

export default ReferralHandler;
