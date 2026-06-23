/**
 * Migration 006 — DM-M4: Finance userId validation (READ-ONLY, no writes)
 *
 * The rez-finance-service models use `userId: { type: String }` while the
 * rest of the system uses `user: Schema.Types.ObjectId`. Cross-service joins
 * require manual string coercion and are error-prone.
 *
 * This is a VALIDATION script only. It does NOT modify any data.
 * Purpose:
 *   1. Count all documents in CreditProfile, FinanceTransaction, LoanApplication
 *   2. Check that all `userId` values are valid 24-char hex ObjectId strings
 *   3. Report any invalid or missing userId values
 *   4. Provide statistics to inform the actual migration plan
 *
 * The actual schema migration (String → ObjectId) requires:
 *   - Schema update in rez-finance-service models
 *   - Cross-service query audit to confirm all callers pass valid ObjectIds
 *   - Coordination with finance service deployment
 *   - That work is tracked for Phase 2
 *
 * Usage (safe to run anytime — read-only):
 *   MONGO_URI=... npx ts-node src/scripts/migrations/006-finance-userid-validate.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('[006] ERROR: MONGO_URI or MONGODB_URI environment variable is not set');
  process.exit(1);
}

const FINANCE_COLLECTIONS = ['creditprofiles', 'financetransactions', 'loanapplications'] as const;

const OBJECTID_REGEX = /^[0-9a-fA-F]{24}$/;

interface ValidationResult {
  collection: string;
  total: number;
  missingUserId: number;
  validObjectIdStrings: number;
  invalidStrings: number;
  invalidExamples: string[];
  alreadyObjectIdType: number;
}

function isValidObjectIdString(value: unknown): boolean {
  return typeof value === 'string' && OBJECTID_REGEX.test(value);
}

async function validateCollection(
  db: ReturnType<InstanceType<typeof MongoClient>['db']>,
  colName: string,
): Promise<ValidationResult> {
  const result: ValidationResult = {
    collection: colName,
    total: 0,
    missingUserId: 0,
    validObjectIdStrings: 0,
    invalidStrings: 0,
    invalidExamples: [],
    alreadyObjectIdType: 0,
  };

  const col = db.collection(colName);
  result.total = await col.countDocuments();

  if (result.total === 0) return result;

  const cursor = col.find({}, { projection: { _id: 1, userId: 1 } });

  for await (const doc of cursor) {
    const userId = doc.userId;

    if (userId === undefined || userId === null) {
      result.missingUserId++;
    } else if (typeof userId === 'object' && userId.constructor?.name === 'ObjectId') {
      // Already stored as ObjectId type — means some docs were already migrated
      result.alreadyObjectIdType++;
    } else if (isValidObjectIdString(userId)) {
      result.validObjectIdStrings++;
    } else {
      result.invalidStrings++;
      if (result.invalidExamples.length < 5) {
        result.invalidExamples.push(String(userId));
      }
    }
  }

  return result;
}

async function run(): Promise<void> {
  const client = new MongoClient(MONGO_URI as string);

  try {
    console.log('[006] Connecting to MongoDB (READ-ONLY validation)...');
    await client.connect();
    const db = client.db();

    const existingCollections = new Set((await db.listCollections().toArray()).map((c) => c.name));

    console.log('\n[006] ==========================================');
    console.log('[006] Finance Service userId Validation Report');
    console.log('[006] ==========================================\n');

    const results: ValidationResult[] = [];

    for (const colName of FINANCE_COLLECTIONS) {
      if (!existingCollections.has(colName)) {
        console.log(`[${colName}] Collection does not exist — skipping`);
        results.push({
          collection: colName,
          total: 0,
          missingUserId: 0,
          validObjectIdStrings: 0,
          invalidStrings: 0,
          invalidExamples: [],
          alreadyObjectIdType: 0,
        });
        continue;
      }

      console.log(`[006] Validating ${colName}...`);
      const result = await validateCollection(db, colName);
      results.push(result);

      console.log(`  Total documents:              ${result.total}`);
      console.log(`  Missing userId:               ${result.missingUserId}`);
      console.log(`  Valid ObjectId strings:        ${result.validObjectIdStrings}`);
      console.log(`  Invalid userId strings:        ${result.invalidStrings}`);
      console.log(`  Already ObjectId type:         ${result.alreadyObjectIdType}`);

      if (result.invalidExamples.length > 0) {
        console.log(`  Invalid examples (up to 5):   ${result.invalidExamples.join(', ')}`);
      }
      console.log('');
    }

    // Summary
    const totalDocs = results.reduce((s, r) => s + r.total, 0);
    const totalMissing = results.reduce((s, r) => s + r.missingUserId, 0);
    const totalValid = results.reduce((s, r) => s + r.validObjectIdStrings, 0);
    const totalInvalid = results.reduce((s, r) => s + r.invalidStrings, 0);
    const totalAlreadyOid = results.reduce((s, r) => s + r.alreadyObjectIdType, 0);

    console.log('[006] ==========================================');
    console.log('[006] Summary across all finance collections:');
    console.log(`  Total documents:              ${totalDocs}`);
    console.log(`  Missing userId:               ${totalMissing}`);
    console.log(`  Valid ObjectId strings:        ${totalValid}`);
    console.log(`  Invalid/non-OID strings:       ${totalInvalid}`);
    console.log(`  Already ObjectId type:         ${totalAlreadyOid}`);
    console.log('[006] ==========================================\n');

    if (totalInvalid > 0 || totalMissing > 0) {
      console.warn('[006] ACTION REQUIRED:');
      console.warn(`  ${totalInvalid} documents have non-ObjectId userId values.`);
      console.warn(`  ${totalMissing} documents are missing userId entirely.`);
      console.warn('  These must be resolved before running the schema migration.');
      console.warn('  Investigate the source of these records in rez-finance-service.');
    } else if (totalValid === totalDocs - totalAlreadyOid) {
      console.log('[006] READY FOR MIGRATION:');
      console.log('  All userId values are valid ObjectId strings.');
      console.log('  The schema migration (String → ObjectId type) can proceed safely.');
      console.log('  Steps:');
      console.log('    1. Update models in rez-finance-service (CreditProfile, FinanceTransaction, LoanApplication)');
      console.log('    2. Change userId: { type: String } → userId: { type: Schema.Types.ObjectId }');
      console.log('    3. MongoDB stores the same 24-char hex but enforces ObjectId type going forward');
      console.log('    4. Run this validation script again after schema change to confirm');
    } else {
      console.log('[006] Some documents are already migrated. Mixed state — review before proceeding.');
    }

    console.log('\n[006] No data was modified. This was a read-only validation.');
  } finally {
    await client.close();
    console.log('[006] Disconnected');
  }
}

run().catch((err) => {
  console.error('[006] FATAL:', err.message || err);
  process.exit(1);
});
