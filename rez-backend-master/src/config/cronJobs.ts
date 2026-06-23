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
 * Initializes ALL cron jobs and background services.
 * Called from startServer() after DB + Redis are connected.
 */
export async function initializeCronJobs(): Promise<void> {
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
