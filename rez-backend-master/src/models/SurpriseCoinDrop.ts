import mongoose, { Schema, Document, Types } from 'mongoose';

// Surprise Coin Drop Interface
export interface ISurpriseCoinDrop extends Document {
  userId: Types.ObjectId;
  coins: number;
  reason: 'random' | 'milestone' | 'promo' | 'special_event' | 'welcome' | 'comeback';
  message: string;
  status: 'available' | 'claimed' | 'expired';
  expiresAt: Date;
  claimedAt?: Date;
  metadata?: {
    campaign?: string;
    source?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Surprise Coin Drop Schema
const SurpriseCoinDropSchema = new Schema<ISurpriseCoinDrop>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coins: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
    },
    reason: {
      type: String,
      required: true,
      enum: ['random', 'milestone', 'promo', 'special_event', 'welcome', 'comeback'],
      default: 'random',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: 'Surprise! You got bonus coins!',
    },
    status: {
      type: String,
      required: true,
      enum: ['available', 'claimed', 'expired'],
      default: 'available',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    claimedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
SurpriseCoinDropSchema.index({ userId: 1, status: 1 });
SurpriseCoinDropSchema.index({ userId: 1, createdAt: -1 });
SurpriseCoinDropSchema.index({ status: 1, expiresAt: 1 });

// Static method to get available drops for a user
SurpriseCoinDropSchema.statics.getAvailableDrops = async function (
  userId: Types.ObjectId | string
) {
  return this.find({
    userId,
    status: 'available',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

// Static method to claim a drop
SurpriseCoinDropSchema.statics.claimDrop = async function (
  dropId: Types.ObjectId | string,
  userId: Types.ObjectId | string
) {
  const drop = await this.findOne({
    _id: dropId,
    userId,
    status: 'available',
    expiresAt: { $gt: new Date() },
  });

  if (!drop) {
    return null;
  }

  drop.status = 'claimed';
  drop.claimedAt = new Date();
  await drop.save();

  return drop;
};

// Static method to create a random surprise drop for a user
SurpriseCoinDropSchema.statics.createRandomDrop = async function (
  userId: Types.ObjectId | string,
  options?: {
    minCoins?: number;
    maxCoins?: number;
    expiryHours?: number;
    message?: string;
    reason?: ISurpriseCoinDrop['reason'];
  }
) {
  const {
    minCoins = 10,
    maxCoins = 100,
    expiryHours = 24,
    message = 'Lucky you! Surprise coins!',
    reason = 'random',
  } = options || {};

  // Random coins between min and max
  const coins = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;

  // Expiry time
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);

  const drop = new this({
    userId,
    coins,
    reason,
    message,
    status: 'available',
    expiresAt,
  });

  return drop.save();
};

// Static method to expire old drops
SurpriseCoinDropSchema.statics.expireOldDrops = async function () {
  return this.updateMany(
    {
      status: 'available',
      expiresAt: { $lte: new Date() },
    },
    {
      $set: { status: 'expired' },
    }
  );
};

// Pre-save middleware to check expiry
SurpriseCoinDropSchema.pre('save', function (next) {
  // If the drop has expired and is still available, mark as expired
  if (this.status === 'available' && this.expiresAt && this.expiresAt <= new Date()) {
    this.status = 'expired';
  }
  next();
});

// Virtual for checking if drop is still claimable
SurpriseCoinDropSchema.virtual('isClaimable').get(function () {
  return this.status === 'available' && this.expiresAt > new Date();
});

// Virtual for time remaining
SurpriseCoinDropSchema.virtual('timeRemaining').get(function () {
  if (this.status !== 'available') return 0;
  const remaining = this.expiresAt.getTime() - Date.now();
  return Math.max(0, remaining);
});

export const SurpriseCoinDrop = mongoose.model<ISurpriseCoinDrop>(
  'SurpriseCoinDrop',
  SurpriseCoinDropSchema
);

export default SurpriseCoinDrop;
