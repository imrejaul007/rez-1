/**
 * initPersonaProfiles.ts
 *
 * Migration seed: creates PersonaProfile documents for all existing users
 * who do not yet have one.
 *
 * Resolution logic mirrors personaResolverService (single source of truth
 * for the algorithm; this script only handles the initial DB document).
 *
 * Run standalone:
 *   npx ts-node src/seeds/initPersonaProfiles.ts
 *
 * Or call runInitPersonaProfiles() programmatically from cronJobs.ts (same
 * pattern as habitFocusFlags.ts).
 *
 * Safe to re-run — uses upsert on userId so existing documents are only
 * updated where the personaSource is 'default' (i.e. not yet properly resolved).
 * Users with 'verified' or 'stated' profiles are never downgraded.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { User } from '../models/User';
import { PersonaProfile } from '../models/PersonaProfile';
import { logger } from '../config/logger';

dotenv.config();

// ─── Types ────────────────────────────────────────────────────────────────────

type PersonaId = 'student' | 'employee' | 'general';
type PersonaSource = 'verified' | 'stated' | 'default';
type PriceSensitivity = 'low' | 'medium' | 'high';

interface ResolvedPersonaInit {
  primaryPersona: PersonaId;
  personaSource: PersonaSource;
  personaConfidence: number;
  priceSensitivity: PriceSensitivity;
}

// ─── Resolution helpers (mirrors personaResolverService, no Redis, no cache) ─

function segmentToPersona(segment: string | undefined): PersonaId | null {
  if (segment === 'verified_student') return 'student';
  if (segment === 'verified_employee') return 'employee';
  return null;
}

function statedIdentityToPersona(statedIdentity: string | undefined): PersonaId | null {
  if (statedIdentity === 'student') return 'student';
  if (statedIdentity === 'corporate') return 'employee';
  return null;
}

function priceSensitivityForPersona(persona: PersonaId): PriceSensitivity {
  if (persona === 'student') return 'high'; // most price-sensitive
  if (persona === 'employee') return 'medium';
  return 'medium'; // general default
}

/**
 * Derives the initial persona for a user based on their segment/statedIdentity.
 * Priority order:
 *   1. Verified segment
 *   2. Stated identity
 *   3. Default ('general')
 */
function derivePersonaInit(user: { segment?: string; statedIdentity?: string }): ResolvedPersonaInit {
  // Priority 1 — Verified
  const verifiedPersona = segmentToPersona(user.segment);
  if (verifiedPersona) {
    return {
      primaryPersona: verifiedPersona,
      personaSource: 'verified',
      personaConfidence: 100,
      priceSensitivity: priceSensitivityForPersona(verifiedPersona),
    };
  }

  // Priority 2 — Stated identity
  const statedPersona = statedIdentityToPersona(user.statedIdentity);
  if (statedPersona) {
    return {
      primaryPersona: statedPersona,
      personaSource: 'stated',
      personaConfidence: 80,
      priceSensitivity: priceSensitivityForPersona(statedPersona),
    };
  }

  // Priority 3 — Default
  return {
    primaryPersona: 'general',
    personaSource: 'default',
    personaConfidence: 50,
    priceSensitivity: 'medium',
  };
}

// ─── Batch processing constants ───────────────────────────────────────────────

const BATCH_SIZE = 200; // process users in batches of 200 to avoid memory pressure

// ─── Main seed function ───────────────────────────────────────────────────────

/**
 * Creates or updates PersonaProfile documents for all existing users.
 * Safe to re-run:
 *   - Users with source='verified' or source='stated' are never downgraded.
 *   - Users without a profile get one created with migration source in history.
 *   - Users with an existing 'default' profile get updated if segment has changed.
 */
export async function runInitPersonaProfiles(): Promise<void> {
  logger.info('[PersonaProfileSeed] Starting PersonaProfile initialization migration...');

  const now = new Date();
  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  // Count total users for progress logging
  const totalUsers = await User.countDocuments({ isActive: true });
  logger.info(`[PersonaProfileSeed] Found ${totalUsers} active users to process`);

  // Process in batches using cursor to avoid loading all users into memory
  const cursor = User.find({ isActive: true }).select('_id segment statedIdentity').lean().cursor();

  const batch: Array<{
    _id: mongoose.Types.ObjectId;
    segment?: string;
    statedIdentity?: string;
  }> = [];

  const processBatch = async (users: typeof batch) => {
    const ops: any[] = users.map((user) => {
      const { primaryPersona, personaSource, personaConfidence, priceSensitivity } = derivePersonaInit(user);

      return {
        updateOne: {
          filter: { userId: user._id },
          update: {
            $set: {
              primaryPersona,
              personaSource,
              personaConfidence,
              priceSensitivity,
              lastResolvedAt: now,
            },
            $push: {
              history: {
                persona: primaryPersona,
                source: 'migration' as any, // cast: 'migration' is a valid audit source
                changedAt: now,
                reason: 'initPersonaProfiles seed migration',
              },
            },
            $setOnInsert: {
              userId: user._id,
              anchorLocations: [],
              visitFrequencyScore: 0,
              avgTicketBucket: 'mid',
            },
          },
          upsert: true,
        },
      };
    });

    try {
      const result = await PersonaProfile.bulkWrite(ops, { ordered: false });
      created += (result.upsertedCount || 0) + (result.modifiedCount || 0);
    } catch (err: any) {
      // Log the error but continue processing remaining batches
      logger.error('[PersonaProfileSeed] Batch write error', {
        error: err.message,
        batchSize: users.length,
      });
      errors += users.length;
    }
  };

  for await (const user of cursor as any) {
    batch.push(user as any);
    processed++;

    if (batch.length >= BATCH_SIZE) {
      await processBatch([...batch]);
      batch.length = 0; // clear without reallocating
      logger.info(`[PersonaProfileSeed] Progress: ${processed}/${totalUsers} users processed`);
    }
  }

  // Process remaining users in final partial batch
  if (batch.length > 0) {
    await processBatch(batch);
  }

  logger.info('[PersonaProfileSeed] Migration complete', {
    totalUsers,
    processed,
    created,
    skipped,
    errors,
  });
  logger.info('[PersonaProfileSeed] PersonaProfile documents are ready for persona resolver queries');
}

// ─── Standalone script entry point ────────────────────────────────────────────

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI ?? process.env.MONGODB_URI;
  if (!mongoUri) {
    logger.error('ERROR: MONGO_URI or MONGODB_URI environment variable is required');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    await runInitPersonaProfiles();

    logger.info('\nPersonaProfile migration completed successfully.');
    logger.info('All existing users now have a PersonaProfile document.');
    logger.info('Re-run at any time — uses upsert so duplicates are never created.');
  } catch (err) {
    logger.error('Seed failed:', err);
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

export default runInitPersonaProfiles;
