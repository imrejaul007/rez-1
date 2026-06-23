import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInstituteReferral extends Document {
  _id: Types.ObjectId;
  submittedBy: Types.ObjectId;
  instituteName: string;
  instituteType: 'college' | 'company';
  city: string;
  adminContactEmail?: string;
  status: 'pending' | 'contacted' | 'onboarded' | 'declined';
  rewardCredited: boolean;
  rewardAmount: number; // in paise (30000 = ₹300)
  onboardedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InstituteReferralSchema = new Schema<IInstituteReferral>(
  {
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    instituteName: {
      type: String,
      required: true,
      trim: true,
    },
    instituteType: {
      type: String,
      enum: ['college', 'company'],
      required: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    adminContactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'onboarded', 'declined'],
      default: 'pending',
      index: true,
    },
    rewardCredited: {
      type: Boolean,
      default: false,
    },
    rewardAmount: {
      type: Number,
      default: 30000, // ₹300 in paise
    },
    onboardedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate referrals for same institute by same user
InstituteReferralSchema.index(
  { submittedBy: 1, instituteName: 1 },
  { unique: true }
);

export const InstituteReferral = mongoose.model<IInstituteReferral>(
  'InstituteReferral',
  InstituteReferralSchema
);

export default InstituteReferral;
