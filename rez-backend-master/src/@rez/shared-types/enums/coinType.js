"use strict";
/**
 * @rez/shared-types/enums/coinType
 *
 * Canonical CoinType enum + normalization utility.
 *
 * The CoinType enum has 6 values covering all coin variants across the platform.
 * Legacy systems may use non-canonical string values (e.g., 'karma_points',
 * 'nuqta', 'rez_coins'). Use `normalizeCoinType()` to safely convert any
 * legacy value to a canonical CoinType.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COIN_TYPE_VALUES = exports.CoinType = void 0;
exports.isCanonicalCoinType = isCanonicalCoinType;
exports.normalizeCoinType = normalizeCoinType;
exports.normalizeCoinTypeAs = normalizeCoinTypeAs;
/**
 * CoinType enum defined here (source of truth) to break the circular dependency
 * between coinType.ts and index.ts. index.ts re-exports this enum.
 */
var CoinType;
(function (CoinType) {
    CoinType["PROMO"] = "promo";
    CoinType["BRANDED"] = "branded";
    CoinType["PRIVE"] = "prive";
    CoinType["CASHBACK"] = "cashback";
    CoinType["REFERRAL"] = "referral";
    CoinType["REZ"] = "rez";
})(CoinType || (exports.CoinType = CoinType = {}));
/**
 * Legacy → canonical CoinType mapping.
 * Covers all known non-canonical variants used across services.
 */
const COIN_TYPE_ALIASES = {
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
exports.COIN_TYPE_VALUES = [
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
function isCanonicalCoinType(value) {
    return exports.COIN_TYPE_VALUES.includes(value);
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
function normalizeCoinType(type, fallback = CoinType.REZ) {
    if (!type)
        return fallback;
    const normalized = type.toLowerCase().trim();
    return COIN_TYPE_ALIASES[normalized] ?? fallback;
}
/**
 * Normalize a coin type and assert it matches a specific type.
 * Useful for narrowing union types after normalization.
 */
function normalizeCoinTypeAs(type, assertType) {
    const normalized = normalizeCoinType(type, assertType);
    if (normalized === assertType)
        return assertType;
    throw new Error(`Expected coin type ${assertType} but got ${normalized} (from input ${type})`);
}
//# sourceMappingURL=coinType.js.map