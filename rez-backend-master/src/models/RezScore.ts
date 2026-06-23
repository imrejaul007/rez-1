/**
 * RezScore Model
 *
 * Composite savings score (0-999) derived from five pillars:
 *   - savingsRate         30% — coins earned / total spend
 *   - visitFrequency      25% — store visits last 30 days
 *   - streakConsistency   20% — from UserStreak current/longest
 *   - merchantDiversity   15% — unique merchants visited last 30 days
 *   - communityContribution 10% — reviews + referrals + shares
 *
 * Score Tiers:
 *   0-199:   Beginner
 *   200-399: Smart Saver
 *   400-599: Super Saver
 *   600-799: Elite Saver
 *   800-999: Legend
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Tier Constants ───────────────────────────────────────────────────────────

export type RezScoreTier = 'beginner' | 'smart_saver' | 'super_saver' | 'elite_saver' | 'legend';

export const REZ_SCORE_TIERS: Record<RezScoreTier, { min: number; max: number; label: string; color: string }> = {
  beginner: { min: 0, max: 199, label: 'Beginner', color: '#9CA3AF' },
  smart_saver: { min: 200, max: 399, label: 'Smart Saver', color: '#34D399' },
  super_saver: { min: 400, max: 599, label: 'Super Saver', color: '#60A5FA' },
  elite_saver: { min: 600, max: 799, label: 'Elite Saver', color: '#F59E0B' },
  legend: { min: 800, max: 999, label: 'Legend', color: '#EF4444' },
};

export function getTierFromScore(score: number): RezScoreTier {
  if (score >= 800) return 'legend';
  if (score >= 600) return 'elite_saver';
  if (score >= 400) return 'super_saver';
  if (score >= 200) return 'smart_saver';
  return 'beginner';
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IRezScoreSnapshot {
  score: number;
  tier: RezScoreTier;
  date: Date;
}

export interface IRezScore extends Document {
  userId: Types.ObjectId;
  totalScore: number; // 0-999
  tier: RezScoreTier;
  pillars: {
    savingsRate: number; // 0-300 (30% of 1000)
    visitFrequency: number; // 0-250 (25% of 1000)
    streakConsistency: number; // 0-200 (20% of 1000)
    merchantDiversity: number; // 0-150 (15% of 1000)
    communityContribution: number; // 0-100 (10% of 1000)
  };
  percentile: number; // 0-100 (rank among all active users)
  previousScore: number;
  trend: 'up' | 'down' | 'stable';
  lastCalculated: Date;
  scoreHistory: IRezScoreSnapshot[]; // last 30 nightly snapshots
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const RezScoreSchema = new Schema<IRezScore>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalScore: {
      type: Number,
      required: true,
      min: 0,
      max: 999,
      default: 0,
    },
    tier: {
      type: String,
      required: true,
      enum: ['beginner', 'smart_saver', 'super_saver', 'elite_saver', 'legend'] as RezScoreTier[],
      default: 'beginner' as RezScoreTier,
    },
    pillars: {
      savingsRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 300,
      },
      visitFrequency: {
        type: Number,
        default: 0,
        min: 0,
        max: 250,
      },
      streakConsistency: {
        type: Number,
        default: 0,
        min: 0,
        max: 200,
      },
      merchantDiversity: {
        type: Number,
        default: 0,
        min: 0,
        max: 150,
      },
      communityContribution: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    percentile: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    previousScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 999,
    },
    trend: {
      type: String,
      enum: ['up', 'down', 'stable'],
      default: 'stable',
    },
    lastCalculated: {
      type: Date,
      default: Date.now,
      index: true,
    },
    scoreHistory: {
      type: [
        {
          score: { type: Number, required: true },
          tier: { type: String, required: true },
          date: { type: Date, required: true },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

RezScoreSchema.index({ totalScore: -1 }); // For percentile ranking queries
RezScoreSchema.index({ tier: 1, totalScore: -1 });
RezScoreSchema.index({ lastCalculated: -1 });

// ─── Model ───────────────────────────────────────────────────────────────────

export const RezScore = mongoose.model<IRezScore>('RezScore', RezScoreSchema);
export default RezScore;
