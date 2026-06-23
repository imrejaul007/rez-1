import { logger } from '../config/logger';
import mongoose, { Types } from 'mongoose';
import { TrialBooking } from '../models/TrialBooking';
import { TrialOffer } from '../models/TrialOffer';
import { TrialCoinWallet } from '../models/TrialCoinWallet';
import { TryScoreLedger, UserTryScore } from '../models/TryScoreLedger';
import { MerchantQualityMetrics } from '../models/MerchantQualityMetrics';
import { Merchant } from '../models/Merchant';
import gamificationService from './gamificationService';
import trialCoinService from './trialCoinService';
import crossIntegrationService from '../services/crossIntegrationService';

class TrialRewardService {
  async creditCompletionRewards(bookingId: Types.ObjectId): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Atomically claim reward credit — prevents double-award on concurrent calls
      const booking = await TrialBooking.findOneAndUpdate(
        { _id: bookingId, rewardCredited: { $ne: true } },
        { $set: { rewardCredited: true } },
        { session, new: false },
      );

      if (!booking) {
        // Either not found or already credited — abort safely
        await session.abortTransaction();
        session.endSession();
        logger.warn('[TrialRewardService] Rewards already credited or booking not found', {
          bookingId: bookingId.toString(),
        });
        return;
      }

      // Fetch trial offer
      const trial = await TrialOffer.findById(booking.trialId).session(session);

      if (!trial) {
        throw new Error(`Trial not found: ${booking.trialId}`);
      }

      // Credit ReZ coins to wallet (main wallet service would be used)
      // For now, we'll use trialCoinService
      const rezCoinsExpiry = new Date();
      rezCoinsExpiry.setDate(rezCoinsExpiry.getDate() + 30); // 30 days

      await trialCoinService.creditCoins(
        booking.userId,
        trial.rewardConfig.rezCoins,
        'purchase',
        rezCoinsExpiry,
        bookingId.toString(),
      );

      // Credit branded coins (with label)
      // This would integrate with main wallet.addBrandedCoins if available
      // For now, we track in the trial coin wallet with branded label
      if (trial.rewardConfig.brandedCoins > 0) {
        // Create entry in TryScoreLedger for tracking
        await TryScoreLedger.create(
          [
            {
              userId: booking.userId,
              component: 'new_merchant',
              points: trial.rewardConfig.brandedCoins,
              referenceId: bookingId.toString(),
            },
          ],
          { session },
        );
      }

      // Update MerchantQualityMetrics
      const metrics = await MerchantQualityMetrics.findOne({
        merchantId: booking.merchantId,
      }).session(session);

      if (metrics) {
        metrics.completionCount += 1;
        metrics.trialCount = Math.max(metrics.trialCount, 1); // Ensure trialCount >= 1

        // Recalculate quality score
        const completionRate = metrics.completionCount / metrics.trialCount;
        metrics.completionRate = completionRate;
        metrics.qualityScore = completionRate * 0.5 + (metrics.avgRating / 5) * 0.3 + metrics.upsellConversion * 0.2;
        metrics.updatedAt = new Date();

        await metrics.save({ session });
      }

      // Update TryScoreLedger and UserTryScore
      const category = trial.category;
      let isNewCategory = false;
      let isNewMerchant = false;

      const userScore = await UserTryScore.findOne({
        userId: booking.userId,
      }).session(session);

      if (userScore) {
        // Check if new category
        if (!userScore.categoriesTried.includes(category)) {
          userScore.categoriesTried.push(category);
          isNewCategory = true;

          // Award points for new category
          await TryScoreLedger.create(
            [
              {
                userId: booking.userId,
                component: 'new_category',
                points: 50, // Points for trying new category
                referenceId: bookingId.toString(),
              },
            ],
            { session },
          );
        }

        // Check if new merchant
        const merchantIdStr = booking.merchantId.toString();
        if (!userScore.merchantsDiscovered.some((m) => m.toString() === merchantIdStr)) {
          userScore.merchantsDiscovered.push(booking.merchantId);
          isNewMerchant = true;

          // Award points for new merchant
          await TryScoreLedger.create(
            [
              {
                userId: booking.userId,
                component: 'new_merchant',
                points: 25, // Points for trying new merchant
                referenceId: bookingId.toString(),
              },
            ],
            { session },
          );
        }

        // Update last trial date and streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (userScore.lastTrialDate) {
          const lastTrialDate = new Date(userScore.lastTrialDate);
          lastTrialDate.setHours(0, 0, 0, 0);

          const daysDiff = (today.getTime() - lastTrialDate.getTime()) / (1000 * 60 * 60 * 24);

          if (daysDiff === 1) {
            // Consecutive day
            userScore.currentStreak += 1;

            // Award streak points
            await TryScoreLedger.create(
              [
                {
                  userId: booking.userId,
                  component: 'streak',
                  points: 10 * userScore.currentStreak,
                  referenceId: bookingId.toString(),
                },
              ],
              { session },
            );
          } else if (daysDiff > 1) {
            // Streak broken, reset
            userScore.currentStreak = 1;
          }
        } else {
          // First trial
          userScore.currentStreak = 1;
        }

        userScore.lastTrialDate = new Date();

        // Recalculate total score and tier
        // Use aggregate instead of loading all entries into memory (unbounded inside a transaction)
        const [scoreAgg] = await TryScoreLedger.aggregate([
          { $match: { userId: booking.userId } },
          { $group: { _id: null, total: { $sum: '$points' } } },
        ]).session(session);
        userScore.totalScore = scoreAgg?.total ?? 0;

        // Tier calculation based on score
        const totalScore = userScore.totalScore;
        if (totalScore < 100) {
          userScore.tier = 'curious';
        } else if (totalScore < 250) {
          userScore.tier = 'explorer';
        } else if (totalScore < 500) {
          userScore.tier = 'adventurer';
        } else {
          userScore.tier = 'pioneer';
        }

        userScore.updatedAt = new Date();
        await userScore.save({ session });
      }

      // Mark booking as reward credited
      booking.rewardCredited = true;
      booking.updatedAt = new Date();
      await booking.save({ session });

      await session.commitTransaction();

      logger.info('[TrialRewardService] Completion rewards credited', {
        bookingId: bookingId.toString(),
        userId: booking.userId.toString(),
        rezCoinsAwarded: trial.rewardConfig.rezCoins,
        isNewCategory,
        isNewMerchant,
      });

      // Trigger gamification events (async, non-blocking)
      try {
        const merchant = await Merchant.findById(booking.merchantId).lean();
        const city = merchant?.businessAddress?.city || 'unknown';

        await gamificationService.processTrialCompletion(
          booking.userId as Types.ObjectId,
          booking._id as Types.ObjectId,
          trial.category,
          city,
        );
      } catch (gameError) {
        logger.warn('[TrialRewardService] Gamification processing failed', {
          bookingId: bookingId.toString(),
          error: (gameError as Error).message,
        });
        // Don't throw - let reward flow continue
      }

      // Fire-and-forget cross-integration calls
      try {
        crossIntegrationService.notifyNearU(booking.userId as Types.ObjectId, booking.merchantId).catch((err: any) => {
          logger.warn('[TrialRewardService] NearU notification failed', { error: err.message });
        });

        if (trial.upsellLinks && trial.upsellLinks.length > 0) {
          crossIntegrationService.notifyMall(booking.userId as Types.ObjectId, trial.upsellLinks).catch((err: any) => {
            logger.warn('[TrialRewardService] Mall notification failed', { error: err.message });
          });
        }
      } catch (integrationError) {
        logger.warn('[TrialRewardService] Cross-integration notification failed', {
          bookingId: bookingId.toString(),
          error: (integrationError as Error).message,
        });
        // Don't throw - fire-and-forget operations
      }
    } catch (error) {
      await session.abortTransaction();
      logger.error('[TrialRewardService] creditCompletionRewards error', {
        bookingId: bookingId.toString(),
        error: (error as Error).message,
      });
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export default new TrialRewardService();
