import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import { logTransaction } from './TransactionAuditLog';
import { div } from '../utils/currency';
import { ledgerService } from '../services/ledgerService';

// Merchant Wallet Transaction interface
export interface IMerchantWalletTransaction {
  _id?: Types.ObjectId;
  type: 'credit' | 'debit' | 'withdrawal' | 'refund' | 'adjustment';
  amount: number;
  platformFee?: number;
  netAmount?: number;
  orderId?: Types.ObjectId;
  orderNumber?: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  withdrawalDetails?: {
    bankAccount?: string;
    ifscCode?: string;
    upiId?: string;
    transactionId?: string;
    processedAt?: Date;
  };
  createdAt: Date;
}

// Bank Details interface
export interface IBankDetails {
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  bankName: string;
  branchName?: string;
  upiId?: string;
  isVerified: boolean;
  verifiedAt?: Date;
}

// Merchant Wallet interface
export interface IMerchantWallet extends Document {
  merchant: Types.ObjectId;
  store: Types.ObjectId;
  balance: {
    total: number;        // Total earnings (before any deductions)
    available: number;    // Available for withdrawal
    pending: number;      // Pending settlement
    withdrawn: number;    // Total withdrawn
    held: number;         // On hold (disputes, etc.)
  };
  statistics: {
    totalSales: number;           // Gross sales (subtotals)
    totalPlatformFees: number;    // Total 15% fees deducted
    netSales: number;             // Net after fees (totalSales - totalPlatformFees)
    totalOrders: number;          // Number of orders
    averageOrderValue: number;    // Average order value
    totalRefunds: number;         // Total refunds issued
    totalWithdrawals: number;     // Total amount withdrawn
  };
  bankDetails?: IBankDetails;
  settlementCycle: 'instant' | 'daily' | 'weekly' | 'monthly';
  minWithdrawalAmount: number;
  transactions: IMerchantWalletTransaction[];
  isActive: boolean;
  lastSettlementAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  creditOrder(orderId: Types.ObjectId, orderNumber: string, grossAmount: number, platformFee: number): Promise<void>;
  requestWithdrawal(amount: number): Promise<IMerchantWalletTransaction>;
  getTransactionHistory(page?: number, limit?: number): IMerchantWalletTransaction[];
}

// Merchant Wallet Model interface with static methods
export interface IMerchantWalletModel extends Model<IMerchantWallet> {
  getOrCreateForMerchant(merchantId: Types.ObjectId, storeId: Types.ObjectId): Promise<IMerchantWallet>;
  getWalletSummary(merchantId: Types.ObjectId): Promise<any>;
}

// Transaction subdocument schema
const MerchantWalletTransactionSchema = new Schema({
  type: {
    type: String,
    enum: ['credit', 'debit', 'withdrawal', 'refund', 'adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  orderNumber: String,
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  withdrawalDetails: {
    bankAccount: String,
    ifscCode: String,
    upiId: String,
    transactionId: String,
    processedAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Bank Details subdocument schema
const BankDetailsSchema = new Schema({
  accountNumber: {
    type: String,
    required: true
  },
  ifscCode: {
    type: String,
    required: true
  },
  accountHolderName: {
    type: String,
    required: true
  },
  bankName: {
    type: String,
    required: true
  },
  branchName: String,
  upiId: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date
}, { _id: false });

// Main Merchant Wallet Schema
const MerchantWalletSchema = new Schema<IMerchantWallet, IMerchantWalletModel>({
  merchant: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  balance: {
    total: { type: Number, default: 0, min: 0 },
    available: { type: Number, default: 0, min: 0 },
    pending: { type: Number, default: 0, min: 0 },
    withdrawn: { type: Number, default: 0, min: 0 },
    held: { type: Number, default: 0, min: 0 }
  },
  statistics: {
    totalSales: { type: Number, default: 0, min: 0 },
    totalPlatformFees: { type: Number, default: 0, min: 0 },
    netSales: { type: Number, default: 0, min: 0 },
    totalOrders: { type: Number, default: 0, min: 0 },
    averageOrderValue: { type: Number, default: 0, min: 0 },
    totalRefunds: { type: Number, default: 0, min: 0 },
    totalWithdrawals: { type: Number, default: 0, min: 0 }
  },
  bankDetails: BankDetailsSchema,
  settlementCycle: {
    type: String,
    enum: ['instant', 'daily', 'weekly', 'monthly'],
    default: 'instant'  // Immediate settlement as per requirements
  },
  minWithdrawalAmount: {
    type: Number,
    default: 100,
    min: 0
  },
  transactions: [MerchantWalletTransactionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  lastSettlementAt: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
MerchantWalletSchema.index({ merchant: 1 }, { unique: true });
MerchantWalletSchema.index({ store: 1 });
MerchantWalletSchema.index({ 'balance.available': 1 });
MerchantWalletSchema.index({ 'transactions.createdAt': -1 });
MerchantWalletSchema.index({ 'transactions.orderId': 1 });

// Static method: Get or create wallet for merchant
MerchantWalletSchema.statics.getOrCreateForMerchant = async function(
  merchantId: Types.ObjectId,
  storeId: Types.ObjectId
): Promise<IMerchantWallet> {
  let wallet = await this.findOne({ merchant: merchantId });

  if (!wallet) {
    wallet = await this.create({
      merchant: merchantId,
      store: storeId,
      balance: {
        total: 0,
        available: 0,
        pending: 0,
        withdrawn: 0,
        held: 0
      },
      statistics: {
        totalSales: 0,
        totalPlatformFees: 0,
        netSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalRefunds: 0,
        totalWithdrawals: 0
      },
      settlementCycle: 'instant',
      transactions: [],
      isActive: true
    });
    logger.info(`💰 [MERCHANT WALLET] Created new wallet for merchant: ${merchantId}`);
  }

  return wallet;
};

// Static method: Get wallet summary
MerchantWalletSchema.statics.getWalletSummary = async function(
  merchantId: Types.ObjectId
): Promise<any> {
  const wallet = await this.findOne({ merchant: merchantId });

  if (!wallet) {
    return null;
  }

  // Get recent transactions (last 10)
  const recentTransactions = wallet.transactions
    .sort((a: IMerchantWalletTransaction, b: IMerchantWalletTransaction) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 10);

  return {
    balance: wallet.balance,
    statistics: wallet.statistics,
    settlementCycle: wallet.settlementCycle,
    bankDetailsConfigured: !!wallet.bankDetails?.isVerified,
    recentTransactions,
    lastSettlementAt: wallet.lastSettlementAt
  };
};

// Instance method: Credit order payment to wallet (idempotent + atomic)
MerchantWalletSchema.methods.creditOrder = async function(
  orderId: Types.ObjectId,
  orderNumber: string,
  grossAmount: number,
  platformFee: number
): Promise<void> {
  // IDEMPOTENCY CHECK — prevent double-crediting the same order
  const alreadyCredited = this.transactions.some(
    (t: any) => t.orderId && t.orderId.toString() === orderId.toString() && t.type === 'credit'
  );
  if (alreadyCredited) {
    logger.info(`⚠️ [MERCHANT WALLET] Order ${orderNumber} already credited, skipping duplicate`);
    return;
  }

  const netAmount = grossAmount - platformFee;

  // Create transaction record
  const transaction: IMerchantWalletTransaction = {
    type: 'credit',
    amount: grossAmount,
    platformFee: platformFee,
    netAmount: netAmount,
    orderId: orderId,
    orderNumber: orderNumber,
    description: `Payment received for order ${orderNumber}`,
    status: 'completed',
    createdAt: new Date()
  };

  // ATOMIC UPDATE — use $inc for balances and $push for transaction
  const updated = await (this.constructor as any).findOneAndUpdate(
    {
      _id: this._id,
      // Extra guard: ensure this orderId isn't already in transactions
      'transactions.orderId': { $ne: orderId }
    },
    {
      $inc: {
        'balance.total': grossAmount,
        'balance.available': netAmount,
        'statistics.totalSales': grossAmount,
        'statistics.totalPlatformFees': platformFee,
        'statistics.netSales': netAmount,
        'statistics.totalOrders': 1,
      },
      $push: { transactions: transaction },
      $set: { lastSettlementAt: new Date() }
    },
    { new: true }
  );

  if (!updated) {
    logger.info(`⚠️ [MERCHANT WALLET] Order ${orderNumber} credit skipped (concurrent duplicate)`);
    return;
  }

  // Recalculate average order value
  if (updated.statistics.totalOrders > 0) {
    updated.statistics.averageOrderValue = div(updated.statistics.totalSales, updated.statistics.totalOrders);
    await updated.save();
  }

  // Refresh local document
  this.balance = updated.balance;
  this.statistics = updated.statistics;
  this.lastSettlementAt = updated.lastSettlementAt;

  // Audit log — fire-and-forget
  logTransaction({
    userId: this.merchant,
    walletId: this._id,
    walletType: 'merchant',
    operation: 'credit',
    amount: netAmount,
    currency: 'INR',
    balanceBefore: {
      total: updated.balance.total - grossAmount,
      available: updated.balance.available - netAmount,
      pending: updated.balance.pending,
      cashback: 0,
    },
    balanceAfter: {
      total: updated.balance.total,
      available: updated.balance.available,
      pending: updated.balance.pending,
      cashback: 0,
    },
    reference: {
      type: 'order',
      id: orderId.toString(),
      orderNumber,
      description: `Order payment: gross ₹${grossAmount}, fee ₹${platformFee}, net ₹${netAmount}`,
    },
    metadata: { source: 'api' },
    status: 'success',
  });

  // Ledger entry: platform_float debit -> merchant_wallet credit (net payout)
  try {
    await ledgerService.recordEntry({
      debitAccount: { type: 'platform_float', id: ledgerService.getPlatformAccountId('platform_float') },
      creditAccount: { type: 'merchant_wallet', id: this.merchant },
      amount: netAmount,
      operationType: 'merchant_payout',
      referenceId: orderId.toString(),
      referenceModel: 'Order',
      metadata: {
        description: `Order credit: gross ${grossAmount}, fee ${platformFee}, net ${netAmount}`,
        idempotencyKey: `merchant-credit:${orderId}`,
      },
    });
  } catch (err) {
    logger.error('[MERCHANT WALLET] Ledger entry failed for creditOrder', err);
  }

  // Ledger entry: platform fee recording
  if (platformFee > 0) {
    try {
      await ledgerService.recordEntry({
        debitAccount: { type: 'platform_float', id: ledgerService.getPlatformAccountId('platform_float') },
        creditAccount: { type: 'platform_fees', id: ledgerService.getPlatformAccountId('platform_fees') },
        amount: platformFee,
        operationType: 'merchant_payout',
        referenceId: orderId.toString(),
        referenceModel: 'Order',
        metadata: {
          description: `Platform fee for order ${orderNumber}`,
          idempotencyKey: `platform-fee:${orderId}`,
        },
      });
    } catch (err) {
      logger.error('[MERCHANT WALLET] Platform fee ledger entry failed', err);
    }
  }

  logger.info(`[MERCHANT WALLET] Credited order ${orderNumber}:`, {
    gross: grossAmount,
    platformFee: platformFee,
    net: netAmount,
    newAvailable: updated.balance.available
  });
};

// Instance method: Request withdrawal
MerchantWalletSchema.methods.requestWithdrawal = async function(
  amount: number
): Promise<IMerchantWalletTransaction> {
  if (amount > this.balance.available) {
    throw new Error(`Insufficient balance. Available: ₹${this.balance.available}, Requested: ₹${amount}`);
  }

  if (amount < this.minWithdrawalAmount) {
    throw new Error(`Minimum withdrawal amount is ₹${this.minWithdrawalAmount}`);
  }

  if (!this.bankDetails?.isVerified) {
    throw new Error('Please verify your bank details before requesting withdrawal');
  }

  // Create withdrawal transaction
  const transaction: IMerchantWalletTransaction = {
    type: 'withdrawal',
    amount: amount,
    description: `Withdrawal request for ₹${amount}`,
    status: 'pending',
    withdrawalDetails: {
      bankAccount: this.bankDetails.accountNumber,
      ifscCode: this.bankDetails.ifscCode
    },
    createdAt: new Date()
  };

  // ATOMIC withdrawal — move funds from available to pending with balance guard
  const updated = await (this.constructor as any).findOneAndUpdate(
    {
      _id: this._id,
      'balance.available': { $gte: amount }
    },
    {
      $inc: {
        'balance.available': -amount,
        'balance.pending': amount,
      },
      $push: { transactions: transaction }
    },
    { new: true }
  );

  if (!updated) {
    throw new Error('Insufficient balance (concurrent withdrawal detected)');
  }

  // Refresh local document
  this.balance = updated.balance;

  // Audit log — fire-and-forget
  logTransaction({
    userId: this.merchant,
    walletId: this._id,
    walletType: 'merchant',
    operation: 'withdrawal',
    amount,
    currency: 'INR',
    balanceBefore: {
      total: updated.balance.total,
      available: updated.balance.available + amount,
      pending: updated.balance.pending - amount,
      cashback: 0,
    },
    balanceAfter: {
      total: updated.balance.total,
      available: updated.balance.available,
      pending: updated.balance.pending,
      cashback: 0,
    },
    reference: {
      type: 'withdrawal',
      description: `Withdrawal request for ₹${amount}`,
    },
    metadata: { source: 'api' },
    status: 'success',
  });

  logger.info(`💸 [MERCHANT WALLET] Withdrawal requested: ₹${amount}`);

  return transaction;
};

// Instance method: Get transaction history with pagination
MerchantWalletSchema.methods.getTransactionHistory = function(
  page: number = 1,
  limit: number = 20
): IMerchantWalletTransaction[] {
  const skip = (page - 1) * limit;

  return this.transactions
    .sort((a: IMerchantWalletTransaction, b: IMerchantWalletTransaction) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(skip, skip + limit);
};

// Create and export the model
export const MerchantWallet = mongoose.model<IMerchantWallet, IMerchantWalletModel>(
  'MerchantWallet',
  MerchantWalletSchema
);

export default MerchantWallet;
