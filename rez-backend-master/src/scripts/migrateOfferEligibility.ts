/**
 * Migration: Offer Eligibility + User Denormalized Tier Fields
 *
 * 1. Backfills `eligibility` on all offers from `restrictions.userTypeRestriction`
 * 2. Backfills `User.nuqtaPlusTier` from Subscription model
 * 3. Backfills `User.priveTier` from PriveAccess model
 * 4. Backfills `User.activeZones` from UserZoneVerification model
 *
 * Usage: npx ts-node src/scripts/migrateOfferEligibility.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';

const ALL_NUQTA_TIERS = ['free', 'premium', 'vip'];
const ALL_PRIVE_TIERS = ['none', 'entry', 'signature', 'elite'];

async function migrateOffers(db: mongoose.Connection) {
  const offers = db.collection('offers');

  // 1. Offers with userTypeRestriction = 'premium' → only premium + vip
  const premiumResult = await offers.updateMany(
    { 'restrictions.userTypeRestriction': 'premium', 'eligibility.nuqtaPlusTiers': { $exists: false } },
    {
      $set: {
        'eligibility.nuqtaPlusTiers': ['premium', 'vip'],
        'eligibility.priveTiers': ALL_PRIVE_TIERS,
        'eligibility.requiredZones': [],
        'eligibility.requireAll': false,
      },
    }
  );
  console.log(`[Offers] Premium-restricted: ${premiumResult.modifiedCount} updated`);

  // 2. Offers with userTypeRestriction = 'student' → add student zone requirement
  const studentResult = await offers.updateMany(
    { 'restrictions.userTypeRestriction': 'student', 'eligibility.nuqtaPlusTiers': { $exists: false } },
    {
      $set: {
        'eligibility.nuqtaPlusTiers': ALL_NUQTA_TIERS,
        'eligibility.priveTiers': ALL_PRIVE_TIERS,
        'eligibility.requiredZones': ['student'],
        'eligibility.requireAll': false,
      },
    }
  );
  console.log(`[Offers] Student-restricted: ${studentResult.modifiedCount} updated`);

  // 3. All remaining offers (all, new_user, or no restriction) → open to all
  const allResult = await offers.updateMany(
    { 'eligibility.nuqtaPlusTiers': { $exists: false } },
    {
      $set: {
        'eligibility.nuqtaPlusTiers': ALL_NUQTA_TIERS,
        'eligibility.priveTiers': ALL_PRIVE_TIERS,
        'eligibility.requiredZones': [],
        'eligibility.requireAll': false,
      },
    }
  );
  console.log(`[Offers] Open/default: ${allResult.modifiedCount} updated`);
}

async function migrateUserTiers(db: mongoose.Connection) {
  const users = db.collection('users');
  const subscriptions = db.collection('subscriptions');
  const priveAccess = db.collection('priveaccesses');
  const zoneVerifications = db.collection('userzoneverifications');

  // 1. Backfill nuqtaPlusTier from active subscriptions
  const activeSubs = await subscriptions.find({
    status: { $in: ['active', 'trial', 'grace_period'] },
    tier: { $in: ['premium', 'vip'] },
  }).toArray();

  let subCount = 0;
  for (const sub of activeSubs) {
    const result = await users.updateOne(
      { _id: sub.user },
      { $set: { nuqtaPlusTier: sub.tier } }
    );
    if (result.modifiedCount > 0) subCount++;
  }
  console.log(`[Users] nuqtaPlusTier backfilled: ${subCount} users`);

  // 2. Backfill priveTier from active Prive access
  const activeAccess = await priveAccess.find({ status: 'active' }).toArray();

  let priveCount = 0;
  for (const access of activeAccess) {
    const tier = access.tierOverride || 'entry';
    const result = await users.updateOne(
      { _id: access.userId },
      { $set: { priveTier: tier } }
    );
    if (result.modifiedCount > 0) priveCount++;
  }
  console.log(`[Users] priveTier backfilled: ${priveCount} users`);

  // 3. Backfill activeZones from approved zone verifications
  const approvedZones = await zoneVerifications.aggregate([
    {
      $match: {
        status: 'approved',
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      },
    },
    {
      $group: {
        _id: '$userId',
        zones: { $addToSet: '$verificationType' },
      },
    },
  ]).toArray();

  let zoneCount = 0;
  for (const entry of approvedZones) {
    const result = await users.updateOne(
      { _id: entry._id },
      { $set: { activeZones: entry.zones } }
    );
    if (result.modifiedCount > 0) zoneCount++;
  }
  console.log(`[Users] activeZones backfilled: ${zoneCount} users`);
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const db = mongoose.connection;

  try {
    console.log('\n--- Migrating Offers ---');
    await migrateOffers(db);

    console.log('\n--- Migrating User Tiers ---');
    await migrateUserTiers(db);

    console.log('\n--- Migration complete ---');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
