import mongoose, { Document, Schema, Types } from 'mongoose';
import { logger } from '../config/logger';

/**
 * WhatsApp AI Session Model (R6 Feature A)
 *
 * Tracks conversational sessions for the Claude RAG-powered WhatsApp ordering bot.
 * Sessions expire via TTL index 24 hours after lastInteractionAt.
 *
 * States:
 *   - greeting: First contact, bot sends welcome
 *   - ordering: Active order conversation with Claude AI
 *   - confirmed: Order placed, awaiting payment
 */

export interface IWhatsAppMessage {
  role: 'customer' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface IWhatsAppAiSession extends Document {
  _id: Types.ObjectId;
  /** Customer phone number (normalised: digits only, with country code) */
  phone: string;
  /** Store slug for RAG context lookup */
  storeSlug: string;
  /** Session state machine */
  state: 'greeting' | 'ordering' | 'confirmed';
  /** Conversation history */
  messages: IWhatsAppMessage[];
  /** Pending order ID after ORDER: marker detected */
  pendingOrderId?: Types.ObjectId;
  /** Pending payment link sent to customer */
  pendingPaymentLink?: string;
  /** When the last interaction occurred (used for TTL) */
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppAiSessionSchema = new Schema<IWhatsAppAiSession>(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    storeSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    state: {
      type: String,
      enum: ['greeting', 'ordering', 'confirmed'],
      default: 'greeting',
    },
    messages: [
      {
        role: {
          type: String,
          enum: ['customer', 'assistant'],
          required: true,
        },
        text: {
          type: String,
          required: true,
          maxlength: 2000,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    pendingOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    pendingPaymentLink: {
      type: String,
    },
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Compound unique index: one active session per phone per store
WhatsAppAiSessionSchema.index({ phone: 1, storeSlug: 1 }, { unique: true });

// TTL index: auto-delete sessions 24 hours after last interaction
WhatsAppAiSessionSchema.index({ lastInteractionAt: 1 }, { expireAfterSeconds: 86400 });

// Index for listing sessions by store
WhatsAppAiSessionSchema.index({ storeSlug: 1, createdAt: -1 });

const WhatsAppAiSession = mongoose.model<IWhatsAppAiSession>('WhatsAppAiSession', WhatsAppAiSessionSchema);

export default WhatsAppAiSession;
