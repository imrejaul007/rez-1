import * as cron from 'node-cron';
import redisService from '../services/redisService';
import { reconciliationService } from '../services/reconciliationService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('ledger-reconciliation');

const SCHEDULE = '0 4 * * *'; // Daily at 4:00 AM (after 3 AM cashback reconciliation)
const LOCK_KEY = 'job:ledger-reconciliation';
const LOCK_TTL = 7200; // 2 hours
const RESULT_TTL = 7 * 24 * 60 * 60; // 7 days

let job: ReturnType<typeof cron.schedule> | null = null;

async function runLedgerReconciliation(): Promise<void> {
  const startTime = Date.now();
  logger.info('Starting wallet-ledger reconciliation job');

  try {
    const report = await reconciliationService.bulkReconciliation(100);

    const duration = Date.now() - startTime;

    // Persist results to Redis for admin dashboard
    await redisService.set('ledger-reconciliation:latest', {
      ...report,
      durationMs: duration,
    }, RESULT_TTL);

    if (report.criticalDriftCount > 0) {
      logger.error('CRITICAL drifts detected in wallet-ledger reconciliation', {
        criticalDriftCount: report.criticalDriftCount,
        minorDriftCount: report.minorDriftCount,
        checkedWallets: report.checkedWallets,
        durationMs: duration,
      });
    } else if (report.minorDriftCount > 0) {
      logger.warn('Minor drifts detected in wallet-ledger reconciliation', {
        minorDriftCount: report.minorDriftCount,
        checkedWallets: report.checkedWallets,
        durationMs: duration,
      });
    } else {
      logger.info('Wallet-ledger reconciliation complete — no drifts', {
        checkedWallets: report.checkedWallets,
        durationMs: duration,
      });
    }
    // Merchant liability reconciliation
    try {
      const merchantLiabilityReport = await reconciliationService.reconcileMerchantLiability();
      if (merchantLiabilityReport.drifts.length > 0) {
        logger.warn('Merchant liability drifts detected', {
          driftsFound: merchantLiabilityReport.drifts.length,
          checked: merchantLiabilityReport.checked,
        });
      } else {
        logger.info('Merchant liability reconciliation complete — no drifts', {
          checked: merchantLiabilityReport.checked,
        });
      }
      await redisService.set('merchant-liability-reconciliation:latest', merchantLiabilityReport, RESULT_TTL);
    } catch (err) {
      logger.error('Merchant liability reconciliation failed', err);
    }
  } catch (error) {
    logger.error('Wallet-ledger reconciliation job failed', error);
  }
}

export function initializeLedgerReconciliationJob(): void {
  if (job) {
    logger.info('Ledger reconciliation job already scheduled');
    return;
  }

  job = cron.schedule(SCHEDULE, async () => {
    const lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.info('Another instance is running ledger reconciliation, skipping');
      return;
    }

    try {
      await runLedgerReconciliation();
    } finally {
      await redisService.releaseLock(LOCK_KEY, lockToken);
    }
  });

  logger.info('Ledger reconciliation job scheduled (daily at 4:00 AM)');
}

export function stopLedgerReconciliationJob(): void {
  if (job) {
    job.stop();
    job = null;
    logger.info('Ledger reconciliation job stopped');
  }
}
