// UserStoreVoucher Model - Tracks store vouchers assigned to users
// This is different from UserVoucher (gift card vouchers)

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUserStoreVoucher extends Document {
  user: Types.ObjectId;
  voucher: Types.ObjectId;
  assignedAt: Date;
  usedAt?: Date;
  order?: Types.ObjectId;
  status: 'assigned' | 'used' | 'expired';
}

const UserStoreVoucherSchema = new Schema<IUserStoreVoucher>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  voucher: {
    type: Schema.Types.ObjectId,
    ref: 'StoreVoucher',
    required: true,
    index: true
  },
  assignedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  usedAt: {
    type: Date
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  status: {
    type: String,
    enum: ['assigned', 'used', 'expired'],
    default: 'assigned',
    index: true
  }
}, {
  timestamps: false
});

// Compound indexes
UserStoreVoucherSchema.index({ user: 1, status: 1 });
UserStoreVoucherSchema.index({ user: 1, voucher: 1 }, { unique: true });

const UserStoreVoucher = mongoose.model<IUserStoreVoucher>('UserStoreVoucher', UserStoreVoucherSchema);
export default UserStoreVoucher;
