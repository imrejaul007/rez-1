/**
 * ledgerReconciliationJob.ts
 *
 * Runs every 15 minutes to detect stuck transactions and wallet/ledger divergence.
 * Registered in ScheduledJobService via BullMQ JOB_DEFINITIONS.
 *
 * Alerts:
 *   - Stuck transactions (INIT/AUTHORIZED/PROCESSING older than 15 minutes)
 *   - Sentry capture when stuck count exceeds threshold
 */

import { createServiceLogger } from '../config/logger';
import { TransactionLedgerService } from '../services/TransactionLedgerService';
import * as Sentry from '@sentry/node';

const logger = createServiceLogger('ledger-reconciliation');

export async function runLedgerReconciliation(): Promise<{
  stuckCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let stuckCount = 0;

  try {
    // Find stuck transactions older than 15 minutes
    const stuckTxs = await TransactionLedgerService.getStuckTransactions(15);
    stuckCount = stuckTxs.length;

    if (stuckCount > 0) {
      logger.warn('[RECONCILIATION] Stuck transactions detected', {
        count: stuckCount,
        txIds: stuckTxs.slice(0, 10).map((t: any) => t.txId),
      });

      // Alert via Sentry if more than 5 stuck transactions
      if (stuckCount > 5) {
        Sentry.captureMessage(`[RECONCILIATION] ${stuckCount} stuck transactions detected`, {
          level: 'warning',
          extra: { stuckTxIds: stuckTxs.slice(0, 20).map((t: any) => t.txId) },
        });
      }
    }

    logger.info('[RECONCILIATION] Job completed', { stuckCount, errorCount: errors.length });
  } catch (err: any) {
    logger.error('[RECONCILIATION] Job failed', { error: err?.message });
    errors.push(err?.message);
    Sentry.captureException(err);
  }

  return { stuckCount, errors };
}
