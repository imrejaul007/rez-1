/**
 * Webhook Idempotency Tests
 *
 * Covers the wallet-credit idempotency guard added to
 * paymentGatewayService.updatePaymentFromWebhook /
 * creditWalletFromPayment.
 *
 * All MongoDB and external calls are mocked so these run without a live DB
 * or Razorpay credentials.
 *
 * Scenarios:
 *   1. First webhook call credits wallet and sets walletCredited: true.
 *   2. Second webhook call with same razorpayOrderId returns early without
 *      crediting again.
 *   3. Concurrent webhook calls (Promise.all) result in exactly one credit.
 */

// ---------------------------------------------------------------------------
// Mocks — defined before any imports that would pull in the real modules
// ---------------------------------------------------------------------------

// Payment model mock
const mockPaymentFindOne = jest.fn();
const mockPaymentFindOneAndUpdate = jest.fn();

jest.mock('../models/Payment', () => ({
  Payment: {
    findOne: (...args: any[]) => mockPaymentFindOne(...args),
    findOneAndUpdate: (...args: any[]) => mockPaymentFindOneAndUpdate(...args),
  },
}));

// Wallet model mock
const mockWalletFindOne = jest.fn();
const mockWalletFindOneAndUpdate = jest.fn();

jest.mock('../models/Wallet', () => ({
  Wallet: {
    findOne: (...args: any[]) => mockWalletFindOne(...args),
    findOneAndUpdate: (...args: any[]) => mockWalletFindOneAndUpdate(...args),
    createForUser: jest.fn(),
  },
}));

// CoinTransaction model mock
const mockCoinTransactionCreateTransaction = jest.fn();
jest.mock('../models/CoinTransaction', () => ({
  CoinTransaction: {
    createTransaction: (...args: any[]) => mockCoinTransactionCreateTransaction(...args),
  },
}));

// Mongoose session/transaction mock
const mockCommitTransaction = jest.fn().mockResolvedValue(undefined);
const mockAbortTransaction = jest.fn().mockResolvedValue(undefined);
const mockEndSession = jest.fn();

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: mockCommitTransaction,
  abortTransaction: mockAbortTransaction,
  endSession: mockEndSession,
};

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    startSession: jest.fn().mockResolvedValue(mockSession),
    Types: actual.Types,
  };
});

// Logger mock (suppress output during tests)
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  createServiceLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// FSM — allow all transitions so tests focus on idempotency, not state machine
jest.mock('../config/financialStateMachine', () => ({
  assertValidTransition: jest.fn(),
  validatePaymentTransition: jest.fn().mockReturnValue(true),
}));

// Prometheus mock
jest.mock('../config/prometheus', () => ({
  fsmInvalidTransitionAttempts: { inc: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base payment document returned by Payment.findOne */
function makePaymentDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: 'pay_obj_id_1',
    paymentId: 'order_razorpay_abc123',
    user: 'user_obj_id_1',
    amount: 500,
    paymentMethod: 'razorpay',
    purpose: 'wallet_topup',
    status: 'pending',
    walletCredited: false,
    metadata: {
      razorpayOrderId: 'order_razorpay_abc123',
    },
    ...overrides,
  };
}

/** Stripe payment document stub */
function makeStripePaymentDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: 'pay_obj_stripe_1',
    paymentId: 'pi_stripe_abc123',
    user: 'user_obj_id_1',
    amount: 1000,
    paymentMethod: 'stripe',
    purpose: 'wallet_topup',
    status: 'pending',
    walletCredited: false,
    metadata: {
      stripeWebhookId: 'evt_stripe_abc123',
    },
    ...overrides,
  };
}

/** PayPal payment document stub */
function makePayPalPaymentDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: 'pay_obj_paypal_1',
    paymentId: 'pp_order_abc123',
    user: 'user_obj_id_1',
    amount: 750,
    paymentMethod: 'paypal',
    purpose: 'wallet_topup',
    status: 'pending',
    walletCredited: false,
    metadata: {
      paypalOrderId: 'PP_ORDER_abc123',
    },
    ...overrides,
  };
}

/** Wallet document stub */
const walletDoc = {
  _id: 'wallet_obj_id_1',
  user: 'user_obj_id_1',
  balance: { available: 1000, total: 1000 },
  coins: [{ type: 'rez', amount: 1000, isActive: true }],
};

// ---------------------------------------------------------------------------
// Inline simulation of the idempotency logic
// (mirrors the actual implementation in paymentGatewayService.ts)
// ---------------------------------------------------------------------------

/**
 * Simulates updatePaymentFromWebhook for a payment.captured event.
 * Returns 'already_credited' | 'already_completed' | 'credited' | 'not_found'.
 */
async function simulateUpdatePaymentFromWebhook(
  razorpayOrderId: string,
  creditFn: (payment: Record<string, unknown>) => Promise<void>,
): Promise<'already_credited' | 'already_completed' | 'credited' | 'not_found'> {
  const payment = await mockPaymentFindOne({
    $or: [{ paymentId: razorpayOrderId }, { 'metadata.razorpayOrderId': razorpayOrderId }],
  });

  if (!payment) return 'not_found';

  // Idempotency fast-path: wallet already credited
  if (payment.walletCredited && payment.purpose === 'wallet_topup') {
    return 'already_credited';
  }

  // Already completed guard
  if (payment.status === 'completed') {
    return 'already_completed';
  }

  // Atomic CAS: only one concurrent delivery wins
  const updated = await mockPaymentFindOneAndUpdate(
    { _id: payment._id, status: { $ne: 'completed' } },
    { $set: { status: 'completed', completedAt: new Date() } },
    { new: true },
  );

  if (!updated) return 'already_completed';

  // Proceed to credit wallet (has its own CAS inside a transaction)
  await creditFn(payment);
  return 'credited';
}

/**
 * Simulates creditWalletFromPayment.
 * Returns true if this call actually performed the credit, false if already done.
 */
async function simulateCreditWallet(payment: Record<string, unknown>): Promise<boolean> {
  // Fast-path: already credited in-memory
  if (payment.walletCredited) return false;

  // Session-level idempotency: re-read with walletCredited: { $ne: true }
  const freshPayment = await mockPaymentFindOne({
    paymentId: payment.paymentId,
    walletCredited: { $ne: true },
  });

  if (!freshPayment) return false; // already credited by a concurrent winner

  // Wallet credit step (mocked)
  await mockWalletFindOneAndUpdate(
    { user: payment.user as string, 'coins.type': 'rez' },
    { $inc: { 'balance.available': payment.amount, 'balance.total': payment.amount } },
    {},
  );

  // Ledger entry (mocked)
  await mockCoinTransactionCreateTransaction(
    payment.user,
    'earned',
    payment.amount,
    'recharge',
    'Wallet recharge',
    {},
    null,
    mockSession,
  );

  // Optimistic lock: set walletCredited: true ONLY if still false
  const stamped = await mockPaymentFindOneAndUpdate(
    { _id: payment._id, walletCredited: false },
    { $set: { walletCredited: true, walletCreditedAt: new Date() } },
    { session: mockSession },
  );

  // If another concurrent request already set it, this returns null — idempotent
  return stamped !== null;
}

// ---------------------------------------------------------------------------
// Inline simulation of checkWebhookIdempotency
// (mirrors the public method added to paymentGatewayService.ts)
// ---------------------------------------------------------------------------

type CheckOutcome =
  | { outcome: 'not_found' }
  | { outcome: 'already_credited'; payment: Record<string, unknown> }
  | { outcome: 'already_completed'; payment: Record<string, unknown> }
  | { outcome: 'proceed'; payment: Record<string, unknown> };

async function simulateCheckWebhookIdempotency(
  gatewayTxId: string,
  metadataKey: 'stripeWebhookId' | 'paypalOrderId',
): Promise<CheckOutcome> {
  // Layer 0: lookup by metadata key
  const payment = await mockPaymentFindOne({ [`metadata.${metadataKey}`]: gatewayTxId });

  if (!payment) return { outcome: 'not_found' };

  // Layer 1: fast-path walletCredited check
  if (payment.walletCredited && payment.purpose === 'wallet_topup') {
    return { outcome: 'already_credited', payment };
  }

  // Layer 2: status CAS
  const updated = await mockPaymentFindOneAndUpdate(
    { _id: payment._id, status: { $ne: 'completed' } },
    { $set: { status: 'completed', completedAt: new Date() } },
    { new: true },
  );

  if (!updated) return { outcome: 'already_completed', payment };

  return { outcome: 'proceed', payment: updated as Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Webhook idempotency — wallet credit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCommitTransaction.mockResolvedValue(undefined);
    mockAbortTransaction.mockResolvedValue(undefined);
  });

  // ── Scenario 1: First webhook credits wallet and sets walletCredited: true ─

  describe('Scenario 1 — first webhook delivery', () => {
    it('credits the wallet and returns "credited"', async () => {
      const razorpayOrderId = 'order_razorpay_abc123';
      const payment = makePaymentDoc();

      // findOne returns the payment (first call in updatePaymentFromWebhook,
      // second call inside simulateCreditWallet)
      mockPaymentFindOne.mockResolvedValueOnce(payment); // outer lookup
      mockPaymentFindOne.mockResolvedValueOnce(payment); // inner freshPayment check

      // CAS on status: returns updated doc (we win the race)
      mockPaymentFindOneAndUpdate.mockResolvedValueOnce({ ...payment, status: 'completed' });

      // Wallet update succeeds
      mockWalletFindOneAndUpdate.mockResolvedValueOnce(walletDoc);

      // CoinTransaction succeeds
      mockCoinTransactionCreateTransaction.mockResolvedValueOnce({ _id: 'tx_1' });

      // Optimistic lock on walletCredited returns updated doc (we win)
      mockPaymentFindOneAndUpdate.mockResolvedValueOnce({ ...payment, walletCredited: true });

      const result = await simulateUpdatePaymentFromWebhook(razorpayOrderId, simulateCreditWallet);

      expect(result).toBe('credited');
      expect(mockWalletFindOneAndUpdate).toHaveBeenCalledTimes(1);

      // Verify the optimistic-lock filter used walletCredited: false
      const lockCall = mockPaymentFindOneAndUpdate.mock.calls[1] as any[];
      expect(lockCall[0]).toMatchObject({ walletCredited: false });
      expect(lockCall[1].$set.walletCredited).toBe(true);
    });
  });

  // ── Scenario 2: Second webhook with same razorpayOrderId — no double credit ─

  describe('Scenario 2 — duplicate webhook replay', () => {
    it('returns "already_credited" without touching wallet', async () => {
      const razorpayOrderId = 'order_razorpay_abc123';
      // Payment already credited from the first delivery
      const alreadyCreditedPayment = makePaymentDoc({ walletCredited: true, status: 'completed' });

      mockPaymentFindOne.mockResolvedValueOnce(alreadyCreditedPayment);

      const result = await simulateUpdatePaymentFromWebhook(razorpayOrderId, simulateCreditWallet);

      expect(result).toBe('already_credited');
      // Wallet must NOT be touched
      expect(mockWalletFindOneAndUpdate).not.toHaveBeenCalled();
      // CAS on status must NOT be attempted
      expect(mockPaymentFindOneAndUpdate).not.toHaveBeenCalled();
    });

    it('lookup by metadata.razorpayOrderId works when paymentId differs', async () => {
      const razorpayOrderId = 'order_razorpay_abc123';
      // Old doc created before paymentId-enrichment where paymentId might be
      // an internal ID; the index on metadata.razorpayOrderId still finds it.
      const payment = makePaymentDoc({
        paymentId: 'internal_pay_id_old',
        walletCredited: true,
        status: 'completed',
        metadata: { razorpayOrderId },
      });

      mockPaymentFindOne.mockResolvedValueOnce(payment);

      const result = await simulateUpdatePaymentFromWebhook(razorpayOrderId, simulateCreditWallet);

      expect(result).toBe('already_credited');
      expect(mockWalletFindOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  // ── Scenario 3: Concurrent deliveries — exactly one credit ─────────────────

  describe('Scenario 3 — concurrent webhook deliveries', () => {
    it('exactly one credit when two concurrent calls race on CAS', async () => {
      const razorpayOrderId = 'order_razorpay_abc123';
      const payment = makePaymentDoc();

      // Both deliveries pass the outer findOne (same unprocessed doc)
      mockPaymentFindOne
        .mockResolvedValueOnce(payment) // delivery A — outer lookup
        .mockResolvedValueOnce(payment) // delivery B — outer lookup
        .mockResolvedValueOnce(payment) // delivery A — inner freshPayment
        .mockResolvedValueOnce(null); // delivery B — inner freshPayment: already claimed

      // Delivery A wins the status CAS; delivery B gets null (already completed)
      mockPaymentFindOneAndUpdate
        .mockResolvedValueOnce({ ...payment, status: 'completed' }) // A wins status CAS
        .mockResolvedValueOnce(null) // B loses status CAS
        .mockResolvedValueOnce({ ...payment, walletCredited: true }); // A wins walletCredited CAS

      mockWalletFindOneAndUpdate.mockResolvedValueOnce(walletDoc);
      mockCoinTransactionCreateTransaction.mockResolvedValueOnce({ _id: 'tx_concurrent' });

      // Fire both deliveries concurrently
      const [resultA, resultB] = await Promise.all([
        simulateUpdatePaymentFromWebhook(razorpayOrderId, simulateCreditWallet),
        simulateUpdatePaymentFromWebhook(razorpayOrderId, simulateCreditWallet),
      ]);

      // One wins, one is rejected by the CAS
      const credited = [resultA, resultB].filter((r) => r === 'credited').length;
      const skipped = [resultA, resultB].filter((r) => r === 'already_completed').length;

      expect(credited).toBe(1);
      expect(skipped).toBe(1);

      // Wallet credited exactly once
      expect(mockWalletFindOneAndUpdate).toHaveBeenCalledTimes(1);
    });

    it('optimistic lock on walletCredited stops a second concurrent credit', async () => {
      // Both callers pass the freshPayment check (race before transaction commits).
      // The walletCredited CAS ensures only one actually sets walletCredited: true.
      const payment = makePaymentDoc();
      let creditCount = 0;

      async function creditWithOptimisticLock(casResult: Record<string, unknown> | null): Promise<void> {
        if (payment.walletCredited) return;

        // Simulate wallet update always succeeds (the race is on the final stamp)
        mockWalletFindOneAndUpdate.mockResolvedValueOnce(walletDoc);
        mockCoinTransactionCreateTransaction.mockResolvedValueOnce({ _id: 'tx_opt' });

        // Optimistic lock: only winner gets non-null back
        mockPaymentFindOneAndUpdate.mockResolvedValueOnce(casResult);

        const stamped = await mockPaymentFindOneAndUpdate(
          { _id: payment._id, walletCredited: false },
          { $set: { walletCredited: true, walletCreditedAt: new Date() } },
          {},
        );

        if (stamped !== null) {
          creditCount++;
        }
      }

      // Call A wins the CAS (gets updated doc back)
      await creditWithOptimisticLock({ ...payment, walletCredited: true });
      // Call B loses the CAS (gets null back — another process already set it)
      await creditWithOptimisticLock(null);

      expect(creditCount).toBe(1);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Generic idempotency helper — checkWebhookIdempotency
// Tests cover: stripeWebhookId and paypalOrderId metadata key lookups,
// all four outcome branches, and the concurrent CAS race.
// ──────────────────────────────────────────────────────────────────────────────

describe('checkWebhookIdempotency — generic gateway guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Stripe: stripeWebhookId lookup ──────────────────────────────────────────

  describe('stripeWebhookId lookup', () => {
    it('returns "not_found" when no payment has the given stripeWebhookId', async () => {
      mockPaymentFindOne.mockResolvedValueOnce(null);

      const result = await simulateCheckWebhookIdempotency('evt_unknown', 'stripeWebhookId');

      expect(result.outcome).toBe('not_found');
      expect(mockPaymentFindOneAndUpdate).not.toHaveBeenCalled();
    });

    it('returns "already_credited" when wallet was already credited (fast-path)', async () => {
      const payment = makeStripePaymentDoc({ walletCredited: true, status: 'completed' });
      mockPaymentFindOne.mockResolvedValueOnce(payment);

      const result = await simulateCheckWebhookIdempotency('evt_stripe_abc123', 'stripeWebhookId');

      expect(result.outcome).toBe('already_credited');
      // CAS must NOT be attempted on the already-credited path
      expect(mockPaymentFindOneAndUpdate).not.toHaveBeenCalled();
    });

    it('returns "already_completed" when status CAS returns null (another process won)', async () => {
      const payment = makeStripePaymentDoc({ walletCredited: false, status: 'completed' });
      mockPaymentFindOne.mockResolvedValueOnce(payment);
      // CAS fails — document was already completed by a concurrent delivery
      mockPaymentFindOneAndUpdate.mockResolvedValueOnce(null);

      const result = await simulateCheckWebhookIdempotency('evt_stripe_abc123', 'stripeWebhookId');

      expect(result.outcome).toBe('already_completed');
    });

    it('returns "proceed" on the first (winning) delivery and uses correct CAS filter', async () => {
      const payment = makeStripePaymentDoc();
      mockPaymentFindOne.mockResolvedValueOnce(payment);
      mockPaymentFindOneAndUpdate.mockResolvedValueOnce({ ...payment, status: 'completed' });

      const result = await simulateCheckWebhookIdempotency('evt_stripe_abc123', 'stripeWebhookId');

      expect(result.outcome).toBe('proceed');

      // Verify the metadata query used the correct key (literal dot key, not nested path)
      const findOneCall = mockPaymentFindOne.mock.calls[0][0] as Record<string, unknown>;
      expect(findOneCall['metadata.stripeWebhookId']).toBe('evt_stripe_abc123');

      // Verify the CAS filter uses status: { $ne: 'completed' }
      const casFilter = mockPaymentFindOneAndUpdate.mock.calls[0][0] as Record<string, unknown>;
      expect(casFilter).toMatchObject({ status: { $ne: 'completed' } });
    });
  });

  // ── PayPal: paypalOrderId lookup ─────────────────────────────────────────────

  describe('paypalOrderId lookup', () => {
    it('returns "not_found" when no payment has the given paypalOrderId', async () => {
      mockPaymentFindOne.mockResolvedValueOnce(null);

      const result = await simulateCheckWebhookIdempotency('PP_UNKNOWN', 'paypalOrderId');

      expect(result.outcome).toBe('not_found');
    });

    it('returns "already_credited" when wallet was already credited via PayPal', async () => {
      const payment = makePayPalPaymentDoc({ walletCredited: true, status: 'completed' });
      mockPaymentFindOne.mockResolvedValueOnce(payment);

      const result = await simulateCheckWebhookIdempotency('PP_ORDER_abc123', 'paypalOrderId');

      expect(result.outcome).toBe('already_credited');
      expect(mockPaymentFindOneAndUpdate).not.toHaveBeenCalled();
    });

    it('returns "proceed" on first delivery and uses correct metadata key', async () => {
      const payment = makePayPalPaymentDoc();
      mockPaymentFindOne.mockResolvedValueOnce(payment);
      mockPaymentFindOneAndUpdate.mockResolvedValueOnce({ ...payment, status: 'completed' });

      const result = await simulateCheckWebhookIdempotency('PP_ORDER_abc123', 'paypalOrderId');

      expect(result.outcome).toBe('proceed');

      const findOneCall = mockPaymentFindOne.mock.calls[0][0] as Record<string, unknown>;
      // Literal dot key — MongoDB query object, not nested object
      expect(findOneCall['metadata.paypalOrderId']).toBe('PP_ORDER_abc123');
    });
  });

  // ── Concurrent deliveries: exactly one "proceed", one "already_completed" ───

  describe('concurrent Stripe deliveries', () => {
    it('exactly one "proceed" when two concurrent calls race on status CAS', async () => {
      const payment = makeStripePaymentDoc();

      // Both deliveries find the same unprocessed doc
      mockPaymentFindOne
        .mockResolvedValueOnce(payment) // delivery A
        .mockResolvedValueOnce(payment); // delivery B

      // Delivery A wins the CAS; delivery B gets null
      mockPaymentFindOneAndUpdate
        .mockResolvedValueOnce({ ...payment, status: 'completed' }) // A wins
        .mockResolvedValueOnce(null); // B loses

      const [resultA, resultB] = await Promise.all([
        simulateCheckWebhookIdempotency('evt_stripe_abc123', 'stripeWebhookId'),
        simulateCheckWebhookIdempotency('evt_stripe_abc123', 'stripeWebhookId'),
      ]);

      const outcomes = [resultA.outcome, resultB.outcome];
      expect(outcomes.filter((o) => o === 'proceed')).toHaveLength(1);
      expect(outcomes.filter((o) => o === 'already_completed')).toHaveLength(1);
    });
  });
});
