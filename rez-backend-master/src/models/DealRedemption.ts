import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Deal Redemption Status
 * - pending: Paid deal awaiting payment confirmation
 * - active: Deal is redeemed and ready to use
 * - used: Deal has been applied to an order
 * - expired: Deal has passed its expiry date
 * - cancelled: Deal was cancelled by user or system
 */
export type RedemptionStatus = 'pending' | 'active' | 'used' | 'expired' | 'cancelled';

/**
 * Deal Redemption interface - Tracks user's redeemed campaign deals
 */
export interface IDealRedemption extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  campaign: Types.ObjectId;
  campaignId: string; // Slug/identifier for easier lookup
  dealIndex: number;

  // Snapshot of deal at redemption time (in case campaign changes)
  dealSnapshot: {
    store?: string;
    storeId?: Types.ObjectId;
    image: string;
    cashback?: string;
    coins?: string;
    bonus?: string;
    drop?: string;
    discount?: string;
    price?: number;
    currency?: 'INR' | 'AED' | 'USD';
  };

  // Snapshot of campaign info at redemption time
  campaignSnapshot: {
    title: string;
    subtitle: string;
    type: string;
    badge: string;
    gradientColors: string[];
    endTime: Date;
    minOrderValue?: number;
    maxBenefit?: number;
    terms?: string[];
  };

  // Status tracking
  status: RedemptionStatus;
  redeemedAt: Date;
  usedAt?: Date;
  expiresAt: Date;

  // Order linkage (when deal is applied to an order)
  orderId?: Types.ObjectId;
  benefitApplied?: number; // Amount of cashback/coins/discount applied

  // Unique code for this redemption
  redemptionCode: string;

  // Purchase tracking (for paid deals)
  isPaid: boolean;
  purchaseAmount?: number;
  purchaseCurrency?: 'INR' | 'AED' | 'USD';
  purchaseTransactionId?: string;
  purchasePaymentMethod?: 'razorpay' | 'stripe' | 'wallet' | 'cod';
  purchasedAt?: Date;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;

  // Merchant usage tracking (when deal is redeemed at store)
  usedByMerchantId?: Types.ObjectId;  // Which merchant marked it as used
  usedAtStoreId?: Types.ObjectId;     // Which store location redeemed it
  merchantNotes?: string;              // Notes from merchant
  orderAmount?: number;                // Order amount at redemption time

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Deal Redemption Schema
 */
const DealRedemptionSchema = new Schema<IDealRedemption>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  campaign: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true,
  },
  campaignId: {
    type: String,
    required: true,
    index: true,
  },
  dealIndex: {
    type: Number,
    required: true,
    min: 0,
  },

  dealSnapshot: {
    store: { type: String },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    image: { type: String, required: true },
    cashback: { type: String },
    coins: { type: String },
    bonus: { type: String },
    drop: { type: String },
    discount: { type: String },
    price: { type: Number },
    currency: { type: String, enum: ['INR', 'AED', 'USD'] },
  },

  campaignSnapshot: {
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    type: { type: String, required: true },
    badge: { type: String, required: true },
    gradientColors: [{ type: String }],
    endTime: { type: Date, required: true },
    minOrderValue: { type: Number },
    maxBenefit: { type: Number },
    terms: [{ type: String }],
  },

  status: {
    type: String,
    enum: ['pending', 'active', 'used', 'expired', 'cancelled'],
    default: 'active',
    index: true,
  },
  redeemedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  usedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },

  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
  },
  benefitApplied: {
    type: Number,
  },

  redemptionCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Purchase tracking (for paid deals)
  isPaid: {
    type: Boolean,
    default: false,
    index: true,
  },
  purchaseAmount: {
    type: Number,
    min: 0,
  },
  purchaseCurrency: {
    type: String,
    enum: ['INR', 'AED', 'USD'],
  },
  purchaseTransactionId: {
    type: String,
    index: true,
  },
  purchasePaymentMethod: {
    type: String,
    enum: ['razorpay', 'stripe', 'wallet', 'cod'],
  },
  purchasedAt: {
    type: Date,
  },
  stripeSessionId: {
    type: String,
    index: true,
  },
  stripePaymentIntentId: {
    type: String,
    index: true,
  },

  // Merchant usage tracking (when deal is redeemed at store)
  usedByMerchantId: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    index: true,
  },
  usedAtStoreId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
  },
  merchantNotes: {
    type: String,
    maxlength: 500,
  },
  orderAmount: {
    type: Number,
    min: 0,
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
DealRedemptionSchema.index({ user: 1, status: 1 });
DealRedemptionSchema.index({ user: 1, campaign: 1, dealIndex: 1 });
DealRedemptionSchema.index({ redemptionCode: 1 });
DealRedemptionSchema.index({ expiresAt: 1, status: 1 }); // For expiry cleanup job
DealRedemptionSchema.index({ stripeSessionId: 1 }); // For webhook lookup
DealRedemptionSchema.index({ 'dealSnapshot.storeId': 1, status: 1 }); // For merchant queries

// Unique partial index to prevent race conditions on redemption creation
// Only allows one pending/active/used redemption per user per deal
// Includes 'pending' to prevent double-payment scenarios
DealRedemptionSchema.index(
  { user: 1, campaign: 1, dealIndex: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'active', 'used'] }
    },
    name: 'unique_active_redemption_per_user_deal'
  }
);

// Generate unique redemption code
DealRedemptionSchema.statics.generateRedemptionCode = function(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding ambiguous chars
  let code = 'RZ-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Static method to get user's active redemptions
DealRedemptionSchema.statics.getUserActiveRedemptions = function(userId: Types.ObjectId) {
  const now = new Date();
  return this.find({
    user: userId,
    status: 'active',
    expiresAt: { $gte: now },
  }).sort({ redeemedAt: -1 });
};

// Static method to check if user already redeemed this deal
DealRedemptionSchema.statics.hasUserRedeemed = async function(
  userId: Types.ObjectId,
  campaignId: Types.ObjectId,
  dealIndex: number
): Promise<boolean> {
  const existing = await this.findOne({
    user: userId,
    campaign: campaignId,
    dealIndex,
    status: { $in: ['active', 'used'] },
  });
  return !!existing;
};

const DealRedemption = mongoose.model<IDealRedemption>('DealRedemption', DealRedemptionSchema);

export default DealRedemption;
