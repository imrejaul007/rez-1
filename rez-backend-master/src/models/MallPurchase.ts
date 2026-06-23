import { logger } from '../config/logger';
/**
 * MallPurchase Model
 *
 * Tracks purchases made through affiliate links.
 * Links clicks to actual purchases and manages cashback status.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import crypto from 'crypto';

// Purchase status types
export type PurchaseStatus = 'pending' | 'confirmed' | 'rejected' | 'refunded' | 'credited';

// Status history entry interface
export interface IStatusHistoryEntry {
  status: PurchaseStatus;
  timestamp: Date;
  reason?: string;
  updatedBy?: string;  // 'system', 'webhook', 'admin'
}

// Interface for MallPurchase document
export interface IMallPurchase extends Document {
  _id: Types.ObjectId;
  purchaseId: string;           // Unique ID (e.g., "PUR_xyz789")
  click: Types.ObjectId;        // MallAffiliateClick reference
  user: Types.ObjectId;         // User who made purchase
  brand: Types.ObjectId;        // MallBrand reference

  // Order details (from webhook)
  externalOrderId: string;      // Brand's order ID
  orderAmount: number;          // Total order amount
  currency: string;             // Currency code (INR)

  // Cashback calculation
  cashbackRate: number;         // % at time of purchase
  cashbackAmount: number;       // Calculated cashback amount
  maxCashback?: number;         // Cap applied (if any)
  actualCashback: number;       // Final cashback (after cap)

  // Status tracking
  status: PurchaseStatus;
  statusHistory: IStatusHistoryEntry[];

  // Verification
  verificationDays: number;     // Days to wait before crediting (7-14)
  verifiedAt?: Date;
  creditedAt?: Date;
  coinsAwarded?: number;        // REZ coins credited to user wallet

  // Related records
  cashback?: Types.ObjectId;    // UserCashback reference (after crediting)
  transaction?: Types.ObjectId; // Wallet transaction reference

  // Webhook data
  webhookPayload?: Record<string, any>;  // Raw webhook data for debugging
  webhookReceivedAt?: Date;
  fraudFlags?: string[];                 // Fraud velocity check flags

  // Timestamps
  purchasedAt: Date;            // When purchase was made on brand site
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  updateStatus(newStatus: PurchaseStatus, reason?: string, updatedBy?: string, session?: any): Promise<void>;
  getDaysUntilCredit(): number;
}

// Schema definition
const MallPurchaseSchema = new Schema<IMallPurchase>({
  purchaseId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  click: {
    type: Schema.Types.ObjectId,
    ref: 'MallAffiliateClick',
    required: true,
    index: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'MallBrand',
    required: true,
    index: true,
  },

  // Order details
  externalOrderId: {
    type: String,
    required: true,
    index: true,
  },
  orderAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },

  // Cashback calculation
  cashbackRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  cashbackAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  maxCashback: {
    type: Number,
    min: 0,
  },
  actualCashback: {
    type: Number,
    required: true,
    min: 0,
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'refunded', 'credited'],
    default: 'pending',
    index: true,
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'refunded', 'credited'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    reason: String,
    updatedBy: {
      type: String,
      default: 'system',
    },
  }],

  // Verification
  verificationDays: {
    type: Number,
    default: 7,
    min: 1,
    max: 30,
  },
  verifiedAt: Date,
  creditedAt: Date,
  coinsAwarded: {
    type: Number,
    min: 0,
    default: 0,
  },

  // Related records
  cashback: {
    type: Schema.Types.ObjectId,
    ref: 'UserCashback',
  },
  transaction: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
  },

  // Webhook data
  webhookPayload: {
    type: Schema.Types.Mixed,
  },
  webhookReceivedAt: Date,
  fraudFlags: [{ type: String }],

  // Purchase timestamp
  purchasedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes
MallPurchaseSchema.index({ user: 1, status: 1, purchasedAt: -1 });
MallPurchaseSchema.index({ brand: 1, status: 1 });
MallPurchaseSchema.index({ status: 1, creditedAt: 1, purchasedAt: 1 }); // For credit job (getReadyForCredit)
MallPurchaseSchema.index({ externalOrderId: 1, brand: 1 }, { unique: true }); // Prevent duplicates

// Pre-save hook to generate purchaseId
MallPurchaseSchema.pre('save', function(next) {
  if (!this.purchaseId && this.isNew) {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    this.purchaseId = `PUR_${timestamp}_${random}`;
  }

  // Add initial status to history if new
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: 'system',
    });
  }

  next();
});

// Static method to generate purchase ID
MallPurchaseSchema.statics.generatePurchaseId = function(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `PUR_${timestamp}_${random}`;
};

// Static method to find purchases ready for credit (DB-level filtering with batch limit)
MallPurchaseSchema.statics.getReadyForCredit = async function(
  batchSize: number = 200
): Promise<IMallPurchase[]> {
  const now = new Date();

  // Use $expr for DB-level date math: purchasedAt + (verificationDays * ms/day) <= now
  return this.find({
    status: 'confirmed',
    creditedAt: { $exists: false },
    $expr: {
      $lte: [
        { $add: ['$purchasedAt', { $multiply: ['$verificationDays', 86400000] }] },
        now,
      ],
    },
  }).limit(batchSize);
};

// Static method to get user's purchase history
MallPurchaseSchema.statics.getUserPurchases = async function(
  userId: Types.ObjectId,
  status?: PurchaseStatus,
  page: number = 1,
  limit: number = 20
): Promise<{ purchases: IMallPurchase[]; total: number; pages: number }> {
  const query: any = { user: userId };
  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [purchases, total] = await Promise.all([
    this.find(query)
      .sort({ purchasedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('brand', 'name slug logo')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    purchases,
    total,
    pages: Math.ceil(total / limit),
  };
};

// Static method to get user's cashback summary
MallPurchaseSchema.statics.getUserCashbackSummary = async function(
  userId: Types.ObjectId
): Promise<{
  totalEarned: number;
  pending: number;
  credited: number;
  rejected: number;
  purchaseCount: number;
}> {
  const summary = await this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$actualCashback' },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    totalEarned: 0,
    pending: 0,
    credited: 0,
    rejected: 0,
    purchaseCount: 0,
  };

  summary.forEach((item: any) => {
    result.purchaseCount += item.count;
    if (item._id === 'pending' || item._id === 'confirmed') {
      result.pending += item.total;
    } else if (item._id === 'credited') {
      result.credited += item.total;
      result.totalEarned += item.total;
    } else if (item._id === 'rejected' || item._id === 'refunded') {
      result.rejected += item.total;
    }
  });

  return result;
};

// Static method to get brand analytics
MallPurchaseSchema.statics.getBrandPurchaseAnalytics = async function(
  brandId: Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<{
  totalPurchases: number;
  totalAmount: number;
  totalCashback: number;
  averageOrderValue: number;
  statusBreakdown: Record<PurchaseStatus, number>;
}> {
  const stats = await this.aggregate([
    {
      $match: {
        brand: brandId,
        purchasedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$orderAmount' },
        totalCashback: { $sum: '$actualCashback' },
      },
    },
  ]);

  const result = {
    totalPurchases: 0,
    totalAmount: 0,
    totalCashback: 0,
    averageOrderValue: 0,
    statusBreakdown: {} as Record<PurchaseStatus, number>,
  };

  stats.forEach((item: any) => {
    result.totalPurchases += item.count;
    result.totalAmount += item.totalAmount;
    result.totalCashback += item.totalCashback;
    result.statusBreakdown[item._id as PurchaseStatus] = item.count;
  });

  result.averageOrderValue = result.totalPurchases > 0
    ? result.totalAmount / result.totalPurchases
    : 0;

  return result;
};

// Instance method to update status
MallPurchaseSchema.methods.updateStatus = async function(
  newStatus: PurchaseStatus,
  reason?: string,
  updatedBy: string = 'system',
  session?: any
): Promise<void> {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    reason,
    updatedBy,
  });

  if (newStatus === 'confirmed') {
    this.verifiedAt = new Date();
  } else if (newStatus === 'credited') {
    this.creditedAt = new Date();
  }

  await this.save(session ? { session } : undefined);
  logger.info(`📦 [PURCHASE] ${this.purchaseId} status updated to ${newStatus}`);
};

// Instance method to calculate days until credit
MallPurchaseSchema.methods.getDaysUntilCredit = function(): number {
  if (this.status !== 'confirmed') return -1;

  const now = new Date();
  const purchaseDate = new Date(this.purchasedAt);
  const daysSincePurchase = Math.floor(
    (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, this.verificationDays - daysSincePurchase);
};

// Virtual for is ready for credit
MallPurchaseSchema.virtual('isReadyForCredit').get(function(this: IMallPurchase) {
  if (this.status !== 'confirmed' || this.creditedAt) return false;

  const now = new Date();
  const purchaseDate = new Date(this.purchasedAt);
  const daysSincePurchase = Math.floor(
    (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSincePurchase >= this.verificationDays;
});

// Virtual for days since purchase
MallPurchaseSchema.virtual('daysSincePurchase').get(function(this: IMallPurchase) {
  const now = new Date();
  const purchaseDate = new Date(this.purchasedAt);
  return Math.floor(
    (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );
});

// Enable virtuals
MallPurchaseSchema.set('toJSON', { virtuals: true });
MallPurchaseSchema.set('toObject', { virtuals: true });

// Delete cached model if exists
if (mongoose.models.MallPurchase) {
  delete (mongoose.models as any).MallPurchase;
}

export const MallPurchase = mongoose.model<IMallPurchase>(
  'MallPurchase',
  MallPurchaseSchema
);
