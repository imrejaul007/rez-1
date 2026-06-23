/**
 * Migration 002 — DM-C4: coinType 'nuqta' → 'rez'
 *
 * Production documents have coinType: 'nuqta' (legacy brand name).
 * The active enum no longer includes 'nuqta', so any .save() on these
 * documents throws a Mongoose validation error.
 *
 * Collections updated:
 *   - cointransactions   — simple field rename
 *   - coinledgers        — simple field rename
 *   - wallets            — array element rename via arrayFilters
 *   - userloyalties      — check for nuqta references
 *
 * NOTE: The existing `migrate-coin-type-nuqta.ts` script covers
 * cointransactions, coingifts, and walletbalances. This migration
 * targets the broader set of collections including coinledgers and
 * userloyalties, which the original script did not cover.
 *
 * Idempotent: updateMany with { coinType: 'nuqta' } will match 0 docs
 * on subsequent runs once migration is complete.
 *
 * Usage:
 *   MONGO_URI=... npx ts-node src/scripts/migrations/002-nuqta-to-rez-cointype.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('[002] ERROR: MONGO_URI or MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function run(): Promise<void> {
  const client = new MongoClient(MONGO_URI as string);

  try {
    console.log('[002] Connecting to MongoDB...');
    await client.connect();
    const db = client.db();

    const existingCollections = new Set((await db.listCollections().toArray()).map((c) => c.name));
    console.log(`[002] ${existingCollections.size} collections found in database`);

    let totalModified = 0;

    // Helper: safe updateMany — skips if collection doesn't exist
    const safeUpdateMany = async (
      colName: string,
      filter: object,
      update: object,
      options?: object,
    ): Promise<number> => {
      if (!existingCollections.has(colName)) {
        console.log(`  [skip] ${colName} — collection does not exist`);
        return 0;
      }
      const result = await db.collection(colName).updateMany(filter, update, options);
      return result.modifiedCount;
    };

    // Helper: count docs matching filter (for dry-run reporting)
    const safeCount = async (colName: string, filter: object): Promise<number> => {
      if (!existingCollections.has(colName)) return 0;
      return db.collection(colName).countDocuments(filter);
    };

    // --- 1. cointransactions ---
    const pre1 = await safeCount('cointransactions', { coinType: 'nuqta' });
    const c1 = await safeUpdateMany('cointransactions', { coinType: 'nuqta' }, { $set: { coinType: 'rez' } });
    console.log(`[1/4] cointransactions: ${pre1} matched, ${c1} modified`);
    totalModified += c1;

    // --- 2. coinledgers ---
    const pre2 = await safeCount('coinledgers', { coinType: 'nuqta' });
    const c2 = await safeUpdateMany('coinledgers', { coinType: 'nuqta' }, { $set: { coinType: 'rez' } });
    console.log(`[2/4] coinledgers: ${pre2} matched, ${c2} modified`);
    totalModified += c2;

    // --- 3. wallets — coins is an array of { type, balance, ... } objects ---
    // Cannot use positional $ operator with updateMany for multiple elements.
    // Use arrayFilters instead.
    const pre3 = await safeCount('wallets', { 'coins.type': 'nuqta' });
    const c3 = await safeUpdateMany(
      'wallets',
      { 'coins.type': 'nuqta' },
      { $set: { 'coins.$[elem].type': 'rez' } },
      { arrayFilters: [{ 'elem.type': 'nuqta' }] },
    );
    console.log(`[3/4] wallets (coins array): ${pre3} docs matched, ${c3} modified`);
    totalModified += c3;

    // --- 4. userloyalties — check for any nuqta field references ---
    // Common patterns: coinType, type, coinEarned.coinType, etc.
    const loyaltyFilter = {
      $or: [{ coinType: 'nuqta' }, { 'history.coinType': 'nuqta' }, { 'transactions.coinType': 'nuqta' }],
    };
    const pre4 = await safeCount('userloyalties', loyaltyFilter);
    console.log(`[4/4] userloyalties: ${pre4} docs with nuqta references found`);

    if (pre4 > 0 && existingCollections.has('userloyalties')) {
      // Simple top-level coinType
      const c4a = await safeUpdateMany('userloyalties', { coinType: 'nuqta' }, { $set: { coinType: 'rez' } });
      // Nested history array coinType
      const c4b = await safeUpdateMany(
        'userloyalties',
        { 'history.coinType': 'nuqta' },
        { $set: { 'history.$[elem].coinType': 'rez' } },
        { arrayFilters: [{ 'elem.coinType': 'nuqta' }] },
      );
      // Nested transactions array coinType
      const c4c = await safeUpdateMany(
        'userloyalties',
        { 'transactions.coinType': 'nuqta' },
        { $set: { 'transactions.$[elem].coinType': 'rez' } },
        { arrayFilters: [{ 'elem.coinType': 'nuqta' }] },
      );
      const c4 = c4a + c4b + c4c;
      console.log(`       userloyalties: ${c4} total modifications`);
      totalModified += c4;
    }

    // Final report
    console.log(`\n[002] Migration complete:`);
    console.log(`  Total documents modified: ${totalModified}`);

    // Verification — confirm no 'nuqta' coinType values remain
    const remainingCounts = await Promise.all([
      safeCount('cointransactions', { coinType: 'nuqta' }),
      safeCount('coinledgers', { coinType: 'nuqta' }),
      safeCount('wallets', { 'coins.type': 'nuqta' }),
      safeCount('userloyalties', { coinType: 'nuqta' }),
    ]);

    const totalRemaining = remainingCounts.reduce((a, b) => a + b, 0);
    console.log(`  Documents still with coinType='nuqta': ${totalRemaining} (should be 0)`);

    if (totalRemaining > 0) {
      console.warn('[002] WARNING: nuqta coinType values still present — manual review needed');
    }
  } finally {
    await client.close();
    console.log('[002] Disconnected');
  }
}

run().catch((err) => {
  console.error('[002] FATAL:', err.message || err);
  process.exit(1);
});
