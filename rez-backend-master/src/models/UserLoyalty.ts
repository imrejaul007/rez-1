import mongoose, { Document, Schema, Types } from 'mongoose';

export type MainCategorySlug = 'food-dining' | 'beauty-wellness' | 'grocery-essentials' | 'fitness-sports' | 'healthcare' | 'fashion' | 'education-learning' | 'home-services' | 'travel-experiences' | 'entertainment' | 'financial-lifestyle' | 'electronics';

export interface ICategoryCoins {
  available: number;
  expiring: number;
  expiryDate?: Date;
}

export interface IUserLoyalty extends Document {
  userId: Types.ObjectId;
  streak: {
    current: number;
    target: number;
    lastCheckin?: Date;
    history: Date[];
  };
  brandLoyalty: Array<{
    brandId: Types.ObjectId;
    brandName: string;
    purchaseCount: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    progress: number;
    nextTierAt: number;
  }>;
  missions: Array<{
    missionId: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    reward: number;
    icon: string;
    completedAt?: Date;
  }>;
  coins: {
    available: number;
    expiring: number;
    expiryDate?: Date;
    history: Array<{
      amount: number;
      type: 'earned' | 'spent' | 'expired';
      description: string;
      date: Date;
    }>;
  };
  categoryCoins: Map<string, ICategoryCoins>; // Per-MainCategory coin balances
  createdAt: Date;
  updatedAt: Date;
}

const UserLoyaltySchema = new Schema<IUserLoyalty>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  streak: {
    current: {
      type: Number,
      default: 0,
      min: 0
    },
    target: {
      type: Number,
      default: 7,
      min: 1
    },
    lastCheckin: {
      type: Date
    },
    history: [{
      type: Date
    }]
  },
  brandLoyalty: [{
    brandId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    brandName: {
      type: String,
      required: true,
      trim: true
    },
    purchaseCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    tier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze'
    },
    progress: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0
    },
    nextTierAt: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  missions: [{
    missionId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    progress: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    target: {
      type: Number,
      required: true,
      min: 1
    },
    reward: {
      type: Number,
      required: true,
      min: 0
    },
    icon: {
      type: String,
      required: true
    },
    completedAt: {
      type: Date
    }
  }],
  coins: {
    available: {
      type: Number,
      default: 0,
      min: 0
    },
    expiring: {
      type: Number,
      default: 0,
      min: 0
    },
    expiryDate: {
      type: Date
    },
    history: [{
      amount: {
        type: Number,
        required: true
      },
      type: {
        type: String,
        enum: ['earned', 'spent', 'expired'],
        required: true
      },
      description: {
        type: String,
        required: true,
        trim: true
      },
      date: {
        type: Date,
        required: true,
        default: Date.now
      }
    }]
  },
  // Per-MainCategory coin balances (food-dining, beauty-wellness, grocery-essentials)
  categoryCoins: {
    type: Map,
    of: new Schema({
      available: { type: Number, default: 0, min: 0 },
      expiring: { type: Number, default: 0, min: 0 },
      expiryDate: { type: Date }
    }, { _id: false }),
    default: () => new Map()
  }
}, {
  timestamps: true
});

UserLoyaltySchema.index({ userId: 1 });
UserLoyaltySchema.index({ 'streak.current': -1 });
UserLoyaltySchema.index({ userId: 1, 'streak.current': -1 });
UserLoyaltySchema.index({ userId: 1, 'brandLoyalty.tier': 1 });

export const UserLoyalty = mongoose.model<IUserLoyalty>('UserLoyalty', UserLoyaltySchema);
export default UserLoyalty;





