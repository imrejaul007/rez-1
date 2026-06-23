/**
 * MissedSavingsService
 *
 * Calculates and surfaces what users could have earned if they had spent
 * at REZ-registered merchants instead of non-REZ merchants.
 *
 * Triggered by:
 *   - Bill upload flow (user uploads receipt from a non-REZ merchant)
 *   - Location detection (user detected at a non-REZ merchant)
 */

import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import MissedSavings, { IMissedSavings, IAlternativeMerchant } from '../models/MissedSavings';

const logger = createServiceLogger('missed-savings-service');

// Approximate coins-per-rupee rate for estimating potential savings
const COINS_PER_RUPEE_ESTIMATE = 0.05; // 5 coins per Rs.100 = 5% rate

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface MissedSavingsCalculation {
  estimatedSavings: number;
  alternativeMerchants: Array<{
    storeId: string;
    name: string;
    distance: number;
    potentialSavings: number;
  }>;
  message: string; // "If this merchant was on REZ, you would have earned X coins"
}

export interface WeeklySummary {
  totalMissedSavings: number;
  missedEvents: number;
  topMissedCategory: string;
  alternativeSuggestions: Array<{
    storeId: string;
    name: string;
    distance: number;
    potentialSavings: number;
    category: string;
  }>;
  period: { from: Date; to: Date };
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  totalMissedSavings: number;
  missedEvents: number;
  byCategory: Array<{ category: string; totalMissed: number; count: number }>;
  vsLastMonth: { delta: number; trend: 'better' | 'worse' | 'same' };
}

// ─── Service ─────────────────────────────────────────────────────────────────

class MissedSavingsService {
  /**
   * Calculate missed savings when a user uploads a bill from a non-REZ merchant.
   * Finds nearby REZ alternatives and persists the missed savings record.
   *
   * @param userId        User who uploaded the bill
   * @param billAmount    Amount on the bill (INR)
   * @param merchantCategory Category of the merchant (e.g., 'food-dining')
   * @param location      Optional user location for finding nearby alternatives
   * @param merchantName  Optional name of the non-REZ merchant
   */
  async calculateMissedSavings(
    userId: string,
    billAmount: number,
    merchantCategory: string,
    location?: { lat: number; lng: number },
    merchantName?: string,
  ): Promise<MissedSavingsCalculation> {
    const estimatedSavings = Math.round(billAmount * COINS_PER_RUPEE_ESTIMATE);

    // Find nearby REZ alternatives in the same category
    const alternativeMerchants = await this.findAlternativeMerchants(merchantCategory, location, billAmount);

    // Persist the missed savings event
    try {
      await MissedSavings.create({
        userId: new mongoose.Types.ObjectId(userId),
        estimatedSavings,
        merchantCategory,
        date: new Date(),
        billAmount,
        nonRezMerchantName: merchantName,
        alternativeMerchants: alternativeMerchants.map((m) => ({
          storeId: new mongoose.Types.ObjectId(m.storeId),
          name: m.name,
          distance: m.distance,
          potentialSavings: m.potentialSavings,
        })),
        source: 'bill_upload',
      });
    } catch (err) {
      logger.warn('[MissedSavingsService] Failed to persist missed savings', {
        userId,
        error: (err as Error).message,
      });
    }

    const message =
      estimatedSavings > 0
        ? `If this merchant was on REZ, you would have earned ${estimatedSavings} coins!`
        : 'Sign up REZ merchants near you to start saving on every purchase.';

    return { estimatedSavings, alternativeMerchants, message };
  }

  /**
   * Get weekly missed savings summary for a user.
   * Returns total missed savings and merchant suggestions for the last 7 days.
   */
  async getWeeklySummary(userId: string): Promise<WeeklySummary> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          userId: userObjectId,
          date: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: '$merchantCategory',
          totalMissed: { $sum: '$estimatedSavings' },
          count: { $sum: 1 },
          alternatives: { $push: '$alternativeMerchants' },
        },
      },
      { $sort: { totalMissed: -1 } },
    ];

    const results = await MissedSavings.aggregate(pipeline);

    let totalMissedSavings = 0;
    let missedEvents = 0;
    let topMissedCategory = '';
    const allAlternatives: any[] = [];

    (results as any[]).forEach((r, i) => {
      totalMissedSavings += r.totalMissed;
      missedEvents += r.count;
      if (i === 0) topMissedCategory = r._id;
      // Flatten alternatives arrays and deduplicate by storeId
      r.alternatives.forEach((altArr: any[]) => {
        altArr.forEach((alt: any) => {
          if (!allAlternatives.find((a) => a.storeId?.toString() === alt.storeId?.toString())) {
            allAlternatives.push({
              storeId: alt.storeId?.toString() || '',
              name: alt.name,
              distance: alt.distance,
              potentialSavings: alt.potentialSavings,
              category: r._id,
            });
          }
        });
      });
    });

    // Return top 3 suggestions sorted by potential savings
    const alternativeSuggestions = allAlternatives.sort((a, b) => b.potentialSavings - a.potentialSavings).slice(0, 3);

    return {
      totalMissedSavings,
      missedEvents,
      topMissedCategory,
      alternativeSuggestions,
      period: { from: sevenDaysAgo, to: new Date() },
    };
  }

  /**
   * Get monthly missed savings summary.
   * Used by the Smart Spending Dashboard.
   */
  async getMonthlySummary(userId: string, month?: string): Promise<MonthlySummary> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Parse month or default to current month
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    // Previous month for comparison
    const prevStartDate = new Date(year, monthNum - 2, 1);
    const prevEndDate = startDate;

    const pipeline = (start: Date, end: Date): mongoose.PipelineStage[] => [
      { $match: { userId: userObjectId, date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: '$merchantCategory',
          totalMissed: { $sum: '$estimatedSavings' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalMissed: -1 } },
    ];

    const [currentResults, prevResults] = await Promise.all([
      MissedSavings.aggregate(pipeline(startDate, endDate)),
      MissedSavings.aggregate(pipeline(prevStartDate, prevEndDate)),
    ]);

    const totalMissedSavings = (currentResults as any[]).reduce((s, r) => s + r.totalMissed, 0);
    const prevTotal = (prevResults as any[]).reduce((s, r) => s + r.totalMissed, 0);
    const missedEvents = (currentResults as any[]).reduce((s, r) => s + r.count, 0);

    const delta = totalMissedSavings - prevTotal;
    let trend: 'better' | 'worse' | 'same' = 'same';
    if (delta < -5)
      trend = 'better'; // Fewer missed savings = better
    else if (delta > 5) trend = 'worse';

    const byCategory = (currentResults as any[]).map((r) => ({
      category: r._id || 'uncategorized',
      totalMissed: r.totalMissed,
      count: r.count,
    }));

    return {
      month: targetMonth,
      totalMissedSavings,
      missedEvents,
      byCategory,
      vsLastMonth: { delta, trend },
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Find nearby REZ merchants in the same category.
   * Falls back to any REZ merchants in the same category if no location provided.
   */
  private async findAlternativeMerchants(
    merchantCategory: string,
    location: { lat: number; lng: number } | undefined,
    billAmount: number,
  ): Promise<Array<{ storeId: string; name: string; distance: number; potentialSavings: number }>> {
    try {
      const Store = mongoose.model('Store');

      const query: any = {
        isActive: true,
        category: merchantCategory,
      };

      let stores: any[] = [];

      if (location) {
        stores = await Store.find({
          ...query,
          'location.coordinates': {
            $nearSphere: {
              $geometry: { type: 'Point', coordinates: [location.lng, location.lat] },
              $maxDistance: 2000, // 2km radius for alternatives
            },
          },
        })
          .select('_id name location')
          .limit(3)
          .lean();
      } else {
        stores = await Store.find(query).select('_id name location').limit(3).lean();
      }

      return stores.map((store: any) => {
        let distance = 0;
        if (location && store.location?.coordinates?.length === 2) {
          distance = Math.round(
            calculateDistanceMeters(
              location.lat,
              location.lng,
              store.location.coordinates[1],
              store.location.coordinates[0],
            ),
          );
        }

        const potentialSavings = Math.round(billAmount * COINS_PER_RUPEE_ESTIMATE);
        return {
          storeId: store._id.toString(),
          name: store.name,
          distance,
          potentialSavings,
        };
      });
    } catch (err) {
      logger.warn('[MissedSavingsService] findAlternativeMerchants failed', { error: (err as Error).message });
      return [];
    }
  }
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default new MissedSavingsService();
