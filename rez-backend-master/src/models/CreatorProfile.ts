import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================
// TYPES
// ============================================

export type CreatorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type CreatorTier = 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum';
export type CreatorCategory = 'fashion' | 'beauty' | 'lifestyle' | 'tech' | 'food' | 'fitness' | 'travel' | 'health' | 'entertainment' | 'other';

export interface ICreatorProfile extends Document {
  user: Types.ObjectId;
  status: CreatorStatus;
  applicationDate: Date;
  approvedDate?: Date;
  approvedBy?: Types.ObjectId;
  rejectedBy?: Types.ObjectId;
  rejectionReason?: string;
  suspendedBy?: Types.ObjectId;
  suspensionReason?: string;

  // Profile
  displayName: string;
  bio: string;
  avatar: string;
  coverImage?: string;
  category: CreatorCategory;
  tags: string[];
  socialLinks: { platform: string; url: string }[];

  // Earnings Config (per-creator override; falls back to global EarningConfig.creatorProgram)
  commissionRate?: number;
  tier: CreatorTier;

  // Aggregated Stats (refreshed by background job)
  stats: {
    totalPicks: number;
    totalViews: number;
    totalLikes: number;
    totalFollowers: number;
    totalConversions: number;
    totalEarnings: number;
    engagementRate: number;
    lastUpdated: Date;
  };

  isVerified: boolean;
  isFeatured: boolean;
  featuredOrder?: number;

  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================

const CreatorProfileSchema = new Schema<ICreatorProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    approvedDate: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: String,
    suspendedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    suspensionReason: String,

    // Profile
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },
    avatar: {
      type: String,
      default: '',
    },
    coverImage: String,
    category: {
      type: String,
      enum: ['fashion', 'beauty', 'lifestyle', 'tech', 'food', 'fitness', 'travel', 'health', 'entertainment', 'other'],
      required: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 10,
        message: 'Maximum 10 tags allowed',
      },
    },
    socialLinks: [
      {
        platform: { type: String, required: true },
        url: { type: String, required: true },
        _id: false,
      },
    ],

    // Earnings Config
    commissionRate: {
      type: Number,
      min: 0,
      max: 50,
    },
    tier: {
      type: String,
      enum: ['starter', 'bronze', 'silver', 'gold', 'platinum'],
      default: 'starter',
    },

    // Aggregated Stats
    stats: {
      totalPicks: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
      totalLikes: { type: Number, default: 0 },
      totalFollowers: { type: Number, default: 0 },
      totalConversions: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    featuredOrder: Number,

    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

CreatorProfileSchema.index({ user: 1 }, { unique: true });
CreatorProfileSchema.index({ status: 1 });
CreatorProfileSchema.index({ status: 1, isFeatured: 1, featuredOrder: 1 });
CreatorProfileSchema.index({ 'stats.totalViews': -1 });
CreatorProfileSchema.index({ tier: 1 });
CreatorProfileSchema.index({ category: 1 });
CreatorProfileSchema.index({ status: 1, category: 1 });
CreatorProfileSchema.index({ status: 1, 'stats.totalFollowers': -1 });

// ============================================
// EXPORT
// ============================================

export const CreatorProfile = mongoose.model<ICreatorProfile>('CreatorProfile', CreatorProfileSchema);
export default CreatorProfile;
