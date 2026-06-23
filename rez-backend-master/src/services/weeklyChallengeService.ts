/**
 * WeeklyChallengeService
 * Phase 3.3 — Habit Reinforcement
 *
 * Auto-generates personalized weekly challenges based on user behavior.
 * Challenge templates:
 *   - "Save Rs.500 this week across 3 different merchants"
 *   - "Visit a new merchant you haven't tried"
 *   - "Maintain your streak for 7 consecutive days"
 *   - "Upload 2 bills this week"
 *
 * Uses the existing Challenge model.
 * Rewards: 50–200 bonus coins on completion.
 */

import mongoose from 'mongoose';
import Challenge, { IChallenge } from '../models/Challenge';
import UserChallengeProgress from '../models/UserChallengeProgress';
import { logger } from '../config/logger';
import redisService from './redisService';
import pushNotificationService from './pushNotificationService';
import { startOfDayIST, endOfDayIST } from '../utils/istTime';
import type { Lean } from '../types/lean';

// ---------------------------------------------------------------------------
// Weekly challenge template definitions
// ---------------------------------------------------------------------------
interface WeeklyChallengeTemplate {
  title: string;
  description: string;
  icon: string;
  action: IChallenge['requirements']['action'];
  target: number;
  minAmount?: number;
  coins: number;
  difficulty: IChallenge['difficulty'];
  /** Optional: filter to users who haven't done this action recently */
  targetSegment?: 'new_users' | 'inactive' | 'active' | 'all';
}

const WEEKLY_CHALLENGE_TEMPLATES: WeeklyChallengeTemplate[] = [
  {
    title: 'Savings Sprinter',
    description: 'Save Rs.500 this week by spending across 3 different merchants',
    icon: '💨',
    action: 'spend_amount',
    target: 500,
    minAmount: 500,
    coins: 150,
    difficulty: 'medium',
    targetSegment: 'all',
  },
  {
    title: 'Store Explorer',
    description: "Visit a new REZ merchant you haven't tried before",
    icon: '🗺️',
    action: 'visit_stores',
    target: 1,
    coins: 100,
    difficulty: 'easy',
    targetSegment: 'active',
  },
  {
    title: 'Streak Guardian',
    description: 'Maintain your savings streak for 7 consecutive days',
    icon: '🔥',
    action: 'login_streak',
    target: 7,
    coins: 200,
    difficulty: 'hard',
    targetSegment: 'all',
  },
  {
    title: 'Bill Collector',
    description: 'Upload 2 bills this week to earn bonus cashback',
    icon: '📄',
    action: 'upload_bills',
    target: 2,
    coins: 75,
    difficulty: 'easy',
    targetSegment: 'all',
  },
  {
    title: 'Loyal Regular',
    description: 'Visit any 2 REZ merchants this week',
    icon: '🏆',
    action: 'visit_stores',
    target: 2,
    coins: 100,
    difficulty: 'easy',
    targetSegment: 'all',
  },
  {
    title: 'Big Saver',
    description: 'Make a purchase of Rs.1000 or more at a REZ merchant',
    icon: '💰',
    action: 'spend_amount',
    target: 1000,
    minAmount: 1000,
    coins: 180,
    difficulty: 'medium',
    targetSegment: 'active',
  },
  {
    title: 'Community Contributor',
    description: 'Write a review for a merchant you visited this week',
    icon: '⭐',
    action: 'review_count',
    target: 1,
    coins: 50,
    difficulty: 'easy',
    targetSegment: 'all',
  },
];

// Number of weekly challenges per user
const CHALLENGES_PER_USER = 3;
const COINS_RANGE = { min: 50, max: 200 };

function getWeekBoundaries(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const weekStart = startOfDayIST(now);
  const weekEnd = endOfDayIST(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1));

  return { weekStart, weekEnd };
}

class WeeklyChallengeService {
  /**
   * Check if weekly challenges already exist for this week.
   */
  async hasWeeklyChallengesForThisWeek(): Promise<boolean> {
    const { weekStart, weekEnd } = getWeekBoundaries();
    const count = await Challenge.countDocuments({
      type: 'weekly',
      active: true,
      startDate: { $gte: weekStart },
      endDate: { $lte: weekEnd },
    });
    return count > 0;
  }

  /**
   * Select N challenge templates for a user based on their behavior.
   * Currently uses random selection from the pool; can be upgraded to
   * ML-based personalization once we have behavioral data.
   */
  private selectChallengesForUser(_userId: string, count: number = CHALLENGES_PER_USER): WeeklyChallengeTemplate[] {
    // Shuffle and pick N
    const shuffled = [...WEEKLY_CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Generate global weekly challenges (one set for all users).
   * Called by the weekly cron job every Monday at 6AM.
   */
  async generateWeeklyChallenges(): Promise<any[]> {
    const alreadyExists = await this.hasWeeklyChallengesForThisWeek();
    if (alreadyExists) {
      logger.info('[WeeklyChallengeService] Weekly challenges already exist for this week');
      return Challenge.find({
        type: 'weekly',
        active: true,
        ...getWeekBoundaries(),
      }).lean();
    }

    const { weekStart, weekEnd } = getWeekBoundaries();

    // Select templates for the global pool
    const selectedTemplates = this.selectChallengesForUser('global', CHALLENGES_PER_USER);

    const challengeDocs = selectedTemplates.map((tmpl, idx) => ({
      type: 'weekly' as const,
      title: tmpl.title,
      description: tmpl.description,
      icon: tmpl.icon,
      requirements: {
        action: tmpl.action,
        target: tmpl.target,
        ...(tmpl.minAmount ? { minAmount: tmpl.minAmount } : {}),
      },
      rewards: {
        coins: Math.min(COINS_RANGE.max, Math.max(COINS_RANGE.min, tmpl.coins)),
      },
      difficulty: tmpl.difficulty,
      startDate: weekStart,
      endDate: weekEnd,
      active: true,
      status: 'active' as const,
      featured: idx === 0,
      visibility: 'both' as const,
      priority: CHALLENGES_PER_USER - idx,
      participantCount: 0,
      completionCount: 0,
      statusHistory: [
        {
          status: 'active',
          changedAt: new Date(),
          reason: 'Auto-generated weekly challenge',
        },
      ],
    }));

    const challenges = await Challenge.insertMany(challengeDocs, { ordered: false });

    // Invalidate cache
    try {
      await redisService.delPattern('challenges:*');
    } catch {
      /* Redis unavailable */
    }

    logger.info(
      `[WeeklyChallengeService] Created ${challenges.length} weekly challenges for week of ${weekStart.toDateString()}`,
    );

    return challenges;
  }

  /**
   * Get current week's challenges with user progress.
   */
  async getCurrentWeeklyChallenges(userId: string): Promise<
    Array<{
      challenge: Lean<IChallenge>;
      progress: number;
      target: number;
      progressPct: number;
      completed: boolean;
      rewardsClaimed: boolean;
      daysLeft: number;
    }>
  > {
    // Ensure challenges exist
    await this.generateWeeklyChallenges();

    const { weekStart, weekEnd } = getWeekBoundaries();
    const now = new Date();
    const msLeft = weekEnd.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    const challenges = await Challenge.find({
      type: 'weekly',
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ priority: -1, featured: -1 })
        .lean();

    const challengeIds = challenges.map((c) => c._id);
    const userProgressList = await UserChallengeProgress.find({
      user: userId,
      challenge: { $in: challengeIds },
    }).lean();

    const progressMap = new Map(userProgressList.map((p) => [String(p.challenge), p]));

    return challenges.map((challenge) => {
      const userProgress = progressMap.get(String(challenge._id));
      const progress = userProgress?.progress ?? 0;
      const target = userProgress?.target ?? challenge.requirements.target;
      const progressPct = target > 0 ? Math.min((progress / target) * 100, 100) : 0;

      return {
        challenge,
        progress,
        target,
        progressPct: parseFloat(progressPct.toFixed(1)),
        completed: userProgress?.completed ?? false,
        rewardsClaimed: userProgress?.rewardsClaimed ?? false,
        daysLeft,
      };
    });
  }

  /**
   * Get user's past weekly challenge history.
   */
  async getPastChallenges(
    userId: string,
    limit: number = 10,
  ): Promise<
    Array<{
      challenge: IChallenge;
      progress: number;
      target: number;
      completed: boolean;
      rewardsClaimed: boolean;
      completedAt?: Date;
    }>
  > {
    const now = new Date();
    const { weekStart } = getWeekBoundaries();

    // Find completed progress records for past weekly challenges
    const pastProgress = await UserChallengeProgress.find({
      user: userId,
    })
      .populate({
        path: 'challenge',
        match: {
          type: 'weekly',
          endDate: { $lt: weekStart },
        },
      })
        .sort({ lastUpdatedAt: -1 })
          .limit(limit)
            .lean();

    return pastProgress
      .filter((p) => p.challenge != null)
        .map((p) => ({
        challenge: p.challenge as unknown as IChallenge,
        progress: p.progress,
        target: p.target,
        completed: p.completed,
        rewardsClaimed: p.rewardsClaimed,
        completedAt: p.completedAt,
      }));
  }

  /**
   * Send push notification: "Your weekly challenge is ready!"
   * Called by the weekly job after generating challenges.
   */
  async notifyActiveUsers(userIds: string[]): Promise<void> {
    const BATCH_SIZE = 100;
    let notified = 0;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (userId) => {
          try {
            await pushNotificationService.sendPushToUser(userId, {
              title: 'Weekly Challenge Ready! 🎯',
              body: 'Your new weekly savings challenges just dropped. Complete them to earn up to 200 bonus coins!',
              data: {
                type: 'weekly_challenge',
                screen: 'weekly-challenge',
              },
            });
            notified++;
          } catch {
            /* Silently skip users without push tokens */
          }
        }),
      );
    }

    logger.info(`[WeeklyChallengeService] Notified ${notified}/${userIds.length} users of new weekly challenges`);
  }
}

export default new WeeklyChallengeService();
