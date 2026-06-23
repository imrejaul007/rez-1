/**
 * AffiliateWebhookLog Model
 *
 * Audit log for all incoming webhooks from affiliate networks and brands.
 * Used for debugging, compliance, and reconciliation.
 *
 * This is separate from WebhookLog (payment webhooks) to keep concerns separate.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

// Webhook types
export type AffiliateWebhookType = 'conversion' | 'confirm' | 'refund' | 'reject' | 'other';
export type ProcessingStatus = 'pending' | 'success' | 'failed' | 'duplicate' | 'invalid';

// Interface for AffiliateWebhookLog document
export interface IAffiliateWebhookLog extends Document {
  _id: Types.ObjectId;

  // Request details
  webhookType: AffiliateWebhookType;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, any>;
  queryParams: Record<string, string>;

  // Source identification
  ipAddress: string;
  userAgent?: string;
  brandId?: Types.ObjectId;
  brandName?: string;
  affiliateNetwork?: string;

  // Processing result
  status: ProcessingStatus;
  responseStatus: number;
  responseBody?: Record<string, any>;
  processingTime: number;  // milliseconds
  errorMessage?: string;
  errorStack?: string;

  // Related records (created/updated by this webhook)
  clickId?: string;
  purchaseId?: string;
  cashbackId?: Types.ObjectId;

  // Timestamps
  receivedAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const AffiliateWebhookLogSchema = new Schema<IAffiliateWebhookLog>({
  // Request details
  webhookType: {
    type: String,
    enum: ['conversion', 'confirm', 'refund', 'reject', 'other'],
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    required: true,
    uppercase: true,
  },
  headers: {
    type: Schema.Types.Mixed,
    default: {},
  },
  body: {
    type: Schema.Types.Mixed,
    default: {},
  },
  queryParams: {
    type: Schema.Types.Mixed,
    default: {},
  },

  // Source identification
  ipAddress: {
    type: String,
    required: true,
    index: true,
  },
  userAgent: {
    type: String,
  },
  brandId: {
    type: Schema.Types.ObjectId,
    ref: 'MallBrand',
    index: true,
  },
  brandName: {
    type: String,
  },
  affiliateNetwork: {
    type: String,
    index: true,
  },

  // Processing result
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'duplicate', 'invalid'],
    default: 'pending',
    index: true,
  },
  responseStatus: {
    type: Number,
    required: true,
    default: 200,
  },
  responseBody: {
    type: Schema.Types.Mixed,
  },
  processingTime: {
    type: Number,
    default: 0,
    min: 0,
  },
  errorMessage: {
    type: String,
  },
  errorStack: {
    type: String,
  },

  // Related records
  clickId: {
    type: String,
    index: true,
  },
  purchaseId: {
    type: String,
    index: true,
  },
  cashbackId: {
    type: Schema.Types.ObjectId,
    ref: 'UserCashback',
  },

  // Timestamps
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  processedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for querying
AffiliateWebhookLogSchema.index({ webhookType: 1, receivedAt: -1 });
AffiliateWebhookLogSchema.index({ brandId: 1, receivedAt: -1 });
AffiliateWebhookLogSchema.index({ status: 1, receivedAt: -1 });
AffiliateWebhookLogSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // Auto-delete after 90 days

// Static method to create log entry
AffiliateWebhookLogSchema.statics.logWebhook = async function(data: {
  webhookType: AffiliateWebhookType;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, any>;
  queryParams: Record<string, string>;
  ipAddress: string;
  userAgent?: string;
  brandId?: Types.ObjectId;
  brandName?: string;
  affiliateNetwork?: string;
}): Promise<IAffiliateWebhookLog> {
  const log = new this({
    ...data,
    receivedAt: new Date(),
  });
  await log.save();
  return log;
};

// Static method to update log with result
AffiliateWebhookLogSchema.statics.updateLogResult = async function(
  logId: Types.ObjectId,
  result: {
    status: ProcessingStatus;
    responseStatus: number;
    responseBody?: Record<string, any>;
    processingTime: number;
    errorMessage?: string;
    errorStack?: string;
    clickId?: string;
    purchaseId?: string;
    cashbackId?: Types.ObjectId;
  }
): Promise<void> {
  await this.findByIdAndUpdate(logId, {
    ...result,
    processedAt: new Date(),
  });
};

// Static method to get recent logs by brand
AffiliateWebhookLogSchema.statics.getRecentByBrand = async function(
  brandId: Types.ObjectId,
  limit: number = 50
): Promise<IAffiliateWebhookLog[]> {
  return this.find({ brandId })
    .sort({ receivedAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get failed webhooks
AffiliateWebhookLogSchema.statics.getFailedWebhooks = async function(
  startDate: Date,
  endDate: Date
): Promise<IAffiliateWebhookLog[]> {
  return this.find({
    status: 'failed',
    receivedAt: { $gte: startDate, $lte: endDate },
  })
    .sort({ receivedAt: -1 })
    .lean();
};

// Static method to get webhook stats
AffiliateWebhookLogSchema.statics.getStats = async function(
  startDate: Date,
  endDate: Date
): Promise<{
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  avgProcessingTime: number;
}> {
  const stats = await this.aggregate([
    {
      $match: {
        receivedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $facet: {
        total: [{ $count: 'count' }],
        byType: [
          { $group: { _id: '$webhookType', count: { $sum: 1 } } },
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        avgTime: [
          { $group: { _id: null, avg: { $avg: '$processingTime' } } },
        ],
      },
    },
  ]);

  const result = stats[0];

  return {
    total: result.total[0]?.count || 0,
    byType: result.byType.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byStatus: result.byStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    avgProcessingTime: Math.round(result.avgTime[0]?.avg || 0),
  };
};

// Delete cached model if exists
if (mongoose.models.AffiliateWebhookLog) {
  delete (mongoose.models as any).AffiliateWebhookLog;
}

export const AffiliateWebhookLog = mongoose.model<IAffiliateWebhookLog>(
  'AffiliateWebhookLog',
  AffiliateWebhookLogSchema
);
