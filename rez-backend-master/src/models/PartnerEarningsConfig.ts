import mongoose, { Schema, Document, Model } from 'mongoose';

// --- Interfaces ---

export interface ICashbackRates {
  partner: number;      // Level 1 cashback % (default 10)
  influencer: number;   // Level 2 cashback % (default 15)
  ambassador: number;   // Level 3 cashback % (default 20)
}

export interface IMilestoneDefinition {
  orderCount: number;
  rewardType: 'cashback' | 'voucher' | 'points';
  rewardValue: number;
  title: string;
  description: string;
}

export interface IJackpotDefinition {
  spendAmount: number;
  rewardType: 'cashback' | 'voucher' | 'product';
  rewardValue: number;
  title: string;
  description: string;
}

export interface ILevelUpBonuses {
  toPartner: number;      // default 500
  toInfluencer: number;   // default 1000
  toAmbassador: number;   // default 1500
}

export interface ITransactionBonuses {
  partner: { every: number; reward: number };     // every 11 orders, ₹100
  influencer: { every: number; reward: number };   // every 11 orders, ₹200
  ambassador: { every: number; reward: number };   // every 11 orders, ₹500
}

export interface ITaskRewardConfig {
  profile: number;        // points for profile completion
  review: number;         // cashback for reviews
  referral: number;       // cashback for referrals
  social: number;         // points for social sharing
}

export interface ISettlementConfig {
  autoSettleEnabled: boolean;
  autoSettleDelayHours: number;
  requireApprovalAbove: number;   // NC threshold for maker-checker
  maxDailySettlement: number;     // Max per user per day
}

export interface IPartnerEarningsConfig extends Document {
  singleton: boolean;
  cashbackRates: ICashbackRates;
  milestones: IMilestoneDefinition[];
  jackpots: IJackpotDefinition[];
  levelUpBonuses: ILevelUpBonuses;
  transactionBonuses: ITransactionBonuses;
  taskRewards: ITaskRewardConfig;
  referralBonus: number;
  settlementConfig: ISettlementConfig;
  createdAt: Date;
  updatedAt: Date;
}

interface IPartnerEarningsConfigModel extends Model<IPartnerEarningsConfig> {
  getOrCreate(): Promise<IPartnerEarningsConfig>;
}

// --- Schema ---

const PartnerEarningsConfigSchema = new Schema<IPartnerEarningsConfig>({
  singleton: { type: Boolean, default: true, unique: true },

  cashbackRates: {
    partner: { type: Number, default: 10 },
    influencer: { type: Number, default: 15 },
    ambassador: { type: Number, default: 20 },
  },

  milestones: {
    type: [{
      orderCount: { type: Number, required: true },
      rewardType: { type: String, enum: ['cashback', 'voucher', 'points'], required: true },
      rewardValue: { type: Number, required: true },
      title: { type: String, required: true },
      description: { type: String, default: '' },
    }],
    default: [
      { orderCount: 5, rewardType: 'cashback', rewardValue: 100, title: '₹100 Cashback', description: 'Complete 5 orders' },
      { orderCount: 10, rewardType: 'voucher', rewardValue: 200, title: '₹200 Shopping Voucher', description: 'Complete 10 orders' },
      { orderCount: 15, rewardType: 'cashback', rewardValue: 500, title: '₹500 Cashback Bonus', description: 'Complete 15 orders' },
      { orderCount: 20, rewardType: 'points', rewardValue: 1000, title: '1000 Loyalty Points', description: 'Complete 20 orders' },
    ],
  },

  jackpots: {
    type: [{
      spendAmount: { type: Number, required: true },
      rewardType: { type: String, enum: ['cashback', 'voucher', 'product'], required: true },
      rewardValue: { type: Number, required: true },
      title: { type: String, required: true },
      description: { type: String, default: '' },
    }],
    default: [
      { spendAmount: 25000, rewardType: 'cashback', rewardValue: 1000, title: 'Silver Jackpot', description: 'Spend ₹25,000 to unlock' },
      { spendAmount: 50000, rewardType: 'voucher', rewardValue: 2500, title: 'Gold Jackpot', description: 'Spend ₹50,000 to unlock' },
      { spendAmount: 100000, rewardType: 'product', rewardValue: 5000, title: 'Platinum Jackpot', description: 'Spend ₹1,00,000 to unlock' },
    ],
  },

  levelUpBonuses: {
    toPartner: { type: Number, default: 500 },
    toInfluencer: { type: Number, default: 1000 },
    toAmbassador: { type: Number, default: 1500 },
  },

  transactionBonuses: {
    partner: {
      every: { type: Number, default: 11 },
      reward: { type: Number, default: 100 },
    },
    influencer: {
      every: { type: Number, default: 11 },
      reward: { type: Number, default: 200 },
    },
    ambassador: {
      every: { type: Number, default: 11 },
      reward: { type: Number, default: 500 },
    },
  },

  taskRewards: {
    profile: { type: Number, default: 100 },
    review: { type: Number, default: 50 },
    referral: { type: Number, default: 150 },
    social: { type: Number, default: 200 },
  },

  referralBonus: { type: Number, default: 50 },

  settlementConfig: {
    autoSettleEnabled: { type: Boolean, default: true },
    autoSettleDelayHours: { type: Number, default: 24 },
    requireApprovalAbove: { type: Number, default: 1000 },
    maxDailySettlement: { type: Number, default: 50000 },
  },
}, {
  timestamps: true,
});

// Static: Get or create singleton
PartnerEarningsConfigSchema.statics.getOrCreate = async function(): Promise<IPartnerEarningsConfig> {
  let config = await this.findOne({ singleton: true });
  if (!config) {
    config = await this.create({ singleton: true });
  }
  return config;
};

export const PartnerEarningsConfig = mongoose.model<IPartnerEarningsConfig, IPartnerEarningsConfigModel>(
  'PartnerEarningsConfig',
  PartnerEarningsConfigSchema
);
