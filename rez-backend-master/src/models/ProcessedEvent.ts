/**
 * ProcessedEvent Model — Canonical Event Idempotency Ledger
 *
 * Stores one record per (eventId, processorKey) tuple so the canonical event
 * bus can guarantee at-most-once delivery per subscriber. Records auto-expire
 * after 7 days via a TTL index — long enough to cover any reasonable redelivery
 * window from Redis pub/sub, short enough to keep the collection lean.
 *
 * NOTE: This file is part of the Sprint 0 scaffold and is not yet wired into
 * any existing caller. See `src/events/canonical/bus.ts` for usage.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProcessedEvent extends Document {
  eventId: string;
  processorKey: string;
  processedAt: Date;
}

const ProcessedEventSchema = new Schema<IProcessedEvent>(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    processorKey: {
      type: String,
      required: true,
      index: true,
    },
    processedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'processed_events',
    versionKey: false,
  },
);

// Compound uniqueness: one record per (eventId, processorKey) — enforces
// idempotency across concurrent subscriber replicas.
ProcessedEventSchema.index({ eventId: 1, processorKey: 1 }, { unique: true });

// TTL: drop records 7 days after processing. Mongo's TTL monitor runs ~60s
// granularity, which is acceptable for a deduplication ledger.
ProcessedEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const ProcessedEvent: Model<IProcessedEvent> =
  mongoose.models.ProcessedEvent ||
  mongoose.model<IProcessedEvent>('ProcessedEvent', ProcessedEventSchema);

export default ProcessedEvent;
