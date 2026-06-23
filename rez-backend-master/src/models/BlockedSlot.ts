import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBlockedSlot extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  serviceId?: Types.ObjectId | null; // null = block for ALL services
  date: Date;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  reason?: string;
  isAllDay: boolean;
  recurring?: {
    type: 'weekly';
    daysOfWeek: number[]; // 0=Sun, 1=Mon … 6=Sat
    until?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BlockedSlotSchema = new Schema<IBlockedSlot>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}$/,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    isAllDay: {
      type: Boolean,
      default: false,
    },
    recurring: {
      type: {
        type: String,
        enum: ['weekly'],
      },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }],
      until: Date,
    },
  },
  { timestamps: true }
);

BlockedSlotSchema.index({ merchantId: 1, date: 1 });
BlockedSlotSchema.index({ storeId: 1, date: 1 });

export const BlockedSlot = mongoose.model<IBlockedSlot>('BlockedSlot', BlockedSlotSchema);
export default BlockedSlot;
