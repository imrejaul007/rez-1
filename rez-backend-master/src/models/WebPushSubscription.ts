import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IWebPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface IWebPushSubscription extends Document {
  userId: Types.ObjectId;
  endpoint: string;
  keys: IWebPushSubscriptionKeys;
  createdAt: Date;
}

const WebPushSubscriptionSchema = new Schema<IWebPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One subscription object per endpoint (deduplicate on re-subscribe)
WebPushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

export const WebPushSubscription = mongoose.model<IWebPushSubscription>(
  'WebPushSubscription',
  WebPushSubscriptionSchema,
);
