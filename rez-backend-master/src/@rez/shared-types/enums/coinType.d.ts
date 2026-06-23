// @ts-nocheck
/**
 * @rez/shared/enums/coinType
 *
 * Canonical CoinType enum + normalization utility.
 *
 * The CoinType enum has 6 values covering all coin variants across the platform.
 * Legacy systems may use non-canonical string values (e.g., 'karma_points',
 * 'nuqta', 'rez_coins'). Use `normalizeCoinType()` to safely convert any
 * legacy value to a canonical CoinType.
 */
/**
 * CoinType enum defined here (source of truth) to break the circular dependency
 * between coinType.ts and index.ts. index.ts re-exports this enum.
 */
export declare enum CoinType {
  PROMO = 'promo',
  BRANDED = 'branded',
  PRIVE = 'prive',
  CASHBACK = 'cashback',
  REFERRAL = 'referral',
  REZ = 'rez',
}
/**
 * Canonical CoinType values as a readonly array.
 */
export declare const COIN_TYPE_VALUES: readonly [
  CoinType.PROMO,
  CoinType.BRANDED,
  CoinType.PRIVE,
  CoinType.CASHBACK,
  CoinType.REFERRAL,
  CoinType.REZ,
];
/**
 * Check if a string is a valid canonical CoinType value.
 */
export declare function isCanonicalCoinType(value: string): value is CoinType;
/**
 * Normalize any coin type string (including legacy variants) to a canonical CoinType.
 *
 * @param type - The coin type string to normalize (may be canonical or legacy)
 * @param fallback - Value returned if type is unknown (default: REZ)
 * @returns The canonical CoinType equivalent
 *
 * @example
 * normalizeCoinType('karma_points')  // → CoinType.REZ
 * normalizeCoinType('nuqta')          // → CoinType.REZ
 * normalizeCoinType('branded_coin')   // → CoinType.BRANDED
 * normalizeCoinType('promo')          // → CoinType.PROMO
 * normalizeCoinType('unknown_value')   // → CoinType.REZ (fallback)
 */
export declare function normalizeCoinType(type: string | null | undefined, fallback?: CoinType): CoinType;
/**
 * Normalize a coin type and assert it matches a specific type.
 * Useful for narrowing union types after normalization.
 */
export declare function normalizeCoinTypeAs<T extends CoinType>(type: string | null | undefined, assertType: T): T;
//# sourceMappingURL=coinType.d.ts.map
