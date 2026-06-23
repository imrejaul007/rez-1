import mongoose, { Document, Schema, Types } from 'mongoose';
import { BillType, BILL_TYPES } from './BillProvider';

// ============================================
// TYPES & INTERFACES
// ============================================

export type BillPaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type BillRefundStatus = 'none' | 'pending' | 'processed' | 'failed';

export interface IBillPayment extends Document {
  userId: Types.ObjectId;
  provider: Types.ObjectId;
  billType: BillType;
  customerNumber: string;
  amount: number;
  cashbackAmount: number;
  promoCoinsIssued: number;
  promoExpiryDays: number;
  maxRedemptionPercent: number;
  status: BillPaymentStatus;
  transactionRef?: string;
  aggregatorRef?: string;
  aggregatorName?: 'razorpay' | 'setu' | 'manual';
  walletDebited: boolean;
  walletDebitedAmount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  webhookVerified: boolean;
  refundStatus: BillRefundStatus;
  refundRef?: string;
  refundAmount?: number;
  refundedAt?: Date;
  refundReason?: string;
  dueDateRaw?: Date;
  reminderSent: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const BillPaymentSchema = new Schema<IBillPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'BillProvider',
      required: [true, 'Provider is required'],
      index: true,
    },
    billType: {
      type: String,
      required: [true, 'Bill type is required'],
      enum: BILL_TYPES,
      index: true,
    },
    customerNumber: {
      type: String,
      required: [true, 'Customer number is required'],
      trim: true,
      maxlength: 50,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1'],
    },
    cashbackAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    promoCoinsIssued: {
      type: Number,
      default: 0,
      min: 0,
    },
    promoExpiryDays: {
      type: Number,
      default: 7,
    },
    maxRedemptionPercent: {
      type: Number,
      default: 15,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    transactionRef: {
      type: String,
      trim: true,
      sparse: true,
    },
    aggregatorRef: {
      type: String,
      trim: true,
      sparse: true,
    },
    aggregatorName: {
      type: String,
      enum: ['razorpay', 'setu', 'manual'],
      default: 'razorpay',
    },
    walletDebited: {
      type: Boolean,
      default: false,
    },
    walletDebitedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      sparse: true,
    },
    webhookVerified: {
      type: Boolean,
      default: false,
    },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'processed', 'failed'],
      default: 'none',
    },
    refundRef: {
      type: String,
      trim: true,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    refundedAt: {
      type: Date,
    },
    refundReason: {
      type: String,
      trim: true,
    },
    dueDateRaw: {
      type: Date,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
BillPaymentSchema.index({ userId: 1, createdAt: -1 });
BillPaymentSchema.index({ userId: 1, status: 1 });
BillPaymentSchema.index({ userId: 1, billType: 1, createdAt: -1 });
BillPaymentSchema.index({ transactionRef: 1 }, { unique: true, sparse: true });
BillPaymentSchema.index({ aggregatorRef: 1 }, { sparse: true });
BillPaymentSchema.index({ status: 1, createdAt: -1 });
BillPaymentSchema.index({ dueDateRaw: 1, reminderSent: 1 });
BillPaymentSchema.index({ razorpayOrderId: 1 }, { sparse: true });

export const BillPayment = mongoose.model<IBillPayment>('BillPayment', BillPaymentSchema);
