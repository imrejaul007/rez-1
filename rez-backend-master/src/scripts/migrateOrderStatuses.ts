/**
 * migrateOrderStatuses.ts — M2
 *
 * One-time migration: normalises the Order.status field to the canonical
 * enum defined in src/models/Order.ts.
 *
 * Mappings applied:
 *   pending   → placed
 *   completed → delivered
 *   done      → delivered
 *   rejected  → cancelled
 *
 * Safe to re-run: documents already on canonical values are untouched.
 * Supports DRY_RUN=true for preview without writes.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrateOrderStatuses.ts
 *
 * Dry-run (no writes):
 *   DRY_RUN=true npx ts-node -r tsconfig-paths/register src/scripts/migrateOrderStatuses.ts
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectScriptDb, disconnectDb } from './connectDb';
import { logger } from '../config/logger';

dotenv.config();

interface MigrationMapping {
  from: string;
  to: string;
}

const STATUS_MAPPINGS: MigrationMapping[] = [
  { from: 'pending', to: 'placed' },
  { from: 'completed', to: 'delivered' },
  { from: 'done', to: 'delivered' },
  { from: 'rejected', to: 'cancelled' },
];

interface MigrationResult {
  mapping: string;
  matchedCount: number;
  modifiedCount: number;
}

async function migrate(): Promise<void> {
  const isDryRun = process.env.DRY_RUN === 'true';

  if (isDryRun) {
    logger.info('[migrateOrderStatuses] DRY RUN — no writes will be performed.');
  }

  logger.info('[migrateOrderStatuses] Starting Order status migration...');
  await connectScriptDb();

  // Use the raw collection so we bypass Mongoose schema validation (documents
  // with legacy status values would fail schema validation on .save()).
  const collection = mongoose.connection.db!.collection('orders');

  const results: MigrationResult[] = [];
  let totalMatched = 0;
  let totalModified = 0;

  for (const { from, to } of STATUS_MAPPINGS) {
    const matchedCount = await collection.countDocuments({ status: from });

    logger.info(`[migrateOrderStatuses] '${from}' → '${to}': ${matchedCount} document(s) found`);

    let modifiedCount = 0;

    if (matchedCount > 0 && !isDryRun) {
      const updateResult = await collection.updateMany(
        { status: from },
        { $set: { status: to, updatedAt: new Date() } },
      );
      modifiedCount = updateResult.modifiedCount;
      logger.info(`[migrateOrderStatuses] '${from}' → '${to}': ${modifiedCount} document(s) updated`);
    }

    results.push({ mapping: `${from} → ${to}`, matchedCount, modifiedCount });
    totalMatched += matchedCount;
    totalModified += modifiedCount;
  }

  logger.info('[migrateOrderStatuses] Migration summary:');
  for (const r of results) {
    logger.info(`  ${r.mapping}: matched=${r.matchedCount}, modified=${r.modifiedCount}`);
  }
  logger.info(`[migrateOrderStatuses] Total: matched=${totalMatched}, modified=${totalModified}`);

  if (isDryRun) {
    logger.info('[migrateOrderStatuses] DRY RUN complete — no writes performed.');
  } else {
    logger.info('[migrateOrderStatuses] Migration complete.');
  }

  await disconnectDb();
}

migrate().catch((err) => {
  logger.error('[migrateOrderStatuses] Fatal error:', err);
  process.exit(1);
});
