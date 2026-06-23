import axios from 'axios';
import { logger } from '../config/logger';

/**
 * MarketingSignalService — fires non-blocking signals to rez-marketing-service.
 *
 * Every call is fire-and-forget (errors are logged, never thrown).
 * This prevents any rez-marketing-service outage from impacting the main API.
 *
 * Signals sent:
 *   - searchSignal    → after user searches (keyword targeting)
 *   - locationSignal  → after order placed with delivery address (location targeting)
 *   - conversion      → after order confirmed (attribution tracking)
 *   - estimateAudience → sync call — returns estimated reach count for a filter
 */

// BUG-013 FIX: No fallback — validated at startup via validateEnv.ts
const MARKETING_SERVICE_URL = process.env.MARKETING_SERVICE_URL!;
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

const client = axios.create({
  baseURL: MARKETING_SERVICE_URL,
  timeout: 5_000,
  headers: {
    'x-internal-key': INTERNAL_SERVICE_KEY,
    'x-internal-service': 'rezbackend',
  },
});

export class MarketingSignalService {
  /**
   * Record a keyword search by a user.
   * Called after every successful search in searchController.
   */
  static async searchSignal(userId: string, term: string): Promise<void> {
    if (!term?.trim()) return;
    try {
      await client.post('/audience/search-signal', { userId, term });
    } catch (err: any) {
      logger.debug('[MarketingSignal] searchSignal failed (non-critical)', { err: err.message });
    }
  }

  /**
   * Update location profile from an order's delivery address.
   * Called after order is created with a delivery address.
   */
  static async locationSignal(
    userId: string,
    address: {
      city?: string;
      area?: string;
      pincode?: string;
      coordinates?: [number, number];
    },
  ): Promise<void> {
    if (!userId || !address) return;
    try {
      await client.post('/audience/location-signal', { userId, address });
    } catch (err: any) {
      logger.debug('[MarketingSignal] locationSignal failed (non-critical)', { err: err.message });
    }
  }

  /**
   * Track a conversion — an order placed within a campaign's attribution window.
   * Called after order status changes to confirmed/paid.
   */
  static async trackConversion(merchantId: string, userId: string): Promise<void> {
    if (!merchantId || !userId) return;
    try {
      await client.post('/analytics/track/conversion', { merchantId, userId });
    } catch (err: any) {
      logger.debug('[MarketingSignal] trackConversion failed (non-critical)', { err: err.message });
    }
  }

  /**
   * Estimate audience size for a given filter.
   * Proxied by the merchant broadcasts route → returns count to merchant UI.
   * This IS a synchronous call (returns data).
   */
  static async estimateAudience(merchantId: string, filter: object, channel: string = 'whatsapp'): Promise<number> {
    try {
      const response = await client.post('/audience/estimate', { merchantId, filter, channel });
      return response.data?.estimatedCount ?? 0;
    } catch (err: any) {
      logger.warn('[MarketingSignal] estimateAudience failed', { err: err.message });
      return 0;
    }
  }
}

export default MarketingSignalService;
