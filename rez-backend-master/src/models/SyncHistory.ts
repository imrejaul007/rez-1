import mongoose, { Document, Schema } from 'mongoose';

export interface ISyncHistory extends Document {
  syncId: string;
  merchantId: string;
  syncedAt: Date;
  success: boolean;
  duration: number;
  results: {
    products?: { created: number; updated: number; deleted: number; errors: number };
    orders?: { created: number; updated: number; errors: number };
    cashback?: { created: number; updated: number; errors: number };
    merchant?: { updated: boolean; errors: number };
  };
  syncErrors: string[];
}

const SyncHistorySchema = new Schema<ISyncHistory>(
  {
    syncId: { type: String, required: true, unique: true },
    merchantId: { type: String, required: true, index: true },
    syncedAt: { type: Date, required: true, default: Date.now },
    success: { type: Boolean, required: true },
    duration: { type: Number, default: 0 },
    results: { type: Schema.Types.Mixed, default: {} },
    syncErrors: [{ type: String }],
  },
  { timestamps: false },
);

// TTL: auto-delete sync history older than 90 days
SyncHistorySchema.index({ syncedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SyncHistoryModel =
  mongoose.models.SyncHistory || mongoose.model<ISyncHistory>('SyncHistory', SyncHistorySchema);
