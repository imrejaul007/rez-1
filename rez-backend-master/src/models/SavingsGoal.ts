/**
 * SavingsGoal Model
 * Phase 3.3 — Habit Reinforcement
 *
 * Tracks a user's self-set monthly savings target and their progress toward it.
 * One document per user per calendar month.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ISavingsGoal extends Document {
  /** Reference to the user */
  userId: mongoose.Types.ObjectId;
  /** Target savings amount in Rs */
  targetAmount: number;
  /** Current accumulated savings amount in Rs */
  currentAmount: number;
  /**
   * Calendar month in YYYY-MM format (e.g. "2026-03").
   * Used to enforce one goal per user per month.
   */
  month: string;
  /** Whether the user has hit or exceeded their target */
  isAchieved: boolean;
  /** Timestamp when the goal was first marked as achieved */
  achievedDate?: Date;
  /** When the user last updated their target */
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsGoalSchema = new Schema<ISavingsGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: [1, 'Target amount must be at least Rs.1'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    month: {
      type: String,
      required: true,
      // Enforce YYYY-MM format
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format'],
      index: true,
    },
    isAchieved: {
      type: Boolean,
      default: false,
      index: true,
    },
    achievedDate: {
      type: Date,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// One goal per user per month
SavingsGoalSchema.index({ userId: 1, month: 1 }, { unique: true });

// Efficient lookup: all active goals for a user
SavingsGoalSchema.index({ userId: 1, isAchieved: 1 });

/**
 * Virtual: progress percentage (0-100)
 */
SavingsGoalSchema.virtual('progressPct').get(function (this: ISavingsGoal) {
  if (this.targetAmount <= 0) return 0;
  return Math.min(100, parseFloat(((this.currentAmount / this.targetAmount) * 100).toFixed(1)));
});

/**
 * Virtual: amount remaining to reach the goal
 */
SavingsGoalSchema.virtual('remaining').get(function (this: ISavingsGoal) {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

/**
 * Helper: generate the current month key (YYYY-MM)
 */
export function currentMonthKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Helper: generate a month key N months ago
 */
export function monthKeyOffset(offsetMonths: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offsetMonths);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default mongoose.model<ISavingsGoal>('SavingsGoal', SavingsGoalSchema);
