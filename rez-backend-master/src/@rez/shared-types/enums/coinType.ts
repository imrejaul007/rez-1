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
export enum CoinType {
  PROMO = 'promo',
  BRANDED = 'branded',
  PRIVE = 'prive',
  CASHBACK = 'cashback',
  REFERRAL = 'referral',
  REZ = 'rez',
}

/**
 * Legacy → canonical CoinType mapping.
 * Covers all known non-canonical variants used across services.
 */
const COIN_TYPE_ALIASES: Readonly<Record<string, CoinType>> = {
  // Legacy ruFlo naming
  nuqta: CoinType.REZ,
  wasil_coins: CoinType.REZ,
  wasil_bonus: CoinType.REZ,
  earning: CoinType.REZ,
  earnings: CoinType.REZ,

  // Karma system variants
  karma_points: CoinType.REZ,
  karma_coins: CoinType.REZ,

  // Consumer app display names
  rez_coins: CoinType.REZ,
  branded_coin: CoinType.BRANDED,
  branded_coins: CoinType.BRANDED,
  prive_coins: CoinType.PRIVE,

  // Other legacy variants
  loyalty: CoinType.REZ,
  reward: CoinType.PROMO,
  bonus: CoinType.PROMO,
  promotional: CoinType.PROMO,
  promotional_coins: CoinType.PROMO,

  // Case-insensitive fallbacks
  promo: CoinType.PROMO,
  branded: CoinType.BRANDED,
  prive: CoinType.PRIVE,
  cashback: CoinType.CASHBACK,
  referral: CoinType.REFERRAL,
  rez: CoinType.REZ,
};

/**
 * Canonical CoinType values as a readonly array.
 */
export const COIN_TYPE_VALUES = [
  CoinType.PROMO,
  CoinType.BRANDED,
  CoinType.PRIVE,
  CoinType.CASHBACK,
  CoinType.REFERRAL,
  CoinType.REZ,
] as const;

/**
 * Check if a string is a valid canonical CoinType value.
 */
export function isCanonicalCoinType(value: string): value is CoinType {
  return (COIN_TYPE_VALUES as readonly string[]).includes(value);
}

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
export function normalizeCoinType(type: string | null | undefined, fallback: CoinType = CoinType.REZ): CoinType {
  if (!type) return fallback;
  const normalized = type.toLowerCase().trim();
  return COIN_TYPE_ALIASES[normalized] ?? fallback;
}

/**
 * Normalize a coin type and assert it matches a specific type.
 * Useful for narrowing union types after normalization.
 */
export function normalizeCoinTypeAs<T extends CoinType>(type: string | null | undefined, assertType: T): T {
  const normalized = normalizeCoinType(type, assertType);
  if (normalized === assertType) return assertType;
  throw new Error(`Expected coin type ${assertType} but got ${normalized} (from input ${type})`);
}
