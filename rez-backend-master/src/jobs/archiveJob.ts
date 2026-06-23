import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { Activity } from '../models/Activity';
import { ArchivedActivity } from '../models/ArchivedActivity';
import { LedgerEntry } from '../models/LedgerEntry';
import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('archive-job');
const gzip = promisify(zlib.gzip);

const LOCK_KEY = 'job:archive-old-records';
const LOCK_TTL = 1200; // 20 minutes
const ACTIVITY_RETENTION_DAYS = 90;
const LEDGER_ARCHIVE_DELAY_DAYS = 60; // Only archive months that ended >60 days ago
const BATCH_SIZE = 500;
const ARCHIVE_DIR = path.resolve(process.cwd(), 'archives');
const LEDGER_ARCHIVE_DIR = path.join(ARCHIVE_DIR, 'ledger');
const REDIS_ARCHIVED_MONTHS_KEY = 'ledger:archived:months';

/**
 * Archive old records:
 * 1. Move Activity records >90 days to ArchivedActivity
 * 2. Export old LedgerEntry months to gzipped JSON files (DO NOT delete originals)
 */
async function runArchiveJob(): Promise<void> {
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.info('Archive job skipped — lock held by another instance');
      return;
    }

    logger.info('Starting archive job...');

    // Step 1: Archive old Activity records
    const activityResult = await archiveOldActivities();
    logger.info('Activity archive complete', activityResult);

    // Step 2: Export old LedgerEntry months
    const ledgerResult = await exportOldLedgerMonths();
    logger.info('Ledger export complete', ledgerResult);

    logger.info('Archive job finished', { ...activityResult, ...ledgerResult });
  } catch (error) {
    logger.error('Archive job failed', error as Error);
  } finally {
    if (lockToken) {
      await redisService.releaseLock(LOCK_KEY, lockToken);
    }
  }
}

/**
 * Move Activity records older than retention period to ArchivedActivity.
 */
async function archiveOldActivities(): Promise<{ activitiesArchived: number; batches: number }> {
  const cutoffDate = new Date(Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  let totalArchived = 0;
  let batches = 0;

  while (true) {
    const oldActivities = await Activity.find({ createdAt: { $lt: cutoffDate } })
      .limit(BATCH_SIZE)
      .lean();

    if (oldActivities.length === 0) break;

    // Insert into archive collection
    const archiveData = oldActivities.map((a: any) => ({
      originalId: a._id,
      user: a.user,
      type: a.type,
      title: a.title,
      description: a.description,
      amount: a.amount,
      icon: a.icon,
      color: a.color,
      relatedEntity: a.relatedEntity,
      metadata: a.metadata,
      archivedAt: new Date(),
      createdAt: a.createdAt,
    }));

    try {
      await ArchivedActivity.insertMany(archiveData, { ordered: false });
    } catch (err: any) {
      // E11000 duplicates are fine (idempotent re-run)
      if (err.code !== 11000 && !err.writeErrors) {
        throw err;
      }
    }

    // Delete originals
    const ids = oldActivities.map((a: any) => a._id);
    await Activity.deleteMany({ _id: { $in: ids } });

    totalArchived += oldActivities.length;
    batches++;

    // Safety: don't run forever
    if (batches >= 20) {
      logger.warn('Activity archive hit batch limit (20), will continue next run');
      break;
    }
  }

  return { activitiesArchived: totalArchived, batches };
}

/**
 * Export old LedgerEntry months to gzipped JSON files.
 * Financial records are NOT deleted — only exported for cold storage.
 */
async function exportOldLedgerMonths(): Promise<{ monthsExported: number; entriesExported: number }> {
  // Ensure archive directory exists
  if (!fs.existsSync(LEDGER_ARCHIVE_DIR)) {
    fs.mkdirSync(LEDGER_ARCHIVE_DIR, { recursive: true });
  }

  // Determine which months are eligible (fully past, >60 days old)
  const cutoff = new Date(Date.now() - LEDGER_ARCHIVE_DELAY_DAYS * 24 * 60 * 60 * 1000);
  const cutoffYM = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;

  // Get all distinct yearMonth values that are eligible
  const distinctMonths = await LedgerEntry.distinct('yearMonth', {
    yearMonth: { $exists: true, $ne: null, $lt: cutoffYM },
  });

  if (distinctMonths.length === 0) {
    return { monthsExported: 0, entriesExported: 0 };
  }

  // Check which months are already archived
  let alreadyArchived: string[] = [];
  try {
    const cached = await redisService.get<string[]>(REDIS_ARCHIVED_MONTHS_KEY);
    if (cached && Array.isArray(cached)) alreadyArchived = cached;
  } catch { /* ignore */ }

  const toExport = distinctMonths.filter((m: string) => !alreadyArchived.includes(m));
  if (toExport.length === 0) {
    return { monthsExported: 0, entriesExported: 0 };
  }

  let monthsExported = 0;
  let entriesExported = 0;

  for (const ym of toExport) {
    try {
      const entries = await LedgerEntry.find({ yearMonth: ym })
        .sort({ createdAt: 1 })
        .lean();

      if (entries.length === 0) continue;

      // Write gzipped JSON lines
      const lines = entries.map(e => JSON.stringify(e)).join('\n');
      const compressed = await gzip(Buffer.from(lines, 'utf-8'));
      const filePath = path.join(LEDGER_ARCHIVE_DIR, `${ym}.json.gz`);
      fs.writeFileSync(filePath, compressed);

      // Mark as archived
      alreadyArchived.push(ym);
      monthsExported++;
      entriesExported += entries.length;

      logger.info(`Exported ledger month ${ym}`, { entries: entries.length, file: filePath });
    } catch (err) {
      logger.error(`Failed to export ledger month ${ym}`, err as Error);
    }
  }

  // Persist archived months list
  try {
    await redisService.set(REDIS_ARCHIVED_MONTHS_KEY, alreadyArchived);
  } catch { /* non-critical */ }

  return { monthsExported, entriesExported };
}

/**
 * Initialize cron schedule — runs daily at 3:00 AM.
 */
export function initializeArchiveJob(): void {
  cron.schedule('0 3 * * *', () => {
    runArchiveJob().catch(err => {
      logger.error('Unhandled error in archive job', err as Error);
    });
  });
}

export { runArchiveJob };
export default initializeArchiveJob;
