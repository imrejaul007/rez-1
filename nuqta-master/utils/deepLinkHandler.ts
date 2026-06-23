import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReferralHandler from './referralHandler';

interface DeepLinkData {
  type: 'referral' | 'product' | 'store' | 'offer' | 'unknown';
  data: any;
}

export class DeepLinkHandler {
  /**
   * Parse deep link URL
   * Supports both /ref/ and /invite/ patterns for referral links
   */
  parseDeepLink(url: string): DeepLinkData {
    try {
      const parsed = Linking.parse(url);
      const { hostname, path, queryParams } = parsed;

      // Handle referral links: /invite/ABC123 or /ref/ABC123
      if (hostname === 'invite' || hostname === 'ref' ||
          path?.includes('/invite/') || path?.includes('/ref/')) {
        const code = path?.split(/\/(?:invite|ref)\//)[1] || hostname;
        return {
          type: 'referral',
          data: {
            code: code?.toUpperCase(),
            source: queryParams?.source || 'direct'
          }
        };
      }

      // Handle product links: rez://product/123
      if (hostname === 'product' || path?.includes('/product/')) {
        const productId = path?.split('/product/')[1] || hostname;
        return {
          type: 'product',
          data: { productId }
        };
      }

      // Handle store links: rez://store/456
      if (hostname === 'store' || path?.includes('/store/')) {
        const storeId = path?.split('/store/')[1] || hostname;
        return {
          type: 'store',
          data: { storeId }
        };
      }

      // Handle offer links: rez://offer/789
      if (hostname === 'offer' || path?.includes('/offer/')) {
        const offerId = path?.split('/offer/')[1] || hostname;
        return {
          type: 'offer',
          data: { offerId }
        };
      }

      return {
        type: 'unknown',
        data: { url }
      };
    } catch (error) {
      return {
        type: 'unknown',
        data: { url }
      };
    }
  }

  /**
   * Handle referral deep link — delegates to canonical ReferralHandler
   */
  async handleReferralLink(code: string, source: string = 'direct'): Promise<void> {
    await ReferralHandler.storeReferralCode(code, source);
  }

  /**
   * Get pending referral code — delegates to canonical ReferralHandler
   */
  async getPendingReferralCode(): Promise<{
    code: string;
    source: string;
    timestamp: number;
  } | null> {
    const data = await ReferralHandler.getStoredReferralCode();
    if (data) {
      return {
        code: data.code,
        source: data.source,
        timestamp: new Date(data.timestamp).getTime(),
      };
    }
    return null;
  }

  /**
   * Clear pending referral code — delegates to canonical ReferralHandler
   */
  async clearPendingReferralCode(): Promise<void> {
    await ReferralHandler.clearReferralCode();
  }

  /**
   * Generate deep link URL
   */
  generateDeepLink(type: 'referral' | 'product' | 'store' | 'offer', id: string): string {
    const baseUrl = 'https://rez.app';

    switch (type) {
      case 'referral':
        return `${baseUrl}/invite/${id}`;
      case 'product':
        return `${baseUrl}/product/${id}`;
      case 'store':
        return `${baseUrl}/store/${id}`;
      case 'offer':
        return `${baseUrl}/offer/${id}`;
      default:
        return baseUrl;
    }
  }

  /**
   * Track deep link attribution
   */
  async trackAttribution(type: string, data: any): Promise<void> {
    try {
      // Store attribution data
      const attribution = {
        type,
        data,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(
        '@rez_attribution',
        JSON.stringify(attribution)
      );
      // TODO: Send to analytics

    } catch (_error) {
      // silently handle
    }
  }
}

/**
 * React hook for handling deep links
 */
export function useDeepLinkHandler() {
  const [deepLink, setDeepLink] = useState<DeepLinkData | null>(null);
  const router = useRouter();
  const handler = new DeepLinkHandler();

  useEffect(() => {
    // Handle initial URL (app opened from link)
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const parsed = handler.parseDeepLink(initialUrl);
        setDeepLink(parsed);
        handleDeepLink(parsed);
      }
    };

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = handler.parseDeepLink(url);
      setDeepLink(parsed);
      handleDeepLink(parsed);
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (linkData: DeepLinkData) => {
    switch (linkData.type) {
      case 'referral':
        await handler.handleReferralLink(
          linkData.data.code,
          linkData.data.source
        );
        await handler.trackAttribution('referral', linkData.data);

        // Navigate to registration or apply code
        // Check if user is logged in
        // If not, navigate to registration
        // If yes, prompt to apply code (if not already used)
        break;

      case 'product':
        await handler.trackAttribution('product', linkData.data);
        router.push(`/product-page?id=${linkData.data.productId}`);
        break;

      case 'store':
        await handler.trackAttribution('store', linkData.data);
        router.push(`/Store?id=${linkData.data.storeId}`);
        break;

      case 'offer':
        await handler.trackAttribution('offer', linkData.data);
        router.push(`/offers?id=${linkData.data.offerId}`);
        break;

      default:

    }
  };

  return {
    deepLink,
    handler
  };
}

export default new DeepLinkHandler();
