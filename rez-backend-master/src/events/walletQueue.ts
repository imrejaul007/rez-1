/**
 * Wallet Queue — BullMQ-backed durable wallet event dispatcher
 *
 * WHY: Wallet mutations (credit/debit) trigger inline side effects: cache
 * invalidation, audit logging, balance notifications, analytics. The financial
 * mutation itself (atomic $inc + CoinTransaction) is authoritative and MUST
 * remain inline. But secondary effects can be decoupled for reliability.
 *
 * IMPORTANT: This queue does NOT process the actual financial mutation.
 * The walletService.credit() / debit() methods remain the authoritative path.
 * This queue handles post-mutation side effects only:
 *   • Balance change notifications (push/in-app)
 *   • Wallet analytics (spend patterns, reward velocity)
 *   • Merchant settlement event forwarding
 *   • Cross-service balance sync (e.g., merchant wallet aggregation)
 *
 * STRATEGY: Strangler Fig (Phase A — shadow/dual mode)
 *   - walletService continues to handle mutations inline (source of truth)
 *   - This queue runs in parallel for async side effects
 *   - Phase B: move all post-mutation effects exclusively to this queue
 *   - Phase C: extract into `rez-wallet-service` process (highest risk phase)
 */

import { Queue, Worker, Job } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';
import { createServiceLogger } from '../config/logger';
import { attachFailureHandler } from '../config/bullmqFailureHandler';

const logger = createServiceLogger('wallet-queue');

export const WALLET_QUEUE_NAME = 'wallet-events';

// ── Event types ────────────────────────────────────────────────────────────────

export type WalletEventType =
  | 'wallet.credited'
  | 'wallet.debited'
  | 'wallet.refunded'
  | 'wallet.adjustment'
  | 'wallet.reward_granted'
  | 'wallet.cashback_awarded'
  | 'wallet.transfer'
  | 'wallet.merchant_settlement'
  | 'wallet.balance_alert';

export interface WalletEvent {
  eventId: string;
  eventType: WalletEventType;
  userId: string;
  merchantId?: string;
  payload: {
    amount: number;
    newBalance?: number;
    previousBalance?: number;
    source?: string;
    description?: string;
    transactionId?: string;
    referenceId?: string;
    referenceModel?: string;
    coinType?: string;
    category?: string;
    [key: string]: any;
  };
  createdAt: string;
}

// ── Queue (producer side) ─────────────────────────────────────────────────────

let _queue: Queue | null = null;

function getWalletQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(WALLET_QUEUE_NAME, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 48 * 3600 }, // 48h — financial events need audit trail
        removeOnFail: { age: 30 * 24 * 3600 }, // 30 days for failed wallet events
      },
    });
    _queue.on('error', (err) => {
      logger.error('[WalletQueue] Queue error: ' + err.message);
    });
  }
  return _queue;
}

/**
 * Publish a wallet event to the durable BullMQ queue.
 * Fail-open — never blocks the calling wallet mutation.
 */
export async function publishWalletEvent(event: WalletEvent): Promise<void> {
  try {
    const queue = getWalletQueue();
    await queue.add(event.eventType, event, {
      jobId: event.eventId,
    });
  } catch (err: any) {
    logger.warn('[WalletQueue] Failed to enqueue event (fail-open):', {
      eventType: event.eventType,
      userId: event.userId,
      error: err.message,
    });
  }
}

// ── Worker (consumer side) ────────────────────────────────────────────────────

let _worker: Worker | null = null;

/**
 * Start the BullMQ wallet worker.
 * Handles async side effects for wallet mutations.
 */
export function startWalletWorker(): Worker | null {
  if (process.env.DISABLE_WALLET_WORKER === 'true') {
    logger.info('[WalletQueue] Monolith worker disabled — standalone rez-wallet-service handles events');
    return null;
  }

  if (_worker) return _worker;

  _worker = new Worker(
    WALLET_QUEUE_NAME,
    async (job: Job<WalletEvent>) => {
      const event = job.data;

      logger.debug('[WalletWorker] Processing event', {
        type: event.eventType,
        userId: event.userId,
        amount: event.payload.amount,
        attempt: job.attemptsMade,
      });

      const errors: string[] = [];

      // 1. Balance change notification — inform user of significant wallet changes
      try {
        if (['wallet.credited', 'wallet.cashback_awarded', 'wallet.reward_granted'].includes(event.eventType)) {
          const { publishNotificationEvent } = await import('./notificationQueue');
          const titles: Record<string, string> = {
            'wallet.credited': 'Coins Credited',
            'wallet.cashback_awarded': 'Cashback Received',
            'wallet.reward_granted': 'Reward Earned',
          };
          await publishNotificationEvent({
            eventId: `wallet-notif:${event.eventId}`,
            eventType: `wallet.${event.eventType}`,
            userId: event.userId,
            channels: ['push', 'in_app'],
            payload: {
              title: titles[event.eventType] || 'Wallet Update',
              body: `${event.payload.amount} coins ${event.eventType === 'wallet.debited' ? 'used' : 'added'}. Balance: ${event.payload.newBalance ?? '—'}`,
              data: {
                amount: event.payload.amount,
                newBalance: event.payload.newBalance,
                transactionId: event.payload.transactionId,
              },
            },
            category: 'financial',
            source: 'system' as const,
            createdAt: event.createdAt,
          });
        }
      } catch (err: any) {
        errors.push(`notification:${err.message}`);
      }

      // 2. Wallet analytics — track spend/earn patterns
      try {
        const { publishAnalyticsEvent } = await import('./analyticsQueue');
        await publishAnalyticsEvent({
          eventId: `wallet-analytics:${event.eventId}`,
          eventType: 'reward_event',
          userId: event.userId,
          data: {
            entityId: event.payload.transactionId,
            entityType: 'wallet_transaction',
            amount: event.payload.amount,
            category: event.eventType,
            source: event.payload.source,
            metadata: {
              coinType: event.payload.coinType,
              referenceModel: event.payload.referenceModel,
            },
          },
          createdAt: event.createdAt,
        } as any);
      } catch (err: any) {
        errors.push(`analytics:${err.message}`);
      }

      // 3. Wallet cache invalidation (redundant safety net)
      try {
        const redisService = (await import('../services/redisService')).default;
        await redisService.del(`wallet:${event.userId}`);
        await redisService.del(`wallet:balance:${event.userId}`);
        // Also clear user dashboard cache that shows balance
        await redisService.del(`user:dashboard:${event.userId}`);
      } catch (err: any) {
        errors.push(`cache:${err.message}`);
      }

      // 4. Merchant wallet aggregation — update merchant revenue on settlement events
      try {
        if (event.eventType === 'wallet.merchant_settlement' && event.merchantId) {
          const redisService = (await import('../services/redisService')).default;
          await redisService.del(`merchant:wallet:${event.merchantId}`);
          await redisService.del(`merchant:revenue:${event.merchantId}`);
          logger.debug('[WalletWorker] Merchant wallet cache invalidated', {
            merchantId: event.merchantId,
          });
        }
      } catch (err: any) {
        errors.push(`merchant-wallet:${err.message}`);
      }

      // 5. Balance alert — low balance push notification
      try {
        if (event.eventType === 'wallet.debited' && event.payload.newBalance !== undefined) {
          if (event.payload.newBalance < 50) {
            const { publishNotificationEvent } = await import('./notificationQueue');
            await publishNotificationEvent({
              eventId: `low-balance:${event.eventId}`,
              eventType: 'wallet.balance_alert',
              userId: event.userId,
              channels: ['push', 'in_app'],
              payload: {
                title: 'Low Coin Balance',
                body: `You have only ${event.payload.newBalance} coins left. Shop at partner stores to earn more!`,
                data: {
                  balance: event.payload.newBalance,
                  type: 'low_balance_alert',
                },
              },
              category: 'financial',
              source: 'system' as const,
              createdAt: event.createdAt,
            });
          }
        }
      } catch (err: any) {
        errors.push(`balance-alert:${err.message}`);
      }

      if (errors.length > 0) {
        logger.warn('[WalletWorker] Some handlers failed', {
          eventId: event.eventId,
          errors,
        });
      }
    },
    {
      connection: bullmqRedis,
      concurrency: 10,
      limiter: {
        max: 200,
        duration: 1000,
      },
    },
  );
  attachFailureHandler(_worker, WALLET_QUEUE_NAME);

  _worker.on('completed', (job) => {
    logger.debug('[WalletWorker] Job completed', { jobId: job.id, type: job.name });
  });

  _worker.on('failed', (job, err) => {
    logger.error('[WalletWorker] Job failed', {
      jobId: job?.id,
      type: job?.name,
      userId: (job?.data as WalletEvent)?.userId,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  _worker.on('error', (err) => {
    logger.error('[WalletWorker] Worker error: ' + err.message);
  });

  logger.info('[WalletWorker] Started — processing queue: ' + WALLET_QUEUE_NAME);
  return _worker;
}

/**
 * Gracefully close queue and worker connections.
 */
export async function closeWalletQueue(): Promise<void> {
  await Promise.allSettled([_worker?.close(), _queue?.close()]);
  _worker = null;
  _queue = null;
}
