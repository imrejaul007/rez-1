import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';

/**
 * Activity Event — standard event format consumed by all gamification systems.
 */
export interface ActivityEvent {
  userId: string;
  eventId: string;
  timestamp: Date;
  type: ActivityEventType;
  category: EventCategory;
  data: {
    entityId?: string;
    entityType?: string;
    amount?: number;
    storeId?: string;
    categorySlug?: string;
    metadata?: Record<string, any>;
  };
  source: {
    controller: string;
    action: string;
  };
}

export type ActivityEventType =
  | 'order_placed' | 'order_delivered'
  | 'review_submitted' | 'review_helpful_vote'
  | 'referral_completed'
  | 'video_created'
  | 'bill_uploaded'
  | 'login' | 'daily_checkin'
  | 'project_completed'
  | 'offer_redeemed'
  | 'game_won' | 'quiz_correct'
  | 'social_share' | 'social_media_submitted' | 'social_media_approved' | 'social_media_credited'
  | 'favorite_added' | 'wishlist_added'
  | 'challenge_completed'
  | 'invite_applied'
  | 'reward_issued'
  | 'refund_processed'
  // Savings actions — trigger savings streak
  | 'store_payment_confirmed'
  | 'bill_payment_confirmed'
  | 'deal_locked'
  | 'cashback_earned'
  // POS billing (added during Phase 2H merge)
  | 'pos_bill_paid';

export type EventCategory =
  | 'order' | 'review' | 'referral' | 'video' | 'bill'
  | 'game' | 'social' | 'login' | 'project' | 'offer' | 'event'
  | 'reward'
  | 'refund';

/**
 * Gamification Event Bus — central dispatcher for all gamification events.
 *
 * Uses Node.js EventEmitter for immediate in-process fan-out.
 * All consumers register handlers for specific event types.
 * Errors in consumers do NOT propagate to the emitter (non-blocking).
 */
class GamificationEventBus {
  private emitter: EventEmitter;
  private initialized = false;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(20); // Allow many consumers
  }

  /**
   * Emit a gamification event. Called from controllers after qualifying actions.
   * This is fire-and-forget — errors in consumers are caught and logged.
   */
  emit(
    type: ActivityEventType,
    data: {
      userId: string;
      entityId?: string;
      entityType?: string;
      amount?: number;
      storeId?: string;
      categorySlug?: string;
      metadata?: Record<string, any>;
      source?: { controller: string; action: string };
    }
  ): void {
    const event: ActivityEvent = {
      userId: data.userId,
      eventId: uuidv4(),
      timestamp: new Date(),
      type,
      category: this.inferCategory(type),
      data: {
        entityId: data.entityId,
        entityType: data.entityType,
        amount: data.amount,
        storeId: data.storeId,
        categorySlug: data.categorySlug,
        metadata: data.metadata
      },
      source: data.source || { controller: 'unknown', action: type }
    };

    // Emit asynchronously to not block the caller
    setImmediate(() => {
      try {
        this.emitter.emit('gamification_event', event);
        this.emitter.emit(`event:${type}`, event);
      } catch (error) {
        logger.error(`[EVENT BUS] Error emitting event ${type}:`, error);
      }
    });
  }

  /**
   * Register a handler for all gamification events.
   */
  onAll(handler: (event: ActivityEvent) => Promise<void> | void): void {
    this.emitter.on('gamification_event', async (event: ActivityEvent) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`[EVENT BUS] Handler error for ${event.type}:`, error);
      }
    });
  }

  /**
   * Register a handler for a specific event type.
   */
  on(type: ActivityEventType, handler: (event: ActivityEvent) => Promise<void> | void): void {
    this.emitter.on(`event:${type}`, async (event: ActivityEvent) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`[EVENT BUS] Handler error for ${type}:`, error);
      }
    });
  }

  /**
   * Initialize all event handlers. Called once at server startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Import and register handlers (only for enabled features)
    try {
      const { isGamificationEnabled } = await import('../config/gamificationFeatureFlags');
      let handlerCount = 0;

      if (isGamificationEnabled('achievements')) {
        const { registerAchievementHandler } = await import('./handlers/achievementProgressHandler');
        registerAchievementHandler(this);
        handlerCount++;
      }
      if (isGamificationEnabled('challenges')) {
        const { registerChallengeHandler } = await import('./handlers/challengeProgressHandler');
        registerChallengeHandler(this);
        handlerCount++;
        const { registerMissionProgressHandler } = await import('./handlers/missionProgressHandler');
        registerMissionProgressHandler(this);
        handlerCount++;
      }
      if (isGamificationEnabled('streaks')) {
        const { registerStreakHandler } = await import('./handlers/streakHandler');
        registerStreakHandler(this);
        handlerCount++;
      }
      if (isGamificationEnabled('leaderboard')) {
        const { registerLeaderboardHandler } = await import('./handlers/leaderboardHandler');
        registerLeaderboardHandler(this);
        handlerCount++;
      }

      // Review coin reward handler — awards branded/rez coins for store reviews
      this.on('review_submitted', async (event) => {
        try {
          const { Store } = await import('../models/Store');
          const { rewardEngine } = await import('../core/rewardEngine');

          const storeId = event.data.storeId || event.data.entityId;
          if (!storeId) return;

          const store = await Store.findById(storeId)
            .select('rewardRules merchantId name')
            .lean();
          if (!store) return;

          const bonusCoins = (store as any).rewardRules?.reviewBonusCoins ?? 0;
          const coinType = (store as any).rewardRules?.reviewBonusCoinType ?? 'branded';
          if (bonusCoins <= 0) return;

          await rewardEngine.issue({
            userId: event.userId,
            amount: bonusCoins,
            rewardType: 'review' as any,
            source: 'review',
            coinType: coinType as any,
            description: `${bonusCoins} ${coinType === 'branded' ? 'Branded' : 'REZ'} coins for reviewing ${(store as any).name}`,
            operationType: 'review_reward' as any,
            referenceId: `review:${event.data.entityId || event.eventId}`,
            referenceModel: 'Review',
            merchantId: coinType === 'branded' ? (store as any).merchantId?.toString() : undefined,
            metadata: {
              storeId,
              reviewId: event.data.entityId,
            },
          });

          logger.info(`[REVIEW] Awarded ${bonusCoins} ${coinType} coins to user ${event.userId} for reviewing store ${storeId}`);
        } catch (err) {
          logger.error('[REVIEW] Failed to award review coins:', err);
        }
      });
      handlerCount++;

      // Analytics stream handler — always enabled (persists events for warehouse export)
      const { registerAnalyticsStreamHandler } = await import('./handlers/analyticsStreamHandler');
      registerAnalyticsStreamHandler(this);
      handlerCount++;

      this.initialized = true;
      logger.info(`[EVENT BUS] Gamification event bus initialized with ${handlerCount} handler(s)`);
    } catch (error) {
      logger.error('[EVENT BUS] Failed to initialize handlers:', error);
    }
  }

  private inferCategory(type: ActivityEventType): EventCategory {
    if (type.startsWith('order')) return 'order';
    if (type.startsWith('review')) return 'review';
    if (type.startsWith('referral')) return 'referral';
    if (type.startsWith('video')) return 'video';
    if (type.startsWith('bill')) return 'bill';
    if (type.startsWith('game') || type.startsWith('quiz')) return 'game';
    if (type.startsWith('social') || type.startsWith('favorite') || type.startsWith('wishlist')) return 'social';
    if (type.startsWith('login') || type.startsWith('daily')) return 'login';
    if (type.startsWith('project')) return 'project';
    if (type.startsWith('offer')) return 'offer';
    if (type.startsWith('challenge')) return 'event';
    if (type.startsWith('invite')) return 'referral';
    if (type.startsWith('reward')) return 'reward';
    if (type.startsWith('refund')) return 'refund';
    return 'event';
  }
}

// Singleton
const gamificationEventBus = new GamificationEventBus();
export default gamificationEventBus;
