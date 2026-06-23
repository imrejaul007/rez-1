import { logger } from '../config/logger';
import { Types } from 'mongoose';
import { MerchantWallet, IMerchantWallet, IMerchantWalletTransaction } from '../models/MerchantWallet';
import { Store } from '../models/Store';
import { Merchant } from '../models/Merchant';
import merchantNotificationService from './merchantNotificationService';
import { runFinancialTxn } from '../utils/financialTransactionWrapper';
import { ledgerService } from './ledgerService';
import type { Lean } from '../types/lean';

interface WalletSummary {
  balance: {
    total: number;
    available: number;
    pending: number;
    withdrawn: number;
    held: number;
  };
  statistics: {
    totalSales: number;
    totalPlatformFees: number;
    netSales: number;
    totalOrders: number;
    averageOrderValue: number;
    totalRefunds: number;
    totalWithdrawals: number;
  };
  settlementCycle: string;
  bankDetailsConfigured: boolean;
  recentTransactions: IMerchantWalletTransaction[];
  lastSettlementAt?: Date;
}

interface TransactionHistoryResult {
  transactions: IMerchantWalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class MerchantWalletService {
  /**
   * Get or create wallet for a merchant
   */
  async getOrCreateWallet(merchantId: string | Types.ObjectId, storeId?: string | Types.ObjectId): Promise<IMerchantWallet> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    // Try to find existing wallet
    const existingWallet = await MerchantWallet.findOne({ merchant: merchantObjectId }).lean();

    if (existingWallet) {
      return existingWallet as unknown as IMerchantWallet;
    }

    // If no storeId provided, try to find the merchant's store
    let storeObjectId: Types.ObjectId;

    if (storeId) {
      storeObjectId = typeof storeId === 'string' ? new Types.ObjectId(storeId) : storeId;
    } else {
      const store = await Store.findOne({ merchantId: merchantObjectId }).lean();
      if (!store) {
        throw new Error('No store found for this merchant');
      }
      storeObjectId = store._id as Types.ObjectId;
    }

    return MerchantWallet.getOrCreateForMerchant(merchantObjectId, storeObjectId);
  }

  /**
   * Credit order payment to merchant wallet
   * Called after successful payment
   */
  async creditOrderPayment(
    merchantId: string | Types.ObjectId,
    orderId: string | Types.ObjectId,
    orderNumber: string,
    grossAmount: number,
    platformFee: number,
    storeId?: string | Types.ObjectId
  ): Promise<{ balance: { total: number; available: number; pending: number } } | null> {
    try {
      // SECURITY: Refuse to credit an inactive merchant's wallet. An inactive
      // merchant is one whose account has been deactivated (ToS violation,
      // fraud hold, etc.). Crediting them would defeat the deactivation.
      const merchantRecord = await Merchant.findById(merchantId).select('isActive').lean();
      if (merchantRecord && merchantRecord.isActive === false) {
        logger.error('🚨 [MERCHANT WALLET] Refusing credit to inactive merchant', {
          merchantId: merchantId.toString(),
          orderId: orderId.toString(),
          grossAmount,
        });
        throw new Error('Merchant account is inactive — credit refused');
      }

      const wallet = await this.getOrCreateWallet(merchantId, storeId);

      const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

      await wallet.creditOrder(orderObjectId, orderNumber, grossAmount, platformFee);

      logger.info(`✅ [MERCHANT WALLET SERVICE] Credited ₹${grossAmount - platformFee} to merchant ${merchantId}`);

      // Return updated balance for real-time notifications
      return {
        balance: {
          total: wallet.balance.total,
          available: wallet.balance.available,
          pending: wallet.balance.pending
        }
      };
    } catch (error) {
      logger.error(`❌ [MERCHANT WALLET SERVICE] Failed to credit wallet:`, error);
      throw error;
    }
  }

  /**
   * Get wallet summary for a merchant
   */
  async getWalletSummary(merchantId: string | Types.ObjectId): Promise<WalletSummary | null> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    const summary = await MerchantWallet.getWalletSummary(merchantObjectId);

    return summary;
  }

  /**
   * Get transaction history with pagination
   */
  async getTransactionHistory(
    merchantId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20,
    type?: 'credit' | 'debit' | 'withdrawal' | 'refund' | 'adjustment'
  ): Promise<TransactionHistoryResult> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    const wallet = await MerchantWallet.findOne({ merchant: merchantObjectId }).lean();

    if (!wallet) {
      return {
        transactions: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }

    // Filter transactions by type if specified
    let transactions = wallet.transactions;
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }

    // Sort by date descending
    transactions = transactions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = transactions.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const paginatedTransactions = transactions.slice(skip, skip + limit);

    return {
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Request withdrawal from wallet
   */
  async requestWithdrawal(
    merchantId: string | Types.ObjectId,
    amount: number
  ): Promise<IMerchantWalletTransaction> {
    const wallet = await this.getOrCreateWallet(merchantId);

    const transaction = await wallet.requestWithdrawal(amount);

    logger.info(`💸 [MERCHANT WALLET SERVICE] Withdrawal requested: ₹${amount} for merchant ${merchantId}`);

    return transaction;
  }

  /**
   * Process withdrawal (admin action)
   */
  async processWithdrawal(
    merchantId: string | Types.ObjectId,
    transactionId: string,
    transactionReference: string
  ): Promise<void> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;
    const txnObjectId = new Types.ObjectId(transactionId);

    // Look up the pending withdrawal transaction (without .lean() so we can read subdoc data)
    const walletDoc = await MerchantWallet.findOne({
      merchant: merchantObjectId,
      'transactions._id': txnObjectId,
      'transactions.type': 'withdrawal',
      'transactions.status': 'pending',
    });

    if (!walletDoc) {
      throw new Error('Withdrawal transaction not found or already processed');
    }

    const transaction = walletDoc.transactions.find(
      t => t._id?.toString() === transactionId && t.type === 'withdrawal' && t.status === 'pending'
    );

    if (!transaction) {
      throw new Error('Withdrawal transaction not found or already processed');
    }

    const amount = transaction.amount;

    await runFinancialTxn(async ({ session, recordLedger }) => {
      // Atomic update: deduct pending, increment withdrawn + stats, set transaction status
      const updated = await MerchantWallet.findOneAndUpdate(
        {
          merchant: merchantObjectId,
          'transactions._id': txnObjectId,
          'transactions.status': 'pending',
          'balance.pending': { $gte: amount },
        },
        {
          $inc: {
            'balance.pending': -amount,
            'balance.withdrawn': amount,
            'statistics.totalWithdrawals': amount,
          },
          $set: {
            'transactions.$.status': 'completed',
            'transactions.$.withdrawalDetails.transactionId': transactionReference,
            'transactions.$.withdrawalDetails.processedAt': new Date(),
          },
        },
        { new: true, session }
      );

      if (!updated) {
        throw new Error('Failed to process withdrawal (concurrent update or insufficient pending balance)');
      }

      // Ledger: merchant_wallet debit -> platform_float credit (money leaves merchant)
      await recordLedger({
        debitAccount: { type: 'merchant_wallet', id: merchantObjectId },
        creditAccount: { type: 'platform_float', id: ledgerService.getPlatformAccountId('platform_float') },
        amount,
        operationType: 'withdrawal',
        referenceId: transactionId,
        referenceModel: 'MerchantWallet',
        metadata: {
          description: `Merchant withdrawal processed: ${amount}`,
          idempotencyKey: `merchant-withdrawal:${transactionId}`,
        },
      });
    });

    logger.info(`[MERCHANT WALLET SERVICE] Processed withdrawal: ${amount}`);

    // Send notification to merchant about successful withdrawal
    try {
      await merchantNotificationService.notifyWithdrawalStatus({
        merchantId: merchantObjectId.toString(),
        withdrawalId: transactionId,
        amount,
        status: 'completed',
      });
      logger.info('[MERCHANT WALLET SERVICE] Sent withdrawal completion notification');
    } catch (notifyError) {
      logger.warn('Failed to send withdrawal notification:', notifyError);
    }
  }

  /**
   * Reject withdrawal (admin action)
   */
  async rejectWithdrawal(
    merchantId: string | Types.ObjectId,
    transactionId: string,
    reason: string
  ): Promise<void> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;
    const txnObjectId = new Types.ObjectId(transactionId);

    // Look up the pending withdrawal transaction (without .lean())
    const walletDoc = await MerchantWallet.findOne({
      merchant: merchantObjectId,
      'transactions._id': txnObjectId,
      'transactions.type': 'withdrawal',
      'transactions.status': 'pending',
    });

    if (!walletDoc) {
      throw new Error('Withdrawal transaction not found or already processed');
    }

    const transaction = walletDoc.transactions.find(
      t => t._id?.toString() === transactionId && t.type === 'withdrawal' && t.status === 'pending'
    );

    if (!transaction) {
      throw new Error('Withdrawal transaction not found or already processed');
    }

    const amount = transaction.amount;

    await runFinancialTxn(async ({ session, recordLedger }) => {
      // Atomic update: return pending to available, set transaction status to failed
      const updated = await MerchantWallet.findOneAndUpdate(
        {
          merchant: merchantObjectId,
          'transactions._id': txnObjectId,
          'transactions.status': 'pending',
        },
        {
          $inc: {
            'balance.pending': -amount,
            'balance.available': amount,
          },
          $set: {
            'transactions.$.status': 'failed',
            'transactions.$.description': `${transaction.description} - Rejected: ${reason}`,
          },
        },
        { new: true, session }
      );

      if (!updated) {
        throw new Error('Failed to reject withdrawal (concurrent update)');
      }

      // Ledger: platform_float debit -> merchant_wallet credit (funds returned to merchant)
      await recordLedger({
        debitAccount: { type: 'platform_float', id: ledgerService.getPlatformAccountId('platform_float') },
        creditAccount: { type: 'merchant_wallet', id: merchantObjectId },
        amount,
        operationType: 'refund',
        referenceId: transactionId,
        referenceModel: 'MerchantWallet',
        metadata: {
          description: `Withdrawal rejected: ${reason}`,
          idempotencyKey: `merchant-withdrawal-reject:${transactionId}`,
        },
      });
    });

    logger.info(`[MERCHANT WALLET SERVICE] Rejected withdrawal: ${amount} - ${reason}`);

    // Send notification to merchant about rejected withdrawal
    try {
      await merchantNotificationService.notifyWithdrawalStatus({
        merchantId: merchantObjectId.toString(),
        withdrawalId: transactionId,
        amount,
        status: 'rejected',
        reason,
      });
      logger.info('[MERCHANT WALLET SERVICE] Sent withdrawal rejection notification');
    } catch (notifyError) {
      logger.warn('Failed to send withdrawal rejection notification:', notifyError);
    }
  }

  /**
   * Update bank details for a merchant
   */
  async updateBankDetails(
    merchantId: string | Types.ObjectId,
    bankDetails: {
      accountNumber: string;
      ifscCode: string;
      accountHolderName: string;
      bankName: string;
      branchName?: string;
      upiId?: string;
    }
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(merchantId);

    wallet.bankDetails = {
      ...bankDetails,
      isVerified: false  // Bank details need verification
    };

    await wallet.save();

    logger.info(`📝 [MERCHANT WALLET SERVICE] Updated bank details for merchant ${merchantId}`);
  }

  /**
   * Verify bank details (admin action)
   */
  async verifyBankDetails(merchantId: string | Types.ObjectId): Promise<void> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    const wallet = await MerchantWallet.findOne({ merchant: merchantObjectId });

    if (!wallet || !wallet.bankDetails) {
      throw new Error('Wallet or bank details not found');
    }

    wallet.bankDetails.isVerified = true;
    wallet.bankDetails.verifiedAt = new Date();

    await wallet.save();

    logger.info(`✅ [MERCHANT WALLET SERVICE] Bank details verified for merchant ${merchantId}`);
  }

  /**
   * Debit merchant wallet when awarding branded coins to a customer
   */
  async debitForCoinAward(
    merchantId: string | Types.ObjectId,
    storeId: string | Types.ObjectId,
    amount: number,
    userId: string,
    reason: string
  ): Promise<{ newBalance: { total: number; available: number } }> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    // Atomic deduction with $gte guard — prevents double-spend on concurrent requests
    const transaction: IMerchantWalletTransaction = {
      type: 'debit',
      amount,
      netAmount: amount,
      description: reason,
      status: 'completed',
      createdAt: new Date()
    };

    const result = await MerchantWallet.findOneAndUpdate(
      {
        merchant: merchantObjectId,
        'balance.available': { $gte: amount }
      },
      {
        $inc: {
          'balance.available': -amount,
          'balance.total': -amount
        },
        $push: { transactions: transaction }
      },
      { new: true }
    );

    if (!result) {
      // Check if wallet exists to provide better error message
      const wallet = await this.getOrCreateWallet(merchantId, storeId);
      throw new Error(
        `Insufficient wallet balance. Available: ${wallet.balance.available}, Requested: ${amount}`
      );
    }

    return {
      newBalance: {
        total: result.balance.total,
        available: result.balance.available
      }
    };
  }

  /**
   * Handle refund - deduct from merchant wallet
   */
  async handleRefund(
    merchantId: string | Types.ObjectId,
    orderId: string | Types.ObjectId,
    orderNumber: string,
    refundAmount: number,
    platformFeeRefund: number
  ): Promise<void> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;
    const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

    const netRefund = refundAmount - platformFeeRefund;

    // Create refund transaction
    const transaction: IMerchantWalletTransaction = {
      type: 'refund',
      amount: refundAmount,
      platformFee: platformFeeRefund,
      netAmount: netRefund,
      orderId: orderObjectId,
      orderNumber: orderNumber,
      description: `Refund for order ${orderNumber}`,
      status: 'completed',
      createdAt: new Date()
    };

    await runFinancialTxn(async ({ session, recordLedger }) => {
      // Atomic update with $gte guard to prevent negative balance
      const updated = await MerchantWallet.findOneAndUpdate(
        {
          merchant: merchantObjectId,
          'balance.available': { $gte: netRefund },
        },
        {
          $inc: {
            'balance.available': -netRefund,
            'statistics.totalRefunds': refundAmount,
          },
          $push: { transactions: transaction },
        },
        { new: true, session }
      );

      if (!updated) {
        // Check if wallet exists to provide better error
        const exists = await MerchantWallet.exists({ merchant: merchantObjectId }).session(session);
        if (!exists) {
          throw new Error('Wallet not found');
        }
        throw new Error(`Insufficient merchant wallet balance for refund of ${netRefund}`);
      }

      // Ledger: merchant_wallet debit -> platform_float credit (refund deducted from merchant)
      await recordLedger({
        debitAccount: { type: 'merchant_wallet', id: merchantObjectId },
        creditAccount: { type: 'platform_float', id: ledgerService.getPlatformAccountId('platform_float') },
        amount: netRefund,
        operationType: 'order_refund',
        referenceId: orderObjectId.toString(),
        referenceModel: 'Order',
        metadata: {
          description: `Refund for order ${orderNumber}: gross ${refundAmount}, fee refund ${platformFeeRefund}, net ${netRefund}`,
          idempotencyKey: `merchant-refund:${orderObjectId}`,
        },
      });
    });

    logger.info(`[MERCHANT WALLET SERVICE] Processed refund: ${netRefund} for order ${orderNumber}`);
  }

  /**
   * Get all merchant wallets (admin)
   */
  async getAllWallets(
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'statistics.totalSales',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{
    wallets: Lean<IMerchantWallet>[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const [wallets, total] = await Promise.all([
      MerchantWallet.find({ isActive: true })
        .populate('merchant', 'name email phone')
        .populate('store', 'name logo')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      MerchantWallet.countDocuments({ isActive: true })
    ]);

    return {
      wallets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get platform-wide wallet statistics (admin)
   */
  async getPlatformStats(): Promise<{
    totalMerchants: number;
    totalSales: number;
    totalPlatformFees: number;
    totalNetSales: number;
    totalPendingWithdrawals: number;
    totalWithdrawn: number;
  }> {
    const stats = await MerchantWallet.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalMerchants: { $sum: 1 },
          totalSales: { $sum: '$statistics.totalSales' },
          totalPlatformFees: { $sum: '$statistics.totalPlatformFees' },
          totalNetSales: { $sum: '$statistics.netSales' },
          totalPendingWithdrawals: { $sum: '$balance.pending' },
          totalWithdrawn: { $sum: '$balance.withdrawn' }
        }
      }
    ]);

    return stats[0] || {
      totalMerchants: 0,
      totalSales: 0,
      totalPlatformFees: 0,
      totalNetSales: 0,
      totalPendingWithdrawals: 0,
      totalWithdrawn: 0
    };
  }
}

// Export singleton instance
export const merchantWalletService = new MerchantWalletService();
export default merchantWalletService;
