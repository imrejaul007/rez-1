import { logger } from '../config/logger';
import QuickAction, { IQuickAction } from '../models/QuickAction';
import { UserAchievement } from '../models/Achievement';
import mongoose from 'mongoose';
import type { Lean } from '../types/lean';

interface QuickActionWithProgress {
  action: any;
  hasIncompleteAchievements: boolean;
  achievementProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

class QuickActionService {
  /**
   * Get all active quick actions, sorted by priority ASC
   */
  async getAll(): Promise<Lean<IQuickAction>[]> {
    return QuickAction.find({ isActive: true })
      .sort({ priority: 1 })
      .lean();
  }

  /**
   * Get personalized quick actions for a user.
   * Cross-references with UserAchievement records to find actions
   * with incomplete achievements. Falls back to all actions if none qualify.
   */
  async getPersonalized(userId: string): Promise<QuickActionWithProgress[]> {
    try {
      // Fetch all active quick actions
      const actions = await QuickAction.find({ isActive: true }).sort({ priority: 1 })
        .lean();

      if (!actions.length) {
        return [];
      }

      // Fetch the user's achievement records
      const userAchievements = await UserAchievement.find({
        user: new mongoose.Types.ObjectId(userId),
      }).lean();

      // Build a map of achievement type -> user achievement record
      const achievementMap = new Map<string, typeof userAchievements[0]>();
      for (const ua of userAchievements) {
        achievementMap.set(ua.type, ua);
      }

      // For each action, determine progress on its targetAchievementTypes
      const actionsWithProgress: QuickActionWithProgress[] = actions.map((action) => {
        const targetTypes = action.targetAchievementTypes || [];

        if (targetTypes.length === 0) {
          // No achievement linkage — always show
          return {
            action,
            hasIncompleteAchievements: true,
            achievementProgress: { total: 0, completed: 0, percentage: 100 },
          };
        }

        let completed = 0;
        for (const type of targetTypes) {
          const ua = achievementMap.get(type);
          if (ua?.unlocked) {
            completed++;
          }
        }

        const total = targetTypes.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const hasIncomplete = completed < total;

        return {
          action,
          hasIncompleteAchievements: hasIncomplete,
          achievementProgress: { total, completed, percentage },
        };
      });

      // Filter to actions that have at least one incomplete achievement
      const filtered = actionsWithProgress.filter((a) => a.hasIncompleteAchievements);

      // If all are filtered out, return all actions as fallback
      if (filtered.length === 0) {
        return actionsWithProgress;
      }

      return filtered;
    } catch (error) {
      logger.error('[QuickActionService] getPersonalized error:', error);
      // Fallback: return all active actions without progress info
      const actions = await QuickAction.find({ isActive: true }).sort({ priority: 1 })
        .lean();
      return actions.map((action) => ({
        action,
        hasIncompleteAchievements: false,
        achievementProgress: { total: 0, completed: 0, percentage: 0 },
      }));
    }
  }

  /**
   * Get a single quick action by ID
   */
  async getById(id: string): Promise<Lean<IQuickAction> | null> {
    return QuickAction.findById(id).lean();
  }

  /**
   * Create a new quick action
   */
  async create(data: Partial<IQuickAction>, createdBy: string): Promise<IQuickAction> {
    const quickAction = new QuickAction({
      ...data,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });
    return quickAction.save();
  }

  /**
   * Update a quick action
   */
  async update(id: string, data: Partial<IQuickAction>): Promise<IQuickAction | null> {
    return QuickAction.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );
  }

  /**
   * Delete a quick action
   */
  async remove(id: string): Promise<IQuickAction | null> {
    return QuickAction.findByIdAndDelete(id);
  }

  /**
   * Toggle isActive for a quick action
   */
  async toggleActive(id: string): Promise<IQuickAction | null> {
    const quickAction = await QuickAction.findById(id);
    if (!quickAction) return null;

    quickAction.isActive = !quickAction.isActive;
    return quickAction.save();
  }

  /**
   * Batch reorder quick actions by setting priority based on array order.
   * orderedIds[0] gets priority 0, orderedIds[1] gets priority 1, etc.
   */
  async reorder(orderedIds: string[]): Promise<void> {
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { priority: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await QuickAction.bulkWrite(bulkOps);
    }
  }
}

export default new QuickActionService();
