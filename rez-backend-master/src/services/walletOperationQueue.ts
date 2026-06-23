/**
 * walletOperationQueue.ts
 *
 * In-memory queue for wallet CREDIT operations that fail due to Redis unavailability.
 * When Redis recovers, queued operations are drained automatically via a drain loop in server.ts.
 *
 * SAFETY RULES:
 * - DEBIT operations must NEVER be queued — always hard-fail to prevent overspending.
 * - Only CREDIT operations with a valid idempotency key are queued.
 * - Queue is intentionally ephemeral (in-memory) — operations older than MAX_AGE_MS are dropped.
 * - Max queue size is capped at MAX_QUEUE_SIZE to prevent memory exhaustion.
 */

import { createServiceLogger } from '../config/logger';
import * as Sentry from '@sentry/node';

const logger = createServiceLogger('wallet-op-queue');

export interface QueuedCreditOperation {
  id: string; // idempotency key — must be unique
  userId: string;
  amount: number;
  source: string;
  description: string;
  operationType: string;
  referenceId?: string;
  queuedAt: number; // Date.now() timestamp
  attempts: number;
}

const MAX_QUEUE_SIZE = 500;
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes — discard stale operations
const MAX_ATTEMPTS = 3;

const queue: QueuedCreditOperation[] = [];

/**
 * Enqueue a credit operation for later drain.
 * Returns true if queued, false if queue is full.
 */
export function enqueueCredit(op: Omit<QueuedCreditOperation, 'queuedAt' | 'attempts'>): boolean {
  if (queue.length >= MAX_QUEUE_SIZE) {
    logger.warn('Wallet op queue full — dropping operation', { userId: op.userId, source: op.source });
    Sentry.captureMessage('Wallet operation queue full — credit operation dropped', {
      level: 'warning',
      extra: { userId: op.userId, source: op.source, queueSize: queue.length },
    });
    return false;
  }
  queue.push({ ...op, queuedAt: Date.now(), attempts: 0 });
  logger.info('Wallet credit queued for later drain', { id: op.id, userId: op.userId, source: op.source });
  return true;
}

export function getQueueSize(): number {
  return queue.length;
}

/**
 * Drain the queue by executing each operation.
 * Called periodically by server.ts when Redis is available.
 *
 * @param executor - async function that performs the actual wallet credit
 */
export async function drainQueue(executor: (op: QueuedCreditOperation) => Promise<void>): Promise<void> {
  if (queue.length === 0) return;

  const now = Date.now();
  // Take all current items and filter out expired ones
  const toProcess = queue.splice(0, queue.length).filter((op) => {
    if (now - op.queuedAt > MAX_AGE_MS) {
      logger.warn('Dropping expired queued wallet op', { id: op.id, userId: op.userId, ageMs: now - op.queuedAt });
      Sentry.captureMessage('Queued wallet credit expired without execution', {
        level: 'warning',
        extra: { id: op.id, userId: op.userId, source: op.source, ageMs: now - op.queuedAt },
      });
      return false;
    }
    return true;
  });

  for (const op of toProcess) {
    try {
      op.attempts++;
      await executor(op);
      logger.info('Drained queued wallet credit successfully', { id: op.id, userId: op.userId });
    } catch (err) {
      if (op.attempts < MAX_ATTEMPTS) {
        // Re-queue at end for retry on next drain cycle
        queue.push(op);
        logger.warn('Wallet op drain failed — re-queued for retry', { id: op.id, attempts: op.attempts });
      } else {
        logger.error('Queued wallet op failed after max attempts — discarding', { id: op.id, err });
        Sentry.captureException(err, {
          extra: { id: op.id, userId: op.userId, source: op.source, attempts: op.attempts },
        });
      }
    }
  }
}
