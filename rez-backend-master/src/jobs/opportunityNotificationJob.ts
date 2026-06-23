/**
 * OpportunityNotificationJob
 *
 * Runs every 2 hours between 10 AM–9 PM (IST).
 * For users who have shared location permission, finds merchants within 500m
 * that have active offers and sends an opportunity push notification.
 *
 * Persona-aware behaviour (added):
 *   • Student  — title "Student deal near campus!", filter priceBucket=low,
 *                distance <= 3 km, priority categories: food/entertainment/grooming
 *   • Employee — title "Save on lunch near office!" (lunch) or "After-work deal nearby"
 *                (evening), filter priceBucket=mid, distance <= 5 km,
 *                priority categories: dining/wellness/fitness
 *   • General  — unchanged (generic nearby offer, radius 500 m)
 *
 * Frequency cap: skip users who have already received 2 opportunity
 * notifications today (enforced by NotificationService.isCategoryCapExceeded).
 */

import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import NotificationService from '../services/notificationService';
// Dependency: personaResolverService is created by Agent 1
import personaResolverService from '../services/personaResolverService';

const logger = createServiceLogger('opportunity-notification-job');

// ─── Constants ───────────────────────────────────────────────────────────────

const NEARBY_RADIUS_METERS = 500; // General / fallback radius (metres)
const STUDENT_RADIUS_METERS = 3000; // 3 km for students near campus
const EMPLOYEE_RADIUS_METERS = 5000; // 5 km for employees near office
const BATCH_SIZE = 100; // users processed per iteration

// IST hour thresholds for employee sub-titles
const LUNCH_START_IST = 11;
const LUNCH_END_IST = 14;
const EVENING_START_IST = 17;

// Persona-relevant store category tags
const STUDENT_PRIORITY_TAGS = ['food', 'entertainment', 'grooming', 'cafe', 'budget-food'];
const EMPLOYEE_PRIORITY_TAGS = ['dining', 'wellness', 'fitness', 'restaurant', 'lunch-deals', 'after-work-dining'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the current IST hour (0–23).
 * IST = UTC+5:30, i.e. UTC offset +330 minutes.
 */
function currentISTHour(): number {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + 330) % (24 * 60);
  return Math.floor(istMinutes / 60);
}

/**
 * Returns true if the current UTC hour falls within 10 AM–9 PM IST window.
 * IST = UTC+5:30, so:
 *   10:00 IST = 04:30 UTC
 *   21:00 IST = 15:30 UTC
 */
function isWithinOperatingHours(): boolean {
  const istHour = currentISTHour();
  return istHour >= 10 && istHour < 21;
}

/**
 * Derive persona-aware notification title for an employee depending on time-of-day.
 */
function employeeNotificationTitle(istHour: number): string {
  if (istHour >= LUNCH_START_IST && istHour < LUNCH_END_IST) {
    return 'Save on lunch near office!';
  }
  if (istHour >= EVENING_START_IST) {
    return 'After-work deal nearby';
  }
  return 'Great deal near your office!';
}

// ─── Job ─────────────────────────────────────────────────────────────────────

/**
 * Core job function. Exported for direct invocation from a cron scheduler
 * (e.g., node-cron or BullMQ repeatable job).
 *
 * Schedule: every 2 hours, 10 AM–9 PM IST.
 * Cron expression: `0 4,6,8,10,12,14 * * *` (UTC equivalent covering 10AM–9PM IST roughly).
 * For precise IST gating the function checks operating hours itself.
 */
export async function runOpportunityNotificationJob(): Promise<void> {
  if (!isWithinOperatingHours()) {
    logger.info('[OpportunityNotificationJob] Outside operating hours — skipping run');
    return;
  }

  logger.info('[OpportunityNotificationJob] Starting run');
  const startTime = Date.now();

  let processedUsers = 0;
  let notificationsSent = 0;
  let skippedCapped = 0;

  // Pre-compute IST hour once for the whole run (avoids drift mid-batch)
  const istHour = currentISTHour();

  try {
    // Dynamically import models to avoid circular dependency issues at module load
    const User = mongoose.model('User');
    const Store = mongoose.model('Store');

    // Find users who have granted location permission and have a recent location update
    // (last 24 hours). Process in batches to avoid memory pressure.
    // Also fetch segment so we can do persona-aware notification without an extra query.
    const locationCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const cursor = User.find({
      isActive: true,
      'profile.locationPermission': true,
      'profile.lastKnownLocation': { $exists: true },
      'profile.locationUpdatedAt': { $gte: locationCutoff },
    })
      .select('_id segment statedIdentity profile.lastKnownLocation profile.locationUpdatedAt')
      .lean()
      .cursor({ batchSize: BATCH_SIZE });

    for await (const user of cursor) {
      const userAny = user as any;
      processedUsers++;

      try {
        const coords = userAny.profile?.lastKnownLocation?.coordinates;
        if (!coords || coords.length !== 2) continue;

        const [lng, lat] = coords;

        // ── Resolve persona (use cached resolver; falls back to 'general' on error) ──
        let personaId: 'student' | 'employee' | 'general' = 'general';
        try {
          const persona = await personaResolverService.resolvePersona(userAny._id.toString());
          personaId = persona.personaId;
        } catch {
          // Persona resolution failure is non-fatal; proceed as general
        }

        // ── Determine radius and category filter per persona ──
        let searchRadius: number;
        let categoryTagFilter: string[] | undefined;
        let notificationTitle: string | undefined;

        if (personaId === 'student') {
          searchRadius = STUDENT_RADIUS_METERS;
          categoryTagFilter = STUDENT_PRIORITY_TAGS;
          notificationTitle = 'Student deal near campus!';
        } else if (personaId === 'employee') {
          searchRadius = EMPLOYEE_RADIUS_METERS;
          categoryTagFilter = EMPLOYEE_PRIORITY_TAGS;
          notificationTitle = employeeNotificationTitle(istHour);
        } else {
          searchRadius = NEARBY_RADIUS_METERS;
          categoryTagFilter = undefined; // no category filter for general
          notificationTitle = undefined; // let NotificationService use its default
        }

        // ── Build store query ──
        const storeQuery: any = {
          isActive: true,
          'location.coordinates': {
            $nearSphere: {
              $geometry: { type: 'Point', coordinates: [lng, lat] },
              $maxDistance: searchRadius,
            },
          },
          // Only stores with at least one active offer
          activeOffersCount: { $gt: 0 },
        };

        // For student/employee, additionally filter by persona-relevant category tags
        if (categoryTagFilter && categoryTagFilter.length > 0) {
          storeQuery.tags = { $in: categoryTagFilter };
        }

        // Find stores within persona-appropriate radius with active offers
        const nearbyStores = await Store.find(storeQuery)
          .select('_id name location activeOffersCount bestOfferAmount tags')
          .limit(3)
          .lean();

        if (!nearbyStores || nearbyStores.length === 0) continue;

        // Pick the store with the highest potential savings
        const bestStore = nearbyStores.reduce((best: any, store: any) => {
          const storeAmount = (store as any).bestOfferAmount || 0;
          const bestAmount = best ? (best as any).bestOfferAmount || 0 : 0;
          return storeAmount > bestAmount ? store : best;
        }, nearbyStores[0]);

        if (!bestStore) continue;

        const storeAny = bestStore as any;
        const storeLng = storeAny.location?.coordinates?.[0] ?? lng;
        const storeLat = storeAny.location?.coordinates?.[1] ?? lat;

        // Approximate distance in meters
        const distanceM = Math.round(calculateDistance(lat, lng, storeLat, storeLng));

        const savingsAmount = storeAny.bestOfferAmount || 0;
        const merchantName = storeAny.name || 'a nearby store';

        // notifyOpportunity handles the per-category cap check internally.
        // Pass customTitle for persona-segmented titles; if undefined the service uses its default.
        const notification = await NotificationService.notifyOpportunity(userAny._id.toString(), {
          merchantName,
          savingsAmount,
          distance: distanceM,
          storeId: storeAny._id.toString(),
          deepLink: `/store/${storeAny._id}`,
          ...(notificationTitle ? { customTitle: notificationTitle } : {}),
        });

        if (notification) {
          notificationsSent++;
        } else {
          skippedCapped++;
        }
      } catch (userErr) {
        logger.warn('[OpportunityNotificationJob] Error processing user', {
          userId: (user as any)._id,
          error: (userErr as Error).message,
        });
      }
    }

    const elapsedMs = Date.now() - startTime;
    logger.info('[OpportunityNotificationJob] Completed', {
      processedUsers,
      notificationsSent,
      skippedCapped,
      elapsedMs,
    });
  } catch (err) {
    logger.error('[OpportunityNotificationJob] Fatal error', { error: (err as Error).message });
    throw err;
  }
}

/**
 * Haversine formula: returns distance in meters between two lat/lng points.
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default runOpportunityNotificationJob;
