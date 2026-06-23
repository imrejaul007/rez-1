import { logger } from '../config/logger';
import { TrialOffer, ITrialOffer } from '../models/TrialOffer';
import { TryFeedCache } from '../models/TryFeedCache';
import { UserTryScore } from '../models/TryScoreLedger';
import { MerchantQualityMetrics } from '../models/MerchantQualityMetrics';
import { Merchant } from '../models/Merchant';
import { TrialBooking } from '../models/TrialBooking';
import mongoose, { Types } from 'mongoose';

interface Geo {
  lat: number;
  lng: number;
}

interface TrialScore {
  trialId: Types.ObjectId;
  score: number;
  components: {
    proximity: number;
    affinity: number;
    quality: number;
    freshness: number;
    availability: number;
    campaign: number;
  };
}

class TryFeedService {
  /**
   * Calculate distance between two geographic points (in km)
   */
  private calculateDistance(geo1: Geo, geo2: Geo): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((geo2.lat - geo1.lat) * Math.PI) / 180;
    const dLng = ((geo2.lng - geo1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((geo1.lat * Math.PI) / 180) *
        Math.cos((geo2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Compute user feed with scoring algorithm
   */
  async computeUserFeed(userId: Types.ObjectId, userGeo: Geo, limit: number = 20): Promise<Types.ObjectId[]> {
    try {
      // Fetch user's try score for affinity calculation
      const userScore = await UserTryScore.findOne({ userId }).lean();

      // Fetch active trials within 10km
      // Note: This is simplified; in real implementation, use geospatial queries
      const activeTrials = await TrialOffer.find({
        status: 'active',
      })
        .lean()
        .limit(1000); // Fetch large set, filter by distance

      // BATCH QUERY: Fetch all merchant metrics and coordinates in one query (prevents N+1)
      const merchantIds = [...new Set(activeTrials.map((t) => t.merchantId.toString()))];

      // Start of today (UTC) for availability calculation
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const trialIdStrings = activeTrials.map((t) => t._id);

      const [merchantMetricsArray, merchantGeoArray, todayBookingCounts] = await Promise.all([
        MerchantQualityMetrics.find({ merchantId: { $in: merchantIds } }).lean(),
        Merchant.find({ _id: { $in: merchantIds } }, { 'location.coordinates': 1 }).lean(),
        // Count bookings per trial for today — single aggregation, no N+1
        TrialBooking.aggregate([
          {
            $match: {
              trialId: { $in: trialIdStrings },
              status: { $nin: ['cancelled'] },
              createdAt: { $gte: todayStart },
            },
          },
          { $group: { _id: '$trialId', count: { $sum: 1 } } },
        ]),
      ]);

      // Build a map of trialId → today's booking count
      const todayBookingsMap = new Map<string, number>(
        todayBookingCounts.map((r: { _id: any; count: number }) => [r._id.toString(), r.count]),
      );

      const metricsMap = new Map(merchantMetricsArray.map((m) => [m.merchantId.toString(), m]));
      // Map merchantId → { latitude, longitude } for distance calculation
      const geoMap = new Map<string, { latitude: number; longitude: number }>();
      for (const m of merchantGeoArray) {
        const coords = (m as any)?.location?.coordinates;
        if (coords?.latitude && coords?.longitude) {
          geoMap.set((m._id as any).toString(), { latitude: coords.latitude, longitude: coords.longitude });
        }
      }

      const trialScores: TrialScore[] = [];

      // Limit loop to 1000 iterations max to prevent runaway computation
      for (let i = 0; i < Math.min(activeTrials.length, 1000); i++) {
        const trial = activeTrials[i];

        // Calculate real distance using merchant GPS coordinates
        const merchantGeo = geoMap.get(trial.merchantId.toString());
        let distance: number;
        if (merchantGeo) {
          distance = this.calculateDistance(userGeo, {
            lat: merchantGeo.latitude,
            lng: merchantGeo.longitude,
          });
        } else {
          // Merchant has no location data — assign a mid-range penalty distance
          // so it still appears in feed but ranks lower than nearby stores
          distance = 7;
        }

        if (distance > 10) {
          continue;
        }

        // Calculate score components
        const proximity = Math.max(0, 1 - distance / 10); // 1 if 0km, 0 if 10km

        // Affinity: whether user tried this category before
        const affinity = userScore?.categoriesTried.includes(trial.category) ? 0.8 : 0.3;

        // Quality: completion rate and rating (from pre-fetched map)
        const qualityMetrics = metricsMap.get(trial.merchantId.toString());
        const qualityScore = qualityMetrics?.qualityScore ?? 0.5;

        // Freshness: how recent the trial was created/boosted
        const createdDaysAgo = (Date.now() - trial.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const freshness = Math.max(0, 1 - createdDaysAgo / 30); // Decay over 30 days

        // Availability: ratio of remaining slots today to total daily capacity.
        // 1.0 = fully open, 0.0 = fully booked → ranks fully-booked trials last.
        const totalSlots = (trial as any).schedule?.dailySlots ?? trial.slotConfig?.dailySlots ?? 0;
        let availability: number;
        if (totalSlots <= 0) {
          // No slot configuration — use neutral score
          availability = 0.5;
        } else {
          const bookedToday = todayBookingsMap.get((trial._id as any).toString()) ?? 0;
          const remaining = Math.max(0, totalSlots - bookedToday);
          availability = remaining / totalSlots;
        }

        // Campaign: boost multiplier
        const campaign = trial.campaignBoost > 0 ? trial.campaignBoost : 0;

        // Weighted score
        const overallScore =
          0.3 * proximity +
          0.25 * affinity +
          0.2 * qualityScore +
          0.1 * freshness +
          0.1 * availability +
          0.05 * campaign;

        trialScores.push({
          trialId: trial._id as unknown as Types.ObjectId,
          score: overallScore,
          components: {
            proximity,
            affinity,
            quality: qualityScore,
            freshness,
            availability,
            campaign,
          },
        });
      }

      // Sort by score
      trialScores.sort((a, b) => b.score - a.score);

      // Extract top trial IDs
      let rankedIds = trialScores.slice(0, limit).map((t) => t.trialId);

      // Inject sponsored trials at positions 3 and 7
      const sponsoredTrials = trialScores
        .filter((t) => t.components.campaign > 0)
        .map((t) => t.trialId)
        .slice(0, 2);

      if (sponsoredTrials.length > 0 && rankedIds.length > 3) {
        const position3Trial = sponsoredTrials[0];
        if (position3Trial && !rankedIds.slice(0, 3).some((id) => id.toString() === position3Trial.toString())) {
          rankedIds = [...rankedIds.slice(0, 3), position3Trial, ...rankedIds.slice(3)];
        }
      }

      if (sponsoredTrials.length > 1 && rankedIds.length > 7) {
        const position7Trial = sponsoredTrials[1];
        if (position7Trial && !rankedIds.slice(0, 7).some((id) => id.toString() === position7Trial.toString())) {
          rankedIds = [...rankedIds.slice(0, 7), position7Trial, ...rankedIds.slice(7)];
        }
      }

      rankedIds = rankedIds.slice(0, limit);

      logger.info('[TryFeedService] Feed computed', {
        userId: userId.toString(),
        trialsReturned: rankedIds.length,
      });

      return rankedIds;
    } catch (error) {
      logger.error('[TryFeedService] computeUserFeed error', {
        userId: userId.toString(),
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get feed for user with caching
   */
  async getFeedForUser(userId: Types.ObjectId, userGeo: Geo): Promise<ITrialOffer[]> {
    try {
      // Check cache
      const cache = await TryFeedCache.findOne({ userId }).lean();
      const now = new Date();

      if (cache && cache.expiresAt > now) {
        logger.info('[TryFeedService] Feed served from cache', {
          userId: userId.toString(),
        });

        // Fetch full trial offers
        const trials = await TrialOffer.find({
          _id: { $in: cache.rankedTrialIds },
        }).lean();

        // Maintain rank order
        const trialMap = new Map(trials.map((t) => [t._id!.toString(), t as any]));
        return cache.rankedTrialIds
          .map((id) => {
            const trialId = (id as unknown as string).toString();
            return trialMap.get(trialId);
          })
          .filter((t) => !!t) as unknown as ITrialOffer[];
      }

      // Compute new feed
      const rankedIds = await this.computeUserFeed(userId, userGeo, 20);

      // Save to cache (6 hours)
      const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      await TryFeedCache.updateOne(
        { userId },
        {
          userId,
          rankedTrialIds: rankedIds,
          generatedAt: now,
          expiresAt,
        },
        { upsert: true },
      );

      // Fetch full trial offers
      const trials = await TrialOffer.find({
        _id: { $in: rankedIds },
      }).lean();

      // Maintain rank order
      const trialMap = new Map(trials.map((t) => [t._id!.toString(), t as any]));
      const result = rankedIds
        .map((id) => {
          const trialId = (id as unknown as string).toString();
          return trialMap.get(trialId);
        })
        .filter((t) => !!t) as unknown as ITrialOffer[];

      logger.info('[TryFeedService] Feed generated and cached', {
        userId: userId.toString(),
        trialsReturned: result.length,
      });

      return result;
    } catch (error) {
      logger.error('[TryFeedService] getFeedForUser error', {
        userId: userId.toString(),
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new TryFeedService();
