import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAggregatorSyncLog extends Document {
  merchantId: Types.ObjectId;
  // aggregatorName used by scheduled sync jobs (e.g. 'swiggy', 'zomato')
  aggregatorName: string;
  // platform is an alias stored alongside aggregatorName for backward compat
  // with aggregatorSyncService.persistConflictsToLog()
  platform?: string;
  syncType: 'menu' | 'orders' | 'inventory' | 'full';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  itemsSynced: number;
  // syncErrors: structured sync-level errors (field + message pairs)
  syncErrors: Array<{ field: string; message: string }>;
  // conflicts: price/name/availability conflicts detected by aggregatorSyncService
  conflicts: Array<{
    itemName?: string;
    field?: string;
    rezValue?: string;
    aggregatorValue?: string;
    resolution?: string;
    // legacy fields from original stub
    itemId?: string;
    rezPrice?: number;
    platformPrice?: number;
    resolvedAt?: Date;
  }>;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AggregatorSyncLogSchema = new Schema<IAggregatorSyncLog>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    aggregatorName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    platform: {
      type: String,
      trim: true,
      lowercase: true,
    },
    syncType: {
      type: String,
      enum: ['menu', 'orders', 'inventory', 'full'],
      default: 'menu',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    itemsSynced: {
      type: Number,
      default: 0,
      min: 0,
    },
    syncErrors: [
      {
        field: { type: String },
        message: { type: String },
        _id: false,
      },
    ],
    conflicts: {
      type: Schema.Types.Mixed,
      default: [],
    },
    syncedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

AggregatorSyncLogSchema.index({ merchantId: 1, aggregatorName: 1, status: 1 });
AggregatorSyncLogSchema.index({ merchantId: 1, platform: 1, status: 1 });
AggregatorSyncLogSchema.index({ merchantId: 1, syncType: 1, createdAt: -1 });

// Pre-save hook: keep aggregatorName and platform in sync
AggregatorSyncLogSchema.pre('save', function (next) {
  if (this.platform && !this.aggregatorName) {
    this.aggregatorName = this.platform;
  } else if (this.aggregatorName && !this.platform) {
    this.platform = this.aggregatorName;
  }
  next();
});

const AggregatorSyncLog = mongoose.models['AggregatorSyncLog']
  ? (mongoose.models['AggregatorSyncLog'] as mongoose.Model<IAggregatorSyncLog>)
  : mongoose.model<IAggregatorSyncLog>('AggregatorSyncLog', AggregatorSyncLogSchema);

export { AggregatorSyncLog };
export default AggregatorSyncLog;
