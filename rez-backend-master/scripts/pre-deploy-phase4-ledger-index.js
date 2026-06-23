#!/usr/bin/env node
/**
 * pre-deploy-phase4-ledger-index.js
 *
 * Pre-deploy migration for Phase 4 (ledger idempotency).
 *
 * What this does:
 *   1. Drops the old non-unique index { referenceId: 1, referenceModel: 1 }
 *      from the ledgerentries collection.
 *   2. The new unique compound index { referenceId, referenceModel,
 *      operationType, direction } is created automatically by Mongoose on
 *      first startup (ensureIndexes) — this script only needs to remove
 *      the conflicting old index so Mongoose can build the new one.
 *
 * Run ONCE before deploying Phase 4 backend code to production:
 *   node scripts/pre-deploy-phase4-ledger-index.js
 *
 * Safe to run multiple times — checks if the index exists before dropping.
 */

'use strict';

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('ERROR: MONGODB_URI or MONGO_URI environment variable is required.');
  process.exit(1);
}

const OLD_INDEX_NAME = 'referenceId_1_referenceModel_1';
const COLLECTION     = 'ledgerentries';

async function run() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    console.log('[pre-deploy] Connected to MongoDB');

    const db   = client.db();
    const coll = db.collection(COLLECTION);

    // List current indexes
    const indexes = await coll.indexes();
    const existing = indexes.find(idx => idx.name === OLD_INDEX_NAME);

    if (!existing) {
      console.log(`[pre-deploy] Index "${OLD_INDEX_NAME}" does not exist — nothing to drop. Already migrated or never created.`);
      return;
    }

    console.log(`[pre-deploy] Dropping old non-unique index: ${OLD_INDEX_NAME}`);
    await coll.dropIndex(OLD_INDEX_NAME);
    console.log(`[pre-deploy] ✅ Index dropped successfully.`);
    console.log('[pre-deploy] The new unique ledger_idempotency_idx will be created by Mongoose on next app startup.');

  } catch (err) {
    console.error('[pre-deploy] ERROR:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('[pre-deploy] Connection closed.');
  }
}

run();
