import * as cron from 'node-cron';
import redisService from '../services/redisService';
import { logger } from '../config/logger';
import { Bill, IBill } from '../models/Bill';

/**
 * Bill Verification Background Job
 *
 * This module schedules a background job that processes pending bill verifications.
 *
 * - Runs every 10 minutes via cron
 * - Finds bills with verificationStatus = 'pending'
 * - Marks them as 'processing'
 * - Runs basic verification checks (amount range, duplicate detection, fraud score)
 * - On pass: approves the bill (which triggers cashback via Bill's post-save hook)
 * - On fail: rejects the bill with a reason
 *
 * Note: The actual OCR/verification logic may be handled by an external service.
 * This job handles the queue processing of pending bills and basic validation.
 *
 * Uses Redis distributed locks with owner tokens for multi-instance safety.
 */

// Job instance
let billVerificationJob: ReturnType<typeof cron.schedule> | null = null;

// Configuration
const BILL_VERIFICATION_SCHEDULE = '*/10 * * * *'; // Every 10 minutes
const BILL_VERIFICATION_LOCK_TTL = 600; // 10 minutes
const BATCH_SIZE = 20; // Process up to 20 bills per run

interface VerificationStats {
  processed: number;
  approved: number;
  rejected: number;
  errors: number;
  duration: number;
}

/**
 * Run basic verification checks on a bill
 * Returns { passed: boolean, reason?: string }
 */
async function verifyBill(bill: IBill): Promise<{ passed: boolean; reason?: string }> {
  // Check 1: Fraud score threshold
  if (bill.metadata?.fraudScore && bill.metadata.fraudScore > 70) {
    return { passed: false, reason: `High fraud score detected (${bill.metadata.fraudScore}/100)` };
  }

  // Check 2: Fraud flags
  if (bill.metadata?.fraudFlags && bill.metadata.fraudFlags.length > 2) {
    return { passed: false, reason: `Multiple fraud indicators detected: ${bill.metadata.fraudFlags.join(', ')}` };
  }

  // Check 3: Unreasonably high amount (over 50,000)
  if (bill.amount > 50000) {
    // Flag for manual review rather than auto-reject
    return { passed: false, reason: 'High amount bill requires manual verification' };
  }

  // Check 4: Duplicate bill detection
  try {
    const duplicateQuery: any = {
      user: bill.user,
      merchant: bill.merchant,
      amount: bill.amount,
      _id: { $ne: bill._id },
      isActive: true,
      verificationStatus: { $in: ['approved', 'processing'] },
    };

    // Check for same date
    const startOfDay = new Date(bill.billDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bill.billDate);
    endOfDay.setHours(23, 59, 59, 999);
    duplicateQuery.billDate = { $gte: startOfDay, $lte: endOfDay };

    const duplicate = await Bill.findOne(duplicateQuery);
    if (duplicate) {
      return { passed: false, reason: 'Duplicate bill detected (same merchant, amount, and date)' };
    }
  } catch (err) {
    // Don't block verification on duplicate check failure
    logger.warn('⚠️ [BILL VERIFICATION] Duplicate check failed:', err);
  }

  // Check 5: Image hash duplicate
  if (bill.billImage?.imageHash) {
    const hashDuplicate = await Bill.findOne({
      'billImage.imageHash': bill.billImage.imageHash,
      _id: { $ne: bill._id },
      isActive: true,
      verificationStatus: { $in: ['approved', 'processing'] },
    });

    if (hashDuplicate) {
      return { passed: false, reason: 'Duplicate bill image detected' };
    }
  }

  // Check 6: OCR confidence (if extracted data is available)
  if (bill.extractedData?.confidence && bill.extractedData.confidence < 30) {
    return { passed: false, reason: 'Bill image quality too low for verification (OCR confidence below threshold)' };
  }

  // Check 7: Amount mismatch between user-entered and OCR-extracted
  if (bill.extractedData?.amount && bill.amount) {
    const diff = Math.abs(bill.extractedData.amount - bill.amount);
    const tolerance = bill.amount * 0.1; // 10% tolerance
    if (diff > tolerance) {
      return { passed: false, reason: `Amount mismatch: user entered ₹${bill.amount}, OCR extracted ₹${bill.extractedData.amount}` };
    }
  }

  // All basic checks passed
  return { passed: true };
}

/**
 * Process a batch of pending bills
 */
async function processPendingBills(): Promise<VerificationStats> {
  const startTime = Date.now();
  const stats: VerificationStats = {
    processed: 0,
    approved: 0,
    rejected: 0,
    errors: 0,
    duration: 0,
  };

  try {
    logger.info('📄 [BILL VERIFICATION] Processing pending bills...');

    // Find pending bills, oldest first
    const pendingBills = await Bill.find({
      verificationStatus: 'pending',
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE)
      .populate('merchant', 'name cashbackPercentage');

    if (pendingBills.length === 0) {
      logger.info('📄 [BILL VERIFICATION] No pending bills to process');
      stats.duration = Date.now() - startTime;
      return stats;
    }

    logger.info(`📄 [BILL VERIFICATION] Found ${pendingBills.length} pending bills`);

    for (const bill of pendingBills) {
      try {
        // Mark as processing
        await bill.markAsProcessing();

        // Run verification checks
        const result = await verifyBill(bill);

        if (result.passed) {
          // Approve the bill (triggers cashback via post-save hook)
          await bill.approve();
          stats.approved++;
        } else {
          // Reject with reason
          await bill.reject(result.reason || 'Verification failed');
          stats.rejected++;
        }

        stats.processed++;
      } catch (error: any) {
        logger.error(`❌ [BILL VERIFICATION] Error processing bill ${bill._id}:`, error.message);
        stats.errors++;
      }
    }

    stats.duration = Date.now() - startTime;

    logger.info('✅ [BILL VERIFICATION] Batch completed:', {
      processed: stats.processed,
      approved: stats.approved,
      rejected: stats.rejected,
      errors: stats.errors,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return stats;
  } catch (error: any) {
    stats.duration = Date.now() - startTime;

    logger.error('❌ [BILL VERIFICATION] Job failed:', {
      error: error.message,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Start the bill verification job
 */
export function startBillVerificationJob(): void {
  if (billVerificationJob) {
    logger.info('⚠️ [BILL VERIFICATION] Bill verification job already running');
    return;
  }

  logger.info('📄 [BILL VERIFICATION] Starting bill verification job (runs every 10 minutes)');

  billVerificationJob = cron.schedule(BILL_VERIFICATION_SCHEDULE, async () => {
    // Acquire distributed lock with owner token — only one instance runs the job
    const lockToken = await redisService.acquireLock('bill_verification_job', BILL_VERIFICATION_LOCK_TTL);
    if (!lockToken) {
      logger.info('⏭️ [BILL VERIFICATION] Another instance is running the verification job, skipping');
      return;
    }

    try {
      await processPendingBills();
    } catch (error) {
      // Error already logged in processPendingBills
    } finally {
      await redisService.releaseLock('bill_verification_job', lockToken);
    }
  });

  logger.info('✅ [BILL VERIFICATION] Bill verification job started');
}

/**
 * Stop the bill verification job
 */
export function stopBillVerificationJob(): void {
  if (billVerificationJob) {
    billVerificationJob.stop();
    billVerificationJob = null;
    logger.info('🛑 [BILL VERIFICATION] Bill verification job stopped');
  }
}

/**
 * Manually trigger bill verification (for testing/maintenance)
 */
export async function triggerManualBillVerification(): Promise<VerificationStats> {
  const lockToken = await redisService.acquireLock('bill_verification_job', BILL_VERIFICATION_LOCK_TTL);
  if (!lockToken) {
    throw new Error('Bill verification already in progress (locked by another instance)');
  }

  logger.info('📄 [BILL VERIFICATION] Manual bill verification triggered');

  try {
    return await processPendingBills();
  } finally {
    await redisService.releaseLock('bill_verification_job', lockToken);
  }
}

/**
 * Get bill verification job status
 */
export function getBillVerificationJobStatus(): {
  running: boolean;
  schedule: string;
} {
  return {
    running: billVerificationJob !== null,
    schedule: BILL_VERIFICATION_SCHEDULE,
  };
}

/**
 * Initialize the bill verification job
 * Called from server startup after database connection
 */
export function initializeBillVerificationJob(): void {
  startBillVerificationJob();
}

export default {
  initialize: initializeBillVerificationJob,
  start: startBillVerificationJob,
  stop: stopBillVerificationJob,
  triggerManual: triggerManualBillVerification,
  getStatus: getBillVerificationJobStatus,
};
