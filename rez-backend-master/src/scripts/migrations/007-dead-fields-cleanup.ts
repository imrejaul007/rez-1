/**
 * Migration 007 — DM-L1 through DM-L5: Dead schema field cleanup
 *
 * Removes never-used and stale fields from production documents.
 * Each step is logged and reported independently.
 *
 * Steps:
 *   1. users — unset profile.ringSize and profile.jewelryPreferences (DM-L1)
 *   2. orders — unset payment.coinsUsed.wasilCoins where null/0/missing (DM-L2)
 *   3. wallets — unset categoryBalances where empty or null (DM-L3)
 *   4. users — report on wallet sub-document presence (DM-L4, NOT removed here —
 *              requires consumer app audit before removal)
 *   5. merchantwallets.statistics.averageOrderValue — NOT touched here (DM-L5 —
 *              needs recalculation job, not removal)
 *
 * Idempotent:
 *   - $unset on already-absent fields is a no-op in MongoDB
 *   - Steps 1–3 match only docs where the target field exists
 *
 * CAUTION for step 4 (DM-L4 / User.wallet sub-doc):
 *   This script only REPORTS the count. Actual removal is deferred until
 *   a consumer app audit confirms no frontend reads wallet from the User doc.
 *
 * Usage:
 *   MONGO_URI=... npx ts-node src/scripts/migrations/007-dead-fields-cleanup.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('[007] ERROR: MONGO_URI or MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function run(): Promise<void> {
  const client = new MongoClient(MONGO_URI as string);

  try {
    console.log('[007] Connecting to MongoDB...');
    await client.connect();
    const db = client.db();

    const existingCollections = new Set((await db.listCollections().toArray()).map((c) => c.name));

    let totalModified = 0;

    // -------------------------------------------------------------------------
    // Step 1 — DM-L1: Remove dead jewelry fields from User.profile
    // Fields: profile.ringSize, profile.jewelryPreferences
    // These are never read or written by any controller/service/route.
    // -------------------------------------------------------------------------
    console.log('\n[007] Step 1 (DM-L1): Removing User.profile jewelry fields...');

    if (!existingCollections.has('users')) {
      console.log('  [skip] users — collection does not exist');
    } else {
      const col = db.collection('users');

      const withRingSize = await col.countDocuments({
        'profile.ringSize': { $exists: true },
      });
      const withJewelryPrefs = await col.countDocuments({
        'profile.jewelryPreferences': { $exists: true },
      });

      console.log(`  Users with profile.ringSize:            ${withRingSize}`);
      console.log(`  Users with profile.jewelryPreferences:  ${withJewelryPrefs}`);

      const result1 = await col.updateMany(
        {
          $or: [{ 'profile.ringSize': { $exists: true } }, { 'profile.jewelryPreferences': { $exists: true } }],
        },
        {
          $unset: {
            'profile.ringSize': '',
            'profile.jewelryPreferences': '',
          },
        },
      );

      console.log(`  Modified: ${result1.modifiedCount} user documents`);
      totalModified += result1.modifiedCount;
    }

    // -------------------------------------------------------------------------
    // Step 2 — DM-L2: Remove Order.payment.coinsUsed.wasilCoins (legacy field)
    // Only remove where value is null, 0, undefined, or field is missing
    // Do NOT remove if value is non-zero (indicates real data — needs review)
    // -------------------------------------------------------------------------
    console.log('\n[007] Step 2 (DM-L2): Removing Order.payment.coinsUsed.wasilCoins...');

    if (!existingCollections.has('orders')) {
      console.log('  [skip] orders — collection does not exist');
    } else {
      const col = db.collection('orders');

      // Check for any non-zero wasilCoins first (these need manual review)
      const nonZeroWasil = await col.countDocuments({
        'payment.coinsUsed.wasilCoins': { $exists: true, $ne: 0, $gt: 0 },
      });

      if (nonZeroWasil > 0) {
        console.warn(`  WARNING: ${nonZeroWasil} orders have non-zero wasilCoins. These are SKIPPED.`);
        console.warn('  Manual review required before removing these records.');
      }

      const toRemove = await col.countDocuments({
        'payment.coinsUsed.wasilCoins': { $exists: true },
        $or: [{ 'payment.coinsUsed.wasilCoins': null }, { 'payment.coinsUsed.wasilCoins': 0 }],
      });

      console.log(`  Orders with wasilCoins=null or 0: ${toRemove}`);

      const result2 = await col.updateMany(
        {
          'payment.coinsUsed.wasilCoins': { $exists: true },
          $or: [{ 'payment.coinsUsed.wasilCoins': null }, { 'payment.coinsUsed.wasilCoins': 0 }],
        },
        { $unset: { 'payment.coinsUsed.wasilCoins': '' } },
      );

      console.log(`  Modified: ${result2.modifiedCount} order documents`);
      totalModified += result2.modifiedCount;
    }

    // -------------------------------------------------------------------------
    // Step 3 — DM-L3: Remove Wallet.categoryBalances where empty
    // Only remove where the Map/object is empty, null, or undefined
    // -------------------------------------------------------------------------
    console.log('\n[007] Step 3 (DM-L3): Removing Wallet.categoryBalances where empty...');

    if (!existingCollections.has('wallets')) {
      console.log('  [skip] wallets — collection does not exist');
    } else {
      const col = db.collection('wallets');

      const withCatBalances = await col.countDocuments({
        categoryBalances: { $exists: true },
      });
      console.log(`  Wallets with categoryBalances field: ${withCatBalances}`);

      // Remove where empty object, empty array, or null
      const result3 = await col.updateMany(
        {
          $or: [{ categoryBalances: null }, { categoryBalances: {} }, { categoryBalances: [] }],
        },
        { $unset: { categoryBalances: '' } },
      );

      console.log(`  Modified (null/empty): ${result3.modifiedCount} wallet documents`);
      totalModified += result3.modifiedCount;

      // Report remaining (may have actual data — do not remove)
      const stillHas = await col.countDocuments({ categoryBalances: { $exists: true } });
      if (stillHas > 0) {
        console.warn(`  WARNING: ${stillHas} wallets still have non-empty categoryBalances.`);
        console.warn('  These are NOT removed — the field may have real data or be partially implemented.');
        console.warn('  Verify these are safe to remove before running a follow-up script.');
      }
    }

    // -------------------------------------------------------------------------
    // Step 4 — DM-L4: REPORT ONLY — User.wallet embedded sub-document
    // NOT removing — requires consumer app audit first
    // -------------------------------------------------------------------------
    console.log('\n[007] Step 4 (DM-L4): Auditing User.wallet sub-document (NO changes made)...');

    if (!existingCollections.has('users')) {
      console.log('  [skip] users — collection does not exist');
    } else {
      const col = db.collection('users');

      const usersWithEmbeddedWallet = await col.countDocuments({
        'wallet.balance': { $exists: true },
      });
      const usersWithNonZeroBalance = await col.countDocuments({
        'wallet.balance': { $exists: true, $ne: null, $gt: 0 },
      });

      console.log(`  Users with embedded wallet.balance field: ${usersWithEmbeddedWallet}`);
      console.log(`  Users with wallet.balance > 0:            ${usersWithNonZeroBalance}`);
      console.log('');
      console.log('  ACTION REQUIRED (manual, before running removal):');
      console.log('  1. Confirm no consumer app reads from User.wallet.balance');
      console.log('  2. If users with non-zero embedded balance exist, investigate if stale data');
      console.log('  3. Once confirmed safe, run:');
      console.log("     db.users.updateMany({}, { $unset: { wallet: '' } })");
      console.log('  Tracked as DM-L4 — deferred until Phase 2 consumer audit');
    }

    // -------------------------------------------------------------------------
    // Step 5 — DM-L5: NOTE — merchantwallets.averageOrderValue
    // NOT removed here — needs recalculation job, not cleanup
    // -------------------------------------------------------------------------
    console.log('\n[007] Step 5 (DM-L5): merchantwallets.statistics.averageOrderValue');
    console.log('  This field is NOT removed — it needs a recalculation job, not deletion.');
    console.log('  The correct fix is to update averageOrderValue in the wallet statistics job.');
    console.log('  File: rez-wallet-service/src/services/merchantWalletService.ts');
    console.log('  Tracked as DM-L5 — deferred to wallet statistics job improvements');

    // -------------------------------------------------------------------------
    // Final report
    // -------------------------------------------------------------------------
    console.log(`\n[007] Migration complete:`);
    console.log(`  Total documents modified across all steps: ${totalModified}`);
    console.log('  Steps 4 and 5 were report-only — no data changed for those');
  } finally {
    await client.close();
    console.log('[007] Disconnected');
  }
}

run().catch((err) => {
  console.error('[007] FATAL:', err.message || err);
  process.exit(1);
});
