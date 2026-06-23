/**
 * Migration: coinType 'nuqta' → 'rez'
 *
 * Uses native MongoDB driver (no mongoose) to avoid triggering
 * automatic collection creation on Atlas M0/M2/M5 clusters.
 * Only operates on collections that already exist.
 *
 * Usage:
 *   MONGODB_URI=... npx ts-node src/scripts/migrate-coin-type-nuqta.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function run(): Promise<void> {
  const client = new MongoClient(MONGO_URI as string);
  console.log('[migrate-coin-type-nuqta] Connecting to MongoDB...');
  await client.connect();
  const db = client.db();

  // List existing collections so we never trigger auto-creation
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  console.log(`[migrate-coin-type-nuqta] ${existing.size} collections in DB`);

  let totalModified = 0;

  // Helper: safe updateMany — skips if collection doesn't exist
  const safeUpdate = async (col: string, filter: object, update: object): Promise<number> => {
    if (!existing.has(col)) {
      console.log(`  [skip] ${col} — collection does not exist`);
      return 0;
    }
    const result = await db.collection(col).updateMany(filter, update);
    return result.modifiedCount;
  };

  // 1. CoinTransaction — update coinType field
  const c1 = await safeUpdate('cointransactions', { coinType: 'nuqta' }, { $set: { coinType: 'rez' } });
  console.log(`[1/3] cointransactions.coinType: ${c1} updated`);
  totalModified += c1;

  // 2. CoinGift — update coinType field
  const c2 = await safeUpdate('coingifts', { coinType: 'nuqta' }, { $set: { coinType: 'rez' } });
  console.log(`[2/3] coingifts.coinType: ${c2} updated`);
  totalModified += c2;

  // 3. WalletBalance — rename 'nuqta' key to 'rez'
  const walletColName = existing.has('walletbalances') ? 'walletbalances' : null;
  if (!walletColName) {
    console.log('  [skip] walletbalances — collection does not exist');
  } else {
    const walletCursor = db.collection(walletColName).find({ nuqta: { $exists: true } });
    let walletCount = 0;
    for await (const doc of walletCursor) {
      if (doc.rez === undefined) {
        await db
          .collection(walletColName)
          .updateOne({ _id: doc._id }, { $set: { rez: doc.nuqta }, $unset: { nuqta: '' } });
      } else {
        await db
          .collection(walletColName)
          .updateOne({ _id: doc._id }, { $inc: { rez: doc.nuqta }, $unset: { nuqta: '' } });
      }
      walletCount++;
    }
    console.log(`[3/3] ${walletColName} nuqta→rez: ${walletCount} updated`);
    totalModified += walletCount;
  }

  console.log(`\n[migrate-coin-type-nuqta] Done. Total documents modified: ${totalModified}`);
  await client.close();
}

run().catch((err) => {
  console.error('[migrate-coin-type-nuqta] FATAL:', err.message || err);
  process.exit(1);
});
