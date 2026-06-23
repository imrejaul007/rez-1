import mongoose, { Schema, Document, Types } from 'mongoose';
import redisService from '../services/redisService';

// ============================================
// TYPES
// ============================================

export type ConversionStatus = 'pending' | 'confirming' | 'confirmed' | 'paid' | 'cancelled' | 'refunded';

export interface ICreatorConversion extends Document {
  pick: Types.ObjectId;
  creator: Types.ObjectId;
  buyer: Types.ObjectId;
  order: Types.ObjectId;
  product: Types.ObjectId;

  purchaseAmount: number;
  commissionRate: number;
  commissionAmount: number;

  status: ConversionStatus;
  paidAt?: Date;
  coinTransactionId?: Types.ObjectId;

  // Anti-fraud
  clickTimestamp?: Date;
  purchaseTimestamp: Date;
  attributionWindowHours: number;
  ipAddress?: string;
  deviceFingerprint?: string;

  // Audit
  statusHistory: {
    status: ConversionStatus;
    timestamp: Date;
    reason?: string;
    updatedBy?: Types.ObjectId;
  }[];

  createdAt: Date;
  updatedAt: Date;

  // Methods
  updateStatus(newStatus: ConversionStatus, reason?: string, updatedBy?: Types.ObjectId): Promise<void>;
}

// ============================================
// SCHEMA
// ============================================

const CreatorConversionSchema = new Schema<ICreatorConversion>(
  {
    pick: {
      type: Schema.Types.ObjectId,
      ref: 'CreatorPick',
      required: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'CreatorProfile',
      required: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    purchaseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['pending', 'confirming', 'confirmed', 'paid', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paidAt: Date,
    coinTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'CoinTransaction',
    },

    // Anti-fraud
    clickTimestamp: Date,
    purchaseTimestamp: {
      type: Date,
      default: Date.now,
    },
    attributionWindowHours: {
      type: Number,
      default: 24,
    },
    ipAddress: String,
    deviceFingerprint: String,

    // Audit
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['pending', 'confirming', 'confirmed', 'paid', 'cancelled', 'refunded'],
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
        reason: String,
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

CreatorConversionSchema.index({ creator: 1, status: 1 });
CreatorConversionSchema.index({ pick: 1 });
CreatorConversionSchema.index({ buyer: 1 });
CreatorConversionSchema.index({ order: 1, pick: 1 }, { unique: true });
CreatorConversionSchema.index({ status: 1, createdAt: 1 });
CreatorConversionSchema.index({ creator: 1, createdAt: -1 });
CreatorConversionSchema.index({ product: 1 });

// ============================================
// PRE-SAVE: Initialize status history
// ============================================

CreatorConversionSchema.pre('save', function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }
  next();
});

// ============================================
// METHODS
// ============================================

CreatorConversionSchema.methods.updateStatus = async function (
  newStatus: ConversionStatus,
  reason?: string,
  updatedBy?: Types.ObjectId
) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    reason,
    updatedBy,
  });

  if (newStatus === 'paid') {
    this.paidAt = new Date();
  }

  await this.save();

  // Invalidate earnings cache for the creator's user (creator field references CreatorProfile, not User)
  try {
    const CreatorProfile = mongoose.model('CreatorProfile');
    const profile = await CreatorProfile.findById(this.creator).select('user').lean();
    if (profile) {
      await redisService.delPattern(`earnings:consolidated:${(profile as any).user.toString()}:*`);
    }
  } catch (e) {}
};

// ============================================
// EXPORT
// ============================================

export const CreatorConversion = mongoose.model<ICreatorConversion>(
  'CreatorConversion',
  CreatorConversionSchema
);
export default CreatorConversion;
