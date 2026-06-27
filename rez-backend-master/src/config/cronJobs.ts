/**
 * config/cronJobs.ts — Cron job initialization
 * Extracted from server.ts for maintainability.
 */
import { logger } from './logger';
import { isGamificationEnabled } from './gamificationFeatureFlags';
import redisService from '../services/redisService';

// Import job initializers
import partnerLevelMaintenanceService from '../services/partnerLevelMaintenanceService';
import { initializeTrialExpiryJob } from '../jobs/trialExpiryNotification';
import { initializeSessionCleanupJob } from '../jobs/cleanupExpiredSessions';
import { initializeCoinExpiryJob } from '../jobs/expireCoins';
import { initializeCashbackJobs } from '../jobs/cashbackJobs';
import { initializeTravelCashbackJobs } from '../jobs/travelCashbackJobs';
import { startRefundReversalJob } from '../jobs/refundReversalJob';
import { initializeInventoryAlertJob } from '../jobs/inventoryAlerts';
import { initializeDealExpiryJob } from '../jobs/expireDealRedemptions';
import { initializeVoucherExpiryJob } from '../jobs/expireVoucherRedemptions';
// Phase 6.24: wire up the merchant daily stats job. Was previously defined
// in computeMerchantDailyStats.ts but never scheduled (BUG-025 removed the
// inner cron.schedule but the replacement was never added). Runs daily at
// 1 AM under a Redis distributed lock.
import { computeYesterdayStats } from '../jobs/computeMerchantDailyStats';
import { initExperienceRewardCron as initializeExperienceRewardCron } from '../jobs/experienceRewardCron';
import { startTrialCoinExpiryJob } from '../jobs/trialCoinExpiryJob';
import { startSurpriseTrialJob } from '../jobs/surpriseTrialJob';
import { initializeTableBookingExpiryJob } from '../jobs/expireTableBookings';
import { startReconciliationJob } from '../jobs/reconciliationJob';
import { startReservationCleanup } from '../jobs/reservationCleanup';
import { initializeLeaderboardRefreshJob } from '../jobs/leaderboardRefreshJob';
import { initializeBillVerificationJob } from '../jobs/billVerificationJob';
import { initializeBillPaymentReminderJob } from '../jobs/billPaymentReminderJob';
import { startCreatorJobs } from '../jobs/creatorJobs';
import { initializeStreakResetJob } from '../jobs/streakResetJob';
import { initBonusCampaignJobs } from '../jobs/bonusCampaignJob';
import { initChallengeLifecycleJobs } from '../jobs/challengeLifecycleJob';
import { initializeTournamentLifecycleJobs } from '../jobs/tournamentLifecycleJob';
import { initializePrizeDistributionJob } from '../jobs/leaderboardPrizeDistributionJob';
import { runStuckTransactionRecovery } from '../jobs/stuckTransactionRecoveryJob';
import { runGiftDelivery } from '../jobs/giftDeliveryJob';
import { runGiftExpiry } from '../jobs/giftExpiryJob';
import { runSurpriseDropExpiry } from '../jobs/surpriseDropExpiryJob';
import { runPartnerEarningsSnapshot } from '../jobs/partnerEarningsSnapshotJob';
import { runDevicePatternAnalysis } from '../jobs/devicePatternAnalysisJob';
import { initializeReferralExpiryJob } from '../jobs/referralExpiryJob';
import { initializePriveInviteExpiryJob } from '../jobs/priveInviteExpiryJob';
import { runPushReceiptProcessing } from '../jobs/pushReceiptJob';
import { initializeNearbyFlashSaleNotificationJob } from '../jobs/nearbyFlashSaleNotificationJob';
import { initializeWeeklySummaryJob } from '../jobs/weeklySummaryJob';
import { seedWalletFeatureFlags } from '../services/walletFeatureService';
import { featureFlagService } from '../services/featureFlagService';
import { initializeSLABreachJob } from '../jobs/slaBreachJob';
import { initializeIntegrationReconciliationJob } from '../jobs/integrationReconciliationJob';
import { ScheduledJobService } from '../services/ScheduledJobService';
import AuditRetentionService from '../services/AuditRetentionService';
import { ReportService } from '../merchantservices/ReportService';
import { initializeTagOffersJob } from '../jobs/tagOffersJob';
import { initializeProviderAnalyticsDigestJob } from '../jobs/providerAnalyticsDigestJob';

// Phase 4 stub replacement: thin wrapper around node-cron. Same signature as the old stub
// so callers (jobs/) don't need changes. Validates the expression, logs scheduling, and
// traps callback errors so one bad job doesn't kill the cron daemon.
export const scheduleCronJob = (
  schedule: string,
  callback: () => Promise<void>,
  description?: string
): void => {
  try {
    const cron = require('node-cron');
    if (!cron.validate(schedule)) {
      logger.error(`[CRON] Invalid cron expression: "${schedule}" (${description ?? ''})`);
      return;
    }
    cron.schedule(schedule, async () => {
      try {
        await callback();
      } catch (err: any) {
        logger.error(`[CRON] Job "${description ?? schedule}" failed:`, err.message);
      }
    });
    logger.info(`[CRON] Scheduled "${description ?? schedule}" @ ${schedule}`);
  } catch (err: any) {
    logger.error(`[CRON] Failed to schedule "${description ?? schedule}":`, err.message);
  }
};

/**
 * Phase 6.24: Wrap a cron callback with a Redis distributed lock so it only
 * runs on one worker replica even when multiple rez-worker pods are running.
 * Use this for any cron that has side effects (writes, notifications,
 * payments). Read-only crons or stats-aggregation crons can skip the lock.
 *
 * The lock is a string token (matching the rest of the codebase's
 * redisService.acquireLock / releaseLock pair). On success the callback's
 * return value is forwarded to the caller; on skip (lock not acquired) or
 * failure, null is returned and the caller can branch on that.
 *
 * @param lockKey  Unique Redis key for the lock (e.g. 'cron:gift_expiry')
 * @param ttlSec   Lock TTL in seconds. Should be > the worst-case job runtime.
 * @param description  Human-readable job name for logs
 * @param callback  The job body to run if the lock is acquired
 *
 * Returns the callback's resolved value on success, or null if the lock was
 * held by another worker or the job threw.
 */
export async function runWithLock<T>(
  lockKey: string,
  ttlSec: number,
  description: string,
  callback: () => Promise<T>
): Promise<T | null> {
  let token: string | null = null;
  try {
    token = await redisService.acquireLock(lockKey, ttlSec);
    if (!token) {
      logger.info(`[CRON] Skipped "${description}" — another worker holds the lock`);
      return null;
    }
    return await callback();
  } catch (err: any) {
    logger.error(`[CRON] Job "${description}" failed:`, err.message);
    return null;
  } finally {
    if (token) {
      try { await redisService.releaseLock(lockKey, token); } catch { /* ignore */ }
    }
  }
}

/**
 * Initializes ALL cron jobs and background services.
 * Called from startServer() after DB + Redis are connected.
 *
 * PRODUCTION SAFETY (Phase 6.24 fix): Cron jobs must only run on the dedicated
 * `rez-worker` service. Running them on the API service too causes duplicate
 * execution — every wallet reconciliation, gift delivery, leaderboard refresh,
 * etc. would fire N times across N API replicas, producing duplicate side
 * effects (double-credits, double-emails, etc.).
 *
 * The contract is:
 *   - Worker service: ENABLE_CRON=true (explicit opt-in)
 *   - API service:    ENABLE_CRON unset or !== 'true' (default skip)
 *
 * `DISABLE_CRON_IN_API=true` is supported for backwards compatibility but the
 * explicit `ENABLE_CRON` gate is the source of truth going forward.
 */
export async function initializeCronJobs(): Promise<void> {
  // PRODUCTION GUARD: only run crons when ENABLE_CRON=true.
  // The legacy `DISABLE_CRON_IN_API` flag is honored as a backwards-compat
  // bypass — if either flag says "skip", we skip.
  if (process.env.ENABLE_CRON !== 'true') {
    if (process.env.DISABLE_CRON_IN_API === 'true') {
      logger.info('[CRON] Skipped (DISABLE_CRON_IN_API=true; legacy flag).');
    } else {
      logger.warn(
        '[CRON] Skipped (ENABLE_CRON !== "true"). ' +
        'Set ENABLE_CRON=true on the rez-worker service only. ' +
        'Running crons on API replicas causes duplicate side effects.'
      );
    }
    return;
  }

  // Initialize report service
  ReportService.initialize();

  // Partner level maintenance cron jobs
  logger.info('Initializing partner level maintenance...');
  partnerLevelMaintenanceService.startAll();
  logger.info('Partner level maintenance cron jobs started');

  // Trial expiry notification job
  initializeTrialExpiryJob();
  logger.info('Trial expiry notification job started');

  // Session cleanup job
  initializeSessionCleanupJob();
  logger.info('Session cleanup job started (runs daily at midnight)');

  // Coin expiry job
  initializeCoinExpiryJob();
  logger.info('Coin expiry job started (runs daily at 1:00 AM)');

  // Cashback jobs (credit pending & expire clicks)
  initializeCashbackJobs();
  logger.info('Cashback jobs started (credit: hourly, expire: daily at 2:00 AM)');

  // Travel cashback jobs (credit, expire unpaid, mark completed)
  initializeTravelCashbackJobs();
  logger.info('Travel cashback jobs started (credit: 2h, expire: 15m, complete: daily 3AM)');

  // Refund reversal job (processes pending refunds)
  startRefundReversalJob();
  logger.info('Refund reversal job started (every 5 minutes)');

  // Inventory alert job (sends low stock / out of stock notifications)
  initializeInventoryAlertJob();
  logger.info('Inventory alert job started (runs daily at 8:00 AM)');

  // Deal redemption expiry job
  initializeDealExpiryJob();
  logger.info('Deal expiry job started (runs every hour)');

  // Voucher redemption expiry job
  initializeVoucherExpiryJob();
  logger.info('Voucher expiry job started (runs every hour at :30)');

  // Table booking expiry job
  initializeTableBookingExpiryJob();
  logger.info('Table booking expiry job started (runs every 30 min)');

  // Reconciliation job
  startReconciliationJob();
  logger.info('Reconciliation job started (runs daily at 3:00 AM)');

  // Phase 6.24: merchant daily stats — daily at 1 AM with a distributed lock
  // (multi-replica would otherwise double-write the merchant_daily_stats
  // collection, causing data corruption in aggregate views).
  scheduleCronJob('0 1 * * *', async () => {
    await runWithLock(
      'cron:merchant_daily_stats',
      1800,           // 30-min TTL: stats rollup can take a while
      'merchant daily stats',
      computeYesterdayStats
    );
  }, 'merchant daily stats');
  logger.info('Merchant daily stats job started (runs daily at 1:00 AM, lock-protected)');

  // Experience reward cron (monthly grant). Self-locking via runWithLock
  // inside the job, so safe under multi-replica.
  initializeExperienceRewardCron();
  logger.info('Experience reward cron started (daily at 23:00 UTC, lock-protected)');

  // Phase 6.24: trial coin expiry (daily 2 AM) and surprise trial assignment
  // (weekly Monday 6 AM) — both write to user balances, so both are
  // lock-protected via runWithLock inside the job itself.
  startTrialCoinExpiryJob();
  logger.info('Trial coin expiry job started (runs daily at 2:00 AM, lock-protected)');
  startSurpriseTrialJob();
  logger.info('Surprise trial job started (runs Monday at 6:00 AM, lock-protected)');

  // Reservation cleanup job
  startReservationCleanup();
  logger.info('Reservation cleanup job started (runs every 5 min)');

  // Leaderboard refresh job
  if (isGamificationEnabled('leaderboard')) {
    initializeLeaderboardRefreshJob();
    logger.info('Leaderboard refresh job started (runs every 5 min)');
  }

  // Bill verification job
  initializeBillVerificationJob();
  logger.info('Bill verification job started (runs every 10 min)');

  // Bill payment reminder job (due date notifications)
  initializeBillPaymentReminderJob();
  logger.info('Bill payment reminder job started (runs daily at 10 AM)');

  // Creator program background jobs
  startCreatorJobs();
  logger.info('Creator jobs started (trending, stats, conversions, tiers)');

  // Streak reset job (resets broken streaks daily at 00:05 UTC)
  if (isGamificationEnabled('streaks')) {
    initializeStreakResetJob();
    logger.info('Streak reset job started (runs daily at 00:05 UTC)');
  }

  // Offer auto-tagging (trending/popular/expiring — runs hourly)
  initializeTagOffersJob();

  // Bonus campaign jobs (status transitions every 5m, expire claims every 30m)
  if (isGamificationEnabled('bonusZones')) {
    initBonusCampaignJobs();
    logger.info('Bonus campaign jobs started (transitions: 5m, expire claims: 30m)');
  }

  // Challenge lifecycle jobs (status transitions every 5m, cleanup every 30m)
  if (isGamificationEnabled('challenges')) {
    initChallengeLifecycleJobs();
    logger.info('Challenge lifecycle jobs started (transitions: 5m, cleanup: 30m)');
  }

  // Tournament lifecycle jobs (activation + completion + prize distribution)
  if (isGamificationEnabled('tournaments')) {
    initializeTournamentLifecycleJobs();
    logger.info('Tournament lifecycle jobs started (activation: 5m, completion: 5m)');
  }

  // ── Wallet production-readiness jobs with distributed locks ──
  const cron = require('node-cron');

  // Stuck transaction recovery — every 15 min, one pod only
  cron.schedule('*/15 * * * *', async () => {
    const lock = await redisService.acquireLock('stuck_tx_recovery', 600);
    if (!lock) return;
    try { await runStuckTransactionRecovery(); }
    catch (e) { logger.error('[JOB] stuckTransactionRecovery:', e); }
    finally { await redisService.releaseLock('stuck_tx_recovery', lock); }
  });

  // Gift delivery — every 5 min, one pod only
  cron.schedule('*/5 * * * *', async () => {
    const lock = await redisService.acquireLock('gift_delivery', 240);
    if (!lock) return;
    try { await runGiftDelivery(); }
    catch (e) { logger.error('[JOB] giftDelivery:', e); }
    finally { await redisService.releaseLock('gift_delivery', lock); }
  });

  // Gift expiry — daily 2:30 AM, one pod only
  cron.schedule('30 2 * * *', async () => {
    const lock = await redisService.acquireLock('gift_expiry', 3600);
    if (!lock) return;
    try { await runGiftExpiry(); }
    catch (e) { logger.error('[JOB] giftExpiry:', e); }
    finally { await redisService.releaseLock('gift_expiry', lock); }
  });

  // Surprise drop expiry — hourly, one pod only
  cron.schedule('0 * * * *', async () => {
    const lock = await redisService.acquireLock('surprise_drop_expiry', 3000);
    if (!lock) return;
    try { await runSurpriseDropExpiry(); }
    catch (e) { logger.error('[JOB] surpriseDropExpiry:', e); }
    finally { await redisService.releaseLock('surprise_drop_expiry', lock); }
  });

  // Partner earnings snapshot — daily 1 AM, one pod only
  cron.schedule('0 1 * * *', async () => {
    const lock = await redisService.acquireLock('partner_earnings_snapshot', 7200);
    if (!lock) return;
    try { await runPartnerEarningsSnapshot(); }
    catch (e) { logger.error('[JOB] partnerEarningsSnapshot:', e); }
    finally { await redisService.releaseLock('partner_earnings_snapshot', lock); }
  });

  // Push receipt processing — every 15 min (offset by 7 min), one pod only
  cron.schedule('7,22,37,52 * * * *', async () => {
    const lock = await redisService.acquireLock('push_receipt_processing', 600);
    if (!lock) return;
    try { await runPushReceiptProcessing(); }
    catch (e) { logger.error('[JOB] pushReceiptProcessing:', e); }
    finally { await redisService.releaseLock('push_receipt_processing', lock); }
  });

  // Device pattern analysis — every 15 min, one pod only
  cron.schedule('*/15 * * * *', async () => {
    const lock = await redisService.acquireLock('device_pattern_analysis', 600);
    if (!lock) return;
    try { await runDevicePatternAnalysis(); }
    catch (e) { logger.error('[JOB] devicePatternAnalysis:', e); }
    finally { await redisService.releaseLock('device_pattern_analysis', lock); }
  });

  logger.info('Wallet production jobs started with distributed locks');

  // Nearby flash sale notifications — every 30 min, location-filtered
  initializeNearbyFlashSaleNotificationJob();
  logger.info('Nearby flash sale notification job started (runs every 30 minutes)');

  // Weekly savings summary — Monday 10 AM
  initializeWeeklySummaryJob();
  logger.info('Weekly summary job started (runs Monday 10:00 AM)');

  // Provider analytics digest email — daily at 9:00 AM IST
  initializeProviderAnalyticsDigestJob();
  logger.info('Provider analytics digest job started (runs daily at 9:00 AM IST)');

  // Wallet-ledger reconciliation — daily at 4 AM
  const { initializeLedgerReconciliationJob } = await import('../jobs/walletLedgerReconciliationJob');
  initializeLedgerReconciliationJob();
  logger.info('Wallet-ledger reconciliation job started (runs daily at 4:00 AM)');

  // Merchant liability settlement — daily at 5 AM
  const { initializeMerchantLiabilitySettlementJob } = await import('../jobs/merchantLiabilitySettlementJob');
  initializeMerchantLiabilitySettlementJob();
  logger.info('Merchant liability settlement job started (runs daily at 5:00 AM)');

  // Referral expiry — daily at 3 AM
  initializeReferralExpiryJob();
  logger.info('Referral expiry job started (runs daily at 3 AM)');

  // Prive invite code expiry — daily at 3:30 AM
  initializePriveInviteExpiryJob();

  // SLA breach detection — every 5 minutes
  initializeSLABreachJob();
  logger.info('SLA breach detection job started (runs every 5 min)');

  // Integration reconciliation — daily at 2 AM
  initializeIntegrationReconciliationJob();
  logger.info('Integration reconciliation job started (runs daily at 2 AM)');

  // Seed wallet feature flags
  await seedWalletFeatureFlags();
  logger.info('Wallet feature flags seeded');

  // Seed gamification + games feature flags
  await featureFlagService.seedDefaultFlags();
  logger.info('Feature flags seeded');

  // Initialize Bull-based scheduled job service
  logger.info('Initializing Bull scheduled job service...');
  await ScheduledJobService.initialize();
  logger.info('Bull scheduled job service initialized');

  // Initialize audit retention service
  logger.info('Initializing audit retention service...');
  await AuditRetentionService.initialize();
  logger.info('Audit retention service initialized');

  // Leaderboard prize distribution job (hourly check for period-end prizes)
  if (isGamificationEnabled('leaderboard')) {
    initializePrizeDistributionJob();
    logger.info('Leaderboard prize distribution job started (runs hourly)');
  }

  // Customer lifecycle automation — daily at 10:00 AM (nudge dormant/lapsed/at-risk users)
  const { initializeLifecycleAutomationJob } = await import('../jobs/lifecycleAutomationJob');
  initializeLifecycleAutomationJob();
  logger.info('Lifecycle automation job started (runs daily at 10:00 AM)');

  // Archive old records — daily at 3:00 AM (Activity → ArchivedActivity, LedgerEntry → gzip export)
  const { initializeArchiveJob } = await import('../jobs/archiveJob');
  initializeArchiveJob();
  logger.info('Archive job started (runs daily at 3:00 AM)');

  // Dispute timeout resolution job (every 30 minutes)
  const { initializeDisputeTimeoutJob } = await import('../jobs/disputeTimeoutJob');
  initializeDisputeTimeoutJob();
  logger.info('Dispute timeout resolution job started (runs every 30 min)');

  // Order lifecycle background jobs
  const { initializeOrderLifecycleJobs } = await import('../jobs/orderLifecycleJobs');
  initializeOrderLifecycleJobs();
  const { initializeOrderReconciliationJob } = await import('../jobs/orderReconciliationJob');
  initializeOrderReconciliationJob();
  logger.info('Order lifecycle + reconciliation jobs started');

  // Personalized deal notifications — 11am lunch + 5pm hangout (IST)
  const { personalizedNotificationJob } = await import('../jobs/personalizedNotificationJob');
  const cronScheduler = (await import('node-cron')).default;
  cronScheduler.schedule('0 11 * * *', async () => {
    const lock = await redisService.acquireLock('lock:notif:lunch', 300);
    if (!lock) return;
    try { await personalizedNotificationJob.run('lunch'); }
    catch (e) { logger.error('[PersonalizedNotif] Lunch job error:', e); }
    finally { await redisService.releaseLock('lock:notif:lunch', lock); }
  }, { timezone: 'Asia/Kolkata' });
  cronScheduler.schedule('0 17 * * *', async () => {
    const lock = await redisService.acquireLock('lock:notif:hangout', 300);
    if (!lock) return;
    try { await personalizedNotificationJob.run('hangout'); }
    catch (e) { logger.error('[PersonalizedNotif] Hangout job error:', e); }
    finally { await redisService.releaseLock('lock:notif:hangout', lock); }
  }, { timezone: 'Asia/Kolkata' });
  logger.info('Personalized notification jobs started (11am lunch, 5pm hangout IST)');

  // Gamification event bus
  logger.info('Initializing gamification event bus...');
  const gamificationEventBus = (await import('../events/gamificationEventBus')).default;
  await gamificationEventBus.initialize();
  logger.info('Gamification event bus initialized');
}
