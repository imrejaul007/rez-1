/**
 * RewardClaim — persistent idempotency record for reward issuances.
 *
 * ISSUE-62: Redis-only idempotency is ephemeral. A Redis restart (or eviction
 * under memory pressure) silently clears all `reward:claimed:*` keys, allowing
 * a previously-rewarded source event to be replayed and double-credited.
 *
 * This model provides the durable backing store. RewardRuleEngine writes here
 * after setting the Redis key, and reads here as a fallback when Redis returns
 * null (cache miss vs genuine first-claim is resolved by DB lookup).
 *
 * The unique index on { userId, sourceType, sourceId } doubles as the
 * duplicate-guard: concurrent callers racing past a Redis miss both attempt
 * the upsert and the second one receives E11000 — which is handled as "already
 * claimed" rather than an error.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IRewardClaim extends Document {
  userId: mongoose.Types.ObjectId;
  sourceType: string;
  sourceId: string;
  claimedAt: Date;
}

const RewardClaimSchema = new Schema<IRewardClaim>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      required: true,
    },
    sourceId: {
      type: String,
      required: true,
    },
    claimedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: false,
    collection: 'rewardclaims',
  },
);

// Unique compound index — enforces one claim per (user, sourceType, sourceId).
// The upsert in markSourceClaimed relies on this index to detect duplicates
// (E11000) without a separate findOne round-trip.
RewardClaimSchema.index({ userId: 1, sourceType: 1, sourceId: 1 }, { unique: true });

export const RewardClaim =
  mongoose.models.RewardClaim || mongoose.model<IRewardClaim>('RewardClaim', RewardClaimSchema);

export default RewardClaim;
