import mongoose, { Schema, Document } from 'mongoose';

export interface IUserChallengeProgress extends Document {
  user: mongoose.Types.ObjectId;
  challenge: mongoose.Types.ObjectId;
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: Date;
  rewardsClaimed: boolean;
  claimedAt?: Date;
  startedAt: Date;
  lastUpdatedAt: Date;
  progressHistory: Array<{
    amount: number;
    timestamp: Date;
    source: string; // e.g., 'order_123', 'review_456'
  }>;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addProgress(amount: number, source?: string): Promise<IUserChallengeProgress>;
  claimRewards(): Promise<IUserChallengeProgress>;
}

const UserChallengeProgressSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    challenge: {
      type: Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
      index: true
    },
    progress: {
      type: Number,
      default: 0,
      min: 0
    },
    target: {
      type: Number,
      required: true,
      min: 1
    },
    completed: {
      type: Boolean,
      default: false,
      index: true
    },
    completedAt: {
      type: Date
    },
    rewardsClaimed: {
      type: Boolean,
      default: false,
      index: true
    },
    claimedAt: {
      type: Date
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    },
    progressHistory: [{
      amount: {
        type: Number,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      source: String
    }]
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient querying
UserChallengeProgressSchema.index({ user: 1, challenge: 1 }, { unique: true });
UserChallengeProgressSchema.index({ user: 1, completed: 1, rewardsClaimed: 1 });
UserChallengeProgressSchema.index({ challenge: 1, completed: 1 });

// Virtual for progress percentage
UserChallengeProgressSchema.virtual('progressPercentage').get(function(this: IUserChallengeProgress) {
  return Math.min((this.progress / this.target) * 100, 100);
});

// Virtual for remaining progress
UserChallengeProgressSchema.virtual('remaining').get(function(this: IUserChallengeProgress) {
  return Math.max(this.target - this.progress, 0);
});

// Method to update progress
UserChallengeProgressSchema.methods.addProgress = async function(amount: number, source?: string) {
  this.progress += amount;
  this.lastUpdatedAt = new Date();

  if (source) {
    this.progressHistory.push({
      amount,
      timestamp: new Date(),
      source
    });
    // Cap progressHistory to last 100 entries to prevent unbounded growth
    if (this.progressHistory.length > 100) {
      this.progressHistory = this.progressHistory.slice(-100);
    }
  }

  // Check if completed
  if (this.progress >= this.target && !this.completed) {
    this.completed = true;
    this.completedAt = new Date();

    // Update challenge completion count
    await mongoose.model('Challenge').findByIdAndUpdate(
      this.challenge,
      { $inc: { completionCount: 1 } }
    );
  }

  return this.save();
};

// Method to claim rewards
UserChallengeProgressSchema.methods.claimRewards = async function() {
  if (!this.completed) {
    throw new Error('Challenge not completed yet');
  }

  if (this.rewardsClaimed) {
    throw new Error('Rewards already claimed');
  }

  this.rewardsClaimed = true;
  this.claimedAt = new Date();

  return this.save();
};

export default mongoose.model<IUserChallengeProgress>('UserChallengeProgress', UserChallengeProgressSchema);
