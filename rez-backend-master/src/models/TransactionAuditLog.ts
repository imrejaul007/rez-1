import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Transaction Audit Log
 *
 * Records every financial mutation with before/after balance snapshots.
 * Immutable append-only log for reconciliation and fraud detection.
 */

export interface ITransactionAuditLog extends Document {
  userId: Types.ObjectId;
  walletId: Types.ObjectId;
  walletType: 'user' | 'merchant';
  operation: 'credit' | 'debit' | 'refund' | 'withdrawal' | 'topup' | 'cashback' | 'coin_deduction' | 'coin_credit' | 'branded_coin_deduction' | 'branded_coin_credit' | 'adjustment';
  amount: number;
  currency: string;
  balanceBefore: {
    total: number;
    available: number;
    pending: number;
    cashback: number;
  };
  balanceAfter: {
    total: number;
    available: number;
    pending: number;
    cashback: number;
  };
  reference: {
    type: 'order' | 'refund' | 'topup' | 'withdrawal' | 'cashback' | 'coin_reward' | 'referral' | 'adjustment' | 'other';
    id?: string;
    orderNumber?: string;
    description?: string;
  };
  metadata: {
    ip?: string;
    userAgent?: string;
    source?: string; // 'api' | 'webhook' | 'cron' | 'admin'
    adminUserId?: string;
  };
  requestId?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  geoLocation?: {
    country?: string;
    city?: string;
  };
  ledgerPairId?: string;
  status: 'success' | 'failed' | 'reversed';
  createdAt: Date;
}

const TransactionAuditLogSchema = new Schema<ITransactionAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  walletId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  walletType: {
    type: String,
    enum: ['user', 'merchant'],
    required: true,
  },
  operation: {
    type: String,
    enum: ['credit', 'debit', 'refund', 'withdrawal', 'topup', 'cashback', 'coin_deduction', 'coin_credit', 'branded_coin_deduction', 'branded_coin_credit', 'adjustment'],
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'RC', // ReZ Coins
  },
  balanceBefore: {
    total: { type: Number, required: true },
    available: { type: Number, required: true },
    pending: { type: Number, default: 0 },
    cashback: { type: Number, default: 0 },
  },
  balanceAfter: {
    total: { type: Number, required: true },
    available: { type: Number, required: true },
    pending: { type: Number, default: 0 },
    cashback: { type: Number, default: 0 },
  },
  reference: {
    type: {
      type: String,
      enum: ['order', 'refund', 'topup', 'withdrawal', 'cashback', 'coin_reward', 'referral', 'adjustment', 'other'],
      required: true,
    },
    id: String,
    orderNumber: String,
    description: String,
  },
  metadata: {
    ip: String,
    userAgent: String,
    source: String,
    adminUserId: String,
  },
  requestId: { type: String, index: true },
  deviceFingerprint: String,
  ipAddress: String,
  geoLocation: {
    country: String,
    city: String,
  },
  ledgerPairId: { type: String, index: true },
  status: {
    type: String,
    enum: ['success', 'failed', 'reversed'],
    default: 'success',
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Immutable — no updates
});

// Compound indexes for efficient queries
TransactionAuditLogSchema.index({ userId: 1, createdAt: -1 });
TransactionAuditLogSchema.index({ walletId: 1, createdAt: -1 });
TransactionAuditLogSchema.index({ 'reference.id': 1 });
TransactionAuditLogSchema.index({ createdAt: -1 });

// TTL: Keep audit logs for 2 years (financial compliance)
TransactionAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 730 days

export const TransactionAuditLog = mongoose.model<ITransactionAuditLog>(
  'TransactionAuditLog',
  TransactionAuditLogSchema
);

/**
 * Helper to create audit log entry.
 * Fire-and-forget — audit logging should never block the main operation.
 */
export async function logTransaction(data: Partial<ITransactionAuditLog>): Promise<void> {
  try {
    await TransactionAuditLog.create(data);
  } catch (error) {
    logger.error('[AUDIT] Failed to write transaction audit log:', error);
  }
}
