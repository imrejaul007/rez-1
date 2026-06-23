import mongoose, { Document, Schema } from 'mongoose';

export interface IStaffCommission extends Document {
  storeId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
  serviceCategories: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StaffCommissionSchema = new Schema<IStaffCommission>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'MerchantStaff', required: true },
    staffName: { type: String, required: true },
    commissionType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    commissionValue: { type: Number, required: true, min: 0, default: 0 },
    serviceCategories: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

StaffCommissionSchema.index({ storeId: 1, staffId: 1 }, { unique: true });

export default mongoose.model<IStaffCommission>('StaffCommission', StaffCommissionSchema);
