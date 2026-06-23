import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Types ──────────────────────────────────────────────────

export type AnalyticsEventType = 'visit_event' | 'reward_event' | 'redemption_event';

export interface IAnalyticsEvent extends Document {
  eventType: AnalyticsEventType;
  userId: Types.ObjectId;
  timestamp: Date;
  data: {
    entityId?: string;
    entityType?: string;
    amount?: number;
    storeId?: string;
    category?: string;
    source?: string;
    metadata?: Record<string, any>;
  };
  sourceEventId: string;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>({
  eventType: {
    type: String,
    required: true,
    enum: ['visit_event', 'reward_event', 'redemption_event'],
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  data: {
    entityId: String,
    entityType: String,
    amount: Number,
    storeId: String,
    category: String,
    source: String,
    metadata: { type: Schema.Types.Mixed },
  },
  sourceEventId: {
    type: String,
    required: true,
  },
  processed: {
    type: Boolean,
    default: false,
    index: true,
  },
  processedAt: Date,
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

// ─── Indexes ────────────────────────────────────────────────

AnalyticsEventSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ sourceEventId: 1 }, { unique: true, sparse: true });
AnalyticsEventSchema.index({ processed: 1, createdAt: 1 });
// TTL: auto-delete after 180 days
AnalyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export const AnalyticsEvent = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
export default AnalyticsEvent;
