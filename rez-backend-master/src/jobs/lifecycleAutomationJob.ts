import cron from 'node-cron';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { NotificationService } from '../services/notificationService';
import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('lifecycle-automation');

const LOCK_KEY = 'job:lifecycle-automation';
const LOCK_TTL = 900; // 15 minutes

// ─── Segment Definitions ────────────────────────────────────

interface UserSegment {
  name: string;
  query: Record<string, any>;
  notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'promotional';
    category: 'general' | 'promotional' | 'reminder';
  };
  maxPerRun: number;
}

const SEGMENTS: UserSegment[] = [
  {
    name: 'dormant_7d',
    query: {
      lastLoginAt: {
        $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        $gt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      isOnboarded: true,
      isActive: { $ne: false },
    },
    notification: {
      title: 'We miss you!',
      message: 'Your favourite stores have new cashback offers waiting. Come back and save!',
      type: 'promotional',
      category: 'promotional',
    },
    maxPerRun: 500,
  },
  {
    name: 'lapsed_30d',
    query: {
      lastLoginAt: {
        $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        $gt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
      isOnboarded: true,
      isActive: { $ne: false },
    },
    notification: {
      title: 'Your coins are waiting',
      message: 'You have unused rewards. Visit a store today and earn bonus cashback!',
      type: 'promotional',
      category: 'promotional',
    },
    maxPerRun: 200,
  },
  {
    name: 'at_risk_no_order',
    query: {
      lastLoginAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      'stats.totalOrders': { $eq: 0 },
      isOnboarded: true,
      createdAt: {
        $lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Signed up >3 days ago
      },
    },
    notification: {
      title: 'Make your first order',
      message: 'Discover stores near you and earn cashback on your first purchase!',
      type: 'info',
      category: 'reminder',
    },
    maxPerRun: 300,
  },
];

// ─── Redis dedup key prefix (prevents re-notifying same user in same segment within 7 days)
const DEDUP_PREFIX = 'lifecycle:notified';
const DEDUP_TTL = 7 * 24 * 60 * 60; // 7 days

// ─── Main Job ───────────────────────────────────────────────

async function runLifecycleAutomation(): Promise<void> {
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.info('Lifecycle automation skipped — lock held');
      return;
    }

    logger.info('Starting lifecycle automation...');
    const results: Record<string, { found: number; notified: number; skipped: number }> = {};

    for (const segment of SEGMENTS) {
      const segResult = await processSegment(segment);
      results[segment.name] = segResult;
      logger.info(`Segment ${segment.name}:`, segResult);
    }

    logger.info('Lifecycle automation complete', results);
  } catch (error) {
    logger.error('Lifecycle automation failed', error as Error);
  } finally {
    if (lockToken) {
      await redisService.releaseLock(LOCK_KEY, lockToken);
    }
  }
}

async function processSegment(segment: UserSegment): Promise<{
  found: number;
  notified: number;
  skipped: number;
}> {
  let notified = 0;
  let skipped = 0;

  try {
    const users = await User.find(segment.query)
      .select('_id')
      .limit(segment.maxPerRun)
      .lean();

    for (const user of users) {
      const userId = (user as any)._id.toString();
      const dedupKey = `${DEDUP_PREFIX}:${segment.name}:${userId}`;

      // Check if already notified in this window
      try {
        const alreadySent = await redisService.get(dedupKey);
        if (alreadySent) {
          skipped++;
          continue;
        }
      } catch {
        // Redis error — skip dedup, proceed cautiously
      }

      // Send notification (fire-and-forget)
      try {
        await NotificationService.createNotification({
          userId,
          title: segment.notification.title,
          message: segment.notification.message,
          type: segment.notification.type,
          category: segment.notification.category,
          priority: 'medium',
          source: 'automated',
        });

        // Mark as notified
        await redisService.set(dedupKey, '1', DEDUP_TTL);
        notified++;
      } catch (err) {
        logger.error(`Failed to notify user ${userId} for segment ${segment.name}`, err as Error);
      }
    }

    return { found: users.length, notified, skipped };
  } catch (error) {
    logger.error(`Failed to process segment ${segment.name}`, error as Error);
    return { found: 0, notified: 0, skipped: 0 };
  }
}

// ─── Cron Schedule ──────────────────────────────────────────

/**
 * Initialize lifecycle automation — runs daily at 10:00 AM.
 * Sends targeted nudges to dormant, lapsed, and at-risk users.
 */
export function initializeLifecycleAutomationJob(): void {
  cron.schedule('0 10 * * *', () => {
    runLifecycleAutomation().catch(err => {
      logger.error('Unhandled error in lifecycle automation', err as Error);
    });
  });
}

export { runLifecycleAutomation };
export default initializeLifecycleAutomationJob;
