/**
 * Canonical coin type enum for the REZ platform.
 *
 * Used by both Wallet (bucket classification) and CoinTransaction (ledger entries).
 * All new code and model schemas must import from this file — never define inline.
 *
 * Source of truth: rez-shared/src/constants/coins.ts — this file mirrors it.
 * WALLET-03 fix: 'nuqta' removed from COIN_TYPE_VALUES. It was a legacy pre-rebrand
 * name for 'rez' present in existing MongoDB documents. Use normalizeCoinType() from
 * @rez/shared to canonicalize legacy 'nuqta' values when reading existing docs.
 * New documents must NEVER write 'nuqta'.
 *
 * Type semantics:
 *   rez      — Canonical universal REZ coin (never expire, earned from purchases/check-ins)
 *   prive    — Premium tier coins; 12-month expiry; earned from campaigns/elite tier
 *   branded  — Merchant-specific coins; 6-month expiry; scoped to a single merchant
 *   promo    — Limited-time promotional coins; campaign-based expiry
 *   cashback — Cashback rewards; credited to Wallet.balance.cashback bucket
 *   referral — Referral bonus coins; credited to Wallet.balance.available
 */
export const COIN_TYPE_VALUES = ['rez', 'prive', 'branded', 'promo', 'cashback', 'referral'] as const;

export type CoinType = (typeof COIN_TYPE_VALUES)[number];
