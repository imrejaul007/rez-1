/**
 * ProgressNudgeJob
 *
 * Runs daily at 6 PM IST.
 * Finds users who are 1-2 actions away from any milestone (streak, loyalty tier,
 * achievement) and sends a progress nudge notification to motivate them to act.
 *
 * Persona-aware nudge variants (added):
 *   Student  — campus leaderboard position, streak flames, peer savings message,
 *               group deal alerts
 *   Employee — tier progress, monthly savings summary, premium unlock proximity,
 *               company-leaderboard top-saver message
 *   General  — existing milestone-based behaviour (unchanged)
 *
 * Examples:
 *   "1 more visit to unlock Gold tier at BrewCafe!"
 *   "2 days to beat your longest streak!"
 *   "3 more coins to reach the next milestone!"
 *
 * Frequency cap: 1 progress notification per user per day
 * (enforced by NotificationService.isCategoryCapExceeded).
 */

import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import NotificationService from '../services/notificationService';
// Dependency: personaResolverService is created by Agent 1
import personaResolverService from '../services/personaResolverService';

const logger = createServiceLogger('progress-nudge-job');

// ─── Constants ───────────────────────────────────────────────────────────────

const BATCH_SIZE = 100;
// Users within this many actions of a milestone get nudged
const NUDGE_THRESHOLD_VISITS = 2;
const NUDGE_THRESHOLD_STREAK_DAYS = 2;

// Streak milestone days (mirrors streakService STREAK_MILESTONES.savings)
const SAVINGS_STREAK_MILESTONES = [3, 7, 21, 60, 100];

// Loyalty tier visit thresholds (per REZ merchant loyalty program)
const LOYALTY_TIER_THRESHOLDS: Record<string, { visits: number; name: string }> = {
  silver: { visits: 5, name: 'Silver' },
  gold: { visits: 10, name: 'Gold' },
  platinum: { visits: 20, name: 'Platinum' },
};

// ─── Job ─────────────────────────────────────────────────────────────────────

export async function runProgressNudgeJob(): Promise<void> {
  logger.info('[ProgressNudgeJob] Starting run');
  const startTime = Date.now();

  let processedUsers = 0;
  let notificationsSent = 0;
  let skippedCapped = 0;

  try {
    const User = mongoose.model('User');
    const UserStreak = mongoose.model('UserStreak');
    const UserLoyalty = mongoose.model('UserLoyalty');

    // Find all active users (process in batches).
    // Select segment so we can resolve persona without an extra query in most cases.
    const cursor = User.find({ isActive: true })
      .select('_id segment statedIdentity')
      .lean()
      .cursor({ batchSize: BATCH_SIZE });

    for await (const user of cursor) {
      const userAny = user as any;
      const userId: string = userAny._id.toString();
      processedUsers++;

      try {
        // ── Resolve persona ──
        let personaId: 'student' | 'employee' | 'general' = 'general';
        try {
          const persona = await personaResolverService.resolvePersona(userId);
          personaId = persona.personaId;
        } catch {
          // Non-fatal; fall through to general nudge
        }

        const nudge = await findBestNudge(userId, UserStreak, UserLoyalty, personaId);
        if (!nudge) continue;

        const notification = await NotificationService.notifyProgress(userId, {
          message: nudge.message,
          storeId: nudge.storeId,
          deepLink: nudge.deepLink,
          metadata: nudge.metadata,
        });

        if (notification) {
          notificationsSent++;
        } else {
          skippedCapped++;
        }
      } catch (userErr) {
        logger.warn('[ProgressNudgeJob] Error processing user', {
          userId,
          error: (userErr as Error).message,
        });
      }
    }

    const elapsedMs = Date.now() - startTime;
    logger.info('[ProgressNudgeJob] Completed', {
      processedUsers,
      notificationsSent,
      skippedCapped,
      elapsedMs,
    });
  } catch (err) {
    logger.error('[ProgressNudgeJob] Fatal error', { error: (err as Error).message });
    throw err;
  }
}

// ─── Nudge Logic ─────────────────────────────────────────────────────────────

interface NudgePayload {
  message: string;
  storeId?: string;
  deepLink: string;
  metadata: Record<string, any>;
  priority: number; // Higher = more important nudge to show
}

/**
 * Determine the single best nudge message for a user.
 * Checks (in order of priority):
 *   1. Persona-specific nudge (student / employee)
 *   2. Streak milestone proximity
 *   3. Loyalty tier proximity at top merchant
 *
 * Returns null if user is not close to any milestone.
 */
async function findBestNudge(
  userId: string,
  UserStreak: mongoose.Model<any>,
  UserLoyalty: mongoose.Model<any>,
  personaId: 'student' | 'employee' | 'general' = 'general',
): Promise<NudgePayload | null> {
  const candidates: NudgePayload[] = [];

  // ── 0. Persona-specific nudges (highest priority when applicable) ──────────
  if (personaId === 'student') {
    // Try to find campus-leaderboard position from UserStreak or a leaderboard model
    try {
      const streak = await UserStreak.findOne({ user: userId, type: 'savings' })
        .select('currentStreak rankPosition collegeSaversCount')
        .lean();

      if (streak) {
        const current: number = (streak as any).currentStreak ?? 0;
        const rankPosition: number | undefined = (streak as any).rankPosition;
        const collegeSaversCount: number = (streak as any).collegeSaversCount ?? 0;

        if (rankPosition && rankPosition <= 10) {
          candidates.push({
            message: `You're #${rankPosition} on your campus leaderboard! Keep saving to hold your rank.`,
            deepLink: '/leaderboard/campus',
            metadata: { type: 'campus_leaderboard', rank: rankPosition, persona: 'student' },
            priority: 15,
          });
        }

        if (current > 0) {
          const flameEmoji = current >= 7 ? '🔥🔥🔥' : current >= 3 ? '🔥🔥' : '🔥';
          candidates.push({
            message: `${flameEmoji} ${current}-day streak! Keep it going — your campus is watching!`,
            deepLink: '/profile/streaks',
            metadata: { type: 'streak_flame', currentStreak: current, persona: 'student' },
            priority: 13,
          });
        }

        if (collegeSaversCount > 0) {
          candidates.push({
            message: `${collegeSaversCount} students from your college saved this week. Don't miss out!`,
            deepLink: '/offers/student',
            metadata: { type: 'peer_savings', collegeSaversCount, persona: 'student' },
            priority: 11,
          });
        }
      }
    } catch (err) {
      logger.warn('[ProgressNudgeJob] Student persona streak check failed', {
        userId,
        error: (err as Error).message,
      });
    }

    // Group deal alert nudge (generic — actual group deals resolved client-side)
    candidates.push({
      message: 'New group deals near campus — save more with friends!',
      deepLink: '/offers/group',
      metadata: { type: 'group_deal_alert', persona: 'student' },
      priority: 9,
    });
  } else if (personaId === 'employee') {
    // Employee-specific nudges: tier progress, savings summary, premium unlock
    try {
      // Find top loyalty entry to surface tier-proximity nudge
      const loyalties = await UserLoyalty.find({ userId })
        .select('merchantId merchantName currentTier visitCount monthlySavings premiumUnlockVisits')
        .sort({ visitCount: -1 })
        .limit(1)
        .lean();

      if (loyalties.length > 0) {
        const topLoyalty = loyalties[0] as any;
        const monthlySavings: number = topLoyalty.monthlySavings ?? 0;
        const premiumUnlockVisits: number = topLoyalty.premiumUnlockVisits ?? 0;
        const visitCount: number = topLoyalty.visitCount ?? 0;

        if (monthlySavings > 0) {
          candidates.push({
            message: `You've saved ₹${monthlySavings} this month at ${topLoyalty.merchantName}. Keep going!`,
            storeId: topLoyalty.merchantId?.toString(),
            deepLink: `/store/${topLoyalty.merchantId}`,
            metadata: { type: 'monthly_savings_summary', monthlySavings, persona: 'employee' },
            priority: 14,
          });
        }

        if (premiumUnlockVisits > 0 && visitCount >= premiumUnlockVisits - 2) {
          const visitsLeft = premiumUnlockVisits - visitCount;
          candidates.push({
            message:
              visitsLeft <= 0
                ? `You've unlocked premium benefits at ${topLoyalty.merchantName}!`
                : `${visitsLeft} more visit${visitsLeft === 1 ? '' : 's'} to unlock premium at ${topLoyalty.merchantName}!`,
            storeId: topLoyalty.merchantId?.toString(),
            deepLink: `/store/${topLoyalty.merchantId}`,
            metadata: { type: 'premium_unlock_proximity', visitsLeft, persona: 'employee' },
            priority: 12,
          });
        }
      }
    } catch (err) {
      logger.warn('[ProgressNudgeJob] Employee persona loyalty check failed', {
        userId,
        error: (err as Error).message,
      });
    }

    // Company leaderboard nudge (generic — actual rank resolved client-side)
    candidates.push({
      message: 'You could be the top saver in your company this month. Check your rank!',
      deepLink: '/leaderboard/company',
      metadata: { type: 'company_leaderboard', persona: 'employee' },
      priority: 10,
    });
  }
  // For 'general' persona we skip straight to milestone-based nudges below.

  // ── 1. Savings Streak proximity ───────────────────────────────────────────
  try {
    const streak = await UserStreak.findOne({ user: userId, type: 'savings' })
      .select('currentStreak longestStreak')
      .lean();

    if (streak) {
      const current: number = (streak as any).currentStreak ?? 0;
      const longest: number = (streak as any).longestStreak ?? 0;

      // Check proximity to next savings streak milestone
      for (const milestoneDay of SAVINGS_STREAK_MILESTONES) {
        const daysLeft = milestoneDay - current;
        if (daysLeft > 0 && daysLeft <= NUDGE_THRESHOLD_STREAK_DAYS) {
          candidates.push({
            message:
              daysLeft === 1
                ? `1 more day to hit a ${milestoneDay}-day savings streak!`
                : `${daysLeft} more days to hit a ${milestoneDay}-day savings streak!`,
            deepLink: '/profile/streaks',
            metadata: { type: 'streak', currentStreak: current, targetDay: milestoneDay },
            priority: 10,
          });
          break; // Only nudge for the closest upcoming milestone
        }
      }

      // Check proximity to beating personal best streak
      if (longest > 0 && current >= longest - NUDGE_THRESHOLD_STREAK_DAYS && current < longest) {
        const daysLeft = longest - current;
        candidates.push({
          message:
            daysLeft === 1
              ? `1 more day to beat your longest streak (${longest} days)!`
              : `${daysLeft} more days to beat your ${longest}-day personal best streak!`,
          deepLink: '/profile/streaks',
          metadata: { type: 'personal_best', currentStreak: current, longestStreak: longest },
          priority: 8,
        });
      }
    }
  } catch (err) {
    logger.warn('[ProgressNudgeJob] Streak check failed', { userId, error: (err as Error).message });
  }

  // ── 2. Loyalty tier proximity ─────────────────────────────────────────────
  try {
    // Find user's loyalty entries and check the ones closest to a tier threshold
    const loyalties = await UserLoyalty.find({ userId })
      .select('merchantId merchantName currentTier visitCount')
      .limit(5)
      .lean();

    for (const loyalty of loyalties) {
      const loyaltyAny = loyalty as any;
      const visitCount: number = loyaltyAny.visitCount ?? 0;
      const currentTier: string = loyaltyAny.currentTier ?? 'bronze';

      // Find the next tier
      const tiers = ['bronze', 'silver', 'gold', 'platinum'];
      const currentTierIndex = tiers.indexOf(currentTier);
      if (currentTierIndex === -1 || currentTierIndex >= tiers.length - 1) continue;

      const nextTierName = tiers[currentTierIndex + 1];
      const nextTierConfig = LOYALTY_TIER_THRESHOLDS[nextTierName];
      if (!nextTierConfig) continue;

      const visitsLeft = nextTierConfig.visits - visitCount;
      if (visitsLeft > 0 && visitsLeft <= NUDGE_THRESHOLD_VISITS) {
        candidates.push({
          message:
            visitsLeft === 1
              ? `1 more visit to unlock ${nextTierConfig.name} tier at ${loyaltyAny.merchantName}!`
              : `${visitsLeft} more visits to unlock ${nextTierConfig.name} tier at ${loyaltyAny.merchantName}!`,
          storeId: loyaltyAny.merchantId?.toString(),
          deepLink: `/store/${loyaltyAny.merchantId}`,
          metadata: {
            type: 'loyalty_tier',
            merchantName: loyaltyAny.merchantName,
            currentTier,
            nextTier: nextTierName,
            visitsLeft,
          },
          priority: 9,
        });
      }
    }
  } catch (err) {
    logger.warn('[ProgressNudgeJob] Loyalty check failed', { userId, error: (err as Error).message });
  }

  if (candidates.length === 0) return null;

  // Return the highest priority nudge
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

export default runProgressNudgeJob;
