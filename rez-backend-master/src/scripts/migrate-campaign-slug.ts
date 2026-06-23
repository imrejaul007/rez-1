/**
 * Migration: nuqta_prive → rez_prive (extended)
 *
 * Complements migrate-nuqta-prive-slug.ts by covering the additional
 * collections that were not included in the original migration:
 *   - campaigns         (exclusiveToProgramSlug AND programSlug)
 *   - offers            (exclusiveToProgramSlug)
 *   - userloyalties     (specialPrograms[].slug — if embedded)
 *
 * The original migrate-nuqta-prive-slug.ts handles:
 *   special_program_configs, program_memberships, campaigns (partial), users
 *
 * Safe to re-run — updateMany is idempotent for already-migrated docs.
 *
 * Usage:
 *   npx ts-node -r dotenv/config src/scripts/migrate-campaign-slug.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function run(): Promise<void> {
  console.log('[migrate-campaign-slug] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI as string);
  const db = mongoose.connection.db!;

  let totalModified = 0;

  // 1. campaigns.exclusiveToProgramSlug
  const campaignExclusiveResult = await db
    .collection('campaigns')
    .updateMany({ exclusiveToProgramSlug: 'nuqta_prive' }, { $set: { exclusiveToProgramSlug: 'rez_prive' } });
  console.log(`[1/4] campaigns.exclusiveToProgramSlug: ${campaignExclusiveResult.modifiedCount} updated`);
  totalModified += campaignExclusiveResult.modifiedCount;

  // 2. campaigns.programSlug (if this field exists on any campaign documents)
  const campaignProgramResult = await db
    .collection('campaigns')
    .updateMany({ programSlug: 'nuqta_prive' }, { $set: { programSlug: 'rez_prive' } });
  console.log(`[2/4] campaigns.programSlug: ${campaignProgramResult.modifiedCount} updated`);
  totalModified += campaignProgramResult.modifiedCount;

  // 3. offers.exclusiveToProgramSlug
  const offersResult = await db
    .collection('offers')
    .updateMany({ exclusiveToProgramSlug: 'nuqta_prive' }, { $set: { exclusiveToProgramSlug: 'rez_prive' } });
  console.log(`[3/4] offers.exclusiveToProgramSlug: ${offersResult.modifiedCount} updated`);
  totalModified += offersResult.modifiedCount;

  // 4. userloyalties.specialPrograms[].slug (embedded array, if present)
  const userLoyaltyResult = await db
    .collection('userloyalties')
    .updateMany(
      { 'specialPrograms.slug': 'nuqta_prive' },
      { $set: { 'specialPrograms.$[elem].slug': 'rez_prive' } },
      { arrayFilters: [{ 'elem.slug': 'nuqta_prive' }] },
    );
  console.log(`[4/4] userloyalties.specialPrograms[].slug: ${userLoyaltyResult.modifiedCount} updated`);
  totalModified += userLoyaltyResult.modifiedCount;

  console.log(`\n[migrate-campaign-slug] Done. Total documents modified: ${totalModified}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[migrate-campaign-slug] FATAL:', err);
  process.exit(1);
});
