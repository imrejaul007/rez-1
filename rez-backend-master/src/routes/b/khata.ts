/**
 * Khata (Split-Bill Ledger) routes — REZ-vs-NUQTA migration (Phase 2.4)
 *
 * Sub-router mounted under `/api/b/khata`. Provides a thin, read-only view
 * of a user's merchant-credit / tab ledger. The heavy lifting still lives
 * in the existing `BillSplit` model — this router just exposes a friendlier
 * summary shape for the B-side frontend.
 *
 * Endpoints
 * ---------
 *   GET /api/b/khata
 *     Returns the user's full khata summary — per-merchant entries plus
 *     the rolled-up totals. Response:
 *       { entries: KhataEntry[],
 *         totalOwedPaise, totalOwedToYouPaise, netBalancePaise }
 *
 *   GET /api/b/khata/:merchantId
 *     Returns the recent transaction history for a single merchant entry.
 *     Used when the user taps a row on the ledger page.
 *
 * Today both endpoints return small, hardcoded fixtures of popular Indian
 * merchants. The contract — request shape and response envelope — is the
 * stable surface; the fixtures will be replaced with real `BillSplit`
 * aggregations once the migration is complete.
 *
 * Mounted in `src/routes/b/index.ts` as
 *     router.use('/khata', khataBRoutes);
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Single row in the khata ledger. One per merchant with whom the user has
 * any non-zero balance.
 */
export interface KhataEntry {
  merchantId: string;
  merchantName: string;
  /**
   * Net balance in paise.
   *  - positive → the merchant owes the user.
   *  - negative → the user owes the merchant.
   *  - zero     → settled (filtered out by the API).
   */
  balancePaise: number;
  /** ISO-8601 timestamp of the most recent transaction with this merchant. */
  lastTransactionAt: string;
  /** Total number of ledger transactions recorded against this merchant. */
  transactionCount: number;
  /** Small visual category used by the UI to pick an emoji / icon. */
  category: string;
}

/**
 * Single transaction line for one merchant's history view.
 */
export interface KhataTransaction {
  id: string;
  merchantId: string;
  /** Positive = you paid; negative = you received. */
  amountPaise: number;
  description: string;
  occurredAt: string;
  status: 'settled' | 'pending' | 'overdue';
}

export interface KhataSummary {
  entries: KhataEntry[];
  totalOwedPaise: number;
  totalOwedToYouPaise: number;
  netBalancePaise: number;
}

export interface KhataMerchantHistory {
  merchant: KhataEntry;
  transactions: KhataTransaction[];
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Hardcoded Indian merchants. Stays stable for the duration of the B-side
 * migration so frontend snapshots don't drift.
 */
const FIXTURE_ENTRIES: ReadonlyArray<KhataEntry> = [
  {
    merchantId: 'merchant-bigbazaar',
    merchantName: 'BigBazaar',
    balancePaise: -125000, // user owes BigBazaar ₹1,250
    lastTransactionAt: '2026-06-18T14:32:00.000Z',
    transactionCount: 7,
    category: 'Grocery',
  },
  {
    merchantId: 'merchant-ccd',
    merchantName: 'Cafe Coffee Day',
    balancePaise: 45000, // CCD owes the user ₹450
    lastTransactionAt: '2026-06-15T09:12:00.000Z',
    transactionCount: 3,
    category: 'Cafe',
  },
  {
    merchantId: 'merchant-dominos',
    merchantName: "Domino's Pizza",
    balancePaise: -65000, // user owes ₹650
    lastTransactionAt: '2026-06-12T20:45:00.000Z',
    transactionCount: 4,
    category: 'Restaurant',
  },
  {
    merchantId: 'merchant-lifestyle',
    merchantName: 'Lifestyle',
    balancePaise: 89900, // store owes the user ₹899
    lastTransactionAt: '2026-06-08T11:00:00.000Z',
    transactionCount: 2,
    category: 'Fashion',
  },
  {
    merchantId: 'merchant-apollo',
    merchantName: 'Apollo Pharmacy',
    balancePaise: -12500, // user owes ₹125
    lastTransactionAt: '2026-05-30T17:25:00.000Z',
    transactionCount: 1,
    category: 'Pharmacy',
  },
];

/** Per-merchant transaction history, keyed by `merchantId`. */
const FIXTURE_HISTORIES: Record<string, ReadonlyArray<KhataTransaction>> = {
  'merchant-bigbazaar': [
    {
      id: 'tx-bb-001',
      merchantId: 'merchant-bigbazaar',
      amountPaise: -32000,
      description: 'Weekly grocery run',
      occurredAt: '2026-06-18T14:32:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-bb-002',
      merchantId: 'merchant-bigbazaar',
      amountPaise: -15000,
      description: 'Snacks + beverages',
      occurredAt: '2026-06-10T18:05:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-bb-003',
      merchantId: 'merchant-bigbazaar',
      amountPaise: -28000,
      description: 'Festival shopping',
      occurredAt: '2026-06-01T10:40:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-bb-004',
      merchantId: 'merchant-bigbazaar',
      amountPaise: -22000,
      description: 'Household supplies',
      occurredAt: '2026-05-25T16:10:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-bb-005',
      merchantId: 'merchant-bigbazaar',
      amountPaise: -18000,
      description: 'Dairy + bread',
      occurredAt: '2026-05-19T08:55:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-bb-006',
      merchantId: 'merchant-bigbazaar',
      amountPaise: -10000,
      description: 'Refund — duplicate item',
      occurredAt: '2026-05-12T12:20:00.000Z',
      status: 'settled',
    },
  ],
  'merchant-ccd': [
    {
      id: 'tx-ccd-001',
      merchantId: 'merchant-ccd',
      amountPaise: 25000,
      description: 'Loyalty credit — birthday',
      occurredAt: '2026-06-15T09:12:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-ccd-002',
      merchantId: 'merchant-ccd',
      amountPaise: 12000,
      description: 'Cashback — Cappuccino combo',
      occurredAt: '2026-05-28T11:00:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-ccd-003',
      merchantId: 'merchant-ccd',
      amountPaise: 8000,
      description: 'Referral bonus',
      occurredAt: '2026-05-14T15:30:00.000Z',
      status: 'settled',
    },
  ],
  'merchant-dominos': [
    {
      id: 'tx-dom-001',
      merchantId: 'merchant-dominos',
      amountPaise: -35000,
      description: 'Friday pizza night',
      occurredAt: '2026-06-12T20:45:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-dom-002',
      merchantId: 'merchant-dominos',
      amountPaise: -15000,
      description: 'Garlic bread add-on',
      occurredAt: '2026-06-05T19:20:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-dom-003',
      merchantId: 'merchant-dominos',
      amountPaise: -10000,
      description: 'Delivery tip',
      occurredAt: '2026-05-22T21:00:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-dom-004',
      merchantId: 'merchant-dominos',
      amountPaise: -5000,
      description: 'Cold drink',
      occurredAt: '2026-05-15T14:10:00.000Z',
      status: 'settled',
    },
  ],
  'merchant-lifestyle': [
    {
      id: 'tx-ls-001',
      merchantId: 'merchant-lifestyle',
      amountPaise: 49900,
      description: 'Exchange credit — old jacket',
      occurredAt: '2026-06-08T11:00:00.000Z',
      status: 'settled',
    },
    {
      id: 'tx-ls-002',
      merchantId: 'merchant-lifestyle',
      amountPaise: 40000,
      description: 'Festive cashback credited',
      occurredAt: '2026-05-20T13:00:00.000Z',
      status: 'settled',
    },
  ],
  'merchant-apollo': [
    {
      id: 'tx-ap-001',
      merchantId: 'merchant-apollo',
      amountPaise: -12500,
      description: 'Monthly medicines',
      occurredAt: '2026-05-30T17:25:00.000Z',
      status: 'pending',
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rollupSummary(entries: ReadonlyArray<KhataEntry>): KhataSummary {
  let totalOwed = 0;
  let totalOwedToYou = 0;
  for (const entry of entries) {
    if (entry.balancePaise < 0) {
      totalOwed += Math.abs(entry.balancePaise);
    } else if (entry.balancePaise > 0) {
      totalOwedToYou += entry.balancePaise;
    }
  }
  return {
    entries: [...entries],
    totalOwedPaise: totalOwed,
    totalOwedToYouPaise: totalOwedToYou,
    netBalancePaise: totalOwedToYou - totalOwed,
  };
}

function findEntry(merchantId: string): KhataEntry | undefined {
  return FIXTURE_ENTRIES.find((e) => e.merchantId === merchantId);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/** Every khata endpoint requires authentication. */
router.use(authenticate);

/**
 * GET /api/b/khata
 *
 * Returns the full ledger summary for the authenticated user, including
 * per-merchant entries and the rolled-up totals.
 */
router.get('/', (req, res) => {
  try {
    logger.info('b_khata_summary_query', { userId: req.user?.id ?? null });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, rollupSummary(FIXTURE_ENTRIES));
});

/**
 * GET /api/b/khata/:merchantId
 *
 * Returns the merchant entry plus its recent transaction history. The
 * `:merchantId` must match a known merchant — unknown IDs return 404.
 */
router.get('/:merchantId', (req, res) => {
  const merchantId = typeof req.params.merchantId === 'string'
    ? req.params.merchantId.trim()
    : '';
  if (merchantId.length === 0) {
    return bError(res, 'merchantId is required', 400);
  }

  const entry = findEntry(merchantId);
  if (!entry) {
    return bError(res, 'Merchant not found', 404);
  }

  const transactions = FIXTURE_HISTORIES[merchantId] ?? [];
  const payload: KhataMerchantHistory = {
    merchant: entry,
    transactions: [...transactions],
  };

  try {
    logger.info('b_khata_merchant_history', {
      userId: req.user?.id ?? null,
      merchantId,
      transactionCount: transactions.length,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, payload);
});

export default router;
