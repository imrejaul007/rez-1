import cron from 'node-cron';
import Offer from '../models/Offer';
import { logger } from '../config/logger';
import redisService from '../services/redisService';

/**
 * Auto-tags offers based on redemption patterns.
 * Runs every hour. Updates isTrending and metadata.autoTags.
 */
export function initializeTagOffersJob() {
  cron.schedule('0 * * * *', async () => {
    const lockKey = 'lock:tag-offers-job';
    const acquired = await redisService.acquireLock(lockKey, 300);
    if (!acquired) return;

    try {
      const now = new Date();
      const week = new Date(now.getTime() - 7 * 86400000);

      const offers = await Offer.find({
        'validity.isActive': true,
        'validity.endDate': { $gt: now },
      }).select('_id redemptionCount metadata createdAt validity.endDate').lean();

      let tagged = 0;
      for (const offer of offers) {
        const tags: string[] = [];

        if ((offer.redemptionCount || 0) > 50) tags.push('popular');
        if (new Date(offer.createdAt) > week) tags.push('new');

        const views = (offer as any).metadata?.views || 0;
        if (views > 0 && (offer.redemptionCount || 0) / views > 0.15) tags.push('best_value');

        if (offer.validity?.endDate) {
          const daysLeft = Math.ceil((new Date(offer.validity.endDate).getTime() - now.getTime()) / 86400000);
          if (daysLeft <= 3) tags.push('limited_time');
        }

        const isTrending = tags.includes('popular') || (offer.redemptionCount || 0) > 100;

        if (tags.length > 0 || isTrending) {
          await Offer.findByIdAndUpdate(offer._id, {
            $set: {
              'metadata.isTrending': isTrending,
              'metadata.autoTags': tags,
              'metadata.tagsUpdatedAt': now,
            },
          });
          tagged++;
        }
      }

      logger.info(`[TAG OFFERS JOB] Tagged ${tagged}/${offers.length} offers`);
    } catch (err) {
      logger.error('[TAG OFFERS JOB] Failed:', err);
    } finally {
      await redisService.releaseLock(lockKey);
    }
  });

  logger.info('[TAG OFFERS JOB] Registered — runs hourly');
}
