/**
 * Centralized Currency Rules — single source of truth for all coin types.
 *
 * These defaults are used when WalletConfig hasn't been configured yet.
 * Admin can override via WalletConfig.coinExpiryConfig (GET/PUT /api/admin/wallet-config).
 */

export interface CoinTypeRule {
  /** Days until coins expire (0 = never expires) */
  expiryDays: number;
  /** Max % of transaction value payable with this coin type (0-100) */
  maxUsagePct: number;
  /** Conversion rate to base currency */
  conversionRate: number;
  /** Deduction priority — lower number = used first */
  priority: number;
}

export const CURRENCY_RULES: Record<string, CoinTypeRule> = {
  rez:     { expiryDays: 0,   maxUsagePct: 100, conversionRate: 1, priority: 4 },
  prive:   { expiryDays: 365, maxUsagePct: 100, conversionRate: 1, priority: 3 },
  promo:   { expiryDays: 90,  maxUsagePct: 20,  conversionRate: 1, priority: 1 },
  branded: { expiryDays: 0,   maxUsagePct: 100, conversionRate: 1, priority: 2 },  // 0 = never expires
};

export const COIN_TYPES = Object.keys(CURRENCY_RULES) as Array<keyof typeof CURRENCY_RULES>;
