/**
 * Backup Verification Script
 *
 * Verifies MongoDB backup integrity for the REZ fintech platform.
 * Checks that critical collections exist, contain data, are fresh,
 * and that wallet-ledger balances are internally consistent.
 *
 * Usage: npx ts-node src/scripts/verifyBackup.ts
 * Exit code 0 = all checks passed, 1 = one or more checks failed
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  detail?: Record<string, unknown>;
}

interface VerificationReport {
  timestamp: string;
  databaseUri: string; // redacted — host only
  overallStatus: 'PASS' | 'FAIL';
  checks: CheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CRITICAL_COLLECTIONS = [
  'users',
  'wallets',
  'payments',
  'ledgerentries',
  'cointransactions',
  'usercashbacks',
] as const;

/** Maximum age (ms) allowed for the most recent ledger entry */
const MAX_LEDGER_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Tolerance fraction for wallet-vs-ledger integrity check */
const BALANCE_TOLERANCE_FRACTION = 0.01; // 1%

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

function makeCheck(name: string, passed: boolean, message: string, detail?: Record<string, unknown>): CheckResult {
  return { name, passed, message, detail };
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

async function checkCollectionExists(db: mongoose.mongo.Db, collectionName: string): Promise<CheckResult> {
  const collections = await db.listCollections({ name: collectionName }).toArray();
  const exists = collections.length > 0;
  return makeCheck(
    `collection_exists:${collectionName}`,
    exists,
    exists ? `Collection '${collectionName}' exists` : `Collection '${collectionName}' is MISSING`,
  );
}

async function checkCollectionHasDocuments(db: mongoose.mongo.Db, collectionName: string): Promise<CheckResult> {
  const count = await db.collection(collectionName).estimatedDocumentCount();
  const passed = count > 0;
  return makeCheck(
    `collection_non_empty:${collectionName}`,
    passed,
    passed
      ? `Collection '${collectionName}' has ${count} documents`
      : `Collection '${collectionName}' is EMPTY — possible backup failure`,
    { documentCount: count },
  );
}

async function checkLedgerFreshness(db: mongoose.mongo.Db): Promise<CheckResult> {
  const collection = db.collection('ledgerentries');
  const latest = await collection.find({}).sort({ createdAt: -1 }).limit(1).project({ createdAt: 1 }).toArray();

  if (latest.length === 0) {
    return makeCheck('ledger_freshness', false, 'No ledger entries found — cannot verify freshness');
  }

  const latestDate: Date = latest[0].createdAt;
  const ageMs = Date.now() - latestDate.getTime();
  const ageHours = (ageMs / (60 * 60 * 1000)).toFixed(2);
  const passed = ageMs <= MAX_LEDGER_AGE_MS;

  return makeCheck(
    'ledger_freshness',
    passed,
    passed
      ? `Most recent ledger entry is ${ageHours}h old (within 24h threshold)`
      : `Most recent ledger entry is ${ageHours}h old — EXCEEDS 24h threshold (stale backup?)`,
    { latestEntryDate: latestDate.toISOString(), ageHours: Number(ageHours) },
  );
}

async function checkWalletLedgerIntegrity(db: mongoose.mongo.Db): Promise<CheckResult> {
  // Sum of all wallet.balance.available across all wallets
  const walletAgg = await db
    .collection('wallets')
    .aggregate([{ $group: { _id: null, totalAvailable: { $sum: '$balance.available' } } }])
    .toArray();

  const totalWalletBalance: number = walletAgg.length > 0 ? walletAgg[0].totalAvailable : 0;

  // Sum of credits minus debits in ledgerentries for user_wallet accounts
  const ledgerAgg = await db
    .collection('ledgerentries')
    .aggregate([
      { $match: { accountType: 'user_wallet' } },
      {
        $group: {
          _id: null,
          totalCredits: {
            $sum: { $cond: [{ $eq: ['$direction', 'credit'] }, '$amount', 0] },
          },
          totalDebits: {
            $sum: { $cond: [{ $eq: ['$direction', 'debit'] }, '$amount', 0] },
          },
        },
      },
    ])
    .toArray();

  const totalCredits: number = ledgerAgg.length > 0 ? ledgerAgg[0].totalCredits : 0;
  const totalDebits: number = ledgerAgg.length > 0 ? ledgerAgg[0].totalDebits : 0;
  const netLedger = totalCredits - totalDebits;

  // Percentage difference between wallet balance and net ledger
  const reference = Math.max(Math.abs(totalWalletBalance), Math.abs(netLedger), 1);
  const diffFraction = Math.abs(totalWalletBalance - netLedger) / reference;
  const passed = diffFraction <= BALANCE_TOLERANCE_FRACTION;

  return makeCheck(
    'wallet_ledger_integrity',
    passed,
    passed
      ? `Wallet-ledger discrepancy ${(diffFraction * 100).toFixed(4)}% — within 1% tolerance`
      : `Wallet-ledger discrepancy ${(diffFraction * 100).toFixed(4)}% — EXCEEDS 1% tolerance`,
    {
      totalWalletBalance,
      netLedger,
      totalCredits,
      totalDebits,
      discrepancyPercent: Number((diffFraction * 100).toFixed(4)),
    },
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runVerification(): Promise<VerificationReport> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const dbName = process.env.DB_NAME || 'rez-app';

  console.log(`Connecting to MongoDB (${redactUri(uri)})...`);
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    family: 4,
  });
  console.log('Connected.\n');

  const db = mongoose.connection.db!;
  const checks: CheckResult[] = [];

  // 1. Check each critical collection exists
  for (const col of CRITICAL_COLLECTIONS) {
    checks.push(await checkCollectionExists(db, col));
  }

  // 2. Check each critical collection has documents (only if it exists)
  for (const col of CRITICAL_COLLECTIONS) {
    const existsCheck = checks.find((c) => c.name === `collection_exists:${col}`);
    if (existsCheck?.passed) {
      checks.push(await checkCollectionHasDocuments(db, col));
    } else {
      checks.push(makeCheck(`collection_non_empty:${col}`, false, `Skipped — collection '${col}' does not exist`));
    }
  }

  // 3. Check ledger freshness (most recent entry < 24h old)
  const ledgerExists = checks.find((c) => c.name === 'collection_exists:ledgerentries');
  if (ledgerExists?.passed) {
    checks.push(await checkLedgerFreshness(db));
  } else {
    checks.push(makeCheck('ledger_freshness', false, 'Skipped — ledgerentries collection does not exist'));
  }

  // 4. Wallet-ledger integrity (balance cross-check within 1%)
  const walletsExist = checks.find((c) => c.name === 'collection_exists:wallets');
  const ledgerEntriesExist = checks.find((c) => c.name === 'collection_exists:ledgerentries');
  if (walletsExist?.passed && ledgerEntriesExist?.passed) {
    checks.push(await checkWalletLedgerIntegrity(db));
  } else {
    checks.push(
      makeCheck('wallet_ledger_integrity', false, 'Skipped — wallets or ledgerentries collection does not exist'),
    );
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const failedCount = checks.filter((c) => !c.passed).length;

  return {
    timestamp: new Date().toISOString(),
    databaseUri: redactUri(uri),
    overallStatus: failedCount === 0 ? 'PASS' : 'FAIL',
    checks,
    summary: {
      total: checks.length,
      passed: passedCount,
      failed: failedCount,
    },
  };
}

async function main(): Promise<void> {
  let report: VerificationReport | null = null;

  try {
    report = await runVerification();
  } catch (err) {
    const errorReport: VerificationReport = {
      timestamp: new Date().toISOString(),
      databaseUri: redactUri(process.env.MONGODB_URI || ''),
      overallStatus: 'FAIL',
      checks: [makeCheck('connection', false, `Fatal error: ${err instanceof Error ? err.message : String(err)}`)],
      summary: { total: 1, passed: 0, failed: 1 },
    };
    console.log(JSON.stringify(errorReport, null, 2));
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // best-effort disconnect
    }
  }

  console.log(JSON.stringify(report, null, 2));

  // Print human-readable summary
  console.log('\n--- Verification Summary ---');
  for (const check of report.checks) {
    const icon = check.passed ? '[PASS]' : '[FAIL]';
    console.log(`${icon} ${check.name}: ${check.message}`);
  }
  console.log(`\nOverall: ${report.overallStatus} (${report.summary.passed}/${report.summary.total} checks passed)`);

  if (report.overallStatus === 'FAIL') {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
