import mongoose, { Schema, Document } from 'mongoose';

export interface ICreatorProgramConfig {
  enabled: boolean;
  defaultCommissionRate: number;
  tierRates: {
    starter: number;
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  minPicksForTier: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  coinsPerConversion: number;
  maxDailyEarnings: number;
  pendingPeriodDays: number;
  attributionWindowHours: number;
  autoApproveCreators: boolean;
  minFollowersToApply: number;
  minVideosToApply: number;
  featuredCreatorLimit: number;
  trendingPickLimit: number;
  trendingAlgorithm: 'views' | 'engagement' | 'conversions' | 'hybrid';
}

export interface IEarningConfig extends Document {
  streaks: {
    login: { milestones: { day: number; coins: number }[] };
    order: { milestones: { day: number; coins: number }[] };
    review: { milestones: { day: number; coins: number }[] };
  };
  referral: {
    referrerAmount: number;
    refereeDiscount: number;
    milestoneBonus: number;
    minOrders: number;
    minSpend: number;
    timeframeDays: number;
    expiryDays: number;
  };
  dailyCheckin: {
    baseCoins: number;
    bonuses: { streak: number; coins: number }[];
  };
  billUpload: {
    minAmount: number;
    maxCashbackPercent: number;
    maxCashbackAmount: number;
  };
  creatorProgram: ICreatorProgramConfig;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EarningConfigSchema = new Schema({
  streaks: {
    login: {
      milestones: [{
        day: { type: Number, required: true },
        coins: { type: Number, required: true }
      }]
    },
    order: {
      milestones: [{
        day: { type: Number, required: true },
        coins: { type: Number, required: true }
      }]
    },
    review: {
      milestones: [{
        day: { type: Number, required: true },
        coins: { type: Number, required: true }
      }]
    }
  },
  referral: {
    referrerAmount: { type: Number, default: 50 },
    refereeDiscount: { type: Number, default: 50 },
    milestoneBonus: { type: Number, default: 20 },
    minOrders: { type: Number, default: 1 },
    minSpend: { type: Number, default: 500 },
    timeframeDays: { type: Number, default: 30 },
    expiryDays: { type: Number, default: 90 }
  },
  dailyCheckin: {
    baseCoins: { type: Number, default: 10 },
    bonuses: [{
      streak: { type: Number, required: true },
      coins: { type: Number, required: true }
    }]
  },
  billUpload: {
    minAmount: { type: Number, default: 100 },
    maxCashbackPercent: { type: Number, default: 10 },
    maxCashbackAmount: { type: Number, default: 500 }
  },
  creatorProgram: {
    enabled: { type: Boolean, default: true },
    defaultCommissionRate: { type: Number, default: 5 },
    tierRates: {
      starter: { type: Number, default: 2 },
      bronze: { type: Number, default: 3 },
      silver: { type: Number, default: 5 },
      gold: { type: Number, default: 7 },
      platinum: { type: Number, default: 10 }
    },
    minPicksForTier: {
      bronze: { type: Number, default: 10 },
      silver: { type: Number, default: 50 },
      gold: { type: Number, default: 200 },
      platinum: { type: Number, default: 500 }
    },
    coinsPerConversion: { type: Number, default: 10 },
    maxDailyEarnings: { type: Number, default: 5000 },
    pendingPeriodDays: { type: Number, default: 7 },
    attributionWindowHours: { type: Number, default: 24 },
    autoApproveCreators: { type: Boolean, default: false },
    minFollowersToApply: { type: Number, default: 0 },
    minVideosToApply: { type: Number, default: 1 },
    featuredCreatorLimit: { type: Number, default: 6 },
    trendingPickLimit: { type: Number, default: 20 },
    trendingAlgorithm: {
      type: String,
      enum: ['views', 'engagement', 'conversions', 'hybrid'],
      default: 'hybrid'
    }
  },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model<IEarningConfig>('EarningConfig', EarningConfigSchema);
