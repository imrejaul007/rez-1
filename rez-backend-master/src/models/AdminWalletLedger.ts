/**
 * AdminWalletLedger
 *
 * Stores every admin wallet transaction as an individual document instead of
 * embedding them inside the AdminWallet singleton.  Embedding caused two real
 * problems:
 *   1. MongoDB's 16 MB document size limit is breached at ~50 k transactions.
 *   2. getTransactionHistory / getDailyBreakdown had to load the entire history
 *      into Node.js memory just to sort, filter, and paginate.
 *
 * The unique index on `orderId` replaces the $ne guard in creditCommission and
 * provides proper idempotency: a duplicate insert throws a E11000 duplicate-key
 * error instead of silently succeeding.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export type AdminLedgerType = 'commission' | 'adjustment';

export interface IAdminWalletLedger extends Document {
  type: AdminLedgerType;
  /** Amount in whole rupees (integer) */
  amount: number;
  /** Present only for commission entries; unique index enforces idempotency */
  orderId?: Types.ObjectId;
  orderNumber?: string;
  description: string;
  createdAt: Date;
}

const AdminWalletLedgerSchema = new Schema<IAdminWalletLedger>(
  {
    type: {
      type: String,
      required: true,
      enum: ['commission', 'adjustment'],
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      // Sparse so that non-commission entries (no orderId) don't conflict.
      // Unique enforces idempotency: inserting the same orderId twice throws E11000.
      sparse: true,
      unique: true,
    },
    orderNumber: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Index for date-range queries (getTransactionHistory, getDailyBreakdown)
AdminWalletLedgerSchema.index({ createdAt: -1 });

export const AdminWalletLedger = mongoose.model<IAdminWalletLedger>('AdminWalletLedger', AdminWalletLedgerSchema);
