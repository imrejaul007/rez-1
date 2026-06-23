import mongoose, { Schema, Document } from 'mongoose';
import { BRAND } from '../config/brand';

export interface ITransferLimits {
  dailyMax: number;
  perTransactionMax: number;
  minAmount: number;
  requireOtpAbove: number;
  maxRecipientsPerDay: number;
}

export interface IGiftTheme {
  id: string;
  label: string;
  emoji: string;
  colors: string[];
  isActive: boolean;
  tags: string[];
  sortOrder: number;
}

export interface IGiftLimits {
  dailyMax: number;
  perGiftMax: number;
  minAmount: number;
  requireOtpAbove: number;
  maxGiftsPerDay: number;
  denominations: number[];
  themes: IGiftTheme[];
  messageMaxLength: number;
  scheduledDeliveryEnabled: boolean;
}

export interface IRechargeTier {
  minAmount: number;
  cashbackPercentage: number;
}

export interface IRechargeConfig {
  isEnabled: boolean;
  tiers: IRechargeTier[];
  maxCashback: number;
  minRecharge: number;
}

export interface IExpiryConfig {
  promoExpiryDays: number;
  alertDaysBefore: number;
  gracePeriodDays: number;
}

export interface ICoinConversion {
  nuqtaToInr: number;
  promoToInr: number;
  brandedToInr: number;
  rezToInr?: number; // Coins per rupee for REZ (added during Phase 2E merge)
}

export interface IFraudThresholds {
  maxTransfersPerHour: number;
  maxGiftsPerDay: number;
  suspiciousAmountThreshold: number;
  autoFreezeMultiplier: number;
}

export interface ICoinRules {
  usageRules: string[];
  earningMethods: string[];
}

export interface ICoinExpiryRule {
  expiryDays: number;
  maxUsagePct: number;
}

export interface ICoinExpiryConfig {
  rez: ICoinExpiryRule;
  prive: ICoinExpiryRule;
  promo: ICoinExpiryRule;
  branded: ICoinExpiryRule;
}

export interface IRedemptionConfig {
  conversionRates: {
    gift_card: number;
    bill_pay: number;
    experience: number;
    charity: number;
  };
  minCoinsPerCategory: {
    gift_card: number;
    bill_pay: number;
    experience: number;
    charity: number;
  };
  maxCoinsPerRedemption: number;
  dailyRedemptionLimit: number;
  enabledCategories: string[];
  expiryDays: {
    gift_card: number;
    bill_pay: number;
    experience: number;
    charity: number;
  };
  reAuthThreshold: number;
}

export interface IHabitLoopDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  targetCount: number;
  deepLink: string;
  enabled: boolean;
  bonusCoins: number;
}

export interface IHabitLoopConfig {
  enabled: boolean;
  loops: IHabitLoopDef[];
  completionBonusCoins: number;
  streakMultiplier: number;
}

export interface IPriveInviteConfig {
  enabled: boolean;
  inviterRewardCoins: number;
  inviteeRewardCoins: number;
  maxCodesPerUser: number;
  codeExpiryDays: number;
  maxUsesPerCode: number;
  minTierToInvite: 'entry' | 'signature' | 'elite';
  cooldownHours: number;
  fraudBlockThreshold: number;
}

export interface IPriveTierConfig {
  tier: 'entry' | 'signature' | 'elite';
  displayName: string;
  color: string;
  coinMultiplier: number;
  conciergeAccess: boolean;
  conciergeResponseSLA: number; // hours
  inviteCodesLimit: number;
  benefits: string[];
}

export interface IPriveProgramConfig {
  tierThresholds: {
    entryTier: number;
    signatureTier: number;
    eliteTier: number;
    trustMinimum: number;
  };
  pillarWeights: {
    engagement: number;
    trust: number;
    influence: number;
    economicValue: number;
    brandAffinity: number;
    network: number;
  };
  tiers: IPriveTierConfig[];
  featureFlags: {
    offersEnabled: boolean;
    missionsEnabled: boolean;
    conciergeEnabled: boolean;
    smartSpendEnabled: boolean;
    redemptionEnabled: boolean;
    analyticsEnabled: boolean;
    invitesEnabled: boolean;
    priveCampaignsEnabled: boolean;
    bizoneMerchantEnabled: boolean;
    socialCashbackEnabled: boolean;
    dailyCheckinEnabled: boolean;
    mapViewEnabled: boolean;
    billSplittingEnabled: boolean;
    storiesRowEnabled: boolean;
  };
  dashboardCacheTtlSeconds: number;
  notificationConfig: {
    expiryWarningDays: number;
  };
}

export interface ICoinManagementConfig {
  globalKillSwitch: {
    active: boolean;
    reason: string;
    activatedBy?: mongoose.Types.ObjectId;
    activatedAt?: Date;
    expiresAt?: Date;
    pausedTypes: ('rez' | 'branded' | 'promo' | 'prive')[];
  };
  dailyCaps: {
    perUserPerDay: number;
    globalDailyIssuance: number;
    perTransactionMax: number;
  };
  multiplierRules: {
    name: string;
    coinType: 'rez' | 'branded' | 'promo' | 'prive';
    multiplier: number;
    conditions: string;
    categories: string[];
    validFrom?: Date;
    validTo?: Date;
    isActive: boolean;
  }[];
}

export interface IWalletConfig extends Document {
  singleton: boolean;
  rewardIssuanceEnabled: boolean; // Global kill-switch: if false, rewardEngine.issue() returns 0
  transferLimits: ITransferLimits;
  giftLimits: IGiftLimits;
  rechargeConfig: IRechargeConfig;
  expiryConfig: IExpiryConfig;
  commissionRate: number;
  coinConversion: ICoinConversion;
  fraudThresholds: IFraudThresholds;
  redemptionConfig: IRedemptionConfig;
  habitLoopConfig: IHabitLoopConfig;
  priveInviteConfig: IPriveInviteConfig;
  priveProgramConfig: IPriveProgramConfig;
  coinExpiryConfig: ICoinExpiryConfig;
  coinRules: Record<string, ICoinRules>;
  coinManagement?: ICoinManagementConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletConfigModel extends mongoose.Model<IWalletConfig> {
  getOrCreate(): Promise<IWalletConfig>;
}

const WalletConfigSchema = new Schema<IWalletConfig>({
  rewardIssuanceEnabled: {
    type: Boolean,
    default: true,
  },
  singleton: {
    type: Boolean,
    default: true,
    unique: true
  },
  transferLimits: {
    dailyMax: { type: Number, default: 10000 },
    perTransactionMax: { type: Number, default: 5000 },
    minAmount: { type: Number, default: 10 },
    requireOtpAbove: { type: Number, default: 1000 },
    maxRecipientsPerDay: { type: Number, default: 10 }
  },
  giftLimits: {
    dailyMax: { type: Number, default: 10000 },
    perGiftMax: { type: Number, default: 5000 },
    minAmount: { type: Number, default: 10 },
    requireOtpAbove: { type: Number, default: 1000 },
    maxGiftsPerDay: { type: Number, default: 20 },
    denominations: {
      type: [Number],
      default: [50, 100, 250, 500, 1000, 2000]
    },
    themes: {
      type: [{
        id: { type: String, required: true },
        label: { type: String, required: true },
        emoji: { type: String, required: true },
        colors: { type: [String], required: true },
        isActive: { type: Boolean, default: true },
        tags: { type: [String], default: [] },
        sortOrder: { type: Number, default: 0 },
      }],
      default: [
        { id: 'birthday', label: 'Birthday', emoji: '🎂', colors: ['#FF6B6B', '#FF8E8E'], isActive: true, tags: ['birthday'], sortOrder: 0 },
        { id: 'christmas', label: 'Christmas', emoji: '🎄', colors: ['#2ECC71', '#27AE60'], isActive: true, tags: ['festival'], sortOrder: 1 },
        { id: 'gift', label: 'Gift', emoji: '🎁', colors: ['#9B59B6', '#8E44AD'], isActive: true, tags: ['general'], sortOrder: 2 },
        { id: 'love', label: 'Love', emoji: '💝', colors: ['#E91E63', '#C2185B'], isActive: true, tags: ['love'], sortOrder: 3 },
        { id: 'thanks', label: 'Thanks', emoji: '🙏', colors: ['#00BCD4', '#0097A7'], isActive: true, tags: ['general'], sortOrder: 4 },
        { id: 'congrats', label: 'Congrats', emoji: '🎉', colors: ['#FFC107', '#FFA000'], isActive: true, tags: ['celebration'], sortOrder: 5 },
      ]
    },
    messageMaxLength: { type: Number, default: 150 },
    scheduledDeliveryEnabled: { type: Boolean, default: false },
  },
  rechargeConfig: {
    isEnabled: { type: Boolean, default: true },
    tiers: {
      type: [{
        minAmount: { type: Number, required: true },
        cashbackPercentage: { type: Number, required: true, min: 0, max: 100 }
      }],
      default: [
        { minAmount: 120, cashbackPercentage: 5 },
        { minAmount: 500, cashbackPercentage: 7 },
        { minAmount: 1000, cashbackPercentage: 10 },
        { minAmount: 5000, cashbackPercentage: 10 },
        { minAmount: 10000, cashbackPercentage: 10 }
      ]
    },
    maxCashback: { type: Number, default: 1000 },
    minRecharge: { type: Number, default: 100 }
  },
  expiryConfig: {
    promoExpiryDays: { type: Number, default: 30 },
    alertDaysBefore: { type: Number, default: 7 },
    gracePeriodDays: { type: Number, default: 3 }
  },
  commissionRate: {
    type: Number,
    default: 0.05,
    min: 0,
    max: 1
  },
  coinConversion: {
    nuqtaToInr: { type: Number, default: 1 },
    promoToInr: { type: Number, default: 1 },
    brandedToInr: { type: Number, default: 1 }
  },
  fraudThresholds: {
    maxTransfersPerHour: { type: Number, default: 5 },
    maxGiftsPerDay: { type: Number, default: 20 },
    suspiciousAmountThreshold: { type: Number, default: 50000 },
    autoFreezeMultiplier: { type: Number, default: 5 }
  },
  redemptionConfig: {
    conversionRates: {
      gift_card: { type: Number, default: 0.10 },
      bill_pay: { type: Number, default: 0.10 },
      experience: { type: Number, default: 0.12 },
      charity: { type: Number, default: 0.15 },
    },
    minCoinsPerCategory: {
      gift_card: { type: Number, default: 500 },
      bill_pay: { type: Number, default: 100 },
      experience: { type: Number, default: 1000 },
      charity: { type: Number, default: 100 },
    },
    maxCoinsPerRedemption: { type: Number, default: 50000 },
    dailyRedemptionLimit: { type: Number, default: 5 },
    enabledCategories: {
      type: [String],
      default: ['gift_card', 'bill_pay', 'experience', 'charity'],
    },
    expiryDays: {
      gift_card: { type: Number, default: 365 },
      bill_pay: { type: Number, default: 30 },
      experience: { type: Number, default: 90 },
      charity: { type: Number, default: 7 },
    },
    reAuthThreshold: { type: Number, default: 5000 },
  },
  habitLoopConfig: {
    enabled: { type: Boolean, default: true },
    loops: {
      type: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        icon: { type: String, required: true },
        description: { type: String, default: '' },
        targetCount: { type: Number, default: 1 },
        deepLink: { type: String, default: '' },
        enabled: { type: Boolean, default: true },
        bonusCoins: { type: Number, default: 0 },
      }],
      default: [
        { id: 'smart_spend', name: 'Smart Spend', icon: '💰', description: 'Place an order', targetCount: 1, deepLink: '/explore/stores', enabled: true, bonusCoins: 0 },
        { id: 'influence', name: 'Influence', icon: '📢', description: 'Write a review', targetCount: 1, deepLink: '/earn/review', enabled: true, bonusCoins: 0 },
        { id: 'redemption_pride', name: 'Redemption', icon: '🎁', description: 'Redeem your coins', targetCount: 1, deepLink: '/prive/redeem', enabled: true, bonusCoins: 0 },
        { id: 'network', name: 'Network', icon: '🔗', description: 'Invite a friend', targetCount: 1, deepLink: '/referral', enabled: true, bonusCoins: 0 },
      ],
    },
    completionBonusCoins: { type: Number, default: 25 },
    streakMultiplier: { type: Number, default: 1 },
  },
  priveInviteConfig: {
    enabled: { type: Boolean, default: true },
    inviterRewardCoins: { type: Number, default: 100 },
    inviteeRewardCoins: { type: Number, default: 50 },
    maxCodesPerUser: { type: Number, default: 5 },
    codeExpiryDays: { type: Number, default: 30 },
    maxUsesPerCode: { type: Number, default: 5 },
    minTierToInvite: { type: String, enum: ['entry', 'signature', 'elite'], default: 'entry' },
    cooldownHours: { type: Number, default: 24 },
    fraudBlockThreshold: { type: Number, default: 80 },
  },
  priveProgramConfig: {
    tierThresholds: {
      entryTier: { type: Number, default: 50 },
      signatureTier: { type: Number, default: 70 },
      eliteTier: { type: Number, default: 85 },
      trustMinimum: { type: Number, default: 60 },
    },
    pillarWeights: {
      engagement: { type: Number, default: 0.25 },
      trust: { type: Number, default: 0.20 },
      influence: { type: Number, default: 0.20 },
      economicValue: { type: Number, default: 0.15 },
      brandAffinity: { type: Number, default: 0.10 },
      network: { type: Number, default: 0.10 },
    },
    tiers: {
      type: [{
        tier: { type: String, enum: ['entry', 'signature', 'elite'], required: true },
        displayName: { type: String, required: true },
        color: { type: String, required: true },
        coinMultiplier: { type: Number, required: true },
        conciergeAccess: { type: Boolean, default: false },
        conciergeResponseSLA: { type: Number, default: 48 },
        inviteCodesLimit: { type: Number, default: 5 },
        benefits: { type: [String], default: [] },
      }],
      default: [
        {
          tier: 'entry',
          displayName: 'Entry',
          color: '#C9A962',
          coinMultiplier: 1.0,
          conciergeAccess: false,
          conciergeResponseSLA: 48,
          inviteCodesLimit: 5,
          benefits: ['Exclusive offers access', 'Daily check-in bonuses', 'Habit loop rewards', 'Smart Spend access'],
        },
        {
          tier: 'signature',
          displayName: 'Signature',
          color: '#E5C878',
          coinMultiplier: 1.5,
          conciergeAccess: true,
          conciergeResponseSLA: 24,
          inviteCodesLimit: 10,
          benefits: ['All Entry benefits', '1.5x coin multiplier', 'Priority concierge (24h SLA)', 'Exclusive Signature offers', 'Advanced analytics'],
        },
        {
          tier: 'elite',
          displayName: 'Elite',
          color: '#FFD700',
          coinMultiplier: 2.0,
          conciergeAccess: true,
          conciergeResponseSLA: 1,
          inviteCodesLimit: 20,
          benefits: ['All Signature benefits', '2x coin multiplier', 'VIP concierge (1h SLA)', 'Exclusive Elite experiences', 'Early access to features', 'Personal account manager'],
        },
      ],
    },
    featureFlags: {
      offersEnabled: { type: Boolean, default: true },
      missionsEnabled: { type: Boolean, default: true },
      conciergeEnabled: { type: Boolean, default: true },
      smartSpendEnabled: { type: Boolean, default: true },
      redemptionEnabled: { type: Boolean, default: true },
      analyticsEnabled: { type: Boolean, default: true },
      invitesEnabled: { type: Boolean, default: true },
      priveCampaignsEnabled: { type: Boolean, default: false },
      bizoneMerchantEnabled: { type: Boolean, default: false },
      socialCashbackEnabled: { type: Boolean, default: false },
      dailyCheckinEnabled: { type: Boolean, default: false },
      mapViewEnabled: { type: Boolean, default: false },
      billSplittingEnabled: { type: Boolean, default: false },
      storiesRowEnabled: { type: Boolean, default: false },
    },
    dashboardCacheTtlSeconds: { type: Number, default: 30 },
    notificationConfig: {
      expiryWarningDays: { type: Number, default: 7 },
    },
  },
  coinExpiryConfig: {
    rez: {
      expiryDays: { type: Number, default: 0 },
      maxUsagePct: { type: Number, default: 100 },
    },
    prive: {
      expiryDays: { type: Number, default: 365 },
      maxUsagePct: { type: Number, default: 100 },
    },
    promo: {
      expiryDays: { type: Number, default: 90 },
      maxUsagePct: { type: Number, default: 20 },
    },
    branded: {
      expiryDays: { type: Number, default: 0 },  // 0 = never expires
      maxUsagePct: { type: Number, default: 100 },
    },
  },
  coinRules: {
    type: Schema.Types.Mixed,
    default: {
      rez: {
        usageRules: [`Use anywhere on ${BRAND.APP_NAME}`, 'No usage cap per transaction', 'Never expires'],
        earningMethods: ['Purchases & Orders', 'Referrals', 'Daily Check-in', 'Games & Challenges', 'Reviews & Social'],
      },
      promo: {
        usageRules: ['Max 20% of bill value per transaction', 'Valid only during campaign period', 'Check expiry date'],
        earningMethods: ['Bonus Campaigns', 'Festival Offers', 'Flash Sales', 'Category Multipliers'],
      },
      branded: {
        usageRules: ['Use only at the issuing merchant', 'Expires in 180 days (configurable)', 'Cannot transfer to others'],
        earningMethods: ['Store Purchases', 'Merchant Promotions', 'Loyalty Programs'],
      },
    }
  },
  coinManagement: {
    globalKillSwitch: {
      active: { type: Boolean, default: false },
      reason: { type: String, default: '' },
      activatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
      activatedAt: { type: Date },
      expiresAt: { type: Date },
      pausedTypes: [{ type: String, enum: ['rez', 'branded', 'promo', 'prive'] }],
    },
    dailyCaps: {
      perUserPerDay: { type: Number, default: 10000 },
      globalDailyIssuance: { type: Number, default: 5000000 },
      perTransactionMax: { type: Number, default: 2000 },
    },
    multiplierRules: [{
      name: { type: String },
      coinType: { type: String, enum: ['rez', 'branded', 'promo', 'prive'] },
      multiplier: { type: Number },
      conditions: { type: String },
      categories: [{ type: String }],
      validFrom: { type: Date },
      validTo: { type: Date },
      isActive: { type: Boolean, default: false },
    }],
  }
}, {
  timestamps: true
});

// Static: Get or create singleton
WalletConfigSchema.statics.getOrCreate = async function(): Promise<IWalletConfig> {
  let config = await this.findOne({ singleton: true });
  if (!config) {
    config = await this.create({ singleton: true });
  }
  return config;
};

export const WalletConfig = mongoose.model<IWalletConfig, IWalletConfigModel>('WalletConfig', WalletConfigSchema);
