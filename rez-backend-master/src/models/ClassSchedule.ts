import mongoose, { Document, Schema } from 'mongoose';

export interface IClassSchedule extends Document {
  storeId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  instructorId?: mongoose.Types.ObjectId;
  instructorName?: string;
  duration: number; // minutes
  capacity: number; // max participants
  price: number;
  startTime: Date;
  endTime: Date;
  recurring: boolean;
  recurringDays?: number[]; // 0=Sun, 1=Mon, ...6=Sat
  color: string;
  active: boolean;
  bookedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ClassScheduleSchema = new Schema<IClassSchedule>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    instructorId: { type: Schema.Types.ObjectId, ref: 'MerchantStaff' },
    instructorName: { type: String, trim: true },
    duration: { type: Number, required: true, min: 1 },
    capacity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    recurring: { type: Boolean, default: false },
    recurringDays: { type: [Number], default: undefined },
    color: { type: String, default: '#6366F1' },
    active: { type: Boolean, default: true },
    bookedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

ClassScheduleSchema.index({ storeId: 1, startTime: 1 });

export const ClassSchedule = mongoose.model<IClassSchedule>('ClassSchedule', ClassScheduleSchema);
