import mongoose, { Schema, Document } from 'mongoose';

/**
 * Webhook Log Model
 * Tracks all webhook events for debugging and idempotency
 */

export interface IWebhookLog extends Document {
  provider: 'razorpay' | 'stripe';
  eventId: string; // Unique event ID from payment gateway
  eventType: string; // payment.captured, payment_intent.succeeded, etc.
  payload: any; // Full webhook payload
  signature: string; // Webhook signature
  signatureValid: boolean; // Whether signature was valid
  processed: boolean; // Whether webhook was processed
  processedAt?: Date;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'duplicate' | 'pending_retry';
  errorMessage?: string;
  retryCount: number;
  metadata?: {
    orderId?: string;
    paymentId?: string;
    amount?: number;
    currency?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WebhookLogSchema = new Schema<IWebhookLog>({
  provider: {
    type: String,
    enum: ['razorpay', 'stripe'],
    required: true,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    unique: true, // Ensures idempotency - same event can't be processed twice
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  signatureValid: {
    type: Boolean,
    required: true,
    default: false
  },
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  processedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'duplicate', 'pending_retry'],
    default: 'pending',
    index: true
  },
  errorMessage: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  metadata: {
    orderId: String,
    paymentId: String,
    amount: Number,
    currency: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
WebhookLogSchema.index({ provider: 1, eventType: 1, createdAt: -1 });
WebhookLogSchema.index({ provider: 1, processed: 1, createdAt: -1 });
WebhookLogSchema.index({ 'metadata.orderId': 1 });
WebhookLogSchema.index({ 'metadata.paymentId': 1 });

// TTL index - automatically delete logs older than 90 days
WebhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Static method to check if event was already processed
WebhookLogSchema.statics.isEventProcessed = async function(eventId: string): Promise<boolean> {
  const existingLog = await this.findOne({
    eventId,
    $or: [
      { processed: true },
      { status: 'success' }
    ]
  });
  return !!existingLog;
};

// Static method to mark event as duplicate
WebhookLogSchema.statics.markAsDuplicate = async function(eventId: string): Promise<void> {
  await this.findOneAndUpdate(
    { eventId },
    {
      status: 'duplicate',
      errorMessage: 'Duplicate webhook event detected'
    }
  );
};

export const WebhookLog = mongoose.model<IWebhookLog>('WebhookLog', WebhookLogSchema);
