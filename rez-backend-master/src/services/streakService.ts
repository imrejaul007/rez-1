import { logger } from '../config/logger';
import UserStreak, { IUserStreak } from '../models/UserStreak';

// Streak milestones and their rewards
const STREAK_MILESTONES = {
  login: [
    { day: 3, coins: 50, name: '3-Day Streak' },
    { day: 7, coins: 200, name: 'Week Warrior' },
    { day: 14, coins: 500, name: 'Two-Week Champion' },
    { day: 30, coins: 2000, name: 'Month Master', badge: 'streak_master' },
    { day: 60, coins: 5000, name: 'Dedication Pro' },
    { day: 100, coins: 10000, name: 'Loyalty Legend', badge: 'loyalty_legend' }
  ],
  order: [
    { day: 2, coins: 100, name: 'Double Order' },
    { day: 4, coins: 300, name: 'Shopping Habit' },
    { day: 7, coins: 800, name: 'Weekly Shopper' },
    { day: 14, coins: 2000, name: 'Shopping Pro', badge: 'shopping_pro' }
  ],
  review: [
    { day: 3, coins: 75, name: 'Review Regular' },
    { day: 7, coins: 250, name: 'Review Pro' },
    { day: 14, coins: 600, name: 'Review Champion', badge: 'review_champion' }
  ],
  savings: [
    { day: 3, coins: 50, name: 'Bronze Saver', badge: 'bronze_saver' },
    { day: 7, coins: 200, name: 'Silver Saver', badge: 'silver_saver' },
    { day: 21, coins: 1000, name: 'Gold Saver', badge: 'gold_saver' },
    { day: 60, coins: 5000, name: 'Smart Saver Elite', badge: 'elite_saver' },
    { day: 100, coins: 10000, name: 'REZ Legend', badge: 'rez_legend' },
  ],
  // Utility payment milestones (count-based, not day-based — bills are monthly)
  utility_payments: [
    { day: 3, coins: 30, name: 'Utility Starter' },
    { day: 6, coins: 75, name: 'Bill Champion' },
    { day: 12, coins: 200, name: 'Super Saver', badge: 'vip_merchant_offers' },
  ],
};

export interface StreakTier {
  name: string;
  level: number;
  icon: string;
  color: string;
  nextTierDays: number | null;
  daysToNext: number;
  description: string;
}

export function getStreakTier(currentStreak: number): StreakTier {
  if (currentStreak >= 60) return { name: 'Smart Saver Elite', level: 4, icon: '💎', color: '#60a5fa', nextTierDays: null, daysToNext: 0, description: 'Top 1% of savers on REZ' };
  if (currentStreak >= 21) return { name: 'Gold Saver', level: 3, icon: '🥇', color: '#F59E0B', nextTierDays: 60, daysToNext: 60 - currentStreak, description: `${60 - currentStreak} more days to Elite` };
  if (currentStreak >= 7) return { name: 'Silver Saver', level: 2, icon: '🥈', color: '#94a3b8', nextTierDays: 21, daysToNext: 21 - currentStreak, description: `${21 - currentStreak} more days to Gold` };
  if (currentStreak >= 1) return { name: 'Bronze Saver', level: 1, icon: '🥉', color: '#cd7f32', nextTierDays: 7, daysToNext: 7 - currentStreak, description: `${7 - currentStreak} more days to Silver` };
  return { name: 'Start Saving', level: 0, icon: '🔥', color: '#ef4444', nextTierDays: 1, daysToNext: 1, description: 'Make your first saving today' };
}

class StreakService {
  // Get or create user streak
  async getOrCreateStreak(
    userId: string,
    type: 'login' | 'order' | 'review' | 'savings'
  ): Promise<IUserStreak> {
    let streak = await UserStreak.findOne({ user: userId, type });

    if (!streak) {
      streak = await UserStreak.create({
        user: userId,
        type,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date(),
        streakStartDate: new Date(),
        totalDays: 0,
        milestones: STREAK_MILESTONES[type].map(m => ({
          day: m.day,
          rewardsClaimed: false
        }))
      }) as any;
    }

    return streak as any;
  }

  // Update streak (call this when user performs action)
  async updateStreak(
    userId: string,
    type: 'login' | 'order' | 'review' | 'savings'
  ): Promise<{
    streak: IUserStreak;
    milestoneReached?: any;
  }> {
    const streak = await this.getOrCreateStreak(userId, type);
    await streak.updateStreak();

    // Check if milestone reached
    const milestone = this.checkMilestone(streak, type);

    return {
      streak,
      milestoneReached: milestone
    };
  }

  // Check if milestone reached
  private checkMilestone(
    streak: IUserStreak,
    type: 'login' | 'order' | 'review' | 'savings'
  ): any | null {
    const milestones = STREAK_MILESTONES[type];

    for (const milestone of milestones) {
      if (streak.currentStreak === milestone.day) {
        const streakMilestone = streak.milestones.find(m => m.day === milestone.day);

        if (streakMilestone && !streakMilestone.rewardsClaimed) {
          return {
            ...milestone,
            canClaim: true
          };
        }
      }
    }

    return null;
  }

  // Claim milestone reward
  async claimMilestone(
    userId: string,
    type: 'login' | 'order' | 'review' | 'savings',
    day: number
  ): Promise<{
    streak: IUserStreak;
    rewards: any;
  }> {
    const streak = await this.getOrCreateStreak(userId, type);

    if (streak.currentStreak < day) {
      throw new Error('Milestone not reached yet');
    }

    await streak.claimMilestone(day);

    const milestone = STREAK_MILESTONES[type].find(m => m.day === day);

    if (!milestone) {
      throw new Error('Invalid milestone');
    }

    return {
      streak,
      rewards: {
        coins: milestone.coins,
        badge: milestone.badge,
        name: milestone.name
      }
    };
  }

  // Freeze streak (Premium feature)
  async freezeStreak(
    userId: string,
    type: 'login' | 'order' | 'review' | 'savings',
    days: number = 1
  ): Promise<IUserStreak> {
    const streak = await this.getOrCreateStreak(userId, type);

    if (streak.frozen && streak.freezeExpiresAt && streak.freezeExpiresAt > new Date()) {
      throw new Error('Streak already frozen');
    }

    await streak.freezeStreak(days);
    return streak;
  }

  // Get all streaks for user
  async getUserStreaks(userId: string): Promise<any> {
    const [login, order, review, savings] = await Promise.all([
      this.getOrCreateStreak(userId, 'login'),
      this.getOrCreateStreak(userId, 'order'),
      this.getOrCreateStreak(userId, 'review'),
      this.getOrCreateStreak(userId, 'savings'),
    ]);

    return {
      login: this.formatStreak(login, 'login'),
      order: this.formatStreak(order, 'order'),
      review: this.formatStreak(review, 'review'),
      savings: this.formatStreak(savings, 'savings'),
      savingsTier: getStreakTier(savings.currentStreak),
    };
  }

  // Format streak with milestone info
  private formatStreak(streak: IUserStreak, type: 'login' | 'order' | 'review' | 'savings'): any {
    const milestones = STREAK_MILESTONES[type];

    // Find next milestone
    const nextMilestone = milestones.find(m => m.day > streak.currentStreak);

    // Find claimable milestones
    const claimableMilestones = milestones.filter(m => {
      const streakMilestone = streak.milestones.find(sm => sm.day === m.day);
      return streak.currentStreak >= m.day && streakMilestone && !streakMilestone.rewardsClaimed;
    });

    return {
      current: streak.currentStreak,
      longest: streak.longestStreak,
      totalDays: streak.totalDays,
      frozen: streak.frozen,
      freezeExpiresAt: streak.freezeExpiresAt,
      lastActivity: streak.lastActivityDate,
      nextMilestone,
      claimableMilestones,
      allMilestones: milestones.map(m => {
        const streakMilestone = streak.milestones.find(sm => sm.day === m.day);
        return {
          ...m,
          reached: streak.currentStreak >= m.day,
          claimed: streakMilestone?.rewardsClaimed || false,
          claimedAt: streakMilestone?.claimedAt
        };
      })
    };
  }

  // Get streak statistics
  async getStreakStats(userId: string): Promise<any> {
    const streaks = await UserStreak.find({ user: userId }).lean();

    const stats = {
      totalStreaks: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      currentlyActive: 0,
      byType: {} as any
    };

    streaks.forEach(streak => {
      stats.totalStreaks++;
      stats.totalDaysActive += streak.totalDays;

      if (streak.longestStreak > stats.longestStreak) {
        stats.longestStreak = streak.longestStreak;
      }

      if (streak.currentStreak > 0) {
        stats.currentlyActive++;
      }

      stats.byType[streak.type] = {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        total: streak.totalDays
      };
    });

    return stats;
  }

  // Check for broken streaks (run daily via cron)
  async checkBrokenStreaks(): Promise<void> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find streaks that should have been updated yesterday
    const streaks = await UserStreak.find({
      currentStreak: { $gt: 0 },
      lastActivityDate: { $lt: yesterday }
    }).lean();

    for (const streak of streaks) {
      // Check if frozen
      if (streak.frozen && streak.freezeExpiresAt && streak.freezeExpiresAt >= now) {
        continue; // Freeze protects the streak
      }

      // Streak is broken
      streak.currentStreak = 0;
      streak.frozen = false;
      streak.freezeExpiresAt = undefined;
      await streak.save();

      logger.info(`Streak broken for user ${streak.user}, type: ${streak.type}`);
    }
  }

  // Phase 4 stub replacement: real implementation. Ensures the streak exists,
  // updates `lastActivityDate` to now, and bumps currentStreak if the previous
  // activity was within the streak window (1 day for login, configurable per type).
  async recordActivity(
    userId: any,
    activityType: 'login' | 'order' | 'review' | 'savings',
    metadata?: any
  ): Promise<any> {
    try {
      const streak = await this.getOrCreateStreak(userId, activityType);
      const now = new Date();
      const last = streak.lastActivityDate ? new Date(streak.lastActivityDate as any) : null;
      const oneDayMs = 24 * 60 * 60 * 1000;
      const sameDay =
        last && last.toDateString() === now.toDateString();
      if (sameDay) {
        // Already counted today — no-op.
        return { streak, changed: false, reason: 'same_day' };
      }
      const yesterday =
        last && (now.getTime() - last.getTime()) < 2 * oneDayMs && !sameDay;
      if (yesterday) {
        streak.currentStreak = (streak.currentStreak || 0) + 1;
      } else {
        // Broke streak — reset to 1.
        streak.currentStreak = 1;
        streak.streakStartDate = now;
      }
      streak.lastActivityDate = now;
      streak.totalDays = (streak.totalDays || 0) + 1;
      if (streak.currentStreak > (streak.longestStreak || 0)) {
        streak.longestStreak = streak.currentStreak;
      }
      await (streak as any).save();
      logger.debug(
        `[STREAK] Recorded ${activityType} for user ${userId}: current=${streak.currentStreak}, longest=${streak.longestStreak}`
      );
      return { streak, changed: true };
    } catch (err: any) {
      logger.error(`[STREAK] recordActivity failed for user ${userId}:`, err.message);
      return null;
    }
  }
}

export default new StreakService();
