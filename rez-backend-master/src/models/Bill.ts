import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

// Bill image interface
export interface IBillImage {
  url: string;
  thumbnailUrl?: string;
  cloudinaryId: string;
  publicId?: string;
  imageHash?: string; // For duplicate detection
}

// Extracted data from OCR
export interface IExtractedData {
  merchantName?: string;
  amount?: number;
  date?: Date;
  billNumber?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  taxAmount?: number;
  discountAmount?: number;
  confidence?: number; // Overall OCR confidence score
}

// Bill verification metadata
export interface IBillMetadata {
  ocrConfidence?: number; // 0-100 score
  processingTime?: number; // milliseconds
  verifiedBy?: Types.ObjectId; // Admin who verified
  verifiedAt?: Date;
  ipAddress?: string;
  deviceInfo?: string;
  fraudScore?: number; // 0-100, higher = more suspicious
  fraudFlags?: string[]; // List of fraud indicators
}

// Main Bill interface
export interface IBill extends Document {
  user: Types.ObjectId;
  merchant: Types.ObjectId;
  billImage: IBillImage;
  extractedData?: IExtractedData;
  amount: number; // User-entered amount
  billDate: Date; // User-entered date
  billNumber?: string; // User-entered bill number
  notes?: string; // User notes
  verificationStatus: 'pending' | 'processing' | 'approved' | 'rejected';
  verificationMethod?: 'automatic' | 'manual';
  rejectionReason?: string;
  cashbackAmount?: number;
  cashbackPercentage?: number;
  cashbackStatus?: 'pending' | 'credited' | 'failed';
  cashbackCreditedAt?: Date;
  metadata: IBillMetadata;
  resubmissionCount?: number; // Number of times resubmitted
  originalBillId?: Types.ObjectId; // If resubmitted, reference to original
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  approve(verifiedBy?: Types.ObjectId): Promise<void>;
  reject(reason: string, verifiedBy?: Types.ObjectId): Promise<void>;
  markAsProcessing(): Promise<void>;
}

// Bill Schema
const BillSchema = new Schema<IBill>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true,
  },
  merchant: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    required: [true, 'Merchant is required'],
    index: true,
  },
  billImage: {
    url: {
      type: String,
      required: [true, 'Bill image URL is required'],
    },
    thumbnailUrl: {
      type: String,
    },
    cloudinaryId: {
      type: String,
      required: [true, 'Cloudinary ID is required'],
    },
    publicId: {
      type: String,
    },
    imageHash: {
      type: String,
      index: true, // For duplicate detection
    },
  },
  extractedData: {
    merchantName: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      min: 0,
    },
    date: {
      type: Date,
    },
    billNumber: {
      type: String,
      trim: true,
    },
    items: [{
      name: {
        type: String,
        required: true,
        trim: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
    }],
    taxAmount: {
      type: Number,
      min: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  amount: {
    type: Number,
    required: [true, 'Bill amount is required'],
    min: [1, 'Bill amount must be at least ₹1'],
    max: [1000000, 'Bill amount cannot exceed ₹10,00,000'],
  },
  billDate: {
    type: Date,
    required: [true, 'Bill date is required'],
    validate: {
      validator: function(value: Date) {
        // Bill should not be older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return value >= thirtyDaysAgo;
      },
      message: 'Bill date cannot be older than 30 days',
    },
  },
  billNumber: {
    type: String,
    trim: true,
    maxlength: 50,
    index: true, // For duplicate detection
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'processing', 'approved', 'rejected'],
    default: 'pending',
    required: true,
    index: true,
  },
  verificationMethod: {
    type: String,
    enum: ['automatic', 'manual'],
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  cashbackAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  cashbackPercentage: {
    type: Number,
    min: 0,
    max: 100,
  },
  cashbackStatus: {
    type: String,
    enum: ['pending', 'credited', 'failed'],
    index: true,
  },
  cashbackCreditedAt: {
    type: Date,
  },
  metadata: {
    ocrConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    processingTime: {
      type: Number,
      min: 0,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    deviceInfo: {
      type: String,
    },
    fraudScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    fraudFlags: [{
      type: String,
    }],
  },
  resubmissionCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  originalBillId: {
    type: Schema.Types.ObjectId,
    ref: 'Bill',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for common queries
BillSchema.index({ user: 1, createdAt: -1 });
BillSchema.index({ merchant: 1, createdAt: -1 });
BillSchema.index({ user: 1, verificationStatus: 1 });
BillSchema.index({ verificationStatus: 1, createdAt: -1 });
BillSchema.index({ cashbackStatus: 1 });
BillSchema.index({ billDate: -1 });
BillSchema.index({ 'metadata.fraudScore': 1 });

// Compound index for duplicate detection
BillSchema.index({ user: 1, merchant: 1, amount: 1, billDate: 1 });
BillSchema.index({ user: 1, billNumber: 1 }, { sparse: true });
BillSchema.index({ 'billImage.imageHash': 1 }, { sparse: true });

// Virtual for days since submission
BillSchema.virtual('daysSinceSubmission').get(function() {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Virtual for verification time (in hours)
BillSchema.virtual('verificationTime').get(function() {
  if (!this.metadata.verifiedAt) return null;
  const diff = this.metadata.verifiedAt.getTime() - this.createdAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60));
});

// Pre-save hook to calculate cashback
BillSchema.pre('save', async function(next) {
  // If bill is approved and cashback not yet calculated
  if (this.isModified('verificationStatus') && this.verificationStatus === 'approved') {
    if (!this.cashbackAmount || this.cashbackAmount === 0) {
      // Get merchant's cashback percentage
      const Merchant = mongoose.model('Merchant');
      const merchant = await Merchant.findById(this.merchant);

      if (merchant && merchant.cashbackPercentage) {
        this.cashbackPercentage = merchant.cashbackPercentage;
        this.cashbackAmount = (this.amount * merchant.cashbackPercentage) / 100;
        this.cashbackStatus = 'pending';
      }
    }
  }

  next();
});

// Post-save hook to trigger cashback credit
BillSchema.post('save', async function(doc) {
  // If bill is approved and cashback is pending, trigger wallet credit
  if (doc.verificationStatus === 'approved' && doc.cashbackStatus === 'pending') {
    try {
      // Import wallet service (avoid circular dependency)
      const { creditBillCashback } = require('../services/walletService');
      await creditBillCashback(doc.user, doc._id, doc.cashbackAmount, doc.merchant);
    } catch (error) {
      logger.error('Error crediting cashback:', error);
    }
  }
});

// Static method to find duplicate bills
BillSchema.statics.findDuplicates = function(userId: Types.ObjectId, billData: {
  merchantId?: Types.ObjectId;
  amount?: number;
  billNumber?: string;
  imageHash?: string;
  billDate?: Date;
}) {
  const query: any = {
    user: userId,
    isActive: true,
    verificationStatus: { $in: ['pending', 'processing', 'approved'] },
  };

  // Check for exact match
  if (billData.merchantId) query.merchant = billData.merchantId;
  if (billData.amount) query.amount = billData.amount;
  if (billData.billNumber) query.billNumber = billData.billNumber;
  if (billData.billDate) {
    // Same date
    const startOfDay = new Date(billData.billDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(billData.billDate);
    endOfDay.setHours(23, 59, 59, 999);
    query.billDate = { $gte: startOfDay, $lte: endOfDay };
  }

  // Check for image hash match (strongest duplicate indicator)
  if (billData.imageHash) {
    return this.findOne({
      user: userId,
      'billImage.imageHash': billData.imageHash,
      isActive: true,
    });
  }

  return this.findOne(query);
};

// Static method to get user's bill statistics
BillSchema.statics.getUserStatistics = async function(userId: Types.ObjectId) {
  const stats = await this.aggregate([
    { $match: { user: userId, isActive: true } },
    {
      $group: {
        _id: '$verificationStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalCashback: { $sum: '$cashbackAmount' },
      },
    },
  ]);

  const result: any = {
    totalBills: 0,
    pendingBills: 0,
    processingBills: 0,
    approvedBills: 0,
    rejectedBills: 0,
    totalSpent: 0,
    totalCashback: 0,
    pendingCashback: 0,
    creditedCashback: 0,
  };

  stats.forEach((stat) => {
    result.totalBills += stat.count;
    result.totalSpent += stat.totalAmount;

    switch (stat._id) {
      case 'pending':
        result.pendingBills = stat.count;
        break;
      case 'processing':
        result.processingBills = stat.count;
        break;
      case 'approved':
        result.approvedBills = stat.count;
        result.totalCashback += stat.totalCashback;
        break;
      case 'rejected':
        result.rejectedBills = stat.count;
        break;
    }
  });

  // Get cashback breakdown
  const cashbackStats = await this.aggregate([
    { $match: { user: userId, verificationStatus: 'approved', isActive: true } },
    {
      $group: {
        _id: '$cashbackStatus',
        amount: { $sum: '$cashbackAmount' },
      },
    },
  ]);

  cashbackStats.forEach((stat) => {
    if (stat._id === 'pending') {
      result.pendingCashback = stat.amount;
    } else if (stat._id === 'credited') {
      result.creditedCashback = stat.amount;
    }
  });

  return result;
};

// Instance method to approve bill
BillSchema.methods.approve = async function(verifiedBy?: Types.ObjectId) {
  this.verificationStatus = 'approved';
  this.metadata.verifiedBy = verifiedBy;
  this.metadata.verifiedAt = new Date();
  await this.save();
};

// Instance method to reject bill
BillSchema.methods.reject = async function(reason: string, verifiedBy?: Types.ObjectId) {
  this.verificationStatus = 'rejected';
  this.rejectionReason = reason;
  this.metadata.verifiedBy = verifiedBy;
  this.metadata.verifiedAt = new Date();
  await this.save();
};

// Instance method to mark as processing
BillSchema.methods.markAsProcessing = async function() {
  this.verificationStatus = 'processing';
  await this.save();
};

export const Bill = mongoose.model<IBill>('Bill', BillSchema);
