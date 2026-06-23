/**
 * Migration: rename 'nuqta' → 'rez' across all coin-related collections
 * Run ONCE before removing 'nuqta' from Mongoose enum arrays.
 * Safe to run multiple times (idempotent).
 */
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function migrate() {
  if (!MONGO_URI) throw new Error('MONGODB_URI env var not set');

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;

  console.log('Starting nuqta→rez migration...');

  // 1. CoinTransactions: coinType field
  const ctResult = await db
    .collection('cointransactions')
    .updateMany({ coinType: 'nuqta' }, { $set: { coinType: 'rez' } });
  console.log(`CoinTransactions: updated ${ctResult.modifiedCount} docs`);

  // 2. Wallets: coins array elements
  const wResult = await db
    .collection('wallets')
    .updateMany(
      { 'coins.type': 'nuqta' },
      { $set: { 'coins.$[elem].type': 'rez' } },
      { arrayFilters: [{ 'elem.type': 'nuqta' }] },
    );
  console.log(`Wallets coins[].type: updated ${wResult.modifiedCount} docs`);

  // 3. LedgerEntries: coinType field
  const leResult = await db
    .collection('ledgerentries')
    .updateMany({ coinType: 'nuqta' }, { $set: { coinType: 'rez' } });
  console.log(`LedgerEntries: updated ${leResult.modifiedCount} docs`);

  // 4. Transfers: coinType field
  const trResult = await db.collection('transfers').updateMany({ coinType: 'nuqta' }, { $set: { coinType: 'rez' } });
  console.log(`Transfers: updated ${trResult.modifiedCount} docs`);

  // 5. CoinGifts: coinType field
  const cgResult = await db.collection('coingifts').updateMany({ coinType: 'nuqta' }, { $set: { coinType: 'rez' } });
  console.log(`CoinGifts: updated ${cgResult.modifiedCount} docs`);

  // 6. Users: rename nuqtaPlusTier → rezPlusTier
  const uResult = await db
    .collection('users')
    .updateMany({ nuqtaPlusTier: { $exists: true } }, { $rename: { nuqtaPlusTier: 'rezPlusTier' } });
  console.log(`Users nuqtaPlusTier→rezPlusTier: updated ${uResult.modifiedCount} docs`);

  console.log('Migration complete!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
