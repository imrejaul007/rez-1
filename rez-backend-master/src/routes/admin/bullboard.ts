// @ts-nocheck
/**
 * BullBoard — Queue monitoring dashboard for admin panel.
 *
 * Mounts at /admin/queues. Protected by admin auth middleware.
 * Shows all BullMQ queues: job counts, status, retry, DLQ.
 */

import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { bullmqRedis } from '../../config/bullmq-connection';
import { CRITICAL_QUEUE_NAMES, NONCRITICAL_QUEUE_NAMES } from '../../workers/workerGroups';

const router = Router();

// Create adapters for all known queues
const allQueueNames = [
  ...CRITICAL_QUEUE_NAMES,
  ...NONCRITICAL_QUEUE_NAMES,
  'payment-events', // Strangler Fig event queue
  'payments-dlq', // Dead letter queues
  'rewards-dlq',
];

const queues = allQueueNames.map(
  (name) =>
    new Queue(name, {
      connection: bullmqRedis,
    }),
);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/admin/queues');

createBullBoard({
  queues: queues.map((q) => new BullMQAdapter(q)),
  serverAdapter,
});

router.use('/queues', serverAdapter.getRouter());

export default router;
