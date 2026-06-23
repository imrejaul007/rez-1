import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Refund Model
 * Tracks all refunds for audit and reporting purposes
 */
export interface IRefund extends Document {
  order: Types.ObjectId;
  user: Types.ObjectId;
  orderNumber: string;
  paymentMethod: 'razorpay' | 'stripe' | 'wallet' | 'cod';

  // Refund details
  refundAmount: number;
  refundType: 'full' | 'partial';
  refundReason: string;

  // Gateway details
  gatewayRefundId?: string; // Razorpay/Stripe refund ID
  gatewayStatus?: string; // Gateway refund status

  // Status tracking
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  failureReason?: string;

  // Items refunded (for partial refunds)
  refundedItems?: Array<{
    itemId: Types.ObjectId;
    productId: Types.ObjectId;
    quantity: number;
    refundAmount: number;
  }>;

  // Processing details
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;

  // Estimated refund arrival
  estimatedArrival?: Date;
  actualArrival?: Date;

  // Notifications
  notificationsSent: {
    sms: boolean;
    email: boolean;
    sentAt?: Date;
  };

  // Audit
  processedBy?: Types.ObjectId; // Admin/Merchant who processed
  notes?: string;
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>({
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: true,
    uppercase: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['razorpay', 'stripe', 'wallet', 'cod']
  },
  refundAmount: {
    type: Number,
    required: true,
    min: 0
  },
  refundType: {
    type: String,
    required: true,
    enum: ['full', 'partial']
  },
  refundReason: {
    type: String,
    required: true,
    trim: true
  },
  gatewayRefundId: String,
  gatewayStatus: String,
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  failureReason: String,
  refundedItems: [{
    itemId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    refundAmount: { type: Number, required: true, min: 0 }
  }],
  requestedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,
  estimatedArrival: Date,
  actualArrival: Date,
  notificationsSent: {
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    sentAt: Date
  },
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  metadata: Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes for efficient queries
RefundSchema.index({ user: 1, createdAt: -1 });
RefundSchema.index({ status: 1, createdAt: -1 });
RefundSchema.index({ gatewayRefundId: 1 }, { sparse: true });
RefundSchema.index({ paymentMethod: 1, status: 1 });
RefundSchema.index({ user: 1, status: 1, createdAt: -1 });

export const Refund = mongoose.model<IRefund>('Refund', RefundSchema);

