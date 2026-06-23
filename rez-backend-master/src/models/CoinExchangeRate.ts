import mongoose, { Schema, Document, Types } from 'mongoose';
import { logger } from '../config/logger';

/**
 * Versioned coin-to-INR exchange rates.
 * Every coin redemption MUST use the rate that was active at the time of the transaction.
 * This ensures historical accuracy and prevents rate-change disputes.
 */
export interface ICoinExchangeRate extends Document {
  coinType: 'rez' | 'promo' | 'branded'; // Type of coin
  rateINR: number; // Exchange rate: 1 coin = X INR (e.g., 1.0)
  effectiveFrom: Date; // When this rate becomes active
  effectiveUntil?: Date; // When this rate expires (null = still active)
  reason: string; // Why rate changed (e.g., "Q1 2026 adjustment", "promo campaign")
  createdBy: Types.ObjectId; // Admin who set the rate
  metadata?: {
    approvalId?: string;
    businessContext?: string; // Campaign name, tier adjustment, etc.
  };
  createdAt: Date;
}

const CoinExchangeRateSchema = new Schema<ICoinExchangeRate>(
  {
    coinType: {
      type: String,
      required: true,
      enum: ['rez', 'promo', 'branded'],
      index: true,
    },
    rateINR: {
      type: Number,
      required: true,
      min: 0.01,
      max: 100, // Sanity check
    },
    effectiveFrom: {
      type: Date,
      required: true,
      index: true,
    },
    effectiveUntil: {
      type: Date,
      index: true,
      sparse: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metadata: {
      approvalId: String,
      businessContext: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Compound index for efficient rate lookup at a specific point in time
CoinExchangeRateSchema.index(
  { coinType: 1, effectiveFrom: -1, effectiveUntil: 1 },
  { name: 'coin_rate_historical_lookup' },
);

// Unique constraint: only one active rate per coin type at any moment
CoinExchangeRateSchema.index(
  { coinType: 1, effectiveUntil: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { effectiveUntil: null },
    name: 'coin_active_rate_unique',
  },
);

export const CoinExchangeRate = mongoose.model<ICoinExchangeRate>('CoinExchangeRate', CoinExchangeRateSchema);

/**
 * Helper to get the active exchange rate for a coin type at a specific point in time.
 * CRITICAL: Always use this for historical transactions to ensure the correct rate was applied.
 */
export async function getHistoricalCoinRate(
  // 'cashback'/'referral'/'nuqta' fall back to 1.0 — no dedicated exchange rate row needed.
  // 'nuqta' is the legacy pre-rebrand name for 'rez' coins; treated identically.
  coinType: 'rez' | 'promo' | 'branded' | 'prive' | 'cashback' | 'referral' | 'nuqta',
  atDate: Date = new Date(),
): Promise<number> {
  const rate = await CoinExchangeRate.findOne({
    coinType,
    effectiveFrom: { $lte: atDate },
    $or: [{ effectiveUntil: null }, { effectiveUntil: { $gt: atDate } }],
  })
    .sort({ effectiveFrom: -1 })
    .lean();

  if (!rate) {
    logger.warn(`[CoinExchangeRate] No rate found for ${coinType} at ${atDate}. Using fallback 1.0.`);
    return 1.0; // Fallback to 1:1 conversion
  }

  return rate.rateINR;
}
