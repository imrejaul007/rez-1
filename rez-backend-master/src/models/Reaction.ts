/**
 * Reaction Model
 *
 * Stores emoji reactions left by users on orders, stores, campaigns, or products.
 * Supports admin moderation and merchant-scoped queries.
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

export type ReactionTargetType = 'order' | 'store' | 'campaign' | 'product';

export const REACTION_EMOJIS = ['👍', '❤️', '😮', '😢', '😡', '🎉', '🔥'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface IReaction extends Document<any, any, any, Record<string, any>, {}> {
  _id: string;
  user: mongoose.Types.ObjectId;
  targetType: ReactionTargetType;
  targetId: mongoose.Types.ObjectId;
  merchantId?: mongoose.Types.ObjectId;
  emoji: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReactionModel extends Model<IReaction> {
  getEmojiBreakdown(filter?: Record<string, unknown>): Promise<Array<{ emoji: string; count: number }>>;
}

const ReactionSchema = new Schema<IReaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['order', 'store', 'campaign', 'product'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
    },
    emoji: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8, // Unicode emoji can be up to 8 bytes
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'reactions',
  },
);

// Compound index for target lookups (most common query pattern)
ReactionSchema.index({ targetType: 1, targetId: 1 });
// Index for merchant-scoped admin views
ReactionSchema.index({ merchantId: 1, createdAt: -1 });
// Index for per-user deduplication checks
ReactionSchema.index({ user: 1, targetType: 1, targetId: 1 });
// Index for time-based queries
ReactionSchema.index({ createdAt: -1 });
// Soft-delete filtering
ReactionSchema.index({ isActive: 1 });

/**
 * Static: aggregate emoji breakdown for a given filter.
 */
ReactionSchema.statics.getEmojiBreakdown = async function (
  filter: Record<string, unknown> = {},
): Promise<Array<{ emoji: string; count: number }>> {
  return this.aggregate([
    { $match: { isActive: true, ...filter } },
    { $group: { _id: '$emoji', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, emoji: '$_id', count: 1 } },
  ]);
};

const Reaction = mongoose.model<IReaction, IReactionModel>('Reaction', ReactionSchema);

export default Reaction;
