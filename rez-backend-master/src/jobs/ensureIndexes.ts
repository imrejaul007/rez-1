import mongoose from 'mongoose';
import { logger } from '../config/logger';

/**
 * ensureIndexes — creates compound indexes on hot query paths.
 * Called once on startup (fire-and-forget via .catch(logger.error)).
 */

/** MongoDB error code for an index that already exists with a different name. */
const INDEX_OPTIONS_CONFLICT = 85;

async function safeCreateIndex(
  collection: ReturnType<typeof mongoose.connection.collection>,
  keys: Record<string, unknown>,
  options: Record<string, unknown>,
): Promise<void> {
  try {
    await collection.createIndex(keys as Parameters<typeof collection.createIndex>[0], options);
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: number }).code === INDEX_OPTIONS_CONFLICT
    ) {
      logger.warn(
        `[ensureIndexes] Index already exists with a different name on ${collection.collectionName} — skipping`,
        { keys },
      );
      return;
    }
    throw err;
  }
}

export async function ensureIndexes(): Promise<void> {
  try {
    logger.info('[ensureIndexes] Creating compound indexes...');

    const db = mongoose.connection;

    // CoinTransaction — most queried collection
    await safeCreateIndex(
      db.collection('cointransactions'),
      { user: 1, createdAt: -1 },
      { background: true, name: 'user_createdAt' },
    );
    await safeCreateIndex(
      db.collection('cointransactions'),
      { 'metadata.storeId': 1, createdAt: -1 },
      { background: true, name: 'storeId_createdAt' },
    );
    await safeCreateIndex(
      db.collection('cointransactions'),
      { user: 1, type: 1, source: 1, createdAt: -1 },
      { background: true, name: 'user_type_source_date' },
    );

    // UserStreak
    await safeCreateIndex(db.collection('userstreaks'), { userId: 1, lastStoreId: 1 }, { background: true });
    await safeCreateIndex(db.collection('userstreaks'), { lastStoreId: 1, updatedAt: -1 }, { background: true });

    // Store
    await safeCreateIndex(db.collection('stores'), { category: 1, isActive: 1 }, { background: true });
    await safeCreateIndex(
      db.collection('stores'),
      { isFeatured: 1, isActive: 1, 'ratings.average': -1 },
      { background: true, name: 'featured_active_rating' },
    );
    await safeCreateIndex(
      db.collection('stores'),
      { isActive: 1, 'ratings.average': -1 },
      { background: true, name: 'active_rating' },
    );

    // Category
    await safeCreateIndex(
      db.collection('categories'),
      { 'metadata.featured': 1, isActive: 1 },
      { background: true, name: 'metadata_featured_active' },
    );
    await safeCreateIndex(
      db.collection('categories'),
      { parentCategory: 1, isActive: 1, sortOrder: 1 },
      { background: true, name: 'parent_active_sort' },
    );

    // Product
    await safeCreateIndex(
      db.collection('products'),
      { isFeatured: 1, isActive: 1, isDeleted: 1 },
      { background: true, name: 'featured_active_deleted' },
    );
    await safeCreateIndex(
      db.collection('products'),
      { isActive: 1, isDeleted: 1, 'ratings.average': -1 },
      { background: true, name: 'active_deleted_rating' },
    );

    // Notification
    await safeCreateIndex(
      db.collection('notifications'),
      { userId: 1, isRead: 1, createdAt: -1 },
      { background: true },
    );

    // ── LedgerEntry — critical for balance computation ─────────────────────────
    // getAccountBalance() aggregates over all entries for a user by direction.
    // Without this compound index, every balance check is a collection scan.
    await safeCreateIndex(
      db.collection('ledgerentries'),
      { accountId: 1, accountType: 1, direction: 1 },
      { background: true, name: 'ledger_balance_compound' },
    );
    // Kill Query 1 fix: covering index for getAccountBalance() aggregate.
    // Including `amount` lets MongoDB satisfy the $sum entirely from the index
    // without fetching documents — critical for platform_float account which
    // accumulates 730M+ entries/year at 1M tx/day.
    await safeCreateIndex(
      db.collection('ledgerentries'),
      { accountId: 1, direction: 1, amount: 1 },
      { background: true, name: 'ledger_balance_covering' },
    );
    await safeCreateIndex(
      db.collection('ledgerentries'),
      { accountId: 1, createdAt: -1 },
      { background: true, name: 'ledger_user_history' },
    );
    await safeCreateIndex(
      db.collection('ledgerentries'),
      { pairId: 1 },
      { background: true, name: 'ledger_pairId', unique: false },
    );
    await safeCreateIndex(
      db.collection('ledgerentries'),
      { yearMonth: 1, accountId: 1 },
      { background: true, name: 'ledger_yearmonth_account' },
    );

    // ── Payment — webhook lookup and merchant settlement ─────────────────────────
    // handleWebhookCaptured/Failed queries by metadata.razorpayOrderId on EVERY webhook.
    // Without this index, every webhook event is a full collection scan.
    await safeCreateIndex(
      db.collection('payments'),
      { 'metadata.razorpayOrderId': 1 },
      { background: true, sparse: true, name: 'payment_razorpay_order' },
    );
    await safeCreateIndex(
      db.collection('payments'),
      { 'metadata.merchantId': 1, status: 1, completedAt: -1 },
      { background: true, sparse: true, name: 'payment_merchant_settlement' },
    );
    // Reconciliation: stuck processing payments
    await safeCreateIndex(
      db.collection('payments'),
      { status: 1, updatedAt: 1 },
      { background: true, name: 'payment_reconciliation_status_updated' },
    );
    // Nonce check: replay prevention
    await safeCreateIndex(
      db.collection('payments'),
      { 'metadata.orchestratorIdempotencyKey': 1 },
      { background: true, sparse: true, name: 'payment_orchestrator_idempotency' },
    );
    // Stripe webhook dedup: looked up by stripeWebhookId when Stripe goes live
    await safeCreateIndex(
      db.collection('payments'),
      { 'metadata.stripeWebhookId': 1 },
      { background: true, sparse: true, name: 'payment_stripe_webhook_id' },
    );
    // PayPal order dedup: looked up by paypalOrderId when PayPal goes live
    await safeCreateIndex(
      db.collection('payments'),
      { 'metadata.paypalOrderId': 1 },
      { background: true, sparse: true, name: 'payment_paypal_order_id' },
    );

    // ── UserCashback — cashback hold credit job ──────────────────────────────────
    await safeCreateIndex(
      db.collection('usercashbacks'),
      { status: 1, creditableAt: 1 },
      { background: true, name: 'cashback_due_for_credit' },
    );
    await safeCreateIndex(
      db.collection('usercashbacks'),
      { user: 1, status: 1, createdAt: -1 },
      { background: true, name: 'cashback_user_status' },
    );
    await safeCreateIndex(
      db.collection('usercashbacks'),
      { user: 1, status: 1, creditableAt: 1 },
      { background: true, name: 'cashback_user_status_creditable' },
    );

    // ── CoinTransaction — user transaction history pagination ────────────────────
    await safeCreateIndex(
      db.collection('cointransactions'),
      { user: 1, coinType: 1, createdAt: -1 },
      { background: true, name: 'cointx_user_type_time' },
    );
    // Kill Query 3 fix: reconciliationService.partnerEarningsByUser() scans
    // metadata.partnerEarning with no index — broken at 12-18 months scale.
    await safeCreateIndex(
      db.collection('cointransactions'),
      { user: 1, 'metadata.partnerEarning': 1 },
      { background: true, sparse: true, name: 'cointx_user_partner_earning' },
    );
    await safeCreateIndex(
      db.collection('cointransactions'),
      { idempotencyKey: 1 },
      { background: true, sparse: true, unique: true, name: 'cointx_idempotency_unique' },
    );

    // ── Wallet — balance lookups ──────────────────────────────────────────────────
    await safeCreateIndex(
      db.collection('wallets'),
      { 'balance.available': 1 },
      { background: true, name: 'wallet_available_balance' },
    );
    await safeCreateIndex(
      db.collection('wallets'),
      { user: 1, 'balance.available': 1 },
      { background: true, name: 'wallet_user_balance_covering' },
    );

    // ── TransactionLedger — reconciliation: stuck transactions ───────────────────
    await safeCreateIndex(
      db.collection('transactionledgers'),
      { status: 1, createdAt: 1 },
      { background: true, name: 'txledger_stuck_txs' },
    );

    // ── Order ── order lookup by store and user ───────────────────────────────────
    // Check if orders collection exists — skip gracefully if not
    try {
      await safeCreateIndex(
        db.collection('orders'),
        { user: 1, status: 1, createdAt: -1 },
        { background: true, name: 'order_user_status_time' },
      );
      await safeCreateIndex(
        db.collection('orders'),
        { store: 1, status: 1, createdAt: -1 },
        { background: true, name: 'order_store_status_time' },
      );
    } catch (err: any) {
      logger.warn('[ensureIndexes] orders collection index skipped', { error: err.message });
    }

    // ── Referral ── already has unique index in schema, add analytics compound ───
    await safeCreateIndex(
      db.collection('referrals'),
      { referrer: 1, status: 1, createdAt: -1 },
      { background: true, name: 'referral_referrer_status_time' },
    );

    // ── TransactionAuditLog ── audit trail lookups by paymentId ─────────────────
    await safeCreateIndex(
      db.collection('transactionauditlogs'),
      { paymentId: 1, createdAt: -1 },
      { background: true, name: 'auditlog_payment_time' },
    );
    await safeCreateIndex(
      db.collection('transactionauditlogs'),
      { userId: 1, createdAt: -1 },
      { background: true, name: 'auditlog_user_time' },
    );

    logger.info('[ensureIndexes] All compound indexes created successfully');
  } catch (error) {
    logger.error('[ensureIndexes] startup error:', error);
  }
}
