import * as cron from 'node-cron';
import tournamentService from '../services/tournamentService';
import Tournament from '../models/Tournament';
import { User } from '../models/User';
import pushNotificationService from '../services/pushNotificationService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Tournament Lifecycle Jobs
 *
 * 1. Activation Job - Runs every 5 minutes
 *    Transitions tournaments from 'upcoming' to 'active' when startDate passes.
 *
 * 2. Completion Job - Runs every 5 minutes
 *    Transitions tournaments from 'active' to 'completed' when endDate passes,
 *    then distributes prizes to winners.
 */

let activationJob: ReturnType<typeof cron.schedule> | null = null;
let completionJob: ReturnType<typeof cron.schedule> | null = null;
let endingSoonJob: ReturnType<typeof cron.schedule> | null = null;
let isActivationRunning = false;
let isCompletionRunning = false;
let isEndingSoonRunning = false;

const ACTIVATION_SCHEDULE = '*/5 * * * *';   // Every 5 minutes
const COMPLETION_SCHEDULE = '*/5 * * * *';   // Every 5 minutes
const ENDING_SOON_SCHEDULE = '0 * * * *';    // Every hour

/**
 * Initialize and start tournament lifecycle jobs
 */
export function initializeTournamentLifecycleJobs(): void {
  if (activationJob || completionJob) {
    logger.info('⚠️ [TOURNAMENT] Lifecycle jobs already running');
    return;
  }

  logger.info('🏆 [TOURNAMENT] Starting tournament lifecycle jobs');

  // Job 1: Activate upcoming tournaments every 5 minutes
  activationJob = cron.schedule(ACTIVATION_SCHEDULE, async () => {
    if (isActivationRunning) {
      logger.info('⏭️ [TOURNAMENT] Previous activation job still running, skipping');
      return;
    }

    isActivationRunning = true;
    const activationLockKey = 'job:tournament-lifecycle';
    let activationLockToken: string | null = null;

    try {
      activationLockToken = await redisService.acquireLock(activationLockKey, 300);
      if (!activationLockToken) {
        logger.info('tournament-lifecycle skipped — lock held by another instance');
        return;
      }

      const startTime = Date.now();

      try {
        const activated = await tournamentService.activateUpcomingTournaments();
        const duration = Date.now() - startTime;
        if (activated > 0) {
          logger.info(`✅ [TOURNAMENT] Activated ${activated} tournaments in ${duration}ms`);
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ [TOURNAMENT] Activation job failed after ${duration}ms:`, error);
      }
    } finally {
      if (activationLockToken) {
        await redisService.releaseLock(activationLockKey, activationLockToken);
      }
      isActivationRunning = false;
    }
  });

  // Job 2: Complete ended tournaments every 5 minutes
  completionJob = cron.schedule(COMPLETION_SCHEDULE, async () => {
    if (isCompletionRunning) {
      logger.info('⏭️ [TOURNAMENT] Previous completion job still running, skipping');
      return;
    }

    isCompletionRunning = true;
    const completionLockKey = 'job:tournament-lifecycle-completion';
    let completionLockToken: string | null = null;

    try {
      completionLockToken = await redisService.acquireLock(completionLockKey, 300);
      if (!completionLockToken) {
        logger.info('tournament-lifecycle-completion skipped — lock held by another instance');
        return;
      }

      const startTime = Date.now();

      try {
        const completed = await tournamentService.completeEndedTournaments();
        const duration = Date.now() - startTime;
        if (completed > 0) {
          logger.info(`✅ [TOURNAMENT] Completed ${completed} tournaments (with prize distribution) in ${duration}ms`);
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ [TOURNAMENT] Completion job failed after ${duration}ms:`, error);
      }
    } finally {
      if (completionLockToken) {
        await redisService.releaseLock(completionLockKey, completionLockToken);
      }
      isCompletionRunning = false;
    }
  });

  // Job 3: Notify participants of tournaments ending within 24h (every hour)
  endingSoonJob = cron.schedule(ENDING_SOON_SCHEDULE, async () => {
    if (isEndingSoonRunning) {
      logger.info('⏭️ [TOURNAMENT] Previous ending-soon job still running, skipping');
      return;
    }

    isEndingSoonRunning = true;
    const endingSoonLockKey = 'job:tournament-lifecycle-ending-soon';
    let endingSoonLockToken: string | null = null;

    try {
      endingSoonLockToken = await redisService.acquireLock(endingSoonLockKey, 300);
      if (!endingSoonLockToken) {
        logger.info('tournament-lifecycle-ending-soon skipped — lock held by another instance');
        return;
      }

      const startTime = Date.now();

      try {
        const notified = await notifyTournamentsEndingSoon();
        const duration = Date.now() - startTime;
        if (notified > 0) {
          logger.info(`✅ [TOURNAMENT] Sent ending-soon notifications to ${notified} participants in ${duration}ms`);
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ [TOURNAMENT] Ending-soon job failed after ${duration}ms:`, error);
      }
    } finally {
      if (endingSoonLockToken) {
        await redisService.releaseLock(endingSoonLockKey, endingSoonLockToken);
      }
      isEndingSoonRunning = false;
    }
  });

  logger.info('✅ [TOURNAMENT] Lifecycle jobs started successfully');
  logger.info('   - Activation: every 5 minutes');
  logger.info('   - Completion + prize distribution: every 5 minutes');
  logger.info('   - Ending-soon notifications: every hour');
}

/**
 * Notify participants of tournaments ending within 24 hours.
 * Only notifies once per tournament by checking a metadata flag.
 */
async function notifyTournamentsEndingSoon(): Promise<number> {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find active tournaments ending within 24 hours that haven't been notified yet
  const endingSoonTournaments = await Tournament.find({
    status: 'active',
    endDate: { $gt: now, $lte: twentyFourHoursFromNow },
    endingSoonNotified: { $ne: true }
  });

  if (endingSoonTournaments.length === 0) return 0;

  let totalNotified = 0;

  for (const tournament of endingSoonTournaments) {
    const hoursLeft = Math.ceil((tournament.endDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    // Get all participant user IDs
    const participantUserIds = tournament.participants.map(p => p.user);

    if (participantUserIds.length === 0) {
      // Mark as notified even if no participants
      await Tournament.updateOne({ _id: tournament._id }, { $set: { endingSoonNotified: true } });
      continue;
    }

    // Fetch phone numbers for all participants
    const users = await User.find({ _id: { $in: participantUserIds } })
      .select('phoneNumber')
      .lean();

    for (const user of users) {
      if (!user.phoneNumber) continue;

      try {
        await pushNotificationService.sendTournamentEndingSoon(
          user.phoneNumber,
          tournament.name,
          hoursLeft
        );
        totalNotified++;
      } catch (notifErr) {
        if (process.env.NODE_ENV === 'development') {
          logger.info(`[TOURNAMENT] Failed to send ending-soon notification:`, notifErr);
        }
      }
    }

    // Mark tournament as notified so we don't send again
    await Tournament.updateOne({ _id: tournament._id }, { $set: { endingSoonNotified: true } });
  }

  return totalNotified;
}

/**
 * Stop all tournament lifecycle jobs
 */
export function stopTournamentLifecycleJobs(): void {
  if (activationJob) {
    activationJob.stop();
    activationJob = null;
  }
  if (completionJob) {
    completionJob.stop();
    completionJob = null;
  }
  if (endingSoonJob) {
    endingSoonJob.stop();
    endingSoonJob = null;
  }
  logger.info('🛑 [TOURNAMENT] Lifecycle jobs stopped');
}

export default {
  initialize: initializeTournamentLifecycleJobs,
  stop: stopTournamentLifecycleJobs,
};
