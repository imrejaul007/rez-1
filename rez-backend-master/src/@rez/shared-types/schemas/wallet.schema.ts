// @ts-nocheck
/**
 * Wallet zod schemas — API-boundary validation.
 *
 * Covers the three hot paths: debit (spend), credit (earn), and balance
 * responses. Idempotency key is REQUIRED on every mutation (debit/credit)
 * — making it optional was the single biggest source of the double-credit
 * incidents the cashback worker was catching. The v2 schema treats that
 * as a contract bug and rejects requests without one.
 */

import { z } from 'zod';

const ObjectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');
const DateOrString = z.union([z.date(), z.string()]);

export const COIN_TYPE = z.enum(['promo', 'branded', 'prive', 'cashback', 'referral', 'rez']);

export const COIN_TRANSACTION_TYPE = z.enum(['earned', 'spent', 'expired', 'refunded', 'bonus', 'branded_award']);

export const TRANSACTION_STATUS = z.enum(['pending', 'completed', 'failed']);

export const WalletBalanceSchema = z
  .object({
    total: z.number().min(0),
    available: z.number().min(0),
    pending: z.number().min(0),
    cashback: z.number().min(0),
  })
  .strict();

export const CoinSchema = z
  .object({
    type: COIN_TYPE,
    amount: z.number().min(0),
    isActive: z.boolean(),
    earnedDate: DateOrString.optional(),
    lastUsed: DateOrString.optional(),
    lastEarned: DateOrString.optional(),
    expiryDate: DateOrString.optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'color must be #RRGGBB')
      .optional(),
  })
  .strict();

export const BrandedCoinSchema = z
  .object({
    merchantId: ObjectIdString,
    merchantName: z.string().min(1),
    merchantLogo: z.string().optional(),
    merchantColor: z.string().optional(),
    amount: z.number().min(0),
    earnedDate: DateOrString,
    lastUsed: DateOrString.optional(),
    expiresAt: DateOrString.optional(),
    isActive: z.boolean(),
  })
  .strict();

/** Metadata accepts primitives only — anything richer belongs on the row itself. */
const WalletMetadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

/** Debit (spend) — idempotencyKey is REQUIRED. */
export const WalletDebitSchema = z
  .object({
    user: ObjectIdString,
    amount: z.number().positive('Debit amount must be positive'),
    source: z.string().min(1, 'Source is required'),
    sourceId: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    merchantId: ObjectIdString.optional(),
    metadata: WalletMetadataSchema.optional(),
    /** REQUIRED in v2 — must be unique per logical debit. */
    idempotencyKey: z.string().min(8, 'idempotencyKey must be at least 8 chars'),
  })
  .strict();

/** Credit (earn) — idempotencyKey is REQUIRED. */
export const WalletCreditSchema = z
  .object({
    user: ObjectIdString,
    coinType: COIN_TYPE,
    amount: z.number().positive('Credit amount must be positive'),
    source: z.string().min(1, 'Source is required'),
    sourceId: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    merchantId: ObjectIdString.optional(),
    expiryDate: DateOrString.optional(),
    metadata: WalletMetadataSchema.optional(),
    idempotencyKey: z.string().min(8, 'idempotencyKey must be at least 8 chars'),
  })
  .strict();

export const CoinTransactionResponseSchema = z
  .object({
    _id: z.string().optional(),
    user: z.string(),
    type: COIN_TRANSACTION_TYPE,
    coinType: COIN_TYPE,
    amount: z.number().min(0),
    balanceBefore: z.number().min(0),
    balanceAfter: z.number().min(0),
    source: z.string(),
    sourceId: z.string().optional(),
    description: z.string(),
    merchantId: z.string().optional(),
    metadata: WalletMetadataSchema.optional(),
    idempotencyKey: z.string().optional(),
    status: TRANSACTION_STATUS,
    createdAt: DateOrString,
    updatedAt: DateOrString.optional(),
  })
  .strip();

export const CoinTransactionListResponseSchema = z.array(CoinTransactionResponseSchema);

export const WalletBalanceResponseSchema = z
  .object({
    user: z.string(),
    balance: WalletBalanceSchema,
    coins: z.array(CoinSchema),
    brandedCoins: z.array(BrandedCoinSchema).optional(),
    currency: z.string(),
    isFrozen: z.boolean(),
    isActive: z.boolean(),
    updatedAt: DateOrString.optional(),
  })
  .strip();

export type WalletDebitRequest = z.infer<typeof WalletDebitSchema>;
export type WalletCreditRequest = z.infer<typeof WalletCreditSchema>;
export type CoinTransactionResponse = z.infer<typeof CoinTransactionResponseSchema>;
export type CoinTransactionListResponse = z.infer<typeof CoinTransactionListResponseSchema>;
export type WalletBalanceResponse = z.infer<typeof WalletBalanceResponseSchema>;
export type CoinType = z.infer<typeof COIN_TYPE>;
export type CoinTransactionType = z.infer<typeof COIN_TRANSACTION_TYPE>;
export type TransactionStatus = z.infer<typeof TRANSACTION_STATUS>;

export const COIN_PRIORITY_ORDER: readonly CoinType[] = [
  'promo',
  'branded',
  'prive',
  'cashback',
  'referral',
  'rez',
] as const;
