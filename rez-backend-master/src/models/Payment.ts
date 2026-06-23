import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPaymentModel extends Model<IPayment> {
  findActivePayments(userId: string): Promise<IPayment[]>;
  findByPaymentId(paymentId: string, userId: string): Promise<IPayment | null>;
}

export interface IPayment extends Document {
  paymentId: string;
  orderId: string;
  user: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentMethodId?: string;
  purpose: 'wallet_topup' | 'order_payment' | 'event_booking' | 'financial_service' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';
  userDetails: {
    name?: string;
    email?: string;
    phone?: string;
  };
  metadata: Record<string, any>;
  gatewayResponse?: {
    gateway: string;
    transactionId?: string;
    paymentUrl?: string;
    qrCode?: string;
    upiId?: string;
    expiryTime?: Date;
    timestamp: Date;
    [key: string]: any;
  };
  failureReason?: string;
  walletCredited?: boolean;
  completedAt?: Date;
  expiresAt: Date;
  refundedAmount?: number; // Added during Phase 2E merge — total already-refunded amount
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
    uppercase: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['upi', 'card', 'wallet', 'netbanking', 'stripe', 'razorpay', 'paypal']
  },
  paymentMethodId: {
    type: String,
    sparse: true
  },
  purpose: {
    type: String,
    enum: ['wallet_topup', 'order_payment', 'event_booking', 'financial_service', 'other'],
    default: 'other',
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'],
    default: 'pending',
    index: true
  },
  userDetails: {
    name: String,
    email: String,
    phone: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  gatewayResponse: {
    gateway: String,
    transactionId: String,
    paymentUrl: String,
    qrCode: String,
    upiId: String,
    expiryTime: Date,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  failureReason: String,
  walletCredited: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
PaymentSchema.index({ user: 1, status: 1 });
PaymentSchema.index({ paymentId: 1, user: 1 });
PaymentSchema.index({ orderId: 1, user: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if payment is expired
PaymentSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Virtual for checking if payment is active (not completed, failed, or expired)
PaymentSchema.virtual('isActive').get(function() {
  return ['pending', 'processing'].includes(this.status) && !(this.expiresAt < new Date());
});

// Static method to find active payments for a user
PaymentSchema.statics.findActivePayments = function(userId: string) {
  return this.find({
    user: userId,
    status: { $in: ['pending', 'processing'] },
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

// Static method to find payment by payment ID and user
PaymentSchema.statics.findByPaymentId = function(paymentId: string, userId: string) {
  return this.findOne({ paymentId, user: userId });
};

// Instance method to mark payment as completed
PaymentSchema.methods.markCompleted = function(transactionId?: string) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (transactionId) {
    this.gatewayResponse = this.gatewayResponse || {};
    this.gatewayResponse.transactionId = transactionId;
  }
  return this.save();
};

// Instance method to mark payment as failed
PaymentSchema.methods.markFailed = function(reason: string) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

// Instance method to mark payment as cancelled
PaymentSchema.methods.markCancelled = function() {
  this.status = 'cancelled';
  return this.save();
};

// Pre-save middleware to ensure payment ID is unique
PaymentSchema.pre('save', async function(next) {
  if (this.isNew && this.paymentId) {
    const PaymentModel = this.constructor as any;
    const existingPayment = await PaymentModel.findOne({ paymentId: this.paymentId });
    if (existingPayment) {
      const error = new Error('Payment ID already exists');
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to set expiry time if not provided
PaymentSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
  }
  next();
});

export const Payment = mongoose.model<IPayment, IPaymentModel>('Payment', PaymentSchema);
export default Payment;
