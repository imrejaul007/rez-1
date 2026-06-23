import { logger } from '../config/logger';
// Admin Wallet Service
// Handles platform commission crediting and wallet queries

import { Types } from 'mongoose';
import AdminWallet from '../models/AdminWallet';

class AdminWalletService {
  /**
   * Credit 5% commission from an order to the admin wallet
   */
  async creditOrderCommission(
    orderId: Types.ObjectId,
    orderNumber: string,
    orderSubtotal: number,
    rate: number = 0.05
  ): Promise<void> {
    try {
      const commission = Math.floor(orderSubtotal * rate);
      if (commission <= 0) {
        logger.info('[ADMIN WALLET] Commission is 0, skipping');
        return;
      }

      const wallet = await AdminWallet.getOrCreate();
      await wallet.creditCommission(orderId, orderNumber, commission);

      logger.info(`[ADMIN WALLET] Credited ${commission} commission from order ${orderNumber}`);
    } catch (error) {
      logger.error('[ADMIN WALLET] Failed to credit commission:', error);
      throw error;
    }
  }

  /**
   * Get wallet summary (balance + statistics)
   */
  async getWalletSummary() {
    const wallet = await AdminWallet.getOrCreate();
    return {
      balance: wallet.balance,
      statistics: wallet.statistics,
      recentTransactions: wallet.transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
    };
  }

  /**
   * Get paginated transaction history with optional date filters
   */
  async getTransactionHistory(
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date
  ) {
    const wallet = await AdminWallet.getOrCreate();

    let transactions = [...wallet.transactions];

    // Apply date filters
    if (startDate) {
      transactions = transactions.filter(t => new Date(t.createdAt) >= startDate);
    }
    if (endDate) {
      transactions = transactions.filter(t => new Date(t.createdAt) <= endDate);
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
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
   * Get daily commission breakdown for charts
   */
  async getDailyBreakdown(days: number = 30) {
    const wallet = await AdminWallet.getOrCreate();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Group transactions by day
    const dailyMap = new Map<string, { total: number; count: number }>();

    for (const tx of wallet.transactions) {
      const txDate = new Date(tx.createdAt);
      if (txDate >= startDate && tx.type === 'commission') {
        const dayKey = txDate.toISOString().split('T')[0];
        const existing = dailyMap.get(dayKey) || { total: 0, count: 0 };
        existing.total += tx.amount;
        existing.count += 1;
        dailyMap.set(dayKey, existing);
      }
    }

    // Convert to sorted array
    const breakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { breakdown, days };
  }
}

export default new AdminWalletService();
