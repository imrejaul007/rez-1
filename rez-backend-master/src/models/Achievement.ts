import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================================================
// Achievement Types (kept for backward compat — new achievements use dynamic strings)
// ============================================================================
export enum AchievementType {
  // Order-based achievements
  FIRST_ORDER = 'FIRST_ORDER',
  ORDERS_10 = 'ORDERS_10',
  ORDERS_50 = 'ORDERS_50',
  ORDERS_100 = 'ORDERS_100',
  FREQUENT_BUYER = 'FREQUENT_BUYER',

  // Spending-based achievements
  SPENT_1000 = 'SPENT_1000',
  SPENT_5000 = 'SPENT_5000',
  SPENT_10000 = 'SPENT_10000',
  BIG_SPENDER = 'BIG_SPENDER',

  // Review-based achievements
  FIRST_REVIEW = 'FIRST_REVIEW',
  REVIEWS_10 = 'REVIEWS_10',
  REVIEWS_25 = 'REVIEWS_25',
  REVIEW_MASTER = 'REVIEW_MASTER',

  // Video-based achievements
  FIRST_VIDEO = 'FIRST_VIDEO',
  VIDEOS_10 = 'VIDEOS_10',
  VIEWS_1000 = 'VIEWS_1000',
  VIEWS_10000 = 'VIEWS_10000',
  INFLUENCER = 'INFLUENCER',

  // Project-based achievements
  FIRST_PROJECT = 'FIRST_PROJECT',
  PROJECTS_10 = 'PROJECTS_10',
  PROJECT_APPROVED = 'PROJECT_APPROVED',
  TOP_EARNER = 'TOP_EARNER',

  // Voucher/Offer achievements
  VOUCHER_REDEEMED = 'VOUCHER_REDEEMED',
  OFFERS_10 = 'OFFERS_10',
  CASHBACK_EARNED = 'CASHBACK_EARNED',

  // Referral achievements
  FIRST_REFERRAL = 'FIRST_REFERRAL',
  REFERRALS_5 = 'REFERRALS_5',
  REFERRALS_10 = 'REFERRALS_10',
  REFERRAL_MASTER = 'REFERRAL_MASTER',

  // Time-based achievements
  EARLY_BIRD = 'EARLY_BIRD',
  ONE_YEAR = 'ONE_YEAR',

  // Activity-based achievements
  ACTIVITY_100 = 'ACTIVITY_100',
  ACTIVITY_500 = 'ACTIVITY_500',
  SUPER_USER = 'SUPER_USER'
}

export enum AchievementCategory {
  ORDERS = 'ORDERS',
  SPENDING = 'SPENDING',
  REVIEWS = 'REVIEWS',
  VIDEOS = 'VIDEOS',
  PROJECTS = 'PROJECTS',
  VOUCHERS = 'VOUCHERS',
  REFERRALS = 'REFERRALS',
  LOYALTY = 'LOYALTY',
  ACTIVITY = 'ACTIVITY'
}

// ============================================================================
// Condition Types for Rule-Based Achievement System
// ============================================================================
export type ConditionType = 'simple' | 'compound' | 'streak' | 'time_bounded';
export type ConditionOperator = 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
export type ConditionCombinator = 'AND' | 'OR';
export type VisibilityType = 'visible' | 'hidden_until_progress' | 'secret';
export type RepeatabilityType = 'one_time' | 'daily' | 'weekly' | 'monthly';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface IConditionRule {
  metric: string;        // e.g., 'totalOrders', 'totalSpent'
  operator: ConditionOperator;
  target: number;
  weight: number;        // For weighted progress in compound conditions
}

export interface IAchievementConditions {
  type: ConditionType;
  rules: IConditionRule[];
  combinator: ConditionCombinator;
  // Streak-specific
  streakMetric?: string;
  streakTarget?: number;
  // Time-bounded
  timeWindowDays?: number;
  startsAt?: Date;
  endsAt?: Date;
}

export interface IAchievementReward {
  coins: number;
  cashback: number;
  badge?: string;
  title?: string;        // Display title reward (e.g., "Expert Reviewer")
  multiplier?: number;   // Coin multiplier bonus (e.g., 1.1 = 10% extra)
}

// ============================================================================
// Achievement Definition Interface (Master list — for migration compat)
// ============================================================================
export interface IAchievementDefinition {
  type: AchievementType;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  color: string;
  requirement: {
    metric: string;
    target: number;
  };
  reward?: {
    coins?: number;
    cashback?: number;
    badge?: string;
  };
  order: number;
  isActive: boolean;
}

// ============================================================================
// Achievement Document Interface (Admin-managed DB collection)
// ============================================================================
export interface IAchievementDoc extends Document {
  type: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  // Legacy fields (kept for backward compat)
  target: number;
  coinReward: number;
  badge?: string;
  // New: Condition system
  conditions: IAchievementConditions;
  // New: Visibility
  visibility: VisibilityType;
  visibilityThreshold: number;
  // New: Repeatability
  repeatability: RepeatabilityType;
  // New: Dependencies
  prerequisites: Types.ObjectId[];
  // New: Tier
  tier: AchievementTier;
  // New: Structured reward
  reward: IAchievementReward;
  // New: Tracked metrics for event routing
  trackedMetrics: string[];
  // Status
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Achievement Schema (Admin-manageable master definitions)
// ============================================================================
const ConditionRuleSchema = new Schema({
  metric: { type: String, required: true },
  operator: { type: String, enum: ['gte', 'lte', 'eq', 'gt', 'lt'], default: 'gte' },
  target: { type: Number, required: true, min: 0 },
  weight: { type: Number, default: 1, min: 0 }
}, { _id: false });

const AchievementConditionsSchema = new Schema({
  type: { type: String, enum: ['simple', 'compound', 'streak', 'time_bounded'], default: 'simple' },
  rules: { type: [ConditionRuleSchema], default: [] },
  combinator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
  streakMetric: { type: String },
  streakTarget: { type: Number },
  timeWindowDays: { type: Number },
  startsAt: { type: Date },
  endsAt: { type: Date }
}, { _id: false });

const AchievementRewardSchema = new Schema({
  coins: { type: Number, default: 0, min: 0 },
  cashback: { type: Number, default: 0, min: 0 },
  badge: { type: String, trim: true },
  title: { type: String, trim: true },
  multiplier: { type: Number }
}, { _id: false });

const AchievementSchema = new Schema<IAchievementDoc>({
  type: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#10B981'
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  // Legacy fields (kept for backward compat with existing admin UI)
  target: {
    type: Number,
    required: true,
    min: 1
  },
  coinReward: {
    type: Number,
    required: true,
    min: 0
  },
  badge: {
    type: String,
    trim: true
  },
  // New: Condition system
  conditions: {
    type: AchievementConditionsSchema,
    default: () => ({ type: 'simple', rules: [], combinator: 'AND' })
  },
  // New: Visibility
  visibility: {
    type: String,
    enum: ['visible', 'hidden_until_progress', 'secret'],
    default: 'visible'
  },
  visibilityThreshold: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // New: Repeatability
  repeatability: {
    type: String,
    enum: ['one_time', 'daily', 'weekly', 'monthly'],
    default: 'one_time'
  },
  // New: Dependencies
  prerequisites: [{
    type: Schema.Types.ObjectId,
    ref: 'Achievement'
  }],
  // New: Tier
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  // New: Structured reward (mirrors coinReward + badge for richer config)
  reward: {
    type: AchievementRewardSchema,
    default: () => ({ coins: 0, cashback: 0 })
  },
  // New: Tracked metrics for event routing
  trackedMetrics: {
    type: [String],
    default: [],
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
AchievementSchema.index({ category: 1, sortOrder: 1 });
AchievementSchema.index({ isActive: 1, sortOrder: 1 });
AchievementSchema.index({ trackedMetrics: 1, isActive: 1 });
AchievementSchema.index({ prerequisites: 1 });

// Pre-save: sync legacy fields with new structured fields
AchievementSchema.pre('save', function() {
  // If conditions.rules exist, derive trackedMetrics
  if (this.conditions?.rules?.length > 0) {
    this.trackedMetrics = [...new Set(this.conditions.rules.map(r => r.metric))];
  }
  // Sync reward.coins ↔ coinReward for backward compat
  if (this.reward?.coins && this.reward.coins > 0 && this.coinReward === 0) {
    this.coinReward = this.reward.coins;
  } else if (this.coinReward > 0 && (!this.reward?.coins || this.reward.coins === 0)) {
    if (!this.reward) this.reward = { coins: 0, cashback: 0 } as unknown as IAchievementReward;
    this.reward.coins = this.coinReward;
  }
  // If conditions.rules is empty but target exists, create a simple rule from legacy fields
  if ((!this.conditions?.rules || this.conditions.rules.length === 0) && this.target > 0) {
    // We can't auto-derive the metric from legacy data here, but the migration script handles it
  }
});

// Achievement master model (admin-manageable)
const Achievement = mongoose.model<IAchievementDoc>('Achievement', AchievementSchema);
export default Achievement;

// ============================================================================
// User Achievement Interface (Per-user progress tracking)
// ============================================================================
export interface IRuleProgress {
  metric: string;
  currentValue: number;
  targetValue: number;
  met: boolean;
}

export interface IUserAchievement extends Document {
  user: Types.ObjectId;
  achievement?: Types.ObjectId;  // Reference to Achievement definition
  type: string;                  // Achievement type string (backward compat)
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  progress: number;              // 0-100 percentage
  unlockedDate?: Date;
  currentValue?: number;
  targetValue?: number;
  // New: Per-rule progress for compound conditions
  ruleProgress: IRuleProgress[];
  // New: Repeat tracking
  timesCompleted: number;
  lastCompletedAt?: Date;
  currentPeriodStart?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User Achievement Schema
const RuleProgressSchema = new Schema({
  metric: { type: String, required: true },
  currentValue: { type: Number, default: 0 },
  targetValue: { type: Number, required: true },
  met: { type: Boolean, default: false }
}, { _id: false });

const UserAchievementSchema = new Schema<IUserAchievement>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  achievement: {
    type: Schema.Types.ObjectId,
    ref: 'Achievement',
    index: true
  },
  type: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#10B981'
  },
  unlocked: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  unlockedDate: {
    type: Date
  },
  currentValue: {
    type: Number,
    default: 0
  },
  targetValue: {
    type: Number,
    required: true
  },
  // New: Per-rule progress for compound conditions
  ruleProgress: {
    type: [RuleProgressSchema],
    default: []
  },
  // New: Repeat tracking
  timesCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  lastCompletedAt: {
    type: Date
  },
  currentPeriodStart: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
UserAchievementSchema.index({ user: 1, type: 1 }, { unique: true });
UserAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true, sparse: true });
UserAchievementSchema.index({ user: 1, unlocked: 1 });
UserAchievementSchema.index({ user: 1, progress: -1 });

export const UserAchievement = mongoose.model<IUserAchievement>('UserAchievement', UserAchievementSchema);

// ============================================================================
// ACHIEVEMENT_DEFINITIONS (Legacy — used for seeding/migration)
// New achievements should be created via admin UI, not hardcoded here.
// ============================================================================
export const ACHIEVEMENT_DEFINITIONS: IAchievementDefinition[] = [
  // Order Achievements
  {
    type: AchievementType.FIRST_ORDER,
    category: AchievementCategory.ORDERS,
    title: 'First Order',
    description: 'Completed your first order',
    icon: 'cart',
    color: '#10B981',
    requirement: { metric: 'totalOrders', target: 1 },
    reward: { coins: 50 },
    order: 1,
    isActive: true
  },
  {
    type: AchievementType.ORDERS_10,
    category: AchievementCategory.ORDERS,
    title: '10 Orders',
    description: 'Completed 10 orders',
    icon: 'cart',
    color: '#10B981',
    requirement: { metric: 'totalOrders', target: 10 },
    reward: { coins: 100 },
    order: 2,
    isActive: true
  },
  {
    type: AchievementType.ORDERS_50,
    category: AchievementCategory.ORDERS,
    title: '50 Orders',
    description: 'Completed 50 orders',
    icon: 'cart',
    color: '#F59E0B',
    requirement: { metric: 'totalOrders', target: 50 },
    reward: { coins: 500 },
    order: 3,
    isActive: true
  },
  {
    type: AchievementType.FREQUENT_BUYER,
    category: AchievementCategory.ORDERS,
    title: 'Frequent Buyer',
    description: 'Completed 100+ orders',
    icon: 'medal',
    color: '#F59E0B',
    requirement: { metric: 'totalOrders', target: 100 },
    reward: { coins: 1000 },
    order: 4,
    isActive: true
  },

  // Spending Achievements
  {
    type: AchievementType.SPENT_1000,
    category: AchievementCategory.SPENDING,
    title: 'First ₹1000',
    description: 'Spent ₹1000 on the platform',
    icon: 'cash',
    color: '#10B981',
    requirement: { metric: 'totalSpent', target: 1000 },
    reward: { cashback: 50 },
    order: 5,
    isActive: true
  },
  {
    type: AchievementType.SPENT_5000,
    category: AchievementCategory.SPENDING,
    title: '₹5000 Milestone',
    description: 'Spent ₹5000 on the platform',
    icon: 'wallet',
    color: '#F59E0B',
    requirement: { metric: 'totalSpent', target: 5000 },
    reward: { cashback: 200 },
    order: 6,
    isActive: true
  },
  {
    type: AchievementType.BIG_SPENDER,
    category: AchievementCategory.SPENDING,
    title: 'Big Spender',
    description: 'Spent ₹10000+ on the platform',
    icon: 'diamond',
    color: '#8B5CF6',
    requirement: { metric: 'totalSpent', target: 10000 },
    reward: { cashback: 500 },
    order: 7,
    isActive: true
  },

  // Review Achievements
  {
    type: AchievementType.FIRST_REVIEW,
    category: AchievementCategory.REVIEWS,
    title: 'First Review',
    description: 'Submitted your first review',
    icon: 'star',
    color: '#10B981',
    requirement: { metric: 'totalReviews', target: 1 },
    reward: { coins: 25 },
    order: 8,
    isActive: true
  },
  {
    type: AchievementType.REVIEWS_25,
    category: AchievementCategory.REVIEWS,
    title: 'Review Master',
    description: 'Written 25+ reviews',
    icon: 'star',
    color: '#EC4899',
    requirement: { metric: 'totalReviews', target: 25 },
    reward: { coins: 250 },
    order: 9,
    isActive: true
  },

  // Video Achievements
  {
    type: AchievementType.FIRST_VIDEO,
    category: AchievementCategory.VIDEOS,
    title: 'First Video',
    description: 'Created your first video',
    icon: 'videocam',
    color: '#10B981',
    requirement: { metric: 'totalVideos', target: 1 },
    reward: { coins: 100 },
    order: 10,
    isActive: true
  },
  {
    type: AchievementType.VIEWS_10000,
    category: AchievementCategory.VIDEOS,
    title: 'Influencer',
    description: '10K+ video views',
    icon: 'eye',
    color: '#8B5CF6',
    requirement: { metric: 'totalVideoViews', target: 10000 },
    reward: { coins: 1000 },
    order: 11,
    isActive: true
  },

  // Project Achievements
  {
    type: AchievementType.FIRST_PROJECT,
    category: AchievementCategory.PROJECTS,
    title: 'First Project',
    description: 'Completed your first project',
    icon: 'briefcase',
    color: '#10B981',
    requirement: { metric: 'totalProjects', target: 1 },
    reward: { coins: 50 },
    order: 12,
    isActive: true
  },
  {
    type: AchievementType.TOP_EARNER,
    category: AchievementCategory.PROJECTS,
    title: 'Top Earner',
    description: 'Earned ₹5000+ from projects',
    icon: 'trophy',
    color: '#F59E0B',
    requirement: { metric: 'projectEarnings', target: 5000 },
    reward: { coins: 500 },
    order: 13,
    isActive: true
  },

  // Referral Achievements
  {
    type: AchievementType.FIRST_REFERRAL,
    category: AchievementCategory.REFERRALS,
    title: 'First Referral',
    description: 'Referred your first friend',
    icon: 'people',
    color: '#10B981',
    requirement: { metric: 'totalReferrals', target: 1 },
    reward: { coins: 100 },
    order: 14,
    isActive: true
  },
  {
    type: AchievementType.REFERRALS_10,
    category: AchievementCategory.REFERRALS,
    title: 'Referral Master',
    description: 'Referred 10+ friends',
    icon: 'share-social',
    color: '#EC4899',
    requirement: { metric: 'totalReferrals', target: 10 },
    reward: { coins: 1000 },
    order: 15,
    isActive: true
  },

  // Time-based Achievements
  {
    type: AchievementType.EARLY_BIRD,
    category: AchievementCategory.LOYALTY,
    title: 'Early Bird',
    description: 'Joined in the first month',
    icon: 'time',
    color: '#10B981',
    requirement: { metric: 'daysActive', target: 30 },
    reward: { coins: 200 },
    order: 16,
    isActive: true
  },

  // Activity Achievements
  {
    type: AchievementType.ACTIVITY_100,
    category: AchievementCategory.ACTIVITY,
    title: 'Active User',
    description: '100+ total activities',
    icon: 'flash',
    color: '#F59E0B',
    requirement: { metric: 'totalActivity', target: 100 },
    reward: { coins: 500 },
    order: 17,
    isActive: true
  },
  {
    type: AchievementType.SUPER_USER,
    category: AchievementCategory.ACTIVITY,
    title: 'Super User',
    description: '500+ total activities',
    icon: 'rocket',
    color: '#8B5CF6',
    requirement: { metric: 'totalActivity', target: 500 },
    reward: { coins: 2000 },
    order: 18,
    isActive: true
  }
];
