import mongoose, { Schema, Document } from 'mongoose';

export interface ISponsor extends Document {
  name: string;
  slug: string;
  logo: string;
  description: string;
  brandCoinName: string;
  brandCoinLogo?: string;
  contactPerson: {
    name: string;
    email: string;
    phone?: string;
  };
  website?: string;
  industry?: string;
  totalEventsSponsored: number;
  totalParticipants: number;
  totalCoinsDistributed: number;
  totalBudgetFunded: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SponsorSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    logo: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    brandCoinName: {
      type: String,
      required: true,
      trim: true
    },
    brandCoinLogo: {
      type: String
    },
    contactPerson: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String }
    },
    website: {
      type: String
    },
    industry: {
      type: String,
      enum: [
        'technology',
        'healthcare',
        'finance',
        'retail',
        'manufacturing',
        'fmcg',
        'energy',
        'education',
        'hospitality',
        'other'
      ]
    },
    totalEventsSponsored: {
      type: Number,
      default: 0,
      min: 0
    },
    totalParticipants: {
      type: Number,
      default: 0,
      min: 0
    },
    totalCoinsDistributed: {
      type: Number,
      default: 0,
      min: 0
    },
    totalBudgetFunded: {
      type: Number,
      default: 0,
      min: 0
    },
    currentBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
SponsorSchema.index({ isActive: 1 });
SponsorSchema.index({ industry: 1 });

// Pre-save middleware to generate slug
SponsorSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = (this.name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

export default mongoose.model<ISponsor>('Sponsor', SponsorSchema);
