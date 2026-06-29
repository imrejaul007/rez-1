import mongoose, { Schema, Document } from 'mongoose';
import { encryptPII, decryptPII } from '../utils/encryption';

export interface IUserProfile extends Document {
  userId: string;
  phone: string;

  verticals: {
    hotel: { totalSpend: number; transactionCount: number; lastActivity: Date | null; averageOrderValue: number };
    restaurant: { totalSpend: number; transactionCount: number; lastActivity: Date | null; averageOrderValue: number };
    fashion: { totalSpend: number; transactionCount: number; lastActivity: Date | null; averageOrderValue: number };
    pharmacy: { totalSpend: number; transactionCount: number; lastActivity: Date | null; averageOrderValue: number };
    retail: { totalSpend: number; transactionCount: number; lastActivity: Date | null; averageOrderValue: number };
    d2c: { totalSpend: number; transactionCount: number; lastActivity: Date | null; averageOrderValue: number };
  };

  totalLifetimeSpend: number;
  totalTransactions: number;
  averageOrderValue: number;
  favoriteCategories: string[];
  favoriteMerchants: string[];

  firstActivity: Date;
  lastActivity: Date;
  daysActive: number;
  lifetimeValue: number;

  engagementScore: number;
  appOpenFrequency: number;
  lastAppOpen: Date;

  preferredPaymentMethod: 'wallet' | 'upi' | 'card' | 'cod';
  notificationsEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const VerticalStatsSchema = new Schema({
  totalSpend: { type: Number, default: 0 },
  transactionCount: { type: Number, default: 0 },
  lastActivity: { type: Date, default: null },
  averageOrderValue: { type: Number, default: 0 },
}, { _id: false });

const userProfileSchema = new Schema<IUserProfile>({
  userId: { type: String, required: true, unique: true, index: true },
  phone: { type: String, required: true, index: true },

  verticals: {
    hotel: VerticalStatsSchema,
    restaurant: VerticalStatsSchema,
    fashion: VerticalStatsSchema,
    pharmacy: VerticalStatsSchema,
    retail: VerticalStatsSchema,
    d2c: VerticalStatsSchema,
  },

  totalLifetimeSpend: { type: Number, default: 0 },
  totalTransactions: { type: Number, default: 0 },
  averageOrderValue: { type: Number, default: 0 },
  favoriteCategories: [String],
  favoriteMerchants: [String],

  firstActivity: Date,
  lastActivity: Date,
  daysActive: Number,
  lifetimeValue: Number,

  engagementScore: { type: Number, default: 0 },
  appOpenFrequency: { type: Number, default: 0 },
  lastAppOpen: Date,

  preferredPaymentMethod: {
    type: String,
    enum: ['wallet', 'upi', 'card', 'cod'],
    default: 'wallet'
  },
  notificationsEnabled: { type: Boolean, default: true },
}, { timestamps: true });

userProfileSchema.index({ lifetimeValue: -1 });
userProfileSchema.index({ engagementScore: -1 });

// PII Encryption middleware for auth service UserProfile
userProfileSchema.pre('save', function (next) {
    if (this.isModified('phone')) {
        this.phone = encryptPII(this.phone);
    }
    next();
});

userProfileSchema.post('init', function () {
    this.phone = decryptPII(this.phone);
});

userProfileSchema.post('findOne', function (doc) {
    if (doc) {
        doc.phone = decryptPII(doc.phone);
    }
});

userProfileSchema.post('find', function (docs) {
    if (Array.isArray(docs)) {
        docs.forEach((doc) => {
            if (doc) {
                doc.phone = decryptPII(doc.phone);
            }
        });
    }
});

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', userProfileSchema);
