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
export declare const COIN_TYPE: z.ZodEnum<['promo', 'branded', 'prive', 'cashback', 'referral', 'rez']>;
export declare const COIN_TRANSACTION_TYPE: z.ZodEnum<
  ['earned', 'spent', 'expired', 'refunded', 'bonus', 'branded_award']
>;
export declare const TRANSACTION_STATUS: z.ZodEnum<['pending', 'completed', 'failed']>;
export declare const WalletBalanceSchema: z.ZodObject<
  {
    total: z.ZodNumber;
    available: z.ZodNumber;
    pending: z.ZodNumber;
    cashback: z.ZodNumber;
  },
  'strict',
  z.ZodTypeAny,
  {
    cashback?: number;
    total?: number;
    available?: number;
    pending?: number;
  },
  {
    cashback?: number;
    total?: number;
    available?: number;
    pending?: number;
  }
>;
export declare const CoinSchema: z.ZodObject<
  {
    type: z.ZodEnum<['promo', 'branded', 'prive', 'cashback', 'referral', 'rez']>;
    amount: z.ZodNumber;
    isActive: z.ZodBoolean;
    earnedDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    lastUsed: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    lastEarned: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    expiryDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    color: z.ZodOptional<z.ZodString>;
  },
  'strict',
  z.ZodTypeAny,
  {
    type?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
    isActive?: boolean;
    amount?: number;
    expiryDate?: string | Date;
    earnedDate?: string | Date;
    lastUsed?: string | Date;
    lastEarned?: string | Date;
    color?: string;
  },
  {
    type?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
    isActive?: boolean;
    amount?: number;
    expiryDate?: string | Date;
    earnedDate?: string | Date;
    lastUsed?: string | Date;
    lastEarned?: string | Date;
    color?: string;
  }
>;
export declare const BrandedCoinSchema: z.ZodObject<
  {
    merchantId: z.ZodString;
    merchantName: z.ZodString;
    merchantLogo: z.ZodOptional<z.ZodString>;
    merchantColor: z.ZodOptional<z.ZodString>;
    amount: z.ZodNumber;
    earnedDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    lastUsed: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    expiresAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    isActive: z.ZodBoolean;
  },
  'strict',
  z.ZodTypeAny,
  {
    merchantId?: string;
    isActive?: boolean;
    amount?: number;
    merchantName?: string;
    earnedDate?: string | Date;
    expiresAt?: string | Date;
    lastUsed?: string | Date;
    merchantLogo?: string;
    merchantColor?: string;
  },
  {
    merchantId?: string;
    isActive?: boolean;
    amount?: number;
    merchantName?: string;
    earnedDate?: string | Date;
    expiresAt?: string | Date;
    lastUsed?: string | Date;
    merchantLogo?: string;
    merchantColor?: string;
  }
>;
/** Debit (spend) — idempotencyKey is REQUIRED. */
export declare const WalletDebitSchema: z.ZodObject<
  {
    user: z.ZodString;
    amount: z.ZodNumber;
    source: z.ZodString;
    sourceId: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    merchantId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
    /** REQUIRED in v2 — must be unique per logical debit. */
    idempotencyKey: z.ZodString;
  },
  'strict',
  z.ZodTypeAny,
  {
    source?: string;
    description?: string;
    merchantId?: string;
    user?: string;
    amount?: number;
    sourceId?: string;
    metadata?: Record<string, string | number | boolean>;
    idempotencyKey?: string;
  },
  {
    source?: string;
    description?: string;
    merchantId?: string;
    user?: string;
    amount?: number;
    sourceId?: string;
    metadata?: Record<string, string | number | boolean>;
    idempotencyKey?: string;
  }
>;
/** Credit (earn) — idempotencyKey is REQUIRED. */
export declare const WalletCreditSchema: z.ZodObject<
  {
    user: z.ZodString;
    coinType: z.ZodEnum<['promo', 'branded', 'prive', 'cashback', 'referral', 'rez']>;
    amount: z.ZodNumber;
    source: z.ZodString;
    sourceId: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    merchantId: z.ZodOptional<z.ZodString>;
    expiryDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
    idempotencyKey: z.ZodString;
  },
  'strict',
  z.ZodTypeAny,
  {
    source?: string;
    description?: string;
    merchantId?: string;
    user?: string;
    amount?: number;
    expiryDate?: string | Date;
    coinType?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
    sourceId?: string;
    metadata?: Record<string, string | number | boolean>;
    idempotencyKey?: string;
  },
  {
    source?: string;
    description?: string;
    merchantId?: string;
    user?: string;
    amount?: number;
    expiryDate?: string | Date;
    coinType?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
    sourceId?: string;
    metadata?: Record<string, string | number | boolean>;
    idempotencyKey?: string;
  }
>;
export declare const CoinTransactionResponseSchema: z.ZodObject<
  {
    _id: z.ZodOptional<z.ZodString>;
    user: z.ZodString;
    type: z.ZodEnum<['earned', 'spent', 'expired', 'refunded', 'bonus', 'branded_award']>;
    coinType: z.ZodEnum<['promo', 'branded', 'prive', 'cashback', 'referral', 'rez']>;
    amount: z.ZodNumber;
    balanceBefore: z.ZodNumber;
    balanceAfter: z.ZodNumber;
    source: z.ZodString;
    sourceId: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    merchantId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<['pending', 'completed', 'failed']>;
    createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    source?: string;
    type?: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus' | 'branded_award';
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    description?: string;
    merchantId?: string;
    status?: 'pending' | 'completed' | 'failed';
    user?: string;
    amount?: number;
    coinType?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
    balanceBefore?: number;
    balanceAfter?: number;
    sourceId?: string;
    metadata?: Record<string, string | number | boolean>;
    idempotencyKey?: string;
  },
  {
    source?: string;
    type?: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus' | 'branded_award';
    _id?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    description?: string;
    merchantId?: string;
    status?: 'pending' | 'completed' | 'failed';
    user?: string;
    amount?: number;
    coinType?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
    balanceBefore?: number;
    balanceAfter?: number;
    sourceId?: string;
    metadata?: Record<string, string | number | boolean>;
    idempotencyKey?: string;
  }
>;
export declare const CoinTransactionListResponseSchema: z.ZodArray<
  z.ZodObject<
    {
      _id: z.ZodOptional<z.ZodString>;
      user: z.ZodString;
      type: z.ZodEnum<['earned', 'spent', 'expired', 'refunded', 'bonus', 'branded_award']>;
      coinType: z.ZodEnum<['promo', 'branded', 'prive', 'cashback', 'referral', 'rez']>;
      amount: z.ZodNumber;
      balanceBefore: z.ZodNumber;
      balanceAfter: z.ZodNumber;
      source: z.ZodString;
      sourceId: z.ZodOptional<z.ZodString>;
      description: z.ZodString;
      merchantId: z.ZodOptional<z.ZodString>;
      metadata: z.ZodOptional<
        z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>
      >;
      idempotencyKey: z.ZodOptional<z.ZodString>;
      status: z.ZodEnum<['pending', 'completed', 'failed']>;
      createdAt: z.ZodUnion<[z.ZodDate, z.ZodString]>;
      updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    },
    'strip',
    z.ZodTypeAny,
    {
      source?: string;
      type?: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus' | 'branded_award';
      _id?: string;
      createdAt?: string | Date;
      updatedAt?: string | Date;
      description?: string;
      merchantId?: string;
      status?: 'pending' | 'completed' | 'failed';
      user?: string;
      amount?: number;
      coinType?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
      balanceBefore?: number;
      balanceAfter?: number;
      sourceId?: string;
      metadata?: Record<string, string | number | boolean>;
      idempotencyKey?: string;
    },
    {
      source?: string;
      type?: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus' | 'branded_award';
      _id?: string;
      createdAt?: string | Date;
      updatedAt?: string | Date;
      description?: string;
      merchantId?: string;
      status?: 'pending' | 'completed' | 'failed';
      user?: string;
      amount?: number;
      coinType?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
      balanceBefore?: number;
      balanceAfter?: number;
      sourceId?: string;
      metadata?: Record<string, string | number | boolean>;
      idempotencyKey?: string;
    }
  >,
  'many'
>;
export declare const WalletBalanceResponseSchema: z.ZodObject<
  {
    user: z.ZodString;
    balance: z.ZodObject<
      {
        total: z.ZodNumber;
        available: z.ZodNumber;
        pending: z.ZodNumber;
        cashback: z.ZodNumber;
      },
      'strict',
      z.ZodTypeAny,
      {
        cashback?: number;
        total?: number;
        available?: number;
        pending?: number;
      },
      {
        cashback?: number;
        total?: number;
        available?: number;
        pending?: number;
      }
    >;
    coins: z.ZodArray<
      z.ZodObject<
        {
          type: z.ZodEnum<['promo', 'branded', 'prive', 'cashback', 'referral', 'rez']>;
          amount: z.ZodNumber;
          isActive: z.ZodBoolean;
          earnedDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          lastUsed: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          lastEarned: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          expiryDate: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
          color: z.ZodOptional<z.ZodString>;
        },
        'strict',
        z.ZodTypeAny,
        {
          type?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
          isActive?: boolean;
          amount?: number;
          expiryDate?: string | Date;
          earnedDate?: string | Date;
          lastUsed?: string | Date;
          lastEarned?: string | Date;
          color?: string;
        },
        {
          type?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
          isActive?: boolean;
          amount?: number;
          expiryDate?: string | Date;
          earnedDate?: string | Date;
          lastUsed?: string | Date;
          lastEarned?: string | Date;
          color?: string;
        }
      >,
      'many'
    >;
    brandedCoins: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            merchantId: z.ZodString;
            merchantName: z.ZodString;
            merchantLogo: z.ZodOptional<z.ZodString>;
            merchantColor: z.ZodOptional<z.ZodString>;
            amount: z.ZodNumber;
            earnedDate: z.ZodUnion<[z.ZodDate, z.ZodString]>;
            lastUsed: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
            expiresAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
            isActive: z.ZodBoolean;
          },
          'strict',
          z.ZodTypeAny,
          {
            merchantId?: string;
            isActive?: boolean;
            amount?: number;
            merchantName?: string;
            earnedDate?: string | Date;
            expiresAt?: string | Date;
            lastUsed?: string | Date;
            merchantLogo?: string;
            merchantColor?: string;
          },
          {
            merchantId?: string;
            isActive?: boolean;
            amount?: number;
            merchantName?: string;
            earnedDate?: string | Date;
            expiresAt?: string | Date;
            lastUsed?: string | Date;
            merchantLogo?: string;
            merchantColor?: string;
          }
        >,
        'many'
      >
    >;
    currency: z.ZodString;
    isFrozen: z.ZodBoolean;
    isActive: z.ZodBoolean;
    updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    updatedAt?: string | Date;
    user?: string;
    balance?: {
      cashback?: number;
      total?: number;
      available?: number;
      pending?: number;
    };
    coins?: {
      type?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
      isActive?: boolean;
      amount?: number;
      expiryDate?: string | Date;
      earnedDate?: string | Date;
      lastUsed?: string | Date;
      lastEarned?: string | Date;
      color?: string;
    }[];
    brandedCoins?: {
      merchantId?: string;
      isActive?: boolean;
      amount?: number;
      merchantName?: string;
      earnedDate?: string | Date;
      expiresAt?: string | Date;
      lastUsed?: string | Date;
      merchantLogo?: string;
      merchantColor?: string;
    }[];
    currency?: string;
    isActive?: boolean;
    isFrozen?: boolean;
  },
  {
    updatedAt?: string | Date;
    user?: string;
    balance?: {
      cashback?: number;
      total?: number;
      available?: number;
      pending?: number;
    };
    coins?: {
      type?: 'rez' | 'prive' | 'branded' | 'promo' | 'cashback' | 'referral';
      isActive?: boolean;
      amount?: number;
      expiryDate?: string | Date;
      earnedDate?: string | Date;
      lastUsed?: string | Date;
      lastEarned?: string | Date;
      color?: string;
    }[];
    brandedCoins?: {
      merchantId?: string;
      isActive?: boolean;
      amount?: number;
      merchantName?: string;
      earnedDate?: string | Date;
      expiresAt?: string | Date;
      lastUsed?: string | Date;
      merchantLogo?: string;
      merchantColor?: string;
    }[];
    currency?: string;
    isActive?: boolean;
    isFrozen?: boolean;
  }
>;
export type WalletDebitRequest = z.infer<typeof WalletDebitSchema>;
export type WalletCreditRequest = z.infer<typeof WalletCreditSchema>;
export type CoinTransactionResponse = z.infer<typeof CoinTransactionResponseSchema>;
export type CoinTransactionListResponse = z.infer<typeof CoinTransactionListResponseSchema>;
export type WalletBalanceResponse = z.infer<typeof WalletBalanceResponseSchema>;
export type CoinType = z.infer<typeof COIN_TYPE>;
export type CoinTransactionType = z.infer<typeof COIN_TRANSACTION_TYPE>;
export type TransactionStatus = z.infer<typeof TRANSACTION_STATUS>;
export declare const COIN_PRIORITY_ORDER: readonly CoinType[];
//# sourceMappingURL=wallet.schema.d.ts.map
