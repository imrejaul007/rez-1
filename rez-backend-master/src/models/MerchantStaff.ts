import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchantStaff extends Document {
  merchantId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  addedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantStaffSchema = new Schema<IMerchantStaff>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    role: { type: String, required: true, default: 'staff' },
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
    strict: false,
  },
);

MerchantStaffSchema.index({ merchantId: 1, isActive: 1 });

export const MerchantStaff = mongoose.model<IMerchantStaff>('MerchantStaff', MerchantStaffSchema);
