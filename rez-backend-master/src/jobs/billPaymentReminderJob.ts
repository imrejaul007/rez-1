import * as cron from 'node-cron';
import redisService from '../services/redisService';
import { BillPayment } from '../models/BillPayment';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('bill-reminder-job');

/**
 * Bill Payment Reminder Job
 *
 * Runs daily at 10 AM IST. Finds completed bill payments whose dueDateRaw
 * is within the next 3 days and haven't been reminded yet.
 * Marks reminderSent = true after notifying.
 *
 * Uses Redis distributed locks for multi-instance safety.
 */

// Job instance
let billReminderJob: ReturnType<typeof cron.schedule> | null = null;

// Configuration
const BILL_REMINDER_SCHEDULE = '0 10 * * *'; // Daily at 10:00 AM
const BILL_REMINDER_LOCK_TTL = 300; // 5 minutes
const BATCH_SIZE = 100;

/**
 * Core logic: find bills due within 3 days and send reminders.
 */
export async function runBillPaymentReminders(): Promise<void> {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const dueBills = await BillPayment.find({
    status: 'completed',
    reminderSent: false,
    dueDateRaw: { $gte: now, $lte: in3Days },
  })
    .populate('provider', 'name type promoCoinsFixed')
    .populate('userId', 'profile.phoneNumber')
    .sort({ dueDateRaw: 1 })
    .limit(BATCH_SIZE)
    .lean();

  logger.info(`[BILL REMINDER] Found ${dueBills.length} bills due in 3 days`);

  if (dueBills.length === 0) return;

  let reminded = 0;
  let errors = 0;

  for (const bill of dueBills) {
    try {
      // In production, send push notification / SMS here
      logger.info(`[BILL REMINDER] Would notify user ${(bill.userId as any)?._id} for ${(bill.provider as any)?.name}`);

      await BillPayment.findByIdAndUpdate(bill._id, { reminderSent: true });
      reminded++;
    } catch (err: any) {
      logger.error('[BILL REMINDER] Failed for bill', { billId: bill._id, error: err.message });
      errors++;
    }
  }

  logger.info(`[BILL REMINDER] Completed: ${reminded} reminded, ${errors} errors`);
}

/**
 * Start the bill payment reminder cron job.
 */
export function startBillPaymentReminderJob(): void {
  if (billReminderJob) {
    logger.info('[BILL REMINDER] Job already running');
    return;
  }

  logger.info('[BILL REMINDER] Starting bill payment reminder job (daily at 10 AM)');

  billReminderJob = cron.schedule(BILL_REMINDER_SCHEDULE, async () => {
    const lockToken = await redisService.acquireLock('bill_payment_reminder_job', BILL_REMINDER_LOCK_TTL);
    if (!lockToken) {
      logger.info('[BILL REMINDER] Another instance is running, skipping');
      return;
    }

    try {
      await runBillPaymentReminders();
    } catch (error: any) {
      logger.error('[BILL REMINDER] Job failed', { error: error.message });
    } finally {
      await redisService.releaseLock('bill_payment_reminder_job', lockToken);
    }
  });

  logger.info('[BILL REMINDER] Job started');
}

/**
 * Stop the bill payment reminder cron job.
 */
export function stopBillPaymentReminderJob(): void {
  if (billReminderJob) {
    billReminderJob.stop();
    billReminderJob = null;
    logger.info('[BILL REMINDER] Job stopped');
  }
}

/**
 * Manually trigger bill payment reminders (for testing/maintenance).
 */
export async function triggerManualBillReminders(): Promise<void> {
  const lockToken = await redisService.acquireLock('bill_payment_reminder_job', BILL_REMINDER_LOCK_TTL);
  if (!lockToken) {
    throw new Error('Bill payment reminder already in progress (locked by another instance)');
  }

  logger.info('[BILL REMINDER] Manual trigger');

  try {
    await runBillPaymentReminders();
  } finally {
    await redisService.releaseLock('bill_payment_reminder_job', lockToken);
  }
}

/**
 * Get job status.
 */
export function getBillReminderJobStatus(): { running: boolean; schedule: string } {
  return {
    running: billReminderJob !== null,
    schedule: BILL_REMINDER_SCHEDULE,
  };
}

/**
 * Initialize — called from server startup after database connection.
 */
export function initializeBillPaymentReminderJob(): void {
  startBillPaymentReminderJob();
}

export default {
  initialize: initializeBillPaymentReminderJob,
  start: startBillPaymentReminderJob,
  stop: stopBillPaymentReminderJob,
  triggerManual: triggerManualBillReminders,
  getStatus: getBillReminderJobStatus,
};
