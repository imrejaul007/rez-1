"use strict";
/**
 * Wallet zod schemas — API-boundary validation.
 *
 * Covers the three hot paths: debit (spend), credit (earn), and balance
 * responses. Idempotency key is REQUIRED on every mutation (debit/credit)
 * — making it optional was the single biggest source of the double-credit
 * incidents the cashback worker was catching. The v2 schema treats that
 * as a contract bug and rejects requests without one.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COIN_PRIORITY_ORDER = exports.WalletBalanceResponseSchema = exports.CoinTransactionListResponseSchema = exports.CoinTransactionResponseSchema = exports.WalletCreditSchema = exports.WalletDebitSchema = exports.BrandedCoinSchema = exports.CoinSchema = exports.WalletBalanceSchema = exports.TRANSACTION_STATUS = exports.COIN_TRANSACTION_TYPE = exports.COIN_TYPE = void 0;
const zod_1 = require("zod");
const ObjectIdString = zod_1.z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');
const DateOrString = zod_1.z.union([zod_1.z.date(), zod_1.z.string()]);
exports.COIN_TYPE = zod_1.z.enum(['promo', 'branded', 'prive', 'cashback', 'referral', 'rez']);
exports.COIN_TRANSACTION_TYPE = zod_1.z.enum([
    'earned',
    'spent',
    'expired',
    'refunded',
    'bonus',
    'branded_award',
]);
exports.TRANSACTION_STATUS = zod_1.z.enum(['pending', 'completed', 'failed']);
exports.WalletBalanceSchema = zod_1.z
    .object({
    total: zod_1.z.number().min(0),
    available: zod_1.z.number().min(0),
    pending: zod_1.z.number().min(0),
    cashback: zod_1.z.number().min(0),
})
    .strict();
exports.CoinSchema = zod_1.z
    .object({
    type: exports.COIN_TYPE,
    amount: zod_1.z.number().min(0),
    isActive: zod_1.z.boolean(),
    earnedDate: DateOrString.optional(),
    lastUsed: DateOrString.optional(),
    lastEarned: DateOrString.optional(),
    expiryDate: DateOrString.optional(),
    color: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color must be #RRGGBB').optional(),
})
    .strict();
exports.BrandedCoinSchema = zod_1.z
    .object({
    merchantId: ObjectIdString,
    merchantName: zod_1.z.string().min(1),
    merchantLogo: zod_1.z.string().optional(),
    merchantColor: zod_1.z.string().optional(),
    amount: zod_1.z.number().min(0),
    earnedDate: DateOrString,
    lastUsed: DateOrString.optional(),
    expiresAt: DateOrString.optional(),
    isActive: zod_1.z.boolean(),
})
    .strict();
/** Metadata accepts primitives only — anything richer belongs on the row itself. */
const WalletMetadataSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.null()]));
/** Debit (spend) — idempotencyKey is REQUIRED. */
exports.WalletDebitSchema = zod_1.z
    .object({
    user: ObjectIdString,
    amount: zod_1.z.number().positive('Debit amount must be positive'),
    source: zod_1.z.string().min(1, 'Source is required'),
    sourceId: zod_1.z.string().optional(),
    description: zod_1.z.string().min(1, 'Description is required'),
    merchantId: ObjectIdString.optional(),
    metadata: WalletMetadataSchema.optional(),
    /** REQUIRED in v2 — must be unique per logical debit. */
    idempotencyKey: zod_1.z.string().min(8, 'idempotencyKey must be at least 8 chars'),
})
    .strict();
/** Credit (earn) — idempotencyKey is REQUIRED. */
exports.WalletCreditSchema = zod_1.z
    .object({
    user: ObjectIdString,
    coinType: exports.COIN_TYPE,
    amount: zod_1.z.number().positive('Credit amount must be positive'),
    source: zod_1.z.string().min(1, 'Source is required'),
    sourceId: zod_1.z.string().optional(),
    description: zod_1.z.string().min(1, 'Description is required'),
    merchantId: ObjectIdString.optional(),
    expiryDate: DateOrString.optional(),
    metadata: WalletMetadataSchema.optional(),
    idempotencyKey: zod_1.z.string().min(8, 'idempotencyKey must be at least 8 chars'),
})
    .strict();
exports.CoinTransactionResponseSchema = zod_1.z
    .object({
    _id: zod_1.z.string().optional(),
    user: zod_1.z.string(),
    type: exports.COIN_TRANSACTION_TYPE,
    coinType: exports.COIN_TYPE,
    amount: zod_1.z.number().min(0),
    balanceBefore: zod_1.z.number().min(0),
    balanceAfter: zod_1.z.number().min(0),
    source: zod_1.z.string(),
    sourceId: zod_1.z.string().optional(),
    description: zod_1.z.string(),
    merchantId: zod_1.z.string().optional(),
    metadata: WalletMetadataSchema.optional(),
    idempotencyKey: zod_1.z.string().optional(),
    status: exports.TRANSACTION_STATUS,
    createdAt: DateOrString,
    updatedAt: DateOrString.optional(),
})
    .strip();
exports.CoinTransactionListResponseSchema = zod_1.z.array(exports.CoinTransactionResponseSchema);
exports.WalletBalanceResponseSchema = zod_1.z
    .object({
    user: zod_1.z.string(),
    balance: exports.WalletBalanceSchema,
    coins: zod_1.z.array(exports.CoinSchema),
    brandedCoins: zod_1.z.array(exports.BrandedCoinSchema).optional(),
    currency: zod_1.z.string(),
    isFrozen: zod_1.z.boolean(),
    isActive: zod_1.z.boolean(),
    updatedAt: DateOrString.optional(),
})
    .strip();
exports.COIN_PRIORITY_ORDER = [
    'promo',
    'branded',
    'prive',
    'cashback',
    'referral',
    'rez',
];
//# sourceMappingURL=wallet.schema.js.map