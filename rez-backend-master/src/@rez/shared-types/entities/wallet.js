"use strict";
/**
 * Wallet entity — canonical shape for the `wallets` collection.
 *
 * Mirrors rezbackend/src/models/Wallet.ts.
 *
 * A user has exactly one Wallet document. Coin balances live in two places:
 *   - `coins[]` — ReZ, prive, promo, cashback, referral (universal coin types)
 *   - `brandedCoins[]` — merchant-scoped coins (expire in 6 months)
 *
 * Priority order for debits ("which bucket empties first") is the canonical
 * COIN_PRIORITY exported from `enums/coinType.ts`. Do NOT re-implement debit
 * ordering locally; use `COIN_PRIORITY_ORDER` and
 * `getValidNextWalletDebitCoin()` helpers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COIN_PRIORITY_ORDER = void 0;
exports.getValidNextWalletDebitCoin = getValidNextWalletDebitCoin;
const index_1 = require("../enums/index");
/**
 * Canonical debit priority — consume cheaper/more-constrained coins first.
 * Keep aligned with enums/index.ts COIN_PRIORITY.
 */
exports.COIN_PRIORITY_ORDER = [
    index_1.CoinType.PROMO,
    index_1.CoinType.BRANDED,
    index_1.CoinType.PRIVE,
    index_1.CoinType.CASHBACK,
    index_1.CoinType.REFERRAL,
    index_1.CoinType.REZ,
];
/**
 * Return the next coin type to debit from, given which ones still have balance.
 * Returns `null` if every bucket is empty in the provided set.
 */
function getValidNextWalletDebitCoin(availableCoins) {
    for (const type of exports.COIN_PRIORITY_ORDER) {
        if (availableCoins.has(type))
            return type;
    }
    return null;
}
//# sourceMappingURL=wallet.js.map