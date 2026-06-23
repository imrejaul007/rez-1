/**
 * habitFocusFlags.ts
 * Phase 4 — Strategic De-Scoping
 *
 * Seeds FeatureFlag documents with the non-core features set to DISABLED.
 * These features are hidden (not deleted) from the main navigation until
 * the core habit loop proves itself (D7 retention > 40%).
 *
 * Run with:
 *   npx ts-node src/seeds/habitFocusFlags.ts
 *
 * Or call runHabitFocusFlags() programmatically from a migration script.
 *
 * Safe to re-run — uses upsert so existing flags are only updated, never duplicated.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FeatureFlag from '../models/FeatureFlag';
import { logger } from '../config/logger';

dotenv.config();

// ---------------------------------------------------------------------------
// Flag definitions
// ---------------------------------------------------------------------------
interface FlagDef {
  key: string;
  enabled: boolean;
  description: string;
  note?: string;
}

const HABIT_FOCUS_FLAGS: FlagDef[] = [
  {
    key: 'FEATURE_GOLD_SAVINGS',
    enabled: false,
    description:
      'Gold Savings / SIP feature. Hidden from consumer app nav until D7 retention > 40%. ' +
      'Routes and models are built and preserved in code.',
    note: 'Phase 4 de-scope — Gold Savings',
  },
  {
    key: 'FEATURE_INSURANCE',
    enabled: false,
    description: 'Insurance Plans feature. Hidden from consumer app nav until core habit loop is proven.',
    note: 'Phase 4 de-scope — Insurance',
  },
  {
    key: 'FEATURE_TRAVEL',
    enabled: false,
    description:
      'Travel Services (flights, hotels, buses). Hidden from consumer app nav. ' +
      'Full routes built and preserved in code.',
    note: 'Phase 4 de-scope — Travel',
  },
  {
    key: 'FEATURE_FINANCIAL_SERVICES',
    enabled: false,
    description: 'Financial Services / Lending routes. Hidden from consumer app nav until core habit proven.',
    note: 'Phase 4 de-scope — Financial Services',
  },
  {
    key: 'FEATURE_MALL',
    enabled: false,
    description:
      'Mall / Brand Aggregation sub-app. Moved to "Explore" section only — not primary nav tab. ' +
      'Set to false to hide from bottom tab bar.',
    note: 'Phase 4 de-scope — Mall (move to Explore, not primary nav)',
  },
  {
    key: 'FEATURE_CREATOR',
    enabled: false,
    description: 'Creator Economy / Creator profiles. Hidden until platform reaches 10k DAU.',
    note: 'Phase 4 de-scope — Creator Economy',
  },
  {
    key: 'FEATURE_GROUP_BUY',
    enabled: false,
    description: 'Group Buying feature. Model exists; hidden until habit loop is proven.',
    note: 'Phase 4 de-scope — Group Buy',
  },
  {
    key: 'FEATURE_PRICE_TRACKING',
    enabled: false,
    description: 'Price Tracking / Price Alerts feature. Model exists; hidden until habit loop is proven.',
    note: 'Phase 4 de-scope — Price Tracking',
  },
  {
    key: 'FEATURE_PRODUCT_COMPARE',
    enabled: false,
    description: 'Product Comparison screen. Exists in frontend; hidden until habit loop is proven.',
    note: 'Phase 4 de-scope — Product Compare',
  },
];

// ---------------------------------------------------------------------------
// Upsert helper
// ---------------------------------------------------------------------------
async function upsertFlag(def: FlagDef): Promise<void> {
  await FeatureFlag.findOneAndUpdate(
    { key: def.key },
    {
      $set: {
        enabled: def.enabled,
        description: def.description,
        rolloutPercentage: def.enabled ? 100 : 0,
        environments: ['development', 'staging', 'production'],
        updatedBy: 'habitFocusFlags-seed',
      },
      $setOnInsert: {
        key: def.key,
        allowedUserIds: [],
      },
    },
    { upsert: true, new: true },
  );
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
export async function runHabitFocusFlags(): Promise<void> {
  logger.info('🚩 [HabitFocusFlags] Starting feature flag seed for Phase 4 de-scope...');

  for (const flag of HABIT_FOCUS_FLAGS) {
    await upsertFlag(flag);
    const status = flag.enabled ? '✅ ENABLED' : '🔴 DISABLED';
    logger.info(`   ${status}  ${flag.key}`);
  }

  logger.info(`✅ [HabitFocusFlags] ${HABIT_FOCUS_FLAGS.length} feature flags seeded successfully`);
  logger.info('');
  logger.info('📋 Summary of de-scoped features:');
  logger.info('   All hidden behind feature flags. Code is preserved, not deleted.');
  logger.info('   Re-enable flags individually when D7 retention > 40%.');
  logger.info('');
  logger.info('   To re-enable a feature, run:');
  logger.info("   db.featureflags.updateOne({key:'FEATURE_X'}, {$set:{enabled:true,rolloutPercentage:100}})");
}

// ---------------------------------------------------------------------------
// Standalone script entry point
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
  if (!mongoUri) {
    logger.error('❌ MONGO_URI or MONGODB_URI environment variable is required');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    logger.info('✅ Connected to MongoDB');

    await runHabitFocusFlags();

    logger.info('\n🎯 Phase 4 de-scope flags applied successfully.');
    logger.info('   Primary navigation should now show ONLY:');
    logger.info('   1. Home   2. Scan & Save   3. Explore   4. Wallet   5. Profile');
  } catch (err) {
    logger.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default runHabitFocusFlags;
