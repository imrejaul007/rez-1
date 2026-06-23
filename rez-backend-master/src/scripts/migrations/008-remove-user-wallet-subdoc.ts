/**
 * Migration 008 — DM-L4: Remove User.wallet embedded sub-document
 *
 * The User schema previously carried a denormalized wallet cache:
 *   wallet.{ balance, totalEarned, totalSpent, pendingAmount, availableBalance, brandedTotal }
 *
 * These fields were populated by Wallet.syncWithUser() after every wallet mutation,
 * but the rest of the app reads wallet data from the separate Wallet collection directly.
 * The sub-doc was a stale cache with divergence risk and no reconciliation guarantee.
 *
 * This migration removes the embedded wallet sub-doc from every user document.
 * The Wallet collection (queried via WalletService or GET /wallet/balance) is the
 * sole source of truth for wallet balances going forward.
 *
 * Idempotent: $unset on absent fields is a no-op in MongoDB.
 *
 * Usage:
 *   MONGO_URI=... npx ts-node src/scripts/migrations/008-remove-user-wallet-subdoc.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('[008] ERROR: MONGO_URI or MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function run(): Promise<void> {
  console.log('[008] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI as string);

  const db = mongoose.connection.db!;
  const col = db.collection('users');

  // Report how many documents have the sub-doc before removal
  const withWallet = await col.countDocuments({ wallet: { $exists: true } });
  const withNonZeroBalance = await col.countDocuments({
    'wallet.balance': { $exists: true, $gt: 0 },
  });

  console.log(`[008] Users with embedded wallet sub-doc:     ${withWallet}`);
  console.log(`[008] Users with wallet.balance > 0:          ${withNonZeroBalance}`);

  if (withNonZeroBalance > 0) {
    console.warn('[008] WARNING: Some users had non-zero embedded wallet.balance.');
    console.warn('[008] These values were denormalized caches from Wallet.syncWithUser().');
    console.warn('[008] The real balances remain intact in the Wallet collection.');
  }

  console.log('[008] Removing embedded wallet sub-docs from users collection...');

  const result = await col.updateMany({ wallet: { $exists: true } }, { $unset: { wallet: '' } });

  console.log(`[008] Matched:  ${result.matchedCount} user documents`);
  console.log(`[008] Modified: ${result.modifiedCount} user documents`);
  console.log('[008] Migration complete. User.wallet sub-doc removed (DM-L4).');

  await mongoose.disconnect();
  console.log('[008] Disconnected');
}

run().catch((err) => {
  console.error('[008] FATAL:', err.message || err);
  process.exit(1);
});
