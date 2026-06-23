/**
 * verify-merchantwallet-merchant-refs.ts
 *
 * READ-ONLY script that audits the `merchant` field on every MerchantWallet
 * document. After the fix that changed `ref: 'User'` to `ref: 'Merchant'`,
 * some existing documents may still have ObjectIds that point to User documents
 * rather than Merchant documents.
 *
 * Outputs a breakdown of:
 *   - refs that exist in the `merchants` collection (correct)
 *   - refs that exist in the `users` collection but NOT `merchants` (stale / wrong)
 *   - refs that exist in neither collection (orphaned)
 *
 * Usage:
 *   npx ts-node src/scripts/verify-merchantwallet-merchant-refs.ts
 *
 * Exit code 0 = script completed (regardless of findings).
 * Exit code 1 = script could not run (connection failure, etc.).
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[ERROR] MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB (${redactUri(uri)})...`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    family: 4,
  });
  console.log('Connected.\n');

  const db = mongoose.connection.db!;

  // ---- 1. Collect all distinct merchant ObjectIds from merchantwallets ----
  const walletDocs = await db
    .collection('merchantwallets')
    .find({}, { projection: { _id: 1, merchant: 1 } })
    .toArray();

  if (walletDocs.length === 0) {
    console.log('No documents found in the merchantwallets collection. Nothing to verify.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${walletDocs.length} MerchantWallet document(s) to audit.\n`);

  // Deduplicate merchant ObjectIds (one wallet per merchant, but be safe)
  const merchantIdSet = new Set<string>();
  for (const doc of walletDocs) {
    if (doc.merchant) {
      merchantIdSet.add(doc.merchant.toString());
    }
  }
  const uniqueMerchantIds = Array.from(merchantIdSet).map((id) => new mongoose.Types.ObjectId(id));

  // ---- 2. Check which ids exist in `merchants` vs `users` ----
  const [merchantMatches, userMatches] = await Promise.all([
    db
      .collection('merchants')
      .find({ _id: { $in: uniqueMerchantIds } }, { projection: { _id: 1 } })
      .toArray(),
    db
      .collection('users')
      .find({ _id: { $in: uniqueMerchantIds } }, { projection: { _id: 1 } })
      .toArray(),
  ]);

  const validMerchantIds = new Set(merchantMatches.map((d) => d._id.toString()));
  const userOnlyIds = new Set(
    userMatches.filter((d) => !validMerchantIds.has(d._id.toString())).map((d) => d._id.toString()),
  );

  // ---- 3. Categorise each wallet document ----
  let validCount = 0;
  let userRefCount = 0;
  let missingCount = 0;

  const userRefWallets: string[] = [];
  const missingRefWallets: string[] = [];

  for (const doc of walletDocs) {
    const mid = doc.merchant?.toString();
    if (!mid) {
      missingCount++;
      missingRefWallets.push(`wallet _id=${doc._id} — merchant field is null/missing`);
      continue;
    }

    if (validMerchantIds.has(mid)) {
      validCount++;
    } else if (userOnlyIds.has(mid)) {
      userRefCount++;
      userRefWallets.push(`wallet _id=${doc._id} — merchant=${mid} (found in users, NOT merchants)`);
    } else {
      missingCount++;
      missingRefWallets.push(`wallet _id=${doc._id} — merchant=${mid} (not in merchants or users)`);
    }
  }

  // ---- 4. Print results ----
  console.log('=== MerchantWallet.merchant ref audit ===\n');

  console.log(`[OK]      Valid Merchant refs : ${validCount}`);
  console.log(`[WARN]    User refs (wrong)   : ${userRefCount}`);
  console.log(`[ERROR]   Missing/orphaned    : ${missingCount}`);
  console.log(`          Total wallets       : ${walletDocs.length}\n`);

  if (userRefWallets.length > 0) {
    console.log('--- Wallets whose merchant field points to a User document ---');
    for (const line of userRefWallets) {
      console.log(' ', line);
    }
    console.log('');
  }

  if (missingRefWallets.length > 0) {
    console.log('--- Wallets with orphaned / missing merchant refs ---');
    for (const line of missingRefWallets) {
      console.log(' ', line);
    }
    console.log('');
  }

  if (userRefCount === 0 && missingCount === 0) {
    console.log('All merchant refs point to valid Merchant documents. No migration needed.');
  } else {
    console.log(`Action required: ${userRefCount + missingCount} wallet(s) have incorrect merchant refs.`);
    console.log('Review the entries above and run a targeted migration to correct the refs.');
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // best-effort disconnect
    }
  });
