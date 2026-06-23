import cron from 'node-cron';
import { ServiceAppointment } from '../models/ServiceAppointment';
import { StorePayment } from '../models/StorePayment';
import { Store } from '../models/Store';
import pushNotificationService from '../services/pushNotificationService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

// Category slug → re-engagement window in days
const CATEGORY_WINDOWS: Record<string, number> = {
  food: 7,
  restaurant: 7,
  service: 25,
  salon: 25,
  consultation: 60,
  retail: 14,
  general: 14,
};

// Default window when no category slug matches
const DEFAULT_WINDOW_DAYS = 14;

// Half-day tolerance window (±12 hours) in ms
const HALF_DAY_MS = 12 * 3600 * 1000;

function getCategoryWindow(slug: string | undefined): number {
  if (!slug) return DEFAULT_WINDOW_DAYS;
  const lower = slug.toLowerCase();
  for (const key of Object.keys(CATEGORY_WINDOWS)) {
    if (lower.includes(key)) return CATEGORY_WINDOWS[key];
  }
  return DEFAULT_WINDOW_DAYS;
}

function buildNudgeMessage(
  categorySlug: string | undefined,
  storeName: string,
  days: number,
): { title: string; body: string } {
  const slug = (categorySlug || '').toLowerCase();

  if (slug.includes('food') || slug.includes('restaurant')) {
    return {
      title: `Hungry again? ${storeName} is waiting 🍛`,
      body: `Come back and earn coins!`,
    };
  }
  if (slug.includes('service') || slug.includes('salon')) {
    return {
      title: `Time to freshen up at ${storeName} 💇`,
      body: `It's been ${days} days — book again and earn REZ coins!`,
    };
  }
  if (slug.includes('consultation')) {
    return {
      title: `Your ${days}-day follow-up reminder`,
      body: `${storeName} is ready for your next consultation.`,
    };
  }
  if (slug.includes('retail')) {
    return {
      title: `New arrivals at ${storeName} 🛍`,
      body: `Use your REZ coins today!`,
    };
  }
  return {
    title: `Visit ${storeName} again!`,
    body: `Earn more REZ coins on your next visit.`,
  };
}

// ── Part A: StorePayment-based nudge for all categories ──────────────
async function runPaymentBasedNudge(): Promise<void> {
  const now = new Date();

  // Gather all unique window values so we can batch queries
  const uniqueWindows = [...new Set(Object.values(CATEGORY_WINDOWS))];

  for (const windowDays of uniqueWindows) {
    const targetTime = new Date(now.getTime() - windowDays * 24 * 3600000);
    const windowStart = new Date(targetTime.getTime() - HALF_DAY_MS);
    const windowEnd = new Date(targetTime.getTime() + HALF_DAY_MS);

    try {
      const payments = await (StorePayment as any)
        .find({
          status: 'completed',
          createdAt: { $gte: windowStart, $lte: windowEnd },
        })
        .limit(500)
        .lean();

      // BUG-035 FIX: batch-fetch all stores for this window in one query instead of N individual lookups
      const storeIds = [...new Set(payments.map((p: any) => p.storeId?.toString()).filter(Boolean))];
      const storeList = await (Store as any)
        .find({ _id: { $in: storeIds } })
        .populate('category', 'slug name')
        .lean();
      const storeMap: Record<string, any> = {};
      for (const s of storeList) storeMap[s._id.toString()] = s;

      for (const payment of payments) {
        try {
          const userId = payment.userId?.toString();
          const storeId = payment.storeId?.toString();
          if (!userId || !storeId) continue;

          // Check Redis dedup key — skip if nudge already sent for this user+store window
          const redisKey = `rebooking-nudge:${userId}:${storeId}`;
          const alreadySent = await redisService.get<string>(redisKey);
          if (alreadySent) continue;

          const store = storeMap[storeId];
          if (!store) continue;

          const categorySlug: string | undefined = (store.category as any)?.slug ?? undefined;
          const storeWindow = getCategoryWindow(categorySlug);

          // Only send nudge if this payment falls in the correct window for this store's category
          if (storeWindow !== windowDays) continue;

          const { title, body } = buildNudgeMessage(categorySlug, store.name, windowDays);

          await pushNotificationService.sendPushToUser(userId, {
            title,
            body,
            data: { screen: 'store', storeId },
          });

          // Mark sent in Redis with TTL = windowDays (so we don't re-nudge until next cycle)
          await redisService.set(redisKey, '1', windowDays * 86400);

          logger.debug(`[RebookingNudgeJob] Nudged userId=${userId} storeId=${storeId} window=${windowDays}d`);
        } catch (e) {
          logger.error('[RebookingNudgeJob] payment nudge error:', e);
        }
      }
    } catch (err) {
      logger.error(`[RebookingNudgeJob] Fatal (window=${windowDays}d):`, err);
    }
  }
}

// ── Part B: ServiceAppointment-based nudge (precise salon rebook) ────
async function runAppointmentBasedNudge(): Promise<void> {
  const now = new Date();
  const salonWindowDays = 25;
  const target = new Date(now.getTime() - salonWindowDays * 24 * 3600000);
  const windowStart = new Date(target.getTime() - HALF_DAY_MS);
  const windowEnd = new Date(target.getTime() + HALF_DAY_MS);

  try {
    // Match appointments completed ~25 days ago.
    // BUG 9 FIX: Use $or so we catch both appointments that set completedAt
    // AND older/migrated records that are 'completed' but never had completedAt
    // written (use updatedAt as best proxy for those records only).
    const appointments = await (ServiceAppointment as any)
      .find({
        status: 'completed',
        $or: [
          // Appointments that correctly recorded completedAt
          { completedAt: { $gte: windowStart, $lte: windowEnd } },
          // Legacy/migrated appointments: completedAt absent, fall back to updatedAt
          { completedAt: { $exists: false }, updatedAt: { $gte: windowStart, $lte: windowEnd } },
        ],
        rebookingNudgeSent: { $ne: true },
      })
      .limit(500)
      .populate('user store')
      .lean();

    for (const apt of appointments) {
      try {
        if (apt.user?._id) {
          await pushNotificationService.sendPushToUser(apt.user._id.toString(), {
            title: `Time to freshen up at ${apt.store?.name ?? 'your salon'} 💇`,
            body: `It's been ${salonWindowDays} days — book again and earn coins!`,
            data: { screen: 'store', storeId: apt.store?._id?.toString() },
          });
        }
        await (ServiceAppointment as any).findByIdAndUpdate(apt._id, {
          rebookingNudgeSent: true,
        });
      } catch (e) {
        logger.error('[RebookingNudgeJob] appointment nudge error:', e);
      }
    }

    logger.debug(`[RebookingNudgeJob] Appointment nudges sent: ${appointments.length}`);
  } catch (err) {
    logger.error('[RebookingNudgeJob] Appointment nudge fatal:', err);
  }
}

// ── Main export ───────────────────────────────────────────────────────
// D4: Distributed lock prevents N-pod double-fire on multi-replica deploys.
// Without this, each pod runs the same nudge query → users get N push notifications.
const LOCK_KEY = 'cron:rebooking-nudge:daily';
const LOCK_TTL_SECONDS = 30 * 60; // 30 min — generous window for full pass

export const startRebookingNudgeJob = () => {
  // Run daily at 10am
  cron.schedule('0 10 * * *', async () => {
    const lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
    if (!lockToken) {
      logger.info('[RebookingNudgeJob] Already running on another pod — skipping');
      return;
    }
    try {
      logger.debug('[RebookingNudgeJob] Running...');
      await runPaymentBasedNudge();
      await runAppointmentBasedNudge();
      logger.debug('[RebookingNudgeJob] Done.');
    } finally {
      await redisService.releaseLock(LOCK_KEY, lockToken);
    }
  });

  logger.debug('[RebookingNudgeJob] Scheduled (daily at 10am)');
};
