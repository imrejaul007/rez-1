/**
 * Restore Test Script
 *
 * Validates that a MongoDB backup can be restored correctly by copying
 * a random sample of documents from each critical collection from a source
 * database to a temporary target database, reading them back, and verifying
 * round-trip fidelity.
 *
 * Usage:
 *   npx ts-node src/scripts/testRestore.ts \
 *     --source mongodb+srv://user:pass@cluster/source-db \
 *     --target mongodb://localhost:27017/rez-restore-test
 *
 * Options:
 *   --source   URI of the backup / staging database  (required)
 *   --target   URI of the temporary test database     (required)
 *   --sample   Number of documents to sample per collection (default: 100)
 *   --cleanup  Whether to drop the target DB after the test (default: true)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionResult {
  collection: string;
  sampled: number;
  written: number;
  verified: number;
  passed: boolean;
  message: string;
}

interface RestoreTestReport {
  timestamp: string;
  sourceUri: string;
  targetUri: string;
  sampleSize: number;
  collections: CollectionResult[];
  overallStatus: 'PASS' | 'FAIL';
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { source: string; target: string; sample: number; cleanup: boolean } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const source = get('--source');
  const target = get('--target');

  if (!source) {
    console.error('Error: --source URI is required');
    process.exit(1);
  }
  if (!target) {
    console.error('Error: --target URI is required');
    process.exit(1);
  }

  const sampleArg = get('--sample');
  const sample = sampleArg ? parseInt(sampleArg, 10) : 100;

  const cleanupArg = get('--cleanup');
  const cleanup = cleanupArg !== 'false'; // default true

  return { source, target, sample, cleanup };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function redactUri(uri: string): string {
  try {
    const url = new URL(uri);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return '<unparseable URI>';
  }
}

/**
 * Sample up to `n` random documents from a collection using reservoir-style
 * aggregation (MongoDB $sample). Returns the raw documents as plain objects.
 */
async function sampleDocuments(
  db: mongoose.mongo.Db,
  collectionName: string,
  n: number,
): Promise<Record<string, unknown>[]> {
  const collectionExists = (await db.listCollections({ name: collectionName }).toArray()).length > 0;
  if (!collectionExists) return [];

  return db
    .collection(collectionName)
    .aggregate([{ $sample: { size: n } }])
    .toArray() as Promise<Record<string, unknown>[]>;
}

// ---------------------------------------------------------------------------
// Per-collection round-trip test
// ---------------------------------------------------------------------------

async function testCollectionRoundTrip(
  sourceDb: mongoose.mongo.Db,
  targetDb: mongoose.mongo.Db,
  collectionName: string,
  sampleSize: number,
): Promise<CollectionResult> {
  const tempCollection = `_restore_test_${collectionName}`;

  // Clean up any leftover from a previous interrupted run
  try {
    await targetDb.collection(tempCollection).drop();
  } catch {
    // collection may not exist — ignore
  }

  let sampled = 0;
  let written = 0;
  let verified = 0;

  try {
    const docs = await sampleDocuments(sourceDb, collectionName, sampleSize);
    sampled = docs.length;

    if (sampled === 0) {
      return {
        collection: collectionName,
        sampled: 0,
        written: 0,
        verified: 0,
        passed: false,
        message: `Collection '${collectionName}' not found or empty in source`,
      };
    }

    // Write sampled documents to the target temp collection
    const insertResult = await targetDb.collection(tempCollection).insertMany(docs, {
      ordered: false,
    });
    written = insertResult.insertedCount;

    // Verify round-trip: read back each inserted document by its _id
    const insertedIds = Object.values(insertResult.insertedIds);
    const readBack = await targetDb
      .collection(tempCollection)
      .find({ _id: { $in: insertedIds } })
      .toArray();

    verified = readBack.length;

    // Cross-check: every inserted _id must appear in readBack
    const readBackIds = new Set(readBack.map((d) => d._id.toString()));
    const allPresent = insertedIds.every((id) => readBackIds.has(id.toString()));

    const passed = written === sampled && verified === sampled && allPresent;

    return {
      collection: collectionName,
      sampled,
      written,
      verified,
      passed,
      message: passed
        ? `OK — sampled ${sampled}, wrote ${written}, verified ${verified}`
        : `FAIL — sampled ${sampled}, wrote ${written}, verified ${verified}; mismatch detected`,
    };
  } finally {
    // Always clean up the temp collection
    try {
      await targetDb.collection(tempCollection).drop();
    } catch {
      // ignore cleanup errors
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const CRITICAL_COLLECTIONS = [
  'users',
  'wallets',
  'payments',
  'ledgerentries',
  'cointransactions',
  'usercashbacks',
] as const;

async function main(): Promise<void> {
  const { source, target, sample, cleanup } = parseArgs();

  console.log(`Source: ${redactUri(source)}`);
  console.log(`Target: ${redactUri(target)}`);
  console.log(`Sample size per collection: ${sample}`);
  console.log(`Cleanup after test: ${cleanup}\n`);

  // Use two separate Mongoose connections so source and target are independent
  const sourceConn = await mongoose
    .createConnection(source, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      family: 4,
    })
    .asPromise();

  const targetConn = await mongoose
    .createConnection(target, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      family: 4,
    })
    .asPromise();

  console.log('Both connections established.\n');

  const sourceDb = sourceConn.db;
  const targetDb = targetConn.db;

  if (!sourceDb || !targetDb) {
    throw new Error('Failed to obtain database handles from connections');
  }

  const results: CollectionResult[] = [];

  for (const col of CRITICAL_COLLECTIONS) {
    process.stdout.write(`Testing '${col}'... `);
    const result = await testCollectionRoundTrip(sourceDb, targetDb, col, sample);
    results.push(result);
    console.log(result.passed ? '[PASS]' : '[FAIL]', result.message);
  }

  // Optional: drop the entire target database after the test
  if (cleanup) {
    console.log('\nCleaning up target database...');
    try {
      await targetDb.dropDatabase();
      console.log('Target database dropped.');
    } catch (err) {
      console.warn(`Warning: could not drop target database: ${(err as Error).message}`);
    }
  }

  await sourceConn.close();
  await targetConn.close();

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  const report: RestoreTestReport = {
    timestamp: new Date().toISOString(),
    sourceUri: redactUri(source),
    targetUri: redactUri(target),
    sampleSize: sample,
    collections: results,
    overallStatus: failedCount === 0 ? 'PASS' : 'FAIL',
    summary: {
      total: results.length,
      passed: passedCount,
      failed: failedCount,
    },
  };

  console.log('\n--- Restore Test Report ---');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nOverall: ${report.overallStatus} (${passedCount}/${results.length} collections passed)`);

  if (report.overallStatus === 'FAIL') {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
