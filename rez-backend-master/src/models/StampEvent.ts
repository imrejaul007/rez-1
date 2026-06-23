import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * StampEvent — records each individual stamp earned by a user.
 * Provides an immutable audit trail linked to the order that triggered it.
 *
 * This is the event-sourcing log for stamp earning. It is NOT updated after creation.
 */
export interface IStampEvent extends Document {
  userId: Types.ObjectId;
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  cardId: Types.ObjectId;
  userCardId: Types.ObjectId; // reference to the UserStampCard document
  orderId?: Types.ObjectId;
  orderNumber?: string;
  stampsEarned: number; // typically 1, but can be N for bonus stamps
  source: 'order' | 'bonus' | 'manual';
  idempotencyKey?: string; // prevents duplicate stamp events for the same trigger
  metadata?: Record<string, any>;
  createdAt: Date;
}

const StampEventSchema = new Schema<IStampEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    cardId: {
      type: Schema.Types.ObjectId,
      ref: 'StampCard',
      required: true,
      index: true,
    },
    userCardId: {
      type: Schema.Types.ObjectId,
      ref: 'UserStampCard',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    orderNumber: {
      type: String,
      index: true,
    },
    stampsEarned: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    source: {
      type: String,
      enum: ['order', 'bonus', 'manual'],
      default: 'order',
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Compound indexes for common query patterns
StampEventSchema.index({ userId: 1, cardId: 1, createdAt: -1 });
StampEventSchema.index({ cardId: 1, createdAt: -1 });
StampEventSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const StampEvent = mongoose.model<IStampEvent>('StampEvent', StampEventSchema);

export default StampEvent;
