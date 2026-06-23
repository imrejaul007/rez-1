// Earnings Calculation Service
// Provides accurate calculation methods for earnings breakdown and analytics

import { TransactionResponse } from './walletApi';

/**
 * Earnings breakdown by category
 */
export interface EarningsBreakdown {
  videos: number;
  projects: number;
  referrals: number;
  cashback: number;
  socialMedia: number;
  bonus: number;
  total: number;
}

/**
 * Date range for calculations
 */
export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Earnings statistics
 */
export interface EarningsStats {
  totalEarnings: number;
  availableBalance: number;
  pendingEarnings: number;
  breakdown: EarningsBreakdown;
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  transactionCount: number;
}

/**
 * Transaction category mapping
 */
const CATEGORY_MAPPINGS = {
  VIDEOS: ['video', 'videos', 'project'],
  PROJECTS: ['project', 'task', 'work'],
  REFERRALS: ['referral', 'refer', 'invitation'],
  CASHBACK: ['cashback', 'rebate', 'discount'],
  SOCIAL_MEDIA: ['social', 'instagram', 'facebook', 'youtube', 'tiktok'],
  BONUS: ['bonus', 'reward', 'achievement', 'milestone'],
};

/**
 * Earnings Calculation Service
 */
class EarningsCalculationService {
  /**
   * Calculate earnings breakdown from transactions
   */
  calculateBreakdown(transactions: TransactionResponse[]): EarningsBreakdown {

    const breakdown: EarningsBreakdown = {
      videos: 0,
      projects: 0,
      referrals: 0,
      cashback: 0,
      socialMedia: 0,
      bonus: 0,
      total: 0,
    };

    // Filter only credit transactions (earnings)
    const earnings = transactions.filter((t) => t.type === 'credit');

    earnings.forEach((transaction) => {
      const amount = this.parseAmount(transaction.amount);

      // Categorize based on category field
      if (transaction.category === 'cashback') {
        breakdown.cashback += amount;
      } else if (transaction.category === 'bonus') {
        breakdown.bonus += amount;
      } else if (transaction.category === 'earning') {
        // Further categorize based on source type
        const sourceType = transaction.source?.type?.toLowerCase() || '';
        const description = transaction.description?.toLowerCase() || '';

        if (this.matchesCategory(sourceType, description, CATEGORY_MAPPINGS.REFERRALS)) {
          breakdown.referrals += amount;
        } else if (this.matchesCategory(sourceType, description, CATEGORY_MAPPINGS.SOCIAL_MEDIA)) {
          breakdown.socialMedia += amount;
        } else if (this.matchesCategory(sourceType, description, CATEGORY_MAPPINGS.VIDEOS)) {
          breakdown.videos += amount;
        } else if (this.matchesCategory(sourceType, description, CATEGORY_MAPPINGS.PROJECTS)) {
          breakdown.projects += amount;
        } else {
          // Default to projects for generic earnings
          breakdown.projects += amount;
        }
      } else {
        // Fallback categorization based on source type
        const sourceType = transaction.source?.type?.toLowerCase() || '';

        if (sourceType.includes('referral')) {
          breakdown.referrals += amount;
        } else if (sourceType.includes('social')) {
          breakdown.socialMedia += amount;
        } else {
          breakdown.bonus += amount;
        }
      }
    });

    // Calculate total
    breakdown.total = this.roundToTwoDecimals(
      breakdown.videos +
      breakdown.projects +
      breakdown.referrals +
      breakdown.cashback +
      breakdown.socialMedia +
      breakdown.bonus
    );
    return breakdown;
  }

  /**
   * Calculate earnings for a specific date range
   */
  calculateByDateRange(
    transactions: TransactionResponse[],
    dateRange: DateRange
  ): EarningsBreakdown {
    const filtered = transactions.filter((t) => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate >= dateRange.from && transactionDate <= dateRange.to;
    });

    return this.calculateBreakdown(filtered);
  }

  /**
   * Calculate daily average earnings
   */
  calculateDailyAverage(transactions: TransactionResponse[]): number {
    if (transactions.length === 0) return 0;

    const earnings = transactions.filter((t) => t.type === 'credit');
    const total = earnings.reduce((sum, t) => sum + this.parseAmount(t.amount), 0);

    // Get date range
    const dates = earnings.map((t) => new Date(t.createdAt).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const daysDiff = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));

    return this.roundToTwoDecimals(total / daysDiff);
  }

  /**
   * Calculate weekly average earnings
   */
  calculateWeeklyAverage(transactions: TransactionResponse[]): number {
    return this.roundToTwoDecimals(this.calculateDailyAverage(transactions) * 7);
  }

  /**
   * Calculate monthly average earnings
   */
  calculateMonthlyAverage(transactions: TransactionResponse[]): number {
    return this.roundToTwoDecimals(this.calculateDailyAverage(transactions) * 30);
  }

  /**
   * Calculate pending earnings
   */
  calculatePendingEarnings(transactions: TransactionResponse[]): number {
    const pending = transactions.filter(
      (t) => t.type === 'credit' && t.status?.current === 'pending'
    );
    const total = pending.reduce((sum, t) => sum + this.parseAmount(t.amount), 0);
    return this.roundToTwoDecimals(total);
  }

  /**
   * Calculate complete earnings statistics
   */
  calculateStats(
    transactions: TransactionResponse[],
    availableBalance: number
  ): EarningsStats {
    const breakdown = this.calculateBreakdown(transactions);
    const pendingEarnings = this.calculatePendingEarnings(transactions);

    return {
      totalEarnings: breakdown.total,
      availableBalance: this.roundToTwoDecimals(availableBalance),
      pendingEarnings,
      breakdown,
      dailyAverage: this.calculateDailyAverage(transactions),
      weeklyAverage: this.calculateWeeklyAverage(transactions),
      monthlyAverage: this.calculateMonthlyAverage(transactions),
      transactionCount: transactions.filter((t) => t.type === 'credit').length,
    };
  }

  /**
   * Format currency with proper decimal handling
   */
  formatCurrency(amount: number): string {
    return `₹${this.roundToTwoDecimals(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Calculate percentage of total
   */
  calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return this.roundToTwoDecimals((part / total) * 100);
  }

  /**
   * Group transactions by date
   */
  groupByDate(transactions: TransactionResponse[]): Map<string, TransactionResponse[]> {
    const grouped = new Map<string, TransactionResponse[]>();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.createdAt).toLocaleDateString('en-IN');
      const existing = grouped.get(date) || [];
      existing.push(transaction);
      grouped.set(date, existing);
    });

    return grouped;
  }

  /**
   * Group transactions by month
   */
  groupByMonth(transactions: TransactionResponse[]): Map<string, TransactionResponse[]> {
    const grouped = new Map<string, TransactionResponse[]>();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = grouped.get(monthKey) || [];
      existing.push(transaction);
      grouped.set(monthKey, existing);
    });

    return grouped;
  }

  /**
   * Calculate earnings trend (comparing current period with previous)
   */
  calculateTrend(
    currentPeriod: TransactionResponse[],
    previousPeriod: TransactionResponse[]
  ): {
    current: number;
    previous: number;
    difference: number;
    percentageChange: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const currentTotal = currentPeriod
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + this.parseAmount(t.amount), 0);

    const previousTotal = previousPeriod
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + this.parseAmount(t.amount), 0);

    const difference = this.roundToTwoDecimals(currentTotal - previousTotal);
    const percentageChange = previousTotal > 0
      ? this.roundToTwoDecimals((difference / previousTotal) * 100)
      : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (difference > 0) trend = 'up';
    else if (difference < 0) trend = 'down';

    return {
      current: this.roundToTwoDecimals(currentTotal),
      previous: this.roundToTwoDecimals(previousTotal),
      difference,
      percentageChange,
      trend,
    };
  }

  /**
   * Get top earning sources
   */
  getTopSources(
    transactions: TransactionResponse[],
    limit: number = 5
  ): Array<{ source: string; amount: number; count: number }> {
    const earnings = transactions.filter((t) => t.type === 'credit');
    const sourceMap = new Map<string, { amount: number; count: number }>();

    earnings.forEach((transaction) => {
      const source = transaction.source?.type || 'Other';
      const existing = sourceMap.get(source) || { amount: 0, count: 0 };
      existing.amount += this.parseAmount(transaction.amount);
      existing.count += 1;
      sourceMap.set(source, existing);
    });

    return Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        amount: this.roundToTwoDecimals(data.amount),
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  /**
   * Private helper: Parse amount and ensure it's a valid number
   */
  private parseAmount(amount: any): number {
    const parsed = typeof amount === 'number' ? amount : parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Private helper: Round to two decimal places
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Private helper: Check if source/description matches category
   */
  private matchesCategory(
    sourceType: string,
    description: string,
    keywords: string[]
  ): boolean {
    return keywords.some(
      (keyword) =>
        sourceType.includes(keyword) || description.includes(keyword)
    );
  }
}

// Export singleton instance
const earningsCalculationService = new EarningsCalculationService();
export default earningsCalculationService;
