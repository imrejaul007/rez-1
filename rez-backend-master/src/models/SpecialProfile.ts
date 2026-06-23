import mongoose, { Document, Schema, Model } from 'mongoose';

// SpecialProfile interface (Verified profile categories like Defence, Healthcare, Senior Citizen)
export interface ISpecialProfile extends Document {
  name: string;
  slug: string;
  icon: string; // Ionicon name
  iconColor: string;
  backgroundColor: string;
  description?: string;
  verificationRequired: string; // e.g., "Military ID", "Hospital ID"
  verificationDocuments?: string[]; // List of accepted documents
  verificationTime?: string; // e.g., "24-48 hours"
  offersCount: number;
  discountRange?: string; // e.g., "10-30%"
  image?: string;
  bannerImage?: string;
  benefits?: string[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const SpecialProfileSchema = new Schema<ISpecialProfile>(
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
      default: 'shield',
    },
    iconColor: {
      type: String,
      required: true,
      default: '#059669',
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
    verificationRequired: {
      type: String,
      required: true,
      trim: true,
    },
    verificationDocuments: [{
      type: String,
      trim: true,
    }],
    verificationTime: {
      type: String,
      default: '24-48 hours',
    },
    offersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountRange: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    bannerImage: {
      type: String,
    },
    benefits: [{
      type: String,
      trim: true,
    }],
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
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate slug
SpecialProfileSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

const SpecialProfile = mongoose.model<ISpecialProfile>('SpecialProfile', SpecialProfileSchema);

export default SpecialProfile;
