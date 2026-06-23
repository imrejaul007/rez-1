// Referral Model
// Tracks individual referral relationships and rewards with enhanced tier system

import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ReferralStatus {
  PENDING = 'pending',      // Referee signed up, no order yet
  REGISTERED = 'registered', // Referee registered
  ACTIVE = 'active',        // Referee placed first order
  QUALIFIED = 'qualified',  // Met qualification criteria
  COMPLETED = 'completed',  // All rewards distributed
  EXPIRED = 'expired',      // 90 days passed without completion
}

export interface IReferralReward {
  referrerAmount: number;      // Amount credited to referrer
  refereeDiscount: number;     // Discount for referee on first order
  milestoneBonus?: number;     // Bonus after referee's 3rd order
  voucherCode?: string;
  voucherType?: string;
  description?: string;
}

export interface IReferralMetadata {
  shareMethod?: string;        // whatsapp, sms, email, copy, qr, etc.
  sharedAt?: Date;
  signupSource?: string;       // web, mobile
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  refereeFirstOrder?: {
    orderId: Types.ObjectId;
    amount: number;
    completedAt: Date;
  };
  milestoneOrders?: {
    count: number;
    totalAmount: number;
    lastOrderAt?: Date;
  };
}

export interface IQualificationCriteria {
  minOrders: number;
  minSpend: number;
  timeframeDays: number;
}

export interface IReferral extends Document {
  referrer: Types.ObjectId;           // User who shared the code
  referee: Types.ObjectId;            // User who used the code
  referralCode: string;               // Code that was used
  status: ReferralStatus;
  tier: string;                       // Current tier of referrer
  rewards: IReferralReward;           // Reward amounts (object, not array)
  referrerRewarded: boolean;          // Has referrer received reward
  refereeRewarded: boolean;           // Has referee received discount
  milestoneRewarded: boolean;         // Has milestone bonus been given
  qualificationCriteria: IQualificationCriteria;
  completedAt?: Date;                 // When status changed to completed
  registeredAt?: Date;                // When referee registered
  qualifiedAt?: Date;                 // When referee qualified
  expiresAt: Date;                    // 90 days from creation
  metadata: IReferralMetadata;
  createdAt: Date;
  updatedAt: Date;
  isExpired(): boolean;
}

const ReferralRewardSchema = new Schema<IReferralReward>({
  referrerAmount: {
    type: Number,
    required: true,
    default: 50  // Default ₹50 for referrer
  },
  refereeDiscount: {
    type: Number,
    required: true,
    default: 50  // Default ₹50 discount for referee
  },
  milestoneBonus: {
    type: Number,
    default: 20  // Default ₹20 after 3rd order
  },
  voucherCode: String,
  voucherType: String,
  description: String
}, { _id: false });

const ReferralMetadataSchema = new Schema<IReferralMetadata>({
  shareMethod: String,
  sharedAt: Date,
  signupSource: String,
  deviceId: String,
  ipAddress: String,
  userAgent: String,
  refereeFirstOrder: {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    amount: Number,
    completedAt: Date,
  },
  milestoneOrders: {
    count: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    lastOrderAt: Date,
  },
}, { _id: false });

const QualificationCriteriaSchema = new Schema<IQualificationCriteria>({
  minOrders: {
    type: Number,
    default: 1
  },
  minSpend: {
    type: Number,
    default: 500
  },
  timeframeDays: {
    type: Number,
    default: 30
  }
}, { _id: false });

const ReferralSchema = new Schema<IReferral>(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ReferralStatus),
      default: ReferralStatus.PENDING,
      index: true,
    },
    tier: {
      type: String,
      default: 'STARTER'
    },
    rewards: {
      type: ReferralRewardSchema,
      required: true,
      default: () => ({
        referrerAmount: 50,
        refereeDiscount: 50,
        milestoneBonus: 20
      })
    },
    referrerRewarded: {
      type: Boolean,
      default: false,
    },
    refereeRewarded: {
      type: Boolean,
      default: false,
    },
    milestoneRewarded: {
      type: Boolean,
      default: false,
    },
    qualificationCriteria: {
      type: QualificationCriteriaSchema,
      default: () => ({
        minOrders: 1,
        minSpend: 500,
        timeframeDays: 30
      })
    },
    completedAt: {
      type: Date,
    },
    registeredAt: {
      type: Date
    },
    qualifiedAt: {
      type: Date
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    metadata: {
      type: ReferralMetadataSchema,
      default: () => ({
        milestoneOrders: {
          count: 0,
          totalAmount: 0,
        },
      }),
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ReferralSchema.index({ referrer: 1, status: 1 });
ReferralSchema.index({ referee: 1, status: 1 });
ReferralSchema.index({ status: 1, expiresAt: 1 });
ReferralSchema.index({ referrer: 1, createdAt: -1 });
ReferralSchema.index({ tier: 1, status: 1, createdAt: -1 });

// Pre-save hook to set expiration date (90 days from creation)
ReferralSchema.pre('save', function (next) {
  if (this.isNew && !this.expiresAt) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 90);
    this.expiresAt = expirationDate;
  }
  next();
});

// Instance method to check if referral is expired
ReferralSchema.methods.isExpired = function (): boolean {
  return this.expiresAt < new Date() && this.status !== ReferralStatus.COMPLETED;
};

// Static method to mark expired referrals
ReferralSchema.statics.markExpiredReferrals = async function () {
  const now = new Date();
  return this.updateMany(
    {
      status: { $in: [ReferralStatus.PENDING, ReferralStatus.ACTIVE] },
      expiresAt: { $lt: now },
    },
    {
      $set: { status: ReferralStatus.EXPIRED },
    }
  );
};

const Referral = mongoose.model<IReferral>('Referral', ReferralSchema);

export default Referral;
