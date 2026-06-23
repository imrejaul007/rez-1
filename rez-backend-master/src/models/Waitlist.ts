import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWaitlistEntry extends Document {
  _id: Types.ObjectId;
  store: Types.ObjectId;
  user: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceType: string;
  preferredDate: Date;
  preferredTimeRange?: {
    from: string; // "HH:MM"
    to: string; // "HH:MM"
  };
  duration?: number;
  staffId?: Types.ObjectId;
  status: 'waiting' | 'notified' | 'booked' | 'expired' | 'cancelled';
  notifiedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSchema = new Schema<IWaitlistEntry>(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    preferredDate: {
      type: Date,
      required: true,
    },
    preferredTimeRange: {
      from: { type: String, match: /^\d{2}:\d{2}$/ },
      to: { type: String, match: /^\d{2}:\d{2}$/ },
    },
    duration: {
      type: Number,
      min: 15,
      max: 480,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'MerchantUser',
    },
    status: {
      type: String,
      enum: ['waiting', 'notified', 'booked', 'expired', 'cancelled'],
      default: 'waiting',
    },
    notifiedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// Compound indexes for efficient queries
WaitlistSchema.index({ store: 1, status: 1, preferredDate: 1 });
WaitlistSchema.index({ user: 1 });
WaitlistSchema.index({ expiresAt: 1, status: 1 }); // for TTL cleanup jobs

export const Waitlist = mongoose.model<IWaitlistEntry>('Waitlist', WaitlistSchema);
export default Waitlist;
