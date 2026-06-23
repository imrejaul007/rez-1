import { Schema, model, Document, Types } from 'mongoose';

export interface IStaffShift extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  staffId: Types.ObjectId;
  staffName: string;
  weekStartDate: Date;
  shifts: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isOff: boolean;
  }>;
  attendance: Array<{
    date: Date;
    status: 'present' | 'absent' | 'half_day' | 'leave';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IStaffShift>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'MerchantUser', required: true },
    staffName: { type: String, required: true },
    weekStartDate: { type: Date, required: true },
    shifts: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6, required: true },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '17:00' },
        isOff: { type: Boolean, default: false },
      },
    ],
    attendance: [
      {
        date: { type: Date, required: true },
        status: {
          type: String,
          enum: ['present', 'absent', 'half_day', 'leave'],
          default: 'absent',
        },
      },
    ],
  },
  { timestamps: true },
);

shiftSchema.index({ storeId: 1, weekStartDate: -1 });
shiftSchema.index({ staffId: 1, weekStartDate: -1 });

export default model<IStaffShift>('StaffShift', shiftSchema);
