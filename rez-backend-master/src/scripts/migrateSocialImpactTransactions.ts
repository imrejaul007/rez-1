/**
 * Migration script: Social Impact Module — Production-Ready Fields
 *
 * This script:
 * 1. Adds totalBudgetFunded + currentBalance to existing Sponsors
 * 2. Adds verificationConfig + sponsorBudget to existing social impact Programs
 * 3. Migrates any CoinTransactions with source='achievement' + metadata.eventId to 'social_impact_reward'
 * 4. Creates initial SponsorAllocation fund entries for sponsors with budgets
 *
 * Run: npx ts-node src/scripts/migrateSocialImpactTransactions.ts
 * Or: MONGODB_URI=... DB_NAME=... npx ts-node src/scripts/migrateSocialImpactTransactions.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'rez-app';

async function migrate() {
  console.log('🔄 Starting Social Impact migration...');
  console.log(`   Connecting to: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log(`   Database: ${DB_NAME}`);

  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db!;

  // 1. Add budget fields to Sponsors
  console.log('\n📦 Step 1: Adding budget fields to Sponsors...');
  const sponsorResult = await db.collection('sponsors').updateMany(
    { totalBudgetFunded: { $exists: false } },
    {
      $set: {
        totalBudgetFunded: 0,
        currentBalance: 0,
      },
    }
  );
  console.log(`   Updated ${sponsorResult.modifiedCount} sponsors`);

  // 2. Add verificationConfig + sponsorBudget to social impact Programs
  console.log('\n📦 Step 2: Adding verificationConfig + sponsorBudget to Programs...');
  const programResult = await db.collection('programs').updateMany(
    { type: 'social_impact', verificationConfig: { $exists: false } },
    {
      $set: {
        verificationConfig: {
          methods: ['manual'],
          geoFenceRadiusMeters: 500,
          requireCheckInBeforeComplete: true,
        },
        sponsorBudget: {
          allocated: 0,
          disbursed: 0,
        },
      },
    }
  );
  console.log(`   Updated ${programResult.modifiedCount} programs`);

  // 3. Migrate CoinTransactions with source='achievement' + metadata.eventId
  console.log('\n📦 Step 3: Migrating achievement+eventId CoinTransactions...');
  const txResult = await db.collection('cointransactions').updateMany(
    {
      source: 'achievement',
      'metadata.eventId': { $exists: true },
    },
    {
      $set: { source: 'social_impact_reward' },
    }
  );
  console.log(`   Migrated ${txResult.modifiedCount} transactions`);

  // 4. Add rewardIdempotencyKey field to enrollments (set null for existing)
  console.log('\n📦 Step 4: Adding rewardIdempotencyKey to enrollments...');
  const enrollmentResult = await db.collection('socialimpactenrollments').updateMany(
    { rewardIdempotencyKey: { $exists: false } },
    {
      $set: {
        rewardIdempotencyKey: null,
        verification: null,
      },
    }
  );
  console.log(`   Updated ${enrollmentResult.modifiedCount} enrollments`);

  // 5. Summary
  console.log('\n✅ Migration completed successfully!');
  console.log('   Summary:');
  console.log(`   - Sponsors updated: ${sponsorResult.modifiedCount}`);
  console.log(`   - Programs updated: ${programResult.modifiedCount}`);
  console.log(`   - CoinTransactions migrated: ${txResult.modifiedCount}`);
  console.log(`   - Enrollments updated: ${enrollmentResult.modifiedCount}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
