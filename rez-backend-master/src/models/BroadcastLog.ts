import mongoose, { Document, Schema } from 'mongoose';

export interface IBroadcastLog extends Document {
  storeSlug: string;
  title: string;
  body: string;
  url?: string;
  sentAt: Date;
  recipientCount: number;
}

const BroadcastLogSchema = new Schema<IBroadcastLog>(
  {
    storeSlug: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    url: { type: String },
    sentAt: { type: Date, required: true, default: () => new Date() },
    recipientCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: false },
);

// Auto-delete after 90 days
BroadcastLogSchema.index({ sentAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const BroadcastLog = mongoose.model<IBroadcastLog>('BroadcastLog', BroadcastLogSchema);
