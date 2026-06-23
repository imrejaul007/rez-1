import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICashbackConfig extends Document {
  name: string;
  minOrderValue: number;
  maxCashbackPerOrder: number;
  maxCashbackPerUserPerDay: number;
  maxCashbackPerMerchantPerDay: number;
  cooldownMinutes: number;
  maxRedemptionPercent: number;
  // 24h hold system — how many hours before pending cashback is auto-credited
  cashbackHoldHours: number;
  // Device / fraud controls
  maxDevicesPerUser: number;
  // Reconciliation interval for the cashback reconciliation job
  reconciliationIntervalHours: number;
  // Risk score thresholds (see riskScoringService.ts)
  riskScoreBlockThreshold: number;
  riskScoreHoldThreshold: number;
  isActive: boolean;
}

const CashbackConfigSchema = new Schema<ICashbackConfig>(
  {
    name: { type: String, required: true, default: 'default' },
    minOrderValue: { type: Number, default: 100 },
    maxCashbackPerOrder: { type: Number, default: 200 },
    maxCashbackPerUserPerDay: { type: Number, default: 500 },
    maxCashbackPerMerchantPerDay: { type: Number, default: 50000 },
    cooldownMinutes: { type: Number, default: 30 },
    maxRedemptionPercent: { type: Number, default: 40 },
    cashbackHoldHours: { type: Number, default: 24 },
    maxDevicesPerUser: { type: Number, default: 3 },
    reconciliationIntervalHours: { type: Number, default: 6 },
    riskScoreBlockThreshold: { type: Number, default: 70 },
    riskScoreHoldThreshold: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CashbackConfigSchema.index({ name: 1 }, { unique: true });

// In-process cache — refreshed every 5 minutes
let _cachedConfig: ICashbackConfig | null = null;
let _cacheTime = 0;

/** Invalidate the in-process config cache (call after admin update). */
export function invalidateCashbackConfigCache(): void {
  _cachedConfig = null;
  _cacheTime = 0;
}

CashbackConfigSchema.statics.getActiveConfig = async function (): Promise<ICashbackConfig> {
  if (_cachedConfig && Date.now() - _cacheTime < 5 * 60 * 1000) {
    return _cachedConfig;
  }
  _cachedConfig = await this.findOne({ isActive: true }).lean();
  if (!_cachedConfig) {
    _cachedConfig = {
      name: 'default',
      minOrderValue: 100,
      maxCashbackPerOrder: 200,
      maxCashbackPerUserPerDay: 500,
      maxCashbackPerMerchantPerDay: 50000,
      cooldownMinutes: 30,
      maxRedemptionPercent: 40,
      cashbackHoldHours: 24,
      maxDevicesPerUser: 3,
      reconciliationIntervalHours: 6,
      riskScoreBlockThreshold: 70,
      riskScoreHoldThreshold: 30,
      isActive: true,
    } as unknown as ICashbackConfig;
  }
  _cacheTime = Date.now();
  return _cachedConfig;
};

export interface ICashbackConfigModel extends Model<ICashbackConfig> {
  getActiveConfig(): Promise<ICashbackConfig>;
}

const CashbackConfig: ICashbackConfigModel = mongoose.model<ICashbackConfig, ICashbackConfigModel>(
  'CashbackConfig',
  CashbackConfigSchema,
);
export default CashbackConfig;
