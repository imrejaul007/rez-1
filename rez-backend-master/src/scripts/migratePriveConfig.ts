/**
 * Migration: Seed priveProgramConfig in WalletConfig
 *
 * Idempotent - uses $setOnInsert so it never overwrites existing config.
 * Run: npx ts-node src/scripts/migratePriveConfig.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rez';

const DEFAULT_PRIVE_PROGRAM_CONFIG = {
  tierThresholds: {
    entryTier: 50,
    signatureTier: 70,
    eliteTier: 85,
    trustMinimum: 60,
  },
  pillarWeights: {
    engagement: 0.25,
    trust: 0.20,
    influence: 0.20,
    economicValue: 0.15,
    brandAffinity: 0.10,
    network: 0.10,
  },
  tiers: [
    {
      tier: 'entry',
      displayName: 'Entry',
      color: '#C9A962',
      coinMultiplier: 1.0,
      conciergeAccess: false,
      conciergeResponseSLA: 48,
      inviteCodesLimit: 5,
      benefits: ['Exclusive offers access', 'Daily check-in bonuses', 'Habit loop rewards', 'Smart Spend access'],
    },
    {
      tier: 'signature',
      displayName: 'Signature',
      color: '#E5C878',
      coinMultiplier: 1.5,
      conciergeAccess: true,
      conciergeResponseSLA: 24,
      inviteCodesLimit: 10,
      benefits: ['All Entry benefits', '1.5x coin multiplier', 'Priority concierge (24h SLA)', 'Exclusive Signature offers', 'Advanced analytics'],
    },
    {
      tier: 'elite',
      displayName: 'Elite',
      color: '#FFD700',
      coinMultiplier: 2.0,
      conciergeAccess: true,
      conciergeResponseSLA: 1,
      inviteCodesLimit: 20,
      benefits: ['All Signature benefits', '2x coin multiplier', 'VIP concierge (1h SLA)', 'Exclusive Elite experiences', 'Early access to features', 'Personal account manager'],
    },
  ],
  featureFlags: {
    offersEnabled: true,
    missionsEnabled: true,
    conciergeEnabled: true,
    smartSpendEnabled: true,
    redemptionEnabled: true,
    analyticsEnabled: true,
    invitesEnabled: true,
  },
  dashboardCacheTtlSeconds: 30,
  notificationConfig: {
    expiryWarningDays: 7,
  },
};

async function migrate() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected');

  const db = mongoose.connection.db!;
  const collection = db.collection('walletconfigs');

  // Check if config already has priveProgramConfig
  const existing = await collection.findOne({ singleton: true });

  if (existing?.priveProgramConfig) {
    console.log('ℹ️  priveProgramConfig already exists — skipping migration (idempotent)');
  } else if (existing) {
    // Config exists but missing priveProgramConfig — add it
    const result = await collection.updateOne(
      { singleton: true, priveProgramConfig: { $exists: false } },
      { $set: { priveProgramConfig: DEFAULT_PRIVE_PROGRAM_CONFIG } }
    );
    if (result.modifiedCount > 0) {
      console.log('✅ Added priveProgramConfig to existing WalletConfig');
    } else {
      console.log('ℹ️  No update needed (config may have been added concurrently)');
    }
  } else {
    // No config at all — create with $setOnInsert
    await collection.updateOne(
      { singleton: true },
      { $setOnInsert: { singleton: true, priveProgramConfig: DEFAULT_PRIVE_PROGRAM_CONFIG } },
      { upsert: true }
    );
    console.log('✅ Created WalletConfig with priveProgramConfig');
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Migration complete.');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
