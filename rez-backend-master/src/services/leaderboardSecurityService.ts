import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { CoinTransaction } from '../models/CoinTransaction';
import { ILeaderboardConfig, LeaderboardPeriod } from '../models/LeaderboardConfig';
import { LeaderboardEntry } from './leaderboardService';

// ============================================================================
// Types
// ============================================================================

export interface FlaggedEntry {
  userId: string;
  rank: number;
  value: number;
  reasons: string[];
}

export interface AntifraudResult {
  flaggedEntries: FlaggedEntry[];
  totalChecked: number;
  totalFlagged: number;
  checks: {
    anomalousEarnings: number;
    duplicateDevices: number;
    maxRankJump: number;
    minDifferentDays: number;
  };
}

// ============================================================================
// Service
// ============================================================================

class LeaderboardSecurityService {
  /**
   * Run all anti-fraud checks against leaderboard entries.
   *
   * Checks performed:
   * 1. Anomalous earnings detection (> 3 standard deviations from mean)
   * 2. Duplicate device ID detection (if config.antifraud.flagDuplicateDevices)
   * 3. Max rank jump per cycle validation
   * 4. Minimum different days activity check
   */
  async runAntifraudChecks(
    entries: LeaderboardEntry[],
    config: ILeaderboardConfig
  ): Promise<AntifraudResult> {
    const flagMap = new Map<string, FlaggedEntry>();
    const checks = {
      anomalousEarnings: 0,
      duplicateDevices: 0,
      maxRankJump: 0,
      minDifferentDays: 0
    };

    const addFlag = (userId: string, rank: number, value: number, reason: string) => {
      const existing = flagMap.get(userId);
      if (existing) {
        existing.reasons.push(reason);
      } else {
        flagMap.set(userId, { userId, rank, value, reasons: [reason] });
      }
    };

    // 1. Anomalous earnings (> 3 standard deviations from mean)
    if (entries.length > 2) {
      const values = entries.map(e => e.value);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Only flag if stdDev is meaningful (not zero or very small)
      if (stdDev > 0) {
        const threshold = mean + 3 * stdDev;
        for (const entry of entries) {
          if (entry.value > threshold) {
            addFlag(
              entry.user.id,
              entry.rank,
              entry.value,
              `Anomalous earnings: ${entry.value} coins (threshold: ${Math.round(threshold)}, mean: ${Math.round(mean)}, stdDev: ${Math.round(stdDev)})`
            );
            checks.anomalousEarnings++;
          }
        }
      }
    }

    // 2. Duplicate device IDs
    if (config.antifraud?.flagDuplicateDevices) {
      try {
        const duplicates = await this.checkDuplicateDevices(entries, config);
        for (const dup of duplicates) {
          addFlag(
            dup.userId,
            dup.rank,
            dup.value,
            `Shares device ID with ${dup.sharedWith.length} other user(s)`
          );
          checks.duplicateDevices++;
        }
      } catch (error: any) {
        logger.error('[LEADERBOARD SECURITY] Duplicate device check failed:', error.message);
      }
    }

    // 3. Min different days check
    if (config.antifraud?.minDifferentDays > 0) {
      const userIds = entries.map(e => e.user.id);

      // Batch check: get distinct activity days for all users at once
      const dayChecks = await this.batchCheckMinDifferentDays(
        userIds,
        config.period,
        config.coinTransactionSources,
        config.antifraud.minDifferentDays
      );

      for (const check of dayChecks) {
        const entry = entries.find(e => e.user.id === check.userId);
        if (entry && !check.passed) {
          addFlag(
            check.userId,
            entry.rank,
            entry.value,
            `Activity on only ${check.distinctDays} different days (minimum: ${config.antifraud.minDifferentDays})`
          );
          checks.minDifferentDays++;
        }
      }
    }

    const flaggedEntries = Array.from(flagMap.values());

    return {
      flaggedEntries,
      totalChecked: entries.length,
      totalFlagged: flaggedEntries.length,
      checks
    };
  }

  /**
   * Check for duplicate device IDs among leaderboard entries.
   * Looks at CoinTransaction metadata.deviceId for the relevant period.
   */
  private async checkDuplicateDevices(
    entries: LeaderboardEntry[],
    config: ILeaderboardConfig
  ): Promise<Array<{ userId: string; rank: number; value: number; sharedWith: string[] }>> {
    const dateRange = this.getDateRange(config.period);
    const userIds = entries.map(e => new mongoose.Types.ObjectId(e.user.id));

    // Build match stage
    const matchStage: any = {
      user: { $in: userIds },
      'metadata.deviceId': { $exists: true, $ne: null }
    };

    if (config.coinTransactionSources?.length > 0) {
      matchStage.source = { $in: config.coinTransactionSources };
    }

    if (dateRange.start) {
      matchStage.createdAt = { $gte: dateRange.start };
    }

    // Find device IDs shared by multiple users
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$metadata.deviceId',
          users: { $addToSet: '$user' }
        }
      },
      {
        $match: {
          'users.1': { $exists: true } // At least 2 users
        }
      }
    ];

    const duplicateDevices = await CoinTransaction.aggregate(pipeline);

    // Build a map of userId -> deviceIds shared with others
    const results: Array<{ userId: string; rank: number; value: number; sharedWith: string[] }> = [];
    const flaggedUsers = new Set<string>();

    for (const device of duplicateDevices) {
      const userIdStrings = device.users.map((u: any) => u.toString());

      for (const uid of userIdStrings) {
        if (flaggedUsers.has(uid)) continue;

        const entry = entries.find(e => e.user.id === uid);
        if (entry) {
          const sharedWith = userIdStrings.filter((id: string) => id !== uid);
          results.push({
            userId: uid,
            rank: entry.rank,
            value: entry.value,
            sharedWith
          });
          flaggedUsers.add(uid);
        }
      }
    }

    return results;
  }

  /**
   * Check if a single user had activity on at least N different days.
   */
  async checkMinDifferentDays(
    userId: string,
    period: LeaderboardPeriod,
    sources?: string[]
  ): Promise<{ distinctDays: number }> {
    const dateRange = this.getDateRange(period);

    const matchStage: any = {
      user: new mongoose.Types.ObjectId(userId),
      type: { $in: ['earned', 'bonus', 'refunded'] }
    };

    if (sources?.length) {
      matchStage.source = { $in: sources };
    }

    if (dateRange.start) {
      matchStage.createdAt = { $gte: dateRange.start };
    }

    const result = await CoinTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          }
        }
      },
      { $count: 'distinctDays' }
    ]);

    return {
      distinctDays: result[0]?.distinctDays || 0
    };
  }

  /**
   * Batch check minimum different days for multiple users.
   */
  private async batchCheckMinDifferentDays(
    userIds: string[],
    period: LeaderboardPeriod,
    sources?: string[],
    minDays: number = 2
  ): Promise<Array<{ userId: string; distinctDays: number; passed: boolean }>> {
    const dateRange = this.getDateRange(period);
    const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));

    const matchStage: any = {
      user: { $in: objectIds },
      type: { $in: ['earned', 'bonus', 'refunded'] }
    };

    if (sources?.length) {
      matchStage.source = { $in: sources };
    }

    if (dateRange.start) {
      matchStage.createdAt = { $gte: dateRange.start };
    }

    const result = await CoinTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            user: '$user',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          }
        }
      },
      {
        $group: {
          _id: '$_id.user',
          distinctDays: { $sum: 1 }
        }
      }
    ]);

    // Build result map
    const dayMap = new Map<string, number>();
    for (const r of result) {
      dayMap.set(r._id.toString(), r.distinctDays);
    }

    return userIds.map(userId => {
      const distinctDays = dayMap.get(userId) || 0;
      return {
        userId,
        distinctDays,
        passed: distinctDays >= minDays
      };
    });
  }

  /**
   * Get date range for a period.
   */
  private getDateRange(period: LeaderboardPeriod): { start: Date | null; end: Date | null } {
    const now = new Date();

    switch (period) {
      case 'daily': {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { start, end: null };
      }
      case 'weekly': {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return { start, end: null };
      }
      case 'monthly': {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        return { start, end: null };
      }
      case 'all-time':
      default:
        return { start: null, end: null };
    }
  }
}

export default new LeaderboardSecurityService();
