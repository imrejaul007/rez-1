/**
 * reconcileCashbacks.ts — H7: Cashback Collection Bridge
 *
 * Links existing CashbackRequest documents (Cashback.ts / 'cashbackrequests'
 * collection) to UserCashback documents ('usercashbacks' collection) by matching
 * on userId + merchantId/storeId + amount + date (±24h tolerance).
 *
 * Once a match is found, the CashbackRequest.merchantCashbackId field is set
 * to the corresponding UserCashback._id, creating a permanent cross-reference.
 *
 * Already-linked documents (merchantCashbackId != null) are skipped so the
 * script is safe to re-run.
 *
 * Supports DRY_RUN=true for preview without writes.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/reconcileCashbacks.ts
 *
 * Dry-run:
 *   DRY_RUN=true npx ts-node -r tsconfig-paths/register src/scripts/reconcileCashbacks.ts
 */

import dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';
import { connectScriptDb, disconnectDb } from './connectDb';
import { logger } from '../config/logger';

dotenv.config();

// ─── Constants ───────────────────────────────────────────────────────────────

// Tolerance window for createdAt / earnedDate matching (milliseconds).
const DATE_TOLERANCE_MS = 24 * 60 * 60 * 1000; // ±24 hours

// Amount tolerance: match within 1 unit to absorb floating-point drift.
const AMOUNT_TOLERANCE = 1;

// Batch size for cursor pagination.
const BATCH_SIZE = 500;

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface ReconcileStats {
  cashbackRequestsScanned: number;
  alreadyLinked: number;
  matched: number;
  unmatched: number;
  errors: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Loads the raw native MongoDB collections so we can operate without Mongoose
 * schema validation (avoids enum/required field issues on legacy documents).
 */
function getCollections() {
  const db = mongoose.connection.db!;
  return {
    cashbackRequests: db.collection('cashbackrequests'),
    userCashbacks: db.collection('usercashbacks'),
  };
}

// ─── Core reconciliation ─────────────────────────────────────────────────────

async function reconcile(): Promise<ReconcileStats> {
  const stats: ReconcileStats = {
    cashbackRequestsScanned: 0,
    alreadyLinked: 0,
    matched: 0,
    unmatched: 0,
    errors: 0,
  };

  const isDryRun = process.env.DRY_RUN === 'true';
  if (isDryRun) {
    logger.info('[reconcileCashbacks] DRY RUN — no writes will be performed.');
  }

  const { cashbackRequests, userCashbacks } = getCollections();

  // Build an in-memory index of UserCashback documents keyed by
  // "userId:storeId:amount" for O(1) lookup.
  // We load all of them once; the collection is typically small compared to
  // cashbackRequests.
  logger.info('[reconcileCashbacks] Loading UserCashback documents into index...');

  type UserCashbackDoc = {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    amount: number;
    earnedDate: Date;
    createdAt: Date;
    metadata?: { storeId?: Types.ObjectId };
  };

  const allUserCashbacks = (await userCashbacks
    .find({}, { projection: { _id: 1, user: 1, amount: 1, earnedDate: 1, createdAt: 1, metadata: 1 } })
    .toArray()) as unknown as unknown as unknown as UserCashbackDoc[];

  logger.info(`[reconcileCashbacks] Loaded ${allUserCashbacks.length} UserCashback records.`);

  // Index: userId → list of UserCashback docs (sorted by earnedDate).
  const userCashbackIndex = new Map<string, UserCashbackDoc[]>();
  for (const uc of allUserCashbacks) {
    const key = String(uc.user);
    if (!userCashbackIndex.has(key)) {
      userCashbackIndex.set(key, []);
    }
    userCashbackIndex.get(key)!.push(uc);
  }

  logger.info('[reconcileCashbacks] Index built. Starting CashbackRequest scan...');

  // Paginate over unlinked CashbackRequest documents.
  let lastId: Types.ObjectId | null = null;

  while (true) {
    const queryFilter: Record<string, any> = {
      merchantCashbackId: { $in: [null, undefined] },
    };
    if (lastId) {
      queryFilter['_id'] = { $gt: lastId };
    }

    const batch = await cashbackRequests.find(queryFilter).sort({ _id: 1 }).limit(BATCH_SIZE).toArray();

    if (batch.length === 0) break;

    stats.cashbackRequestsScanned += batch.length;
    lastId = batch[batch.length - 1]._id as Types.ObjectId;

    for (const cbReq of batch) {
      try {
        const userId = String(cbReq.customerId ?? cbReq.userId ?? '');
        const merchantId = String(cbReq.merchantId ?? '');
        const reqAmount: number = cbReq.requestedAmount ?? cbReq.approvedAmount ?? 0;
        const reqDate: Date = new Date(cbReq.createdAt ?? cbReq.order?.orderDate ?? 0);

        if (!userId || !merchantId || !reqAmount) {
          stats.unmatched++;
          continue;
        }

        const candidates = userCashbackIndex.get(userId) ?? [];

        // Find the best candidate: same userId, amount within tolerance,
        // earnedDate within ±DATE_TOLERANCE_MS of reqDate.
        // If merchantId matches metadata.storeId that takes priority.
        let bestMatch: UserCashbackDoc | null = null;
        let bestScore = -1;

        for (const uc of candidates) {
          const amountDiff = Math.abs(uc.amount - reqAmount);
          if (amountDiff > AMOUNT_TOLERANCE) continue;

          const ucDate = new Date(uc.earnedDate ?? uc.createdAt);
          const dateDiff = Math.abs(ucDate.getTime() - reqDate.getTime());
          if (dateDiff > DATE_TOLERANCE_MS) continue;

          // Score: prefer storeId match; prefer smaller date diff.
          let score = DATE_TOLERANCE_MS - dateDiff; // higher = closer in time
          if (uc.metadata?.storeId && String(uc.metadata.storeId) === merchantId) {
            score += DATE_TOLERANCE_MS; // strong bonus for merchant match
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = uc;
          }
        }

        if (!bestMatch) {
          stats.unmatched++;
          logger.debug('[reconcileCashbacks] No match', {
            cashbackRequestId: String(cbReq._id),
            userId,
            merchantId,
            reqAmount,
          });
          continue;
        }

        if (!isDryRun) {
          await cashbackRequests.updateOne(
            { _id: cbReq._id },
            { $set: { merchantCashbackId: bestMatch._id, updatedAt: new Date() } },
          );
        }

        stats.matched++;
        logger.info('[reconcileCashbacks] Linked', {
          cashbackRequestId: String(cbReq._id),
          userCashbackId: String(bestMatch._id),
          userId,
          amount: reqAmount,
          dryRun: isDryRun,
        });

        // Remove the matched UserCashback from the index so it isn't
        // double-matched by a later CashbackRequest.
        const remaining = (userCashbackIndex.get(userId) ?? []).filter(
          (uc) => String(uc._id) !== String(bestMatch!._id),
        );
        userCashbackIndex.set(userId, remaining);
      } catch (err: any) {
        stats.errors++;
        logger.error('[reconcileCashbacks] Error processing document', {
          id: String(cbReq._id),
          err: err?.message,
        });
      }
    }

    if (batch.length < BATCH_SIZE) break;
  }

  // Count already-linked documents separately (scanned above excluded them,
  // so we query the total with merchantCashbackId set).
  stats.alreadyLinked = await cashbackRequests.countDocuments({
    merchantCashbackId: { $nin: [null, undefined] },
  });

  return stats;
}

// ─── Entry-point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info('[reconcileCashbacks] Starting H7 cashback reconciliation...');
  await connectScriptDb();

  try {
    const stats = await reconcile();

    logger.info('[reconcileCashbacks] Reconciliation complete. Summary:');
    logger.info(`  Scanned (unlinked):  ${stats.cashbackRequestsScanned}`);
    logger.info(`  Already linked:      ${stats.alreadyLinked}`);
    logger.info(`  Newly matched:       ${stats.matched}`);
    logger.info(`  Unmatched:           ${stats.unmatched}`);
    logger.info(`  Errors:              ${stats.errors}`);
  } finally {
    await disconnectDb();
  }
}

main().catch((err) => {
  logger.error('[reconcileCashbacks] Fatal error:', err);
  process.exit(1);
});
