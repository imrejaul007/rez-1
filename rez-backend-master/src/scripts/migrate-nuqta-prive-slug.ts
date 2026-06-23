/**
 * Migration: nuqta_prive → rez_prive
 *
 * Uses native MongoDB driver (no mongoose) to avoid triggering
 * automatic collection creation on Atlas M0/M2/M5 clusters.
 * Only operates on collections that already exist.
 *
 * Usage:
 *   MONGODB_URI=... npx ts-node src/scripts/migrate-nuqta-prive-slug.ts
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
  console.log('[migrate-nuqta-prive] Connecting to MongoDB...');
  await client.connect();
  const db = client.db();

  // List existing collections so we never trigger auto-creation
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  console.log(`[migrate-nuqta-prive] ${existing.size} collections in DB`);

  let totalModified = 0;

  // Helper: safe updateMany — skips if collection doesn't exist
  const safeUpdate = async (col: string, filter: object, update: object, options?: object): Promise<number> => {
    if (!existing.has(col)) {
      console.log(`  [skip] ${col} — collection does not exist`);
      return 0;
    }
    const result = await db.collection(col).updateMany(filter, update, options as any);
    return result.modifiedCount;
  };

  // 1. SpecialProgramConfig — rename the slug itself
  const c1 = await safeUpdate('special_program_configs', { slug: 'nuqta_prive' }, { $set: { slug: 'rez_prive' } });
  console.log(`[1/4] special_program_configs.slug: ${c1} updated`);
  totalModified += c1;

  // 2. ProgramMembership — rename programSlug field
  const c2 = await safeUpdate(
    'program_memberships',
    { programSlug: 'nuqta_prive' },
    { $set: { programSlug: 'rez_prive' } },
  );
  console.log(`[2/4] program_memberships.programSlug: ${c2} updated`);
  totalModified += c2;

  // 3. Campaigns — rename exclusiveToProgramSlug field
  const c3 = await safeUpdate(
    'campaigns',
    { exclusiveToProgramSlug: 'nuqta_prive' },
    { $set: { exclusiveToProgramSlug: 'rez_prive' } },
  );
  console.log(`[3/4] campaigns.exclusiveToProgramSlug: ${c3} updated`);
  totalModified += c3;

  // 4. Users — update embedded specialPrograms array elements if present
  const c4 = await safeUpdate(
    'users',
    { 'specialPrograms.slug': 'nuqta_prive' },
    { $set: { 'specialPrograms.$[elem].slug': 'rez_prive' } },
    { arrayFilters: [{ 'elem.slug': 'nuqta_prive' }] },
  );
  console.log(`[4/4] users.specialPrograms[].slug: ${c4} updated`);
  totalModified += c4;

  console.log(`\n[migrate-nuqta-prive] Done. Total documents modified: ${totalModified}`);
  await client.close();
}

run().catch((err) => {
  console.error('[migrate-nuqta-prive] FATAL:', err.message || err);
  process.exit(1);
});
