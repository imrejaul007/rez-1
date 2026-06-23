/**
 * Migration script: Backfill partner earnings metadata on CoinTransactions
 *
 * This script tags existing CoinTransactions with metadata.partnerEarning = true
 * and metadata.partnerEarningType based on description patterns and existing metadata.
 *
 * Categories:
 * - 'milestone': Partner milestone rewards and level-up bonuses
 * - 'task': Partner task rewards
 * - 'cashback': Partner jackpot cashback and transaction bonuses
 *
 * Run: npx ts-node src/scripts/migratePartnerEarnings.ts
 * Or:  MONGODB_URI=... DB_NAME=... npx ts-node src/scripts/migratePartnerEarnings.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'rez-app';

async function migrate() {
  console.log('🔄 Starting Partner Earnings metadata backfill...');
  console.log(`   Connecting to: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log(`   Database: ${DB_NAME}`);

  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db!;
  const collection = db.collection('cointransactions');

  let totalUpdated = 0;

  // 1. Tag level-up bonuses (description pattern: "Partner level up bonus")
  console.log('\n📦 Step 1: Tagging level-up bonuses as milestone...');
  const levelUpResult = await collection.updateMany(
    {
      description: { $regex: /^Partner level up bonus/i },
      'metadata.partnerEarning': { $ne: true },
    },
    {
      $set: {
        'metadata.partnerEarning': true,
        'metadata.partnerEarningType': 'milestone',
      },
    }
  );
  console.log(`   Updated ${levelUpResult.modifiedCount} level-up bonus transactions`);
  totalUpdated += levelUpResult.modifiedCount;

  // 2. Tag milestone rewards (description pattern: "Partner milestone reward")
  console.log('\n📦 Step 2: Tagging milestone rewards...');
  const milestoneResult = await collection.updateMany(
    {
      description: { $regex: /^Partner milestone reward/i },
      'metadata.partnerEarning': { $ne: true },
    },
    {
      $set: {
        'metadata.partnerEarning': true,
        'metadata.partnerEarningType': 'milestone',
      },
    }
  );
  console.log(`   Updated ${milestoneResult.modifiedCount} milestone reward transactions`);
  totalUpdated += milestoneResult.modifiedCount;

  // 3. Tag transactions with milestoneId metadata (catch any missed)
  console.log('\n📦 Step 3: Tagging by milestoneId metadata...');
  const milestoneIdResult = await collection.updateMany(
    {
      'metadata.milestoneId': { $exists: true },
      'metadata.partnerEarning': { $ne: true },
    },
    {
      $set: {
        'metadata.partnerEarning': true,
        'metadata.partnerEarningType': 'milestone',
      },
    }
  );
  console.log(`   Updated ${milestoneIdResult.modifiedCount} transactions with milestoneId`);
  totalUpdated += milestoneIdResult.modifiedCount;

  // 4. Tag task rewards (description pattern: "Partner task reward")
  console.log('\n📦 Step 4: Tagging task rewards...');
  const taskResult = await collection.updateMany(
    {
      description: { $regex: /^Partner task reward/i },
      'metadata.partnerEarning': { $ne: true },
    },
    {
      $set: {
        'metadata.partnerEarning': true,
        'metadata.partnerEarningType': 'task',
      },
    }
  );
  console.log(`   Updated ${taskResult.modifiedCount} task reward transactions`);
  totalUpdated += taskResult.modifiedCount;

  // 5. Tag transactions with taskId metadata
  console.log('\n📦 Step 5: Tagging by taskId metadata...');
  const taskIdResult = await collection.updateMany(
    {
      'metadata.taskId': { $exists: true },
      'metadata.partnerEarning': { $ne: true },
    },
    {
      $set: {
        'metadata.partnerEarning': true,
        'metadata.partnerEarningType': 'task',
      },
    }
  );
  console.log(`   Updated ${taskIdResult.modifiedCount} transactions with taskId`);
  totalUpdated += taskIdResult.modifiedCount;

  // 6. Tag jackpot rewards (description pattern: "Partner jackpot")
  console.log('\n📦 Step 6: Tagging jackpot rewards as cashback...');
  const jackpotResult = await collection.updateMany(
    {
      description: { $regex: /^Partner jackpot/i },
      'metadata.partnerEarning': { $ne: true },
    },
    {
      $set: {
        'metadata.partnerEarning': true,
        'metadata.partnerEarningType': 'cashback',
      },
    }
  );
  console.log(`   Updated ${jackpotResult.modifiedCount} jackpot reward transactions`);
  totalUpdated += jackpotResult.modifiedCount;

  // 7. Tag transactions with jackpotId metadata
  console.log('\n📦 Step 7: Tagging by jackpotId metadata...');
  const jackpotIdResult = await collection.updateMany(
    {
      'metadata.jackpotId': { $exists: true },
      'metadata.partnerEarning': { $ne: true },
    },
    {
      $set: {
        'metadata.partnerEarning': true,
        'metadata.partnerEarningType': 'cashback',
      },
    }
  );
  console.log(`   Updated ${jackpotIdResult.modifiedCount} transactions with jackpotId`);
  totalUpdated += jackpotIdResult.modifiedCount;

  // 8. Tag partner transaction bonuses (description pattern: "Partner transaction bonus")
  console.log('\n📦 Step 8: Tagging partner transaction bonuses...');
  const txBonusResult = await collection.updateMany(
    {
      description: { $regex: /^Partner transaction bonus/i },
      'metadata.partnerEarning': { $ne: true },
    },
    {
      $set: {
        'metadata.partnerEarning': true,
        'metadata.partnerEarningType': 'cashback',
      },
    }
  );
  console.log(`   Updated ${txBonusResult.modifiedCount} transaction bonus records`);
  totalUpdated += txBonusResult.modifiedCount;

  // 9. Tag any remaining transactions with partnerLevel metadata that weren't caught above
  console.log('\n📦 Step 9: Tagging remaining partnerLevel-tagged transactions...');
  const partnerLevelResult = await collection.updateMany(
    {
      'metadata.partnerLevel': { $exists: true },
      'metadata.partnerEarning': { $ne: true },
    },
    {
      $set: {
        'metadata.partnerEarning': true,
        'metadata.partnerEarningType': 'cashback', // default to cashback for unclassified
      },
    }
  );
  console.log(`   Updated ${partnerLevelResult.modifiedCount} remaining partner transactions`);
  totalUpdated += partnerLevelResult.modifiedCount;

  // Summary
  console.log('\n========================================');
  console.log(`✅ Migration complete! Total updated: ${totalUpdated}`);

  // Verify: count all partner-tagged transactions
  const totalTagged = await collection.countDocuments({ 'metadata.partnerEarning': true });
  console.log(`   Total partner-tagged CoinTransactions: ${totalTagged}`);

  // Breakdown by type
  const byType = await collection.aggregate([
    { $match: { 'metadata.partnerEarning': true } },
    { $group: { _id: '$metadata.partnerEarningType', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    { $sort: { count: -1 } },
  ]).toArray();

  console.log('   Breakdown by type:');
  byType.forEach((t) => {
    console.log(`     ${t._id}: ${t.count} transactions, total: ${t.total}`);
  });

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
