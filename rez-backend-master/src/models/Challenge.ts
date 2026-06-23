import mongoose, { Schema, Document } from 'mongoose';

export type ChallengeStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'expired' | 'disabled';
export type ChallengeVisibility = 'play_and_earn' | 'missions' | 'both';

export interface IChallenge extends Document {
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  title: string;
  description: string;
  icon: string;
  requirements: {
    action: 'visit_stores' | 'upload_bills' | 'refer_friends' | 'spend_amount' | 'order_count' | 'review_count' | 'login_streak' | 'share_deals' | 'explore_categories' | 'add_favorites';
    target: number;
    stores?: mongoose.Types.ObjectId[];
    categories?: string[];
    minAmount?: number;
  };
  rewards: {
    coins: number;
    badges?: string[];
    exclusiveDeals?: mongoose.Types.ObjectId[];
    multiplier?: number; // Cashback multiplier bonus
  };
  difficulty: 'easy' | 'medium' | 'hard';
  startDate: Date;
  endDate: Date;
  participantCount: number;
  completionCount: number;
  active: boolean;
  featured: boolean;
  maxParticipants?: number;

  // Lifecycle fields
  status: ChallengeStatus;
  visibility: ChallengeVisibility;
  priority: number;
  scheduledPublishAt?: Date;
  pausedAt?: Date;
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    changedBy?: mongoose.Types.ObjectId;
    reason?: string;
  }>;

  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isActive(): boolean;
  canJoin(): boolean;
}

const ChallengeSchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'special'],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    },
    requirements: {
      action: {
        type: String,
        enum: [
          'visit_stores',
          'upload_bills',
          'refer_friends',
          'spend_amount',
          'order_count',
          'review_count',
          'login_streak',
          'share_deals',
          'explore_categories',
          'add_favorites'
        ],
        required: true
      },
      target: {
        type: Number,
        required: true,
        min: 1
      },
      stores: [{
        type: Schema.Types.ObjectId,
        ref: 'Store'
      }],
      categories: [String],
      minAmount: Number
    },
    rewards: {
      coins: {
        type: Number,
        required: true,
        min: 0
      },
      badges: [String],
      exclusiveDeals: [{
        type: Schema.Types.ObjectId,
        ref: 'Deal'
      }],
      multiplier: {
        type: Number,
        min: 1.1,
        max: 5
      }
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
      index: true
    },
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    },
    participantCount: {
      type: Number,
      default: 0,
      min: 0
    },
    completionCount: {
      type: Number,
      default: 0,
      min: 0
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    featured: {
      type: Boolean,
      default: false,
      index: true
    },
    maxParticipants: Number,

    // Lifecycle fields
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'expired', 'disabled'],
      default: 'active',
      index: true
    },
    visibility: {
      type: String,
      enum: ['play_and_earn', 'missions', 'both'],
      default: 'both'
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    scheduledPublishAt: Date,
    pausedAt: Date,
    statusHistory: [{
      status: String,
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String
    }]
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
ChallengeSchema.index({ type: 1, active: 1, startDate: 1, endDate: 1 });
ChallengeSchema.index({ active: 1, featured: 1, endDate: -1 });
// For bonus-opportunities query filtering by active + endDate range
ChallengeSchema.index({ active: 1, endDate: 1 });
// Lifecycle indexes
ChallengeSchema.index({ status: 1, visibility: 1, priority: -1 });
ChallengeSchema.index({ status: 1, scheduledPublishAt: 1 });

// Pre-save: derive `active` boolean from `status` to keep them in sync
ChallengeSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.active = this.status === 'active';
  }
  next();
});

// Virtual for completion rate
ChallengeSchema.virtual('completionRate').get(function(this: IChallenge) {
  if (this.participantCount === 0) return 0;
  return (this.completionCount / this.participantCount) * 100;
});

// Method to check if challenge is currently active
// Supports both legacy `active` boolean and new `status` field
ChallengeSchema.methods.isActive = function(): boolean {
  const now = new Date();
  const statusOk = !this.status || this.status === 'active'; // backward compat: if no status, use active boolean
  return this.active && statusOk && now >= this.startDate && now <= this.endDate;
};

// Method to check if challenge has space for more participants
ChallengeSchema.methods.canJoin = function(): boolean {
  if (!this.maxParticipants) return true;
  return this.participantCount < this.maxParticipants;
};

export default mongoose.model<IChallenge>('Challenge', ChallengeSchema);
