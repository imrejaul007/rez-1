import mongoose, { Document, Schema, Model } from 'mongoose';

// ExclusiveZone interface (User segment categories like Corporate, Women, Birthday)
export interface IExclusiveZone extends Document {
  name: string;
  slug: string;
  icon: string; // Ionicon name
  iconColor: string;
  backgroundColor: string;
  description?: string;
  shortDescription?: string;
  eligibilityType: 'corporate_email' | 'gender' | 'birthday_month' | 'student' | 'age' | 'verification' | 'profession' | 'disability';
  eligibilityDetails?: string; // e.g., "Valid corporate email required"
  verificationRequired: boolean;
  offersCount: number;
  image?: string;
  bannerImage?: string;
  isActive: boolean;
  priority: number;
  cashbackBonusPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExclusiveZoneSchema = new Schema<IExclusiveZone>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    icon: {
      type: String,
      required: true,
      default: 'gift',
    },
    iconColor: {
      type: String,
      required: true,
      default: '#00C06A',
    },
    backgroundColor: {
      type: String,
      required: true,
      default: '#D1FAE5',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    eligibilityType: {
      type: String,
      required: true,
      enum: ['corporate_email', 'gender', 'birthday_month', 'student', 'age', 'verification', 'profession', 'disability'],
      index: true,
    },
    eligibilityDetails: {
      type: String,
      trim: true,
    },
    verificationRequired: {
      type: Boolean,
      default: false,
    },
    offersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    image: {
      type: String,
    },
    bannerImage: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    cashbackBonusPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 50,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate slug
ExclusiveZoneSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

const ExclusiveZone = mongoose.model<IExclusiveZone>('ExclusiveZone', ExclusiveZoneSchema);

export default ExclusiveZone;
