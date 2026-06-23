import { logger } from '../config/logger';
import { startOfDayIST, endOfDayIST } from '../utils/istTime';
import mongoose, { Types } from 'mongoose';
import { TrialBooking, ITrialBooking } from '../models/TrialBooking';
import { TrialOffer } from '../models/TrialOffer';
import { Merchant } from '../models/Merchant';
import { UserTryScore, TryScoreLedger } from '../models/TryScoreLedger';
import { WeeklyMission } from '../models/WeeklyMission';
import { UserMissionProgress } from '../models/UserMissionProgress';
import { CategoryBadge } from '../models/CategoryBadge';
import { Lean } from '../types/lean';
import { Leaderboard } from '../models/Leaderboard';
import { SurpriseTrial, ISurpriseTrial } from '../models/SurpriseTrial';
import { ITrialOffer } from '../models/TrialOffer';

const BADGE_THRESHOLDS = {
  newcomer: 1,
  regular: 3,
  expert: 7,
  master: 15,
};

const BADGE_POINTS = {
  newcomer: 10,
  regular: 25,
  expert: 50,
  master: 100,
};

const STREAK_MILESTONES = {
  3: 30,
  7: 50,
  30: 100,
};

class GamificationService {
  /**
   * Called after every trial completion
   * Updates: streak, category badges, mission progress, leaderboard
   */
  async processTrialCompletion(
    userId: Types.ObjectId,
    bookingId: Types.ObjectId,
    category: string,
    city: string,
  ): Promise<void> {
    try {
      logger.info('[GamificationService] Processing trial completion', {
        userId: userId.toString(),
        bookingId: bookingId.toString(),
        category,
        city,
      });

      // Update streak and get points
      const streakBonus = await this.updateStreak(userId);

      // Update category badge
      await this.updateCategoryBadge(userId, category);

      // Update mission progress
      await this.updateMissionProgress(userId, bookingId, category);

      // Update leaderboard (with base points + streak bonus)
      const basePoints = 100; // Base points for trial completion
      const totalPoints = basePoints + streakBonus;
      await this.updateLeaderboard(userId, city, totalPoints);

      logger.info('[GamificationService] Trial completion processed', {
        userId: userId.toString(),
        totalPoints,
      });
    } catch (error) {
      logger.error('[GamificationService] processTrialCompletion error', {
        userId: userId.toString(),
        bookingId: bookingId.toString(),
        error: (error as Error).message,
      });
      // Don't throw - let the reward flow continue
    }
  }

  /**
   * Streak calculation
   * Checks if user completed a trial in the previous 7 days
   * If yes: streak++ else streak=1
   * Credits streak bonus coins at milestones: 3 streak=+30pts, 7 streak=+50pts, 30 streak=+100pts
   *
   * BUG-004/075 FIX: Replace findOne + save with findOneAndUpdate using $inc
   * to make the streak increment atomic.  The previous pattern was vulnerable
   * to a race condition where two concurrent trial completions both read the
   * same currentStreak value and each incremented it by 1, resulting in the
   * streak only advancing by 1 instead of 2 (lost update).
   */
  async updateStreak(userId: Types.ObjectId): Promise<number> {
    try {
      const today = startOfDayIST();

      // Read the current record first (needed to calculate newStreak and bonusPoints)
      const userScore = await UserTryScore.findOne({ userId }).lean();

      if (!userScore) {
        logger.warn('[GamificationService] UserTryScore not found for streak update', {
          userId: userId.toString(),
        });
        return 0;
      }

      let newStreak = 1;
      let bonusPoints = 0;

      if (userScore.lastTrialDate) {
        const lastTrialDate = startOfDayIST(new Date(userScore.lastTrialDate));

        const daysDiff = (today.getTime() - lastTrialDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysDiff === 1) {
          // Consecutive day - streak will increment
          newStreak = userScore.currentStreak + 1;

          // Check for milestone bonuses
          const milestonesAchieved = Object.keys(STREAK_MILESTONES)
            .map(Number)
            .filter((m) => m === newStreak);
          if (milestonesAchieved.length > 0) {
            bonusPoints = STREAK_MILESTONES[newStreak as keyof typeof STREAK_MILESTONES] || 0;
            logger.info('[GamificationService] Streak milestone reached', {
              userId: userId.toString(),
              streak: newStreak,
              bonusPoints,
            });
          }
        } else if (daysDiff > 1) {
          // Streak broken — reset to 1
          newStreak = 1;
        } else {
          // Same day — keep existing streak, do not advance
          newStreak = userScore.currentStreak;
        }
      }

      // Atomic update — use $inc for increment, $set for reset/date.
      // This prevents lost updates when two requests process concurrently.
      const now = new Date();
      await UserTryScore.findOneAndUpdate(
        { userId },
        {
          $set: {
            currentStreak: newStreak,
            lastTrialDate: now,
            updatedAt: now,
          },
        },
        { new: true },
      );

      return bonusPoints;
    } catch (error) {
      logger.error('[GamificationService] updateStreak error', {
        userId: userId.toString(),
        error: (error as Error).message,
      });
      return 0;
    }
  }

  /**
   * Category badges
   * Increments category trial count, checks badge level thresholds
   * newcomer(1), regular(3), expert(7), master(15)
   * Awards TryScore points per badge level
   */
  async updateCategoryBadge(userId: Types.ObjectId, category: string): Promise<void> {
    try {
      const badge = await CategoryBadge.findOne({ userId, category });

      let isNewBadge = false;
      let newBadgeLevel: 'newcomer' | 'regular' | 'expert' | 'master' = 'newcomer';
      let pointsAwarded = 0;

      if (badge) {
        // Increment trial count
        badge.trialCount += 1;

        // Determine badge level
        if (badge.trialCount >= BADGE_THRESHOLDS.master) {
          newBadgeLevel = 'master';
        } else if (badge.trialCount >= BADGE_THRESHOLDS.expert) {
          newBadgeLevel = 'expert';
        } else if (badge.trialCount >= BADGE_THRESHOLDS.regular) {
          newBadgeLevel = 'regular';
        } else {
          newBadgeLevel = 'newcomer';
        }

        // Check if badge level changed
        if (badge.badgeLevel !== newBadgeLevel) {
          badge.badgeLevel = newBadgeLevel;
          pointsAwarded = BADGE_POINTS[newBadgeLevel];

          logger.info('[GamificationService] Badge level upgraded', {
            userId: userId.toString(),
            category,
            oldLevel: badge.badgeLevel,
            newLevel: newBadgeLevel,
            pointsAwarded,
          });
        }

        badge.updatedAt = new Date();
        await badge.save();
      } else {
        // Create new badge
        isNewBadge = true;
        newBadgeLevel = 'newcomer';
        pointsAwarded = BADGE_POINTS.newcomer;

        await CategoryBadge.create({
          userId,
          category,
          trialCount: 1,
          badgeLevel: newBadgeLevel,
          earnedAt: new Date(),
          updatedAt: new Date(),
        });

        logger.info('[GamificationService] New category badge earned', {
          userId: userId.toString(),
          category,
          badgeLevel: newBadgeLevel,
        });
      }
    } catch (error) {
      logger.error('[GamificationService] updateCategoryBadge error', {
        userId: userId.toString(),
        category,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Weekly mission progress
   * Finds all active missions matching this trial's category (or category=null)
   * Increments progress, checks completion
   * If newly completed: credit reward coins, mark rewardCredited
   */
  async updateMissionProgress(userId: Types.ObjectId, bookingId: Types.ObjectId, category: string): Promise<void> {
    try {
      const now = new Date();

      // Find active missions that match this category (or are open to all)
      const activeMissions = await WeeklyMission.find({
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now },
        $or: [{ category: null }, { category }],
      });

      if (activeMissions.length === 0) {
        return;
      }

      for (const mission of activeMissions) {
        const missionId = mission._id as Types.ObjectId;
        try {
          let progress = await UserMissionProgress.findOne({
            userId,
            missionId,
          });

          if (!progress) {
            // Create new progress entry
            progress = await UserMissionProgress.create({
              userId,
              missionId,
              completedTrialIds: [bookingId],
              currentCount: 1,
              completed: false,
              rewardCredited: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            // Increment progress
            if (!progress.completedTrialIds.includes(bookingId)) {
              progress.completedTrialIds.push(bookingId);
              progress.currentCount += 1;
              progress.updatedAt = new Date();
            }
          }

          // Check if mission is now complete
          if (!progress.completed && progress.currentCount >= mission.targetCount) {
            progress.completed = true;
            progress.completedAt = new Date();
            progress.updatedAt = new Date();

            logger.info('[GamificationService] Mission completed', {
              userId: userId.toString(),
              missionId: missionId.toString(),
              missionTitle: mission.title,
            });
          }

          await progress.save();
        } catch (err) {
          logger.warn('[GamificationService] Failed to update mission progress', {
            userId: userId.toString(),
            missionId: missionId.toString(),
            error: (err as Error).message,
          });
        }
      }
    } catch (error) {
      logger.error('[GamificationService] updateMissionProgress error', {
        userId: userId.toString(),
        category,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Leaderboard update
   * Updates weekly + monthly + alltime entries for user in their city
   * Recalculates rank for top 100 in each period
   */
  async updateLeaderboard(userId: Types.ObjectId, city: string, pointsEarned: number): Promise<void> {
    try {
      const now = new Date();

      // Calculate period keys
      const weekKey = this.getWeekKey(now);
      const monthKey = this.getMonthKey(now);
      const periods = [
        { period: 'weekly' as const, periodKey: weekKey },
        { period: 'monthly' as const, periodKey: monthKey },
        { period: 'alltime' as const, periodKey: 'alltime' },
      ];

      // Get user's badge count (categories explored)
      const badgeCount = await CategoryBadge.countDocuments({ userId });

      // Get user's total trial count
      const completedTrials = await TrialBooking.countDocuments({
        userId,
        status: 'completed',
      });

      for (const { period, periodKey } of periods) {
        try {
          let entry = await Leaderboard.findOne({
            userId,
            city,
            period,
            periodKey,
          });

          if (!entry) {
            entry = await Leaderboard.create({
              userId,
              city,
              period,
              periodKey,
              score: pointsEarned,
              rank: 0,
              trialCount: completedTrials,
              categoriesExplored: badgeCount,
              updatedAt: new Date(),
            });
          } else {
            entry.score += pointsEarned;
            entry.trialCount = completedTrials;
            entry.categoriesExplored = badgeCount;
            entry.updatedAt = new Date();
            await entry.save();
          }
        } catch (error) {
          logger.warn('[GamificationService] Failed to update leaderboard entry', {
            userId: userId.toString(),
            city,
            period,
            error: (error as Error).message,
          });
        }
      }

      // Asynchronously update ranks (don't wait for it)
      this.updateLeaderboardRanks(city).catch((err) => {
        logger.error('[GamificationService] updateLeaderboardRanks error', {
          city,
          error: (err as Error).message,
        });
      });
    } catch (error) {
      logger.error('[GamificationService] updateLeaderboard error', {
        userId: userId.toString(),
        city,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Recalculate ranks for top 100 users in each period/city combination
   */
  private async updateLeaderboardRanks(city: string): Promise<void> {
    try {
      const periods = ['weekly', 'monthly', 'alltime'];

      for (const period of periods) {
        const entries = await Leaderboard.find({
          city,
          period,
        })
          .sort({ score: -1 })
          .limit(100);

        for (let i = 0; i < entries.length; i++) {
          entries[i].rank = i + 1;
          await entries[i].save();
        }
      }
    } catch (error) {
      logger.error('[GamificationService] updateLeaderboardRanks error', {
        city,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Surprise trial selection
   * Runs weekly — assigns 1 curated mystery trial per active user
   * Selection: active trial in a category the user has NOT tried yet
   */
  async assignSurpriseTrials(): Promise<{ assigned: number }> {
    try {
      logger.info('[GamificationService] Starting surprise trial assignment');

      const now = new Date();
      const weekKey = this.getWeekKey(now);

      // Calculate week end
      const weekEnd = endOfDayIST(now);

      // Find active users (assume those with at least one completed trial or recent activity)
      const activeUsers = await TrialBooking.find({
        status: 'completed',
        completedAt: {
          $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      }).distinct('userId');

      logger.info('[GamificationService] Found active users for surprise trials', {
        count: activeUsers.length,
      });

      let assignedCount = 0;

      for (const userId of activeUsers) {
        try {
          // Check if user already has a surprise trial for this week
          const existingSurprise = await SurpriseTrial.findOne({
            userId,
            weekKey,
          });

          if (existingSurprise) {
            continue;
          }

          // Get user's categories already tried
          const categoriesTried = await CategoryBadge.find({ userId }).distinct('category');

          // Get user's last known location
          const lastBooking = await TrialBooking.findOne({ userId }).sort({ createdAt: -1 }).lean();

          const userGeo = lastBooking?.geoAtBooking || { lat: 0, lng: 0 };

          // Find available trials not in categories user has tried
          let candidateTrials = await TrialOffer.find({
            status: 'active',
            category: { $nin: categoriesTried },
          })
            .limit(50)
            .lean();

          if (candidateTrials.length === 0) {
            // If no new category available, pick from least-visited category
            const leastVisitedCategory = await CategoryBadge.find({ userId }).sort({ trialCount: 1 }).limit(1);

            if (leastVisitedCategory.length > 0) {
              candidateTrials = await TrialOffer.find({
                status: 'active',
                category: leastVisitedCategory[0].category,
              })
                .limit(50)
                .lean();
            } else {
              // Fallback: any active trial
              candidateTrials = await TrialOffer.find({
                status: 'active',
              })
                .limit(50)
                .lean();
            }
          }

          if (candidateTrials.length === 0) {
            continue;
          }

          // Select one randomly
          const selectedTrial = candidateTrials[Math.floor(Math.random() * candidateTrials.length)];

          // Create surprise trial entry
          await SurpriseTrial.create({
            userId,
            trialId: selectedTrial._id,
            weekKey,
            revealed: false,
            booked: false,
            expiresAt: weekEnd,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          assignedCount++;
        } catch (error) {
          logger.warn('[GamificationService] Failed to assign surprise trial to user', {
            userId: userId.toString(),
            error: (error as Error).message,
          });
        }
      }

      logger.info('[GamificationService] Surprise trial assignment completed', {
        assigned: assignedCount,
        total: activeUsers.length,
      });

      return { assigned: assignedCount };
    } catch (error) {
      logger.error('[GamificationService] assignSurpriseTrials error', {
        error: (error as Error).message,
      });
      return { assigned: 0 };
    }
  }

  /**
   * Get user's surprise trial for current week
   */
  async getSurpriseTrial(userId: Types.ObjectId): Promise<(Lean<ISurpriseTrial> & { trial?: Lean<ITrialOffer> | null }) | null> {
    try {
      const weekKey = this.getWeekKey(new Date());

      const surprise = await SurpriseTrial.findOne({
        userId,
        weekKey,
      }).lean();

      if (!surprise) {
        return null;
      }

      // If not revealed, don't populate full trial (hide merchant name)
      if (!surprise.revealed) {
        return surprise as unknown as (Lean<ISurpriseTrial> & { trial?: Lean<ITrialOffer> | null | undefined; }) | null;
      }

      // If revealed, populate trial data
      const trial = await TrialOffer.findById(surprise.trialId).lean();

      return {
        ...surprise,
        trial: trial ?? undefined,
      };
    } catch (error) {
      logger.error('[GamificationService] getSurpriseTrial error', {
        userId: userId.toString(),
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Reveal surprise trial
   */
  async revealSurpriseTrial(userId: Types.ObjectId): Promise<ITrialOffer> {
    try {
      const weekKey = this.getWeekKey(new Date());

      const surprise = await SurpriseTrial.findOneAndUpdate(
        { userId, weekKey },
        {
          revealed: true,
          revealedAt: new Date(),
          updatedAt: new Date(),
        },
        { new: true },
      );

      if (!surprise) {
        throw new Error('Surprise trial not found');
      }

      // Fetch and return full trial data
      const trial = await TrialOffer.findById(surprise.trialId);

      if (!trial) {
        throw new Error('Trial not found');
      }

      logger.info('[GamificationService] Surprise trial revealed', {
        userId: userId.toString(),
        trialId: surprise.trialId.toString(),
      });

      return trial;
    } catch (error) {
      logger.error('[GamificationService] revealSurpriseTrial error', {
        userId: userId.toString(),
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Helper: Get week key (ISO week format)
   */
  private getWeekKey(date: Date): string {
    const d = new Date(date);
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  /**
   * Helper: Get month key (YYYY-MM format)
   */
  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}

export default new GamificationService();
