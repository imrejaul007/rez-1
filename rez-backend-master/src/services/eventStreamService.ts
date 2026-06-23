import { Types } from 'mongoose';
import { AnalyticsEvent, AnalyticsEventType, IAnalyticsEvent } from '../models/AnalyticsEvent';
import type { ActivityEvent, ActivityEventType } from '../events/gamificationEventBus';
import { createServiceLogger } from '../config/logger';
import { Lean } from '../types/lean';

const logger = createServiceLogger('event-stream');

// ─── Event Type Mapping ─────────────────────────────────────

const EVENT_MAP: Record<string, AnalyticsEventType> = {
  // Visit events
  order_placed: 'visit_event',
  order_delivered: 'visit_event',
  bill_uploaded: 'visit_event',

  // Redemption events
  offer_redeemed: 'redemption_event',

  // Reward events
  reward_issued: 'reward_event',
  referral_completed: 'reward_event',
  daily_checkin: 'reward_event',
  game_won: 'reward_event',
  social_share: 'reward_event',
  challenge_completed: 'reward_event',
};

// ─── Service ────────────────────────────────────────────────

class EventStreamService {

  /**
   * Handle an incoming gamification event — map to analytics event and persist.
   * Called by the analyticsStreamHandler (fire-and-forget).
   */
  async handleEvent(event: ActivityEvent): Promise<void> {
    const analyticsType = EVENT_MAP[event.type];
    if (!analyticsType) return; // Not a tracked event type

    try {
      await this.recordEvent(
        analyticsType,
        event.userId,
        {
          entityId: event.data.entityId,
          entityType: event.data.entityType,
          amount: event.data.amount,
          storeId: event.data.storeId,
          category: event.data.categorySlug,
          source: `${event.source.controller}.${event.source.action}`,
          metadata: event.data.metadata,
        },
        event.eventId
      );
    } catch (err) {
      // Log but don't throw — analytics should never block the main flow
      logger.error('Failed to record analytics event', err as Error, {
        eventType: event.type,
        userId: event.userId,
        eventId: event.eventId,
      });
    }
  }

  /**
   * Persist an analytics event. Idempotent via sourceEventId unique index.
   */
  async recordEvent(
    eventType: AnalyticsEventType,
    userId: string,
    data: IAnalyticsEvent['data'],
    sourceEventId: string
  ): Promise<void> {
    try {
      await AnalyticsEvent.create({
        eventType,
        userId: new Types.ObjectId(userId),
        timestamp: new Date(),
        data,
        sourceEventId,
        processed: false,
      });
    } catch (err: any) {
      // E11000 = duplicate key (sourceEventId) — idempotent, skip silently
      if (err.code === 11000) return;
      throw err;
    }
  }

  /**
   * Query analytics events with filters and pagination.
   */
  async getEvents(filters: {
    eventType?: AnalyticsEventType;
    userId?: string;
    from?: Date;
    to?: Date;
    processed?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ events: Lean<IAnalyticsEvent>[]; total: number; page: number; totalPages: number }> {
    const query: any = {};
    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.userId) query.userId = new Types.ObjectId(filters.userId);
    if (filters.processed !== undefined) query.processed = filters.processed;
    if (filters.from || filters.to) {
      query.timestamp = {};
      if (filters.from) query.timestamp.$gte = filters.from;
      if (filters.to) query.timestamp.$lte = filters.to;
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 100, 500);
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      AnalyticsEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AnalyticsEvent.countDocuments(query),
    ]);

    return {
      events: events as unknown as Lean<IAnalyticsEvent>[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get oldest unprocessed events for warehouse export piping.
   */
  async getUnprocessedBatch(batchSize: number = 100): Promise<Lean<IAnalyticsEvent>[]> {
    return AnalyticsEvent.find({ processed: false })
      .sort({ createdAt: 1 })
      .limit(batchSize)
      .lean() as unknown as Promise<Lean<IAnalyticsEvent>[]>;
  }

  /**
   * Mark events as processed (exported to warehouse).
   */
  async markProcessed(eventIds: string[]): Promise<number> {
    if (eventIds.length === 0) return 0;

    const result = await AnalyticsEvent.updateMany(
      { _id: { $in: eventIds.map(id => new Types.ObjectId(id)) } },
      { $set: { processed: true, processedAt: new Date() } }
    );

    logger.info('Marked analytics events as processed', { count: result.modifiedCount });
    return result.modifiedCount;
  }

  /**
   * Get summary stats for analytics events.
   */
  async getStats(from?: Date, to?: Date): Promise<{
    totalEvents: number;
    byType: Record<string, number>;
    unprocessed: number;
  }> {
    const match: any = {};
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = from;
      if (to) match.timestamp.$lte = to;
    }

    const [byType, unprocessed] = await Promise.all([
      AnalyticsEvent.aggregate([
        ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]),
      AnalyticsEvent.countDocuments({ processed: false }),
    ]);

    const typeMap: Record<string, number> = {};
    let totalEvents = 0;
    for (const item of byType) {
      typeMap[item._id] = item.count;
      totalEvents += item.count;
    }

    return { totalEvents, byType: typeMap, unprocessed };
  }
}

export const eventStreamService = new EventStreamService();
export default eventStreamService;
