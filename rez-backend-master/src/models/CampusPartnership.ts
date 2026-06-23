// Campus Partnership Model
// Merchants partner with institutions to offer student discounts

import mongoose, { Schema, Document } from 'mongoose';

export interface ICampusPartner extends Document {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  institutionId: mongoose.Types.ObjectId;
  institutionName: string;
  merchantName: string;

  // Partnership details
  discount: {
    type: 'percentage' | 'fixed' | 'free_delivery';
    value?: number; // percentage or fixed amount
    minOrderAmount?: number;
    maxDiscount?: number;
  };

  // Status
  status: 'active' | 'paused' | 'expired' | 'pending';
  startDate: Date;
  endDate?: Date;

  // Categories this partnership applies to
  categories: string[];

  // Usage stats
  stats: {
    totalOrders: number;
    totalDiscount: number;
    activeStudents: number;
  };

  // Terms
  terms?: string;
  isExclusive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const CampusPartnerSchema = new Schema<ICampusPartner>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'VerifiedInstitution', required: true },
    institutionName: { type: String, required: true },
    merchantName: { type: String, required: true },

    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed', 'free_delivery'],
        required: true,
      },
      value: { type: Number, min: 0 },
      minOrderAmount: { type: Number, default: 0 },
      maxDiscount: { type: Number },
    },

    status: {
      type: String,
      enum: ['active', 'paused', 'expired', 'pending'],
      default: 'pending',
    },

    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },

    categories: [{ type: String }],

    stats: {
      totalOrders: { type: Number, default: 0 },
      totalDiscount: { type: Number, default: 0 },
      activeStudents: { type: Number, default: 0 },
    },

    terms: { type: String },
    isExclusive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes
CampusPartnerSchema.index({ institutionId: 1, status: 1 });
CampusPartnerSchema.index({ merchantId: 1, status: 1 });
CampusPartnerSchema.index({ institutionName: 'text', merchantName: 'text' });

export const CampusPartner = mongoose.model<ICampusPartner>('CampusPartner', CampusPartnerSchema);
