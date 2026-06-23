/**
 * Migration 004 — DM-M1: Standardize `read` → `isRead` in MerchantNotification
 *
 * The MerchantNotification model has both `read: Boolean` and `isRead: Boolean`
 * with separate indexes. No code keeps them in sync, so read-state diverges
 * between services using different fields.
 *
 * This script:
 *   1. For docs where `read === true` but `isRead` is false or missing:
 *      set `isRead = true` (promote the true value)
 *   2. Unset the `read` field from ALL documents (regardless of value)
 *
 * After this migration: only `isRead` exists. The `read` field and its
 * separate index can be dropped from the schema/model.
 *
 * Idempotent: step 1 only sets isRead=true where needed; on re-run no
 * docs will have `read=true, isRead=false`. Step 2 unsets `read`; on
 * re-run, `read` no longer exists so $unset is a no-op.
 *
 * Usage:
 *   MONGO_URI=... npx ts-node src/scripts/migrations/004-notification-read-to-isread.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('[004] ERROR: MONGO_URI or MONGODB_URI environment variable is not set');
  process.exit(1);
}

const COLLECTION = 'merchantnotifications';

async function run(): Promise<void> {
  const client = new MongoClient(MONGO_URI as string);

  try {
    console.log('[004] Connecting to MongoDB...');
    await client.connect();
    const db = client.db();

    const exists = (await db.listCollections({ name: COLLECTION }).toArray()).length > 0;
    if (!exists) {
      console.log(`[004] Collection \`${COLLECTION}\` does not exist — nothing to migrate`);
      return;
    }

    const col = db.collection(COLLECTION);

    // Baseline counts
    const totalDocs = await col.countDocuments();
    const docsWithReadField = await col.countDocuments({ read: { $exists: true } });
    const conflictingDocs = await col.countDocuments({
      read: true,
      $or: [{ isRead: false }, { isRead: { $exists: false } }],
    });

    console.log(`[004] Total notifications:            ${totalDocs}`);
    console.log(`[004] Docs with legacy 'read' field:  ${docsWithReadField}`);
    console.log(`[004] Conflicting (read=true, isRead falsy): ${conflictingDocs}`);

    // -------------------------------------------------------------------------
    // Step 1: Promote read=true → isRead=true (for docs where they disagree)
    // -------------------------------------------------------------------------
    console.log('\n[004] Step 1: Promoting read=true to isRead=true where needed...');

    const step1Result = await col.updateMany(
      {
        read: true,
        $or: [{ isRead: false }, { isRead: { $exists: false } }],
      },
      { $set: { isRead: true } },
    );

    console.log(`  Docs updated (isRead promoted): ${step1Result.modifiedCount}`);

    // -------------------------------------------------------------------------
    // Step 2: Remove the legacy `read` field from all documents
    // -------------------------------------------------------------------------
    console.log('\n[004] Step 2: Removing legacy `read` field from all documents...');

    const step2Result = await col.updateMany({ read: { $exists: true } }, { $unset: { read: '' } });

    console.log(`  Docs updated (read field removed): ${step2Result.modifiedCount}`);

    // -------------------------------------------------------------------------
    // Verification
    // -------------------------------------------------------------------------
    const remainingWithRead = await col.countDocuments({ read: { $exists: true } });
    const totalIsReadTrue = await col.countDocuments({ isRead: true });
    const totalIsReadFalse = await col.countDocuments({ isRead: false });

    console.log(`\n[004] Migration complete:`);
    console.log(`  Docs still with 'read' field:    ${remainingWithRead} (should be 0)`);
    console.log(`  Notifications with isRead=true:  ${totalIsReadTrue}`);
    console.log(`  Notifications with isRead=false: ${totalIsReadFalse}`);

    if (remainingWithRead > 0) {
      console.warn('[004] WARNING: Some docs still have the `read` field. Manual review needed.');
    }

    console.log('\n[004] Post-migration action required:');
    console.log('  Remove `read: Boolean` and its index from MerchantNotification schema');
    console.log('  File: rez-wallet-service/src/models/MerchantNotification.ts');
  } finally {
    await client.close();
    console.log('[004] Disconnected');
  }
}

run().catch((err) => {
  console.error('[004] FATAL:', err.message || err);
  process.exit(1);
});
