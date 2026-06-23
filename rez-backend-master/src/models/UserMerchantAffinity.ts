import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserMerchantAffinity extends Document {
  userId: Types.ObjectId;
  merchantId: Types.ObjectId;
  visitCount: number;
  tryTrialCount: number;
  lastVisit: Date;
  affinityScore: number;
  updatedAt: Date;
  createdAt: Date;
}

const UserMerchantAffinitySchema = new Schema<IUserMerchantAffinity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true
    },
    visitCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    tryTrialCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    lastVisit: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    affinityScore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1
    }
  },
  {
    timestamps: true
  }
);

// Unique index on userId and merchantId
UserMerchantAffinitySchema.index({ userId: 1, merchantId: 1 }, { unique: true });
UserMerchantAffinitySchema.index({ userId: 1 });
UserMerchantAffinitySchema.index({ merchantId: 1 });
UserMerchantAffinitySchema.index({ affinityScore: -1 });

/**
 * Calculate affinity score: visitCount * 0.4 + tryTrialCount * 0.6, capped at 1.0
 */
function calculateAffinityScore(visitCount: number, tryTrialCount: number): number {
  const score = visitCount * 0.4 + tryTrialCount * 0.6;
  return Math.min(score, 1.0);
}

/**
 * Pre-save hook to calculate affinity score
 */
UserMerchantAffinitySchema.pre('save', function (next) {
  this.affinityScore = calculateAffinityScore(this.visitCount, this.tryTrialCount);
  next();
});

export const UserMerchantAffinity = mongoose.model<IUserMerchantAffinity>(
  'UserMerchantAffinity',
  UserMerchantAffinitySchema
);
