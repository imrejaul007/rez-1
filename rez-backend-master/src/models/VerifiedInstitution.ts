import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVerifiedInstitution extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  type: 'college' | 'company';
  aliases: string[];
  emailDomains: string[];
  city: string;
  state?: string;
  isActive: boolean;
  autoVerifyEnabled: boolean;
  estimatedStudentCount?: number;
  logoUrl?: string;
  addedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VerifiedInstitutionSchema = new Schema<IVerifiedInstitution>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: ['college', 'company'],
      required: true,
      index: true,
    },
    aliases: {
      type: [String],
      default: [],
    },
    emailDomains: {
      type: [String],
      default: [],
      index: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    autoVerifyEnabled: {
      type: Boolean,
      default: true,
    },
    estimatedStudentCount: {
      type: Number,
      min: 0,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
VerifiedInstitutionSchema.index({ type: 1, isActive: 1 });
VerifiedInstitutionSchema.index({ name: 'text', aliases: 'text' });

// Auto-generate slug from name
VerifiedInstitutionSchema.pre('validate', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

export const VerifiedInstitution = mongoose.model<IVerifiedInstitution>(
  'VerifiedInstitution',
  VerifiedInstitutionSchema
);

export default VerifiedInstitution;
