import { Schema, model, Document, Types } from 'mongoose';

/**
 * BroadcastCampaign — merchant-initiated message blast to their customer base.
 *
 * Flow:
 * 1. Merchant creates campaign (status: 'draft')
 * 2. Merchant sends → broadcastDispatchService.dispatch() → status: 'queued'
 * 3. broadcastWorker processes the job → status: 'sending'
 * 4. All messages dispatched → status: 'sent'
 * 5. On failure → status: 'failed'
 *
 * Audience is resolved at dispatch time from MerchantCustomerSnapshot so
 * merchants see a near-real-time count before sending.
 */
export interface IBroadcastCampaign extends Document {
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;

  // Content
  name: string;
  message: string;
  channel: 'sms' | 'push' | 'whatsapp' | 'email' | 'in_app';

  // Audience filter
  audience: {
    segment: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
    daysInactive?: number; // for 'lapsed' segment: inactive for N+ days
    minSpend?: number; // for 'high_value': lifetime spend ≥ N
    estimatedCount: number; // cached estimate from snapshot at creation time
  };

  // Scheduling
  scheduledAt?: Date; // null = send immediately
  sentAt?: Date;

  // Status tracking
  status: 'draft' | 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';
  stats: {
    sent: number;
    delivered: number;
    failed: number;
    deduped: number; // skipped by per-customer dedup
  };

  // Campaign metadata
  type?: string; // campaign type label for AI recommendation (e.g. 'win_back', 'promo')
  linkedRecommendationId?: Types.ObjectId; // CampaignRecommendationLog._id if AI-suggested

  // Error info (if status = 'failed')
  errorMessage?: string;

  // Phase C — set when the campaign was launched from a CampaignTemplate.
  // Gives us a traceable back-pointer to the template + coupon pair and
  // stores the idempotency key used to dedupe double-taps of the same
  // one-tap launch.
  templateLaunch?: {
    templateId: string;
    storeId?: Types.ObjectId;
    couponId?: Types.ObjectId;
    couponCode?: string;
    idempotencyKey: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const BroadcastCampaignSchema = new Schema<IBroadcastCampaign>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },

    name: { type: String, required: true, trim: true },
    message: { type: String, required: true, maxlength: 1000 },
    channel: {
      type: String,
      enum: ['sms', 'push', 'whatsapp', 'email', 'in_app'],
      required: true,
      default: 'push',
    },

    audience: {
      segment: {
        type: String,
        enum: ['all', 'recent', 'lapsed', 'high_value', 'stamp_card'],
        required: true,
        default: 'all',
      },
      daysInactive: { type: Number },
      minSpend: { type: Number },
      estimatedCount: { type: Number, default: 0 },
    },

    scheduledAt: { type: Date },
    sentAt: { type: Date },

    status: {
      type: String,
      enum: ['draft', 'queued', 'sending', 'sent', 'failed', 'cancelled'],
      default: 'draft',
      index: true,
    },

    stats: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      deduped: { type: Number, default: 0 },
    },

    type: { type: String },
    linkedRecommendationId: { type: Schema.Types.ObjectId, ref: 'CampaignRecommendationLog' },
    errorMessage: { type: String },

    // Phase C — campaign-template launch provenance (see interface comment).
    templateLaunch: {
      templateId: { type: String, trim: true },
      storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
      couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
      couponCode: { type: String, trim: true },
      idempotencyKey: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

// Compound indexes for common merchant queries
BroadcastCampaignSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
BroadcastCampaignSchema.index({ merchantId: 1, createdAt: -1 });
BroadcastCampaignSchema.index({ status: 1, scheduledAt: 1 }); // for scheduler: find due campaigns
// Phase C — idempotency lookup for campaign-template double-tap protection.
// Sparse so existing docs without templateLaunch don't occupy index slots.
BroadcastCampaignSchema.index(
  { merchantId: 1, 'templateLaunch.idempotencyKey': 1 },
  { sparse: true },
);

export const BroadcastCampaign = model<IBroadcastCampaign>('BroadcastCampaign', BroadcastCampaignSchema);

export default BroadcastCampaign;
