import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Interface for ProcessedWebhookEvent document properties
 * Tracks all processed webhook events to prevent replay attacks
 */
export interface IProcessedWebhookEvent {
  eventId: string; // Razorpay event ID (unique)
  eventType: string; // e.g., 'subscription.activated', 'subscription.charged'
  subscriptionId?: string; // Razorpay subscription ID
  razorpaySignature: string; // Signature hash for audit
  processedAt: Date; // When the webhook was processed
  expiresAt: Date; // Auto-delete after 30 days (TTL index)

  // Additional context
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  retryCount: number;
  lastRetryAt?: Date;

  // Metadata for audit trail
  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for ProcessedWebhookEvent Document (extends mongoose Document)
 */
export interface IProcessedWebhookEventDocument extends IProcessedWebhookEvent, Document {}

/**
 * Interface for ProcessedWebhookEvent Model (static methods)
 */
export interface IProcessedWebhookEventModel extends mongoose.Model<IProcessedWebhookEventDocument> {
  isEventProcessed(eventId: string): Promise<boolean>;
  getSubscriptionEventHistory(subscriptionId: string, limit?: number): Promise<IProcessedWebhookEventDocument[]>;
  recordEvent(
    eventId: string,
    eventType: string,
    subscriptionId: string,
    razorpaySignature: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<IProcessedWebhookEventDocument>;
  markEventFailed(eventId: string, errorMessage: string): Promise<IProcessedWebhookEventDocument | null>;
  getFailedEvents(hoursAgo?: number): Promise<IProcessedWebhookEventDocument[]>;
  getEventStats(hoursAgo?: number): Promise<{ success: number; failed: number; pending: number }>;
}

/**
 * ProcessedWebhookEvent Schema
 * Stores records of all processed webhooks to prevent duplicate processing
 */
const ProcessedWebhookEventSchema = new Schema<IProcessedWebhookEventDocument>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      description: 'Unique Razorpay event ID',
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
      enum: [
        'subscription.activated',
        'subscription.charged',
        'subscription.completed',
        'subscription.cancelled',
        'subscription.paused',
        'subscription.resumed',
        'subscription.pending',
        'subscription.halted',
        'subscription.updated',
        'invoice.paid',
        'invoice.issued',
        'invoice.failed',
      ],
      description: 'Type of webhook event',
    },
    subscriptionId: {
      type: String,
      sparse: true,
      index: true,
      description: 'Associated Razorpay subscription ID',
    },
    razorpaySignature: {
      type: String,
      required: true,
      description: 'Razorpay webhook signature for audit purposes',
    },
    processedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
      description: 'Timestamp when webhook was processed',
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 30); // Auto-delete after 30 days
        return date;
      },
      index: { expireAfterSeconds: 0 }, // TTL index - auto-delete
      description: 'Auto-expiration date for cleanup',
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success',
      index: true,
      description: 'Processing status of the webhook',
    },
    errorMessage: {
      type: String,
      sparse: true,
      description: 'Error message if processing failed',
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Number of retry attempts',
    },
    lastRetryAt: {
      type: Date,
      sparse: true,
      description: 'Timestamp of last retry attempt',
    },
    ipAddress: {
      type: String,
      sparse: true,
      description: 'IP address that sent the webhook',
    },
    userAgent: {
      type: String,
      sparse: true,
      description: 'User agent string from webhook request',
    },
  },
  {
    timestamps: true,
    collection: 'processed_webhook_events',
  }
);

/**
 * Create indexes for efficient querying and automatic cleanup
 */
ProcessedWebhookEventSchema.index({ eventType: 1, processedAt: -1 });
ProcessedWebhookEventSchema.index({ status: 1 });

/**
 * Static method to check if a webhook event has already been processed
 */
ProcessedWebhookEventSchema.statics.isEventProcessed = async function (
  eventId: string
): Promise<boolean> {
  const existingEvent = await this.findOne({ eventId });
  return !!existingEvent;
};

/**
 * Static method to get event history for a subscription
 */
ProcessedWebhookEventSchema.statics.getSubscriptionEventHistory = async function (
  subscriptionId: string,
  limit: number = 50
) {
  return await this.find({ subscriptionId })
    .sort({ processedAt: -1 })
    .limit(limit);
};

/**
 * Static method to record a processed webhook event
 */
ProcessedWebhookEventSchema.statics.recordEvent = async function (
  eventId: string,
  eventType: string,
  subscriptionId: string,
  razorpaySignature: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const event = new this({
      eventId,
      eventType,
      subscriptionId,
      razorpaySignature,
      status: 'success',
      ipAddress,
      userAgent,
      processedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    return await event.save();
  } catch (error: any) {
    // If duplicate key error, the event was already recorded
    if (error.code === 11000) {
      logger.warn(
        `[WEBHOOK] Event already recorded: ${eventId}`,
        { error: error.message }
      );
      throw new Error(`Duplicate event: ${eventId}`);
    }
    throw error;
  }
};

/**
 * Static method to mark event as failed
 */
ProcessedWebhookEventSchema.statics.markEventFailed = async function (
  eventId: string,
  errorMessage: string
) {
  return await this.findOneAndUpdate(
    { eventId },
    {
      status: 'failed',
      errorMessage,
      lastRetryAt: new Date(),
      $inc: { retryCount: 1 },
    },
    { new: true }
  );
};

/**
 * Static method to get recent failed events
 */
ProcessedWebhookEventSchema.statics.getFailedEvents = async function (
  hoursAgo: number = 24
) {
  const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return await this.find({
    status: 'failed',
    processedAt: { $gte: cutoffDate },
  }).sort({ processedAt: -1 });
};

/**
 * Static method to get event statistics
 */
ProcessedWebhookEventSchema.statics.getEventStats = async function (
  hoursAgo: number = 24
) {
  const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: { processedAt: { $gte: cutoffDate } },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return stats.reduce(
    (acc: any, stat: any) => {
      acc[stat._id] = stat.count;
      return acc;
    },
    { success: 0, failed: 0, pending: 0 }
  );
};

export const ProcessedWebhookEvent = mongoose.model<IProcessedWebhookEventDocument, IProcessedWebhookEventModel>(
  'ProcessedWebhookEvent',
  ProcessedWebhookEventSchema
);
