/**
 * Migration 003 — DM-H3: merchantwallet field normalization
 *
 * The rez-merchant-service proxy was writing merchant wallet documents
 * with `merchantId` (plain string) and `storeId` (plain string) instead
 * of the schema-defined `merchant` (ObjectId) and `store` (ObjectId).
 *
 * This creates a split: wallet-service queries by `merchant` ObjectId,
 * merchant-service queries by `merchantId` string — they are different
 * fields, so each service only sees its own documents.
 *
 * This script:
 *   1. Finds all merchantwallets with `merchantId` but no `merchant` field
 *   2. Converts `merchantId` string → ObjectId, writes as `merchant`, unsets `merchantId`
 *   3. Finds all merchantwallets with `storeId` but no `store` field
 *   4. Converts `storeId` string → ObjectId, writes as `store`, unsets `storeId`
 *
 * Safety notes:
 *   - Only processes docs that have the OLD field AND are missing the NEW field
 *   - Skips any `merchantId`/`storeId` that is not a valid 24-char hex ObjectId
 *   - Idempotent: on re-run, no docs will match the filter
 *
 * CAUTION (extra care needed on production):
 *   - If a wallet has BOTH `merchantId` AND `merchant`, we skip it to avoid
 *     overwriting a valid ObjectId with a potentially different string ID.
 *     Review those manually.
 *
 * Usage:
 *   MONGO_URI=... npx ts-node src/scripts/migrations/003-merchantwallet-merchantid-to-merchant.ts
 */

import { MongoClient, ObjectId, BulkOperationBase } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('[003] ERROR: MONGO_URI or MONGODB_URI environment variable is not set');
  process.exit(1);
}

const COLLECTION = 'merchantwallets';
const BATCH_SIZE = 200;

function isValidObjectId(id: unknown): boolean {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
}

async function run(): Promise<void> {
  const client = new MongoClient(MONGO_URI as string);

  try {
    console.log('[003] Connecting to MongoDB...');
    await client.connect();
    const db = client.db();

    const collections = new Set((await db.listCollections({ name: COLLECTION }).toArray()).map((c) => c.name));

    if (!collections.has(COLLECTION)) {
      console.log(`[003] Collection \`${COLLECTION}\` does not exist — nothing to migrate`);
      return;
    }

    const col = db.collection(COLLECTION);

    // -------------------------------------------------------------------------
    // Phase 1: merchantId (string) → merchant (ObjectId)
    // -------------------------------------------------------------------------
    console.log('\n[003] Phase 1: merchantId → merchant');

    const merchantIdCount = await col.countDocuments({
      merchantId: { $exists: true },
      merchant: { $exists: false },
    });
    console.log(`  Docs with merchantId but no merchant: ${merchantIdCount}`);

    // Also report docs that have BOTH (skip these — manual review)
    const bothMerchantFields = await col.countDocuments({
      merchantId: { $exists: true },
      merchant: { $exists: true },
    });
    if (bothMerchantFields > 0) {
      console.warn(
        `  WARNING: ${bothMerchantFields} docs have BOTH merchantId AND merchant — these are SKIPPED. Manual review recommended.`,
      );
    }

    let merchantMigrated = 0;
    let merchantSkippedInvalidId = 0;

    if (merchantIdCount > 0) {
      const cursor = col.find(
        { merchantId: { $exists: true }, merchant: { $exists: false } },
        { projection: { _id: 1, merchantId: 1 } },
      );

      const bulk = col.initializeUnorderedBulkOp();
      let bulkSize = 0;

      const flushBulk = async (b: ReturnType<typeof col.initializeUnorderedBulkOp>) => {
        if (bulkSize === 0) return;
        const result = await b.execute();
        merchantMigrated += result.modifiedCount;
        bulkSize = 0;
      };

      for await (const doc of cursor) {
        const rawId = doc.merchantId;
        if (!isValidObjectId(rawId)) {
          console.warn(`  [skip] _id=${doc._id} — merchantId '${rawId}' is not a valid ObjectId`);
          merchantSkippedInvalidId++;
          continue;
        }

        bulk.find({ _id: doc._id }).updateOne({
          $set: { merchant: new ObjectId(rawId) },
          $unset: { merchantId: '' },
        });
        bulkSize++;

        if (bulkSize >= BATCH_SIZE) {
          await flushBulk(bulk);
        }
      }
      await flushBulk(bulk);
    }

    console.log(`  Migrated: ${merchantMigrated}`);
    console.log(`  Skipped (invalid ObjectId): ${merchantSkippedInvalidId}`);

    // -------------------------------------------------------------------------
    // Phase 2: storeId (string) → store (ObjectId)
    // -------------------------------------------------------------------------
    console.log('\n[003] Phase 2: storeId → store');

    const storeIdCount = await col.countDocuments({
      storeId: { $exists: true },
      store: { $exists: false },
    });
    console.log(`  Docs with storeId but no store: ${storeIdCount}`);

    const bothStoreFields = await col.countDocuments({
      storeId: { $exists: true },
      store: { $exists: true },
    });
    if (bothStoreFields > 0) {
      console.warn(`  WARNING: ${bothStoreFields} docs have BOTH storeId AND store — these are SKIPPED.`);
    }

    let storeMigrated = 0;
    let storeSkippedInvalidId = 0;

    if (storeIdCount > 0) {
      const cursor = col.find(
        { storeId: { $exists: true }, store: { $exists: false } },
        { projection: { _id: 1, storeId: 1 } },
      );

      const bulk = col.initializeUnorderedBulkOp();
      let bulkSize = 0;

      const flushBulk = async (b: ReturnType<typeof col.initializeUnorderedBulkOp>) => {
        if (bulkSize === 0) return;
        const result = await b.execute();
        storeMigrated += result.modifiedCount;
        bulkSize = 0;
      };

      for await (const doc of cursor) {
        const rawId = doc.storeId;
        if (!isValidObjectId(rawId)) {
          console.warn(`  [skip] _id=${doc._id} — storeId '${rawId}' is not a valid ObjectId`);
          storeSkippedInvalidId++;
          continue;
        }

        bulk.find({ _id: doc._id }).updateOne({
          $set: { store: new ObjectId(rawId) },
          $unset: { storeId: '' },
        });
        bulkSize++;

        if (bulkSize >= BATCH_SIZE) {
          await flushBulk(bulk);
        }
      }
      await flushBulk(bulk);
    }

    console.log(`  Migrated: ${storeMigrated}`);
    console.log(`  Skipped (invalid ObjectId): ${storeSkippedInvalidId}`);

    // -------------------------------------------------------------------------
    // Final verification
    // -------------------------------------------------------------------------
    const remainingMerchantId = await col.countDocuments({
      merchantId: { $exists: true },
      merchant: { $exists: false },
    });
    const remainingStoreId = await col.countDocuments({
      storeId: { $exists: true },
      store: { $exists: false },
    });

    console.log(`\n[003] Migration complete:`);
    console.log(`  merchant phase — migrated: ${merchantMigrated}, skipped: ${merchantSkippedInvalidId}`);
    console.log(`  store phase    — migrated: ${storeMigrated}, skipped: ${storeSkippedInvalidId}`);
    console.log(`  Remaining docs still needing migration:`);
    console.log(`    merchantId without merchant: ${remainingMerchantId} (should be 0)`);
    console.log(`    storeId without store:       ${remainingStoreId} (should be 0)`);

    const totalSkipped = merchantSkippedInvalidId + storeSkippedInvalidId;
    if (totalSkipped > 0) {
      console.warn(`\n[003] WARNING: ${totalSkipped} docs skipped due to invalid ObjectId strings.`);
      console.warn('  These docs cannot be automatically migrated. Review and fix manually.');
    }
  } finally {
    await client.close();
    console.log('[003] Disconnected');
  }
}

run().catch((err) => {
  console.error('[003] FATAL:', err.message || err);
  process.exit(1);
});
