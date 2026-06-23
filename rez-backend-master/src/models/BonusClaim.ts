import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// ============================================
// TYPES & INTERFACES
// ============================================

export type BonusClaimStatus = 'pending' | 'verified' | 'credited' | 'rejected' | 'expired';
export type TransactionRefType = 'order' | 'bill' | 'payment' | 'none';

export interface IBonusClaimTransactionRef {
  type: TransactionRefType;
  refId?: Types.ObjectId;
}

export interface IBonusClaimMetadata {
  ipAddress?: string;
  deviceId?: string;
  paymentMethod?: string;
  bankCode?: string;
  cardBin?: string;
  transactionAmount?: number;
  [key: string]: any;
}

export interface IBonusClaim extends Document {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  userId: Types.ObjectId;
  transactionRef: IBonusClaimTransactionRef;
  status: BonusClaimStatus;
  rewardAmount: number;
  rewardType: 'rez' | 'branded';
  coinTransactionId?: Types.ObjectId;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  metadata: IBonusClaimMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBonusClaimModel extends Model<IBonusClaim> {
  getUserClaimCount(campaignId: string, userId: string): Promise<number>;
  getUserDailyClaimCount(campaignId: string, userId: string): Promise<number>;
  getUserTotalReward(campaignId: string, userId: string): Promise<number>;
}

// ============================================
// SCHEMA
// ============================================

const TransactionRefSchema = new Schema({
  type: {
    type: String,
    enum: ['order', 'bill', 'payment', 'none'],
    required: true,
    default: 'none',
  },
  refId: {
    type: Schema.Types.ObjectId,
  },
}, { _id: false });

const BonusClaimSchema = new Schema<IBonusClaim>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'BonusCampaign',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transactionRef: {
      type: TransactionRefSchema,
      required: true,
      default: () => ({ type: 'none' }),
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'credited', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    rewardAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    rewardType: {
      type: String,
      enum: ['rez', 'branded'],
      default: 'rez',
    },
    coinTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'CoinTransaction',
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: String,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Per-user claim count lookups
BonusClaimSchema.index({ campaignId: 1, userId: 1 });

// Idempotency: prevent duplicate claims for the same transaction
BonusClaimSchema.index(
  { campaignId: 1, userId: 1, 'transactionRef.refId': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { 'transactionRef.refId': { $exists: true } },
  }
);

// User claim history
BonusClaimSchema.index({ userId: 1, status: 1, createdAt: -1 });

// Campaign claim analytics
BonusClaimSchema.index({ campaignId: 1, status: 1 });

// Expiry cron: find pending claims that need expiring
BonusClaimSchema.index({ status: 1, createdAt: 1 });

// ============================================
// STATIC METHODS
// ============================================

BonusClaimSchema.statics.getUserClaimCount = async function (
  campaignId: string,
  userId: string
): Promise<number> {
  return this.countDocuments({
    campaignId: new mongoose.Types.ObjectId(campaignId),
    userId: new mongoose.Types.ObjectId(userId),
    status: { $in: ['pending', 'verified', 'credited'] },
  });
};

BonusClaimSchema.statics.getUserDailyClaimCount = async function (
  campaignId: string,
  userId: string
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return this.countDocuments({
    campaignId: new mongoose.Types.ObjectId(campaignId),
    userId: new mongoose.Types.ObjectId(userId),
    status: { $in: ['pending', 'verified', 'credited'] },
    createdAt: { $gte: startOfDay },
  });
};

BonusClaimSchema.statics.getUserTotalReward = async function (
  campaignId: string,
  userId: string
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        campaignId: new mongoose.Types.ObjectId(campaignId),
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['verified', 'credited'] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$rewardAmount' },
      },
    },
  ]);

  return result.length > 0 ? result[0].total : 0;
};

// ============================================
// EXPORT
// ============================================

const BonusClaim = mongoose.model<IBonusClaim, IBonusClaimModel>(
  'BonusClaim',
  BonusClaimSchema
);

export default BonusClaim;
