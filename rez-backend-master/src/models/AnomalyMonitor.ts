import { Schema, model, Document, Types } from 'mongoose';

/**
 * AnomalyMonitor — stores flagged anomalous activity for admin review.
 *
 * Populated by anomalyDetectionJob when it detects:
 * - High coin velocity (suspicious mass earn in short window)
 * - Payment failure rate spikes
 * - Revenue anomalies
 *
 * Consumed by the admin fraud-alerts screen and anomaly API.
 */
export interface IAnomalyMonitor extends Document {
  userId?: Types.ObjectId;
  merchantId?: Types.ObjectId;
  type: string; // 'high_coin_velocity' | 'payment_failure_spike' | 'revenue_anomaly' | ...
  coinsEarned?: number;
  windowMinutes?: number;
  value?: number; // generic numeric value for the anomaly (e.g. failure rate %)
  threshold?: number; // threshold that was exceeded
  flaggedAt: Date;
  status: 'monitoring' | 'reviewed' | 'dismissed' | 'escalated';
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnomalyMonitorSchema = new Schema<IAnomalyMonitor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', index: true },
    type: { type: String, required: true, index: true },
    coinsEarned: { type: Number },
    windowMinutes: { type: Number },
    value: { type: Number },
    threshold: { type: Number },
    flaggedAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['monitoring', 'reviewed', 'dismissed', 'escalated'],
      default: 'monitoring',
      index: true,
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
);

// Compound indexes for common admin queries
AnomalyMonitorSchema.index({ type: 1, status: 1, flaggedAt: -1 });
AnomalyMonitorSchema.index({ userId: 1, type: 1 }); // dedup upsert key used by job
AnomalyMonitorSchema.index({ flaggedAt: -1, status: 1 });

export const AnomalyMonitor = model<IAnomalyMonitor>('AnomalyMonitor', AnomalyMonitorSchema);

// Named export as 'model' so the legacy require pattern in anomalyDetectionJob works:
//   const AnomalyMonitor = require('../models/AnomalyMonitor') as any;
//   if (AnomalyMonitor.model) { ... }
export default { model: AnomalyMonitor };
