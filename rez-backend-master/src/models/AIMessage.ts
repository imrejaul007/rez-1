/**
 * AI Conversation Message Model
 * Stores conversation history for the R3 AI Chatbot.
 * conversations are scoped by storeSlug and optionally linked to a customerId.
 * Documents expire 30 days after last update.
 */

import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface AIMessageContent {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'order' | 'recommendation' | 'reservation' | 'handoff';
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IAIMessage extends Document {
  conversationId: string;
  customerId?: string;
  storeSlug: string;
  messages: AIMessageContent[];
  lastMessage: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface IAIMessageModel extends Model<IAIMessage> {
  upsertConversation(conversationId: string, storeSlug: string, customerId?: string): Promise<IAIMessage>;
}

const AIMessageContentSchema = new Schema<AIMessageContent>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'order', 'recommendation', 'reservation', 'handoff'],
      default: 'text',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const AIMessageSchema = new Schema<IAIMessage>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      default: null,
    },
    storeSlug: {
      type: String,
      required: true,
      index: true,
    },
    messages: {
      type: [AIMessageContentSchema],
      default: [],
    },
    lastMessage: {
      type: String,
      required: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes for common query patterns
AIMessageSchema.index({ conversationId: 1 }, { unique: true });
AIMessageSchema.index({ storeSlug: 1, customerId: 1 });
AIMessageSchema.index({ updatedAt: 1 });

// TTL index: documents expire 30 days after `updatedAt`
AIMessageSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { conversationId: { $exists: true } } },
);

// Upsert helper
AIMessageSchema.statics.upsertConversation = function (conversationId: string, storeSlug: string, customerId?: string) {
  return this.findOneAndUpdate(
    { conversationId },
    {
      $setOnInsert: {
        conversationId,
        storeSlug,
        customerId: customerId ?? null,
        messages: [],
        lastMessage: '',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

export const AIMessage = mongoose.model<IAIMessage, IAIMessageModel>('AIMessage', AIMessageSchema);
