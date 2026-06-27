import * as cron from 'node-cron';
import { logger } from '../config/logger';
import { Leaderboard } from '../models/Leaderboard';

let leaderboardJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

const CRON_SCHEDULE = '0 * * * *'; // Every hour
const TOP_USERS_LIMIT = 100;

// Top cities to process (reduce scope for performance)
const TOP_CITIES = [
  'bangalore',
  'mumbai',
  'delhi',
  'hyderabad',
  'pune',
  'chennai',
  'kolkata',
  'ahmedabad',
  'jaipur',
  'surat'
];

/**
 * Leaderboard Rank Update Job
 *
 * Runs every hour to:
 * 1. For top cities, recompute rank for top 100 users
 * 2. Lightweight: only update `rank` field, score is updated real-time
 */
export function startLeaderboardJob(): void {
  if (leaderboardJob) {
    logger.warn('[LeaderboardJob] Job already started');
    return;
  }

  leaderboardJob = cron.schedule(CRON_SCHEDULE, async () => {
    if (isRunning) {
      logger.warn('[LeaderboardJob] Previous run still in progress, skipping');
      return;
    }

    isRunning = true;

    try {
      logger.info('[LeaderboardJob] Starting leaderboard rank update job');

      // MP-D002 OPTIMIZATION: Parallelize city processing instead of sequential
      // Previously each city awaited updateCityLeaderboards() before starting the
      // next — 10 cities × ~3 seconds each = ~30 seconds total. Now all cities
      // process concurrently in a single round, bounded by the slowest city.
      const cityResults = await Promise.all(
        TOP_CITIES.map(async (city) => {
          try {
            const updated = await updateCityLeaderboards(city);
            return { city, updated, success: true };
          } catch (error) {
            logger.warn('[LeaderboardJob] Failed to update leaderboard for city', {
              city,
              error: (error as Error).message
            });
            return { city, updated: 0, success: false };
          }
        })
      );

      const totalUpdated = cityResults.reduce((sum, r) => sum + r.updated, 0);
      const successfulCities = cityResults.filter(r => r.success).length;

      logger.info('[LeaderboardJob] Leaderboard update completed', {
        totalUpdated,
        citiesProcessed: TOP_CITIES.length,
        successfulCities
      });
    } catch (error) {
      logger.error('[LeaderboardJob] Job failed', {
        error: (error as Error).message
      });
    } finally {
      isRunning = false;
    }
  });

  logger.info('[LeaderboardJob] Started with schedule:', CRON_SCHEDULE);
}

/**
 * Update leaderboards for a specific city
 */
async function updateCityLeaderboards(city: string): Promise<number> {
  const periods = ['weekly', 'monthly', 'alltime'];

  // MP-D002 OPTIMIZATION: Parallelize period processing within each city
  // Previously weekly/monthly/alltime ran sequentially — now all 3 periods
  // execute concurrently, further reducing total job time.
  const periodResults = await Promise.all(
    periods.map(async (period) => {
      try {
        // Get top 100 entries for this city/period
        const topEntries = await Leaderboard.find({
          city,
          period
        })
          .sort({ score: -1 })
          .limit(TOP_USERS_LIMIT)
          .lean();

        // MP-D002 FIX: Previously each rank change issued an individual await
        // topEntries[i].save() inside the loop — up to 100 sequential round-trips
        // to MongoDB per city/period combination, and 3 000 total (10 cities × 3
        // periods × 100 saves).  Each round-trip holds a DB connection slot open
        // while waiting; under concurrent analytics load this exhausts the Mongoose
        // connection pool, starving API request handlers of connections.
        //
        // The fix batches all rank changes for a city/period into a single
        // bulkWrite() call: one round-trip instead of up to 100, and zero
        // Mongoose document overhead because we use lean() above.
        const bulkOps: any[] = [];
        for (let i = 0; i < topEntries.length; i++) {
          if (topEntries[i].rank !== i + 1) {
            bulkOps.push({
              updateOne: {
                filter: { _id: topEntries[i]._id },
                update: { $set: { rank: i + 1 } },
              },
            });
          }
        }
        if (bulkOps.length > 0) {
          await Leaderboard.bulkWrite(bulkOps, { ordered: false });
        }
        return { period, updated: bulkOps.length, success: true };
      } catch (error) {
        logger.warn('[LeaderboardJob] Failed to update period leaderboard', {
          city,
          period,
          error: (error as Error).message
        });
        return { period, updated: 0, success: false };
      }
    })
  );

  return periodResults.reduce((sum, r) => sum + r.updated, 0);
}

export function stopLeaderboardJob(): void {
  if (leaderboardJob) {
    leaderboardJob.stop();
    leaderboardJob = null;
    logger.info('[LeaderboardJob] Stopped');
  }
}

export function isLeaderboardJobRunning(): boolean {
  return isRunning;
}
