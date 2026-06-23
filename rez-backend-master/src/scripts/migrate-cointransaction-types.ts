/**
 * migrate-cointransaction-types.ts
 *
 * One-time migration: normalises the `type` field on the shared `cointransactions`
 * collection so that documents written by rez-wallet-service (which used 'credit'
 * and 'debit') match the canonical enum used by rez-backend:
 *   'credit' → 'earned'
 *   'debit'  → 'spent'
 *
 * Safe to run multiple times — documents that already carry the canonical value
 * are untouched.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-cointransaction-types.ts
 *
 * Dry-run (no writes):
 *   DRY_RUN=true npx ts-node -r tsconfig-paths/register src/scripts/migrate-cointransaction-types.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectScriptDb, disconnectDb } from './connectDb';
import { logger } from '../config/logger';

dotenv.config();

async function migrate(): Promise<void> {
  const isDryRun = process.env.DRY_RUN === 'true';

  if (isDryRun) {
    logger.info('DRY RUN — no documents will be written.');
  }

  logger.info('Starting CoinTransaction type migration...');
  logger.info('Connecting to MongoDB...');

  await connectScriptDb();
  const collection = mongoose.connection.db!.collection('cointransactions');

  // Count matching documents first so we can show an accurate preview
  const creditCount = await collection.countDocuments({ type: 'credit' });
  const debitCount = await collection.countDocuments({ type: 'debit' });

  logger.info(`Found ${creditCount} document(s) with type='credit' to rename → 'earned'`);
  logger.info(`Found ${debitCount} document(s) with type='debit'   to rename → 'spent'`);

  if (creditCount === 0 && debitCount === 0) {
    logger.info('Nothing to migrate — all documents already use canonical type values.');
    await disconnectDb();
    return;
  }

  if (isDryRun) {
    logger.info('DRY RUN complete — no writes performed.');
    await disconnectDb();
    return;
  }

  // Step 1: credit → earned
  const creditResult = await collection.updateMany({ type: 'credit' }, { $set: { type: 'earned' } });

  // Step 2: debit → spent
  const debitResult = await collection.updateMany({ type: 'debit' }, { $set: { type: 'spent' } });

  logger.info('Migration complete.');
  logger.info('Summary:');
  logger.info(`  'credit' → 'earned' : ${creditResult.modifiedCount} document(s) updated`);
  logger.info(`  'debit'  → 'spent'  : ${debitResult.modifiedCount} document(s) updated`);

  await disconnectDb();
  process.exit(0);
}

migrate().catch((error) => {
  logger.error('Migration failed:', error);
  process.exit(1);
});
