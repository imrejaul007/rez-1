/**
 * MongoDB Index Sync Script
 *
 * Syncs all Mongoose schema-defined indexes to MongoDB.
 * Safe to run multiple times — creates missing indexes, no-ops on existing ones.
 *
 * Usage: npx ts-node scripts/syncIndexes.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function syncIndexes() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
  const dbName = process.env.DB_NAME || 'rez-app';

  console.log(`Connecting to MongoDB: ${dbName}...`);
  await mongoose.connect(uri, { dbName });
  console.log('Connected.\n');

  // Import all models to register their schemas + indexes
  const modelFiles = [
    '../src/models/User',
    '../src/models/Order',
    '../src/models/Product',
    '../src/models/Store',
    '../src/models/Category',
    '../src/models/CoinTransaction',
    '../src/models/Notification',
    '../src/models/Follow',
    '../src/models/Review',
    '../src/models/Activity',
    '../src/models/Video',
    '../src/models/Subscription',
    '../src/models/Address',
    '../src/models/Achievement',
    '../src/models/Cart',
    '../src/models/Wallet',
    '../src/models/Coupon',
    '../src/models/StorePayment',
    '../src/models/Favorite',
    '../src/models/Wishlist',
    '../src/models/Transfer',
    '../src/models/CoinGift',
    '../src/models/LedgerEntry',
    '../src/models/BonusCampaign',
    '../src/models/BonusClaim',
    '../src/models/ScratchCard',
    '../src/models/SpinWheel',
    '../src/models/GameSession',
    '../src/models/Offer',
    '../src/models/Voucher',
    '../src/models/PriveVoucher',
    '../src/models/SocialMediaPost',
    '../src/models/Event',
    '../src/models/Merchant',
    '../src/models/MerchantUser',
    '../src/models/Share',
    '../src/models/DailyCheckIn',
    '../src/models/Referral',
    '../src/models/Refund',
    '../src/models/PriceHistory',
    '../src/models/UserLoyalty',
    '../src/models/UserStreak',
    '../src/models/OTPLog',
    '../src/models/Transaction',
    '../src/models/Payment',
    '../src/models/Bill',
    '../src/models/SearchHistory',
  ];

  console.log('Importing models...');
  for (const file of modelFiles) {
    try {
      await import(file);
    } catch (e: any) {
      console.warn(`  Skip ${file}: ${e.message}`);
    }
  }

  const modelNames = Object.keys(mongoose.models);
  console.log(`\nFound ${modelNames.length} registered models. Syncing indexes...\n`);

  let created = 0;
  let failed = 0;

  for (const name of modelNames.sort()) {
    const Model = mongoose.models[name];
    try {
      await Model.syncIndexes();
      const indexes = await Model.collection.indexes();
      console.log(`  [OK] ${name.padEnd(30)} ${indexes.length} indexes`);
      created++;
    } catch (e: any) {
      console.error(`  [FAIL] ${name.padEnd(28)} ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${created} models synced, ${failed} failed.`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

syncIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
