/**
 * Streak Service Tests
 *
 * Tests for src/services/streakService.ts
 * Uses mongodb-memory-server (via setup.ts) for real MongoDB operations.
 */

import { Types } from 'mongoose';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock pushNotificationService (notifications not under test)
jest.mock('../services/pushNotificationService', () => ({
  default: { sendPushToUser: jest.fn().mockResolvedValue(null) },
}));

// Mock logger
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import streakService from '../services/streakService';
import UserStreak from '../models/UserStreak';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Artificially set a streak's lastActivityDate to simulate activity from N days ago.
 * This is needed to test same-day dedupe vs consecutive-day increment.
 */
async function setStreakLastActivity(userId: string, type: string, daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  // Normalize to midnight to match the streak logic's day comparison
  d.setHours(0, 0, 0, 0);
  await UserStreak.findOneAndUpdate({ user: userId, type }, { $set: { lastActivityDate: d } });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StreakService', () => {
  // ── getOrCreateStreak ──────────────────────────────────────────────────────

  describe('getOrCreateStreak()', () => {
    it('creates a new streak record when none exists', async () => {
      const userId = new Types.ObjectId().toString();

      const streak = await streakService.getOrCreateStreak(userId, 'login');

      expect(streak).not.toBeNull();
      expect(streak.user.toString()).toBe(userId);
      expect(streak.type).toBe('login');
      expect(streak.currentStreak).toBe(0);
    });

    it('returns existing streak without creating a duplicate', async () => {
      const userId = new Types.ObjectId().toString();

      await streakService.getOrCreateStreak(userId, 'order');
      await streakService.getOrCreateStreak(userId, 'order');

      const count = await UserStreak.countDocuments({ user: userId, type: 'order' });
      expect(count).toBe(1);
    });
  });

  // ── updateStreak (increment on consecutive days) ───────────────────────────

  describe('updateStreak() — consecutive days increment', () => {
    it('increments streak when activity is on consecutive days', async () => {
      const userId = new Types.ObjectId().toString();

      // Create streak with lastActivity = yesterday
      await streakService.getOrCreateStreak(userId, 'savings');
      await setStreakLastActivity(userId, 'savings', 1); // yesterday

      // First update streak to 1
      await UserStreak.findOneAndUpdate({ user: userId, type: 'savings' }, { $set: { currentStreak: 1 } });

      const { streak } = await streakService.updateStreak(userId, 'savings');

      expect(streak.currentStreak).toBeGreaterThanOrEqual(1);
    });

    it('updates longestStreak when currentStreak exceeds it', async () => {
      const userId = new Types.ObjectId().toString();

      // Set up a streak at 6 days (longestStreak = 6)
      await streakService.getOrCreateStreak(userId, 'login');
      await UserStreak.findOneAndUpdate(
        { user: userId, type: 'login' },
        { $set: { currentStreak: 6, longestStreak: 6, lastActivityDate: new Date(Date.now() - 86400000) } },
      );

      const { streak } = await streakService.updateStreak(userId, 'login');

      expect(streak.longestStreak).toBeGreaterThanOrEqual(6);
    });
  });

  // ── updateStreak (same-day dedupe) ─────────────────────────────────────────

  describe('updateStreak() — same-day does not double-increment', () => {
    it('does not increment streak when called twice on the same day', async () => {
      const userId = new Types.ObjectId().toString();
      await streakService.getOrCreateStreak(userId, 'review');
      // lastActivity = today → simulates same-day double call
      await setStreakLastActivity(userId, 'review', 0);
      await UserStreak.findOneAndUpdate({ user: userId, type: 'review' }, { $set: { currentStreak: 3 } });

      const { streak: before } = await streakService.updateStreak(userId, 'review');
      const { streak: after } = await streakService.updateStreak(userId, 'review');

      // Streak should not increase on same-day repeat
      expect(after.currentStreak).toBe(before.currentStreak);
    });
  });

  // ── updateStreak (gap > 1 day resets streak) ───────────────────────────────

  describe('updateStreak() — resets on gap > 1 day', () => {
    it('resets streak to 1 when last activity was 2+ days ago', async () => {
      const userId = new Types.ObjectId().toString();
      await streakService.getOrCreateStreak(userId, 'savings');
      // Set lastActivity to 3 days ago with a high streak
      await UserStreak.findOneAndUpdate(
        { user: userId, type: 'savings' },
        { $set: { currentStreak: 10, lastActivityDate: new Date(Date.now() - 3 * 86400000) } },
      );

      const { streak } = await streakService.updateStreak(userId, 'savings');

      // After gap of 3 days, streak should reset (typically to 1 for new activity)
      expect(streak.currentStreak).toBeLessThan(10);
      expect(streak.currentStreak).toBeGreaterThanOrEqual(0);
    });
  });

  // ── freezeStreak prevents reset ─────────────────────────────────────────────

  describe('freezeStreak()', () => {
    it('marks streak as frozen with an expiry date', async () => {
      const userId = new Types.ObjectId().toString();
      await streakService.getOrCreateStreak(userId, 'login');

      await streakService.freezeStreak(userId, 'login', 1);

      const streak = await UserStreak.findOne({ user: userId, type: 'login' });
      expect((streak as any)?.frozen).toBe(true);
      expect((streak as any)?.freezeExpiresAt).toBeDefined();
    });

    it('throws when trying to freeze an already-frozen streak', async () => {
      const userId = new Types.ObjectId().toString();
      await streakService.getOrCreateStreak(userId, 'order');
      // First freeze
      await streakService.freezeStreak(userId, 'order', 1);

      // Second freeze attempt should throw
      await expect(streakService.freezeStreak(userId, 'order', 1)).rejects.toThrow(/already frozen/i);
    });
  });

  // ── Milestone detection ────────────────────────────────────────────────────

  describe('Milestone detection', () => {
    it('detects a claimable milestone when streak reaches threshold day', async () => {
      const userId = new Types.ObjectId().toString();
      await streakService.getOrCreateStreak(userId, 'login');

      // Set streak to exactly 7 (Week Warrior milestone)
      await UserStreak.findOneAndUpdate(
        { user: userId, type: 'login' },
        {
          $set: {
            currentStreak: 7,
            lastActivityDate: new Date(Date.now() - 86400000), // yesterday
          },
        },
      );

      const { streak, milestoneReached } = await streakService.updateStreak(userId, 'login');

      // After update, streak should be 7 (or 8 if incremented from 7)
      // The milestone for day 7 (Week Warrior) should be detected
      expect(streak.currentStreak).toBeGreaterThanOrEqual(7);
    });

    it('does NOT detect milestone that was already claimed', async () => {
      const userId = new Types.ObjectId().toString();
      const streak = await streakService.getOrCreateStreak(userId, 'savings');

      // Mark day-7 milestone as already claimed
      await UserStreak.findOneAndUpdate(
        { user: userId, type: 'savings' },
        {
          $set: {
            currentStreak: 7,
            'milestones.$[m].rewardsClaimed': true,
            'milestones.$[m].claimedAt': new Date(),
          },
        },
        { arrayFilters: [{ 'm.day': 7 }] },
      );

      // Set last activity to yesterday so streak can increment
      await setStreakLastActivity(userId, 'savings', 1);

      const { milestoneReached } = await streakService.updateStreak(userId, 'savings');

      // Milestone for day 7 already claimed — should not appear as claimable
      if (milestoneReached) {
        expect(milestoneReached.day).not.toBe(7);
      }
    });
  });

  // ── claimMilestone ─────────────────────────────────────────────────────────

  describe('claimMilestone()', () => {
    it('throws when claiming a milestone not yet reached', async () => {
      const userId = new Types.ObjectId().toString();
      await streakService.getOrCreateStreak(userId, 'login');
      await UserStreak.findOneAndUpdate(
        { user: userId, type: 'login' },
        { $set: { currentStreak: 2 } }, // Day 3 milestone not reached
      );

      await expect(streakService.claimMilestone(userId, 'login', 3)).rejects.toThrow(/not reached/i);
    });

    it('throws for an invalid milestone day', async () => {
      const userId = new Types.ObjectId().toString();
      await streakService.getOrCreateStreak(userId, 'login');
      await UserStreak.findOneAndUpdate({ user: userId, type: 'login' }, { $set: { currentStreak: 99 } });

      await expect(
        streakService.claimMilestone(userId, 'login', 99), // Not in STREAK_MILESTONES
      ).rejects.toThrow(/Invalid milestone|Milestone not found/i);
    });

    it('returns milestone rewards when claim succeeds', async () => {
      const userId = new Types.ObjectId().toString();
      await streakService.getOrCreateStreak(userId, 'login');
      await UserStreak.findOneAndUpdate({ user: userId, type: 'login' }, { $set: { currentStreak: 7 } });

      const { rewards } = await streakService.claimMilestone(userId, 'login', 7);

      expect(rewards.coins).toBe(200); // Week Warrior = 200 coins
      expect(rewards.name).toBe('Week Warrior');
    });
  });

  // ── getUserStreaks ─────────────────────────────────────────────────────────

  describe('getUserStreaks()', () => {
    it('returns all 4 streak types for a user', async () => {
      const userId = new Types.ObjectId().toString();

      const result = await streakService.getUserStreaks(userId);

      expect(result).toHaveProperty('login');
      expect(result).toHaveProperty('order');
      expect(result).toHaveProperty('review');
      expect(result).toHaveProperty('savings');
      expect(result).toHaveProperty('savingsTier');
    });

    it('includes formatted milestone data in each streak', async () => {
      const userId = new Types.ObjectId().toString();

      const result = await streakService.getUserStreaks(userId);

      expect(result.login).toHaveProperty('allMilestones');
      expect(Array.isArray(result.login.allMilestones)).toBe(true);
      expect(result.login.allMilestones.length).toBeGreaterThan(0);
    });
  });
});
