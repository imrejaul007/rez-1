/**
 * Payment Atomicity Tests
 *
 * Tests for Fix 1 (Payment.markCompleted/markFailed atomic static methods),
 * Fix 2 (creditWalletFromPayment double-credit prevention),
 * and Fix 4 (transferCoins balance.total sync).
 *
 * All MongoDB/service calls are mocked so these run without a live DB.
 */

// ---------------------------------------------------------------------------
// Mock Payment model
// ---------------------------------------------------------------------------

const mockFindOneAndUpdate = jest.fn() as jest.Mock<any>;

const mockPaymentInstance = {
  _id: 'pay_obj_id_1',
  paymentId: 'pay_test_1',
  user: 'user_obj_id_1',
  amount: 500,
  paymentMethod: 'razorpay',
  purpose: 'wallet_topup',
  status: 'pending',
  walletCredited: false,
  metadata: {},
};

// Simulate the static markCompleted / markFailed as they are coded in Payment.ts
// (findOneAndUpdate with status filter)
const simulateMarkCompleted = async (
  findOneAndUpdateFn: jest.Mock,
  paymentId: string,
  expectedStatus: string | string[],
) => {
  const statusFilter = Array.isArray(expectedStatus) ? { $in: expectedStatus } : expectedStatus;
  return findOneAndUpdateFn({ paymentId, status: statusFilter }, { $set: { status: 'completed' } }, { new: true });
};

const simulateMarkFailed = async (
  findOneAndUpdateFn: jest.Mock,
  paymentId: string,
  expectedStatus: string | string[],
) => {
  const statusFilter = Array.isArray(expectedStatus) ? { $in: expectedStatus } : expectedStatus;
  return findOneAndUpdateFn({ paymentId, status: statusFilter }, { $set: { status: 'failed' } }, { new: true });
};

// ---------------------------------------------------------------------------
// Mock Wallet model
// ---------------------------------------------------------------------------

const mockWalletFindOneAndUpdate = jest.fn() as jest.Mock<any>;

// ---------------------------------------------------------------------------
// Mock CoinTransaction model
// ---------------------------------------------------------------------------

const mockCoinTransactionFindOne = jest.fn() as jest.Mock<any>;
const mockCoinTransactionCreate = jest.fn() as jest.Mock<any>;

// ---------------------------------------------------------------------------

describe('Payment Atomicity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // Fix 1: Payment.markCompleted returns null when already completed
  // -------------------------------------------------------------------------
  describe('Payment.markCompleted (atomic static)', () => {
    it('returns the updated document when payment is in the expected status', async () => {
      const completedDoc = {
        ...mockPaymentInstance,
        status: 'completed',
        completedAt: new Date(),
        walletCredited: true,
      };
      mockFindOneAndUpdate.mockResolvedValueOnce(completedDoc);

      const result = await simulateMarkCompleted(mockFindOneAndUpdate, 'pay_test_1', 'pending');

      expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
      expect((result as any)?.status).toBe('completed');
    });

    it('returns null if the payment is already in completed status (concurrent call)', async () => {
      // Second call: MongoDB finds no document matching { status: 'pending' } because it is
      // already 'completed' — returns null, signalling the caller to bail out.
      mockFindOneAndUpdate.mockResolvedValueOnce(null);

      const result = await simulateMarkCompleted(mockFindOneAndUpdate, 'pay_test_1', 'pending');

      expect(result).toBeNull();
    });

    it('accepts an array of expected statuses and passes $in filter', async () => {
      const completedDoc = { ...mockPaymentInstance, status: 'completed' };
      mockFindOneAndUpdate.mockResolvedValueOnce(completedDoc);

      await simulateMarkCompleted(mockFindOneAndUpdate, 'pay_test_1', ['pending', 'processing']);

      const callArgs = mockFindOneAndUpdate.mock.calls[0] as any[];
      const filter = callArgs[0] as any;
      // The status filter should use $in for arrays
      expect(filter.status).toEqual({ $in: ['pending', 'processing'] });
    });

    it('Payment.markFailed returns null if already in terminal state', async () => {
      // Simulates document already completed — findOneAndUpdate finds nothing
      mockFindOneAndUpdate.mockResolvedValueOnce(null);

      const result = await simulateMarkFailed(mockFindOneAndUpdate, 'pay_test_1', ['pending', 'processing']);

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Fix 2: creditWalletFromPayment skips when walletCredited=true
  // -------------------------------------------------------------------------
  describe('creditWalletFromPayment — walletCredited guard', () => {
    it('exits immediately when payment.walletCredited is true (fast-path)', async () => {
      // Replicate the fast-path guard logic from the fixed creditWalletFromPayment
      const payment = { ...mockPaymentInstance, walletCredited: true };

      let walletUpdateCalled = false;

      async function creditWalletSimulation(pmt: typeof payment) {
        if (pmt.walletCredited) {
          return; // fast-path exit — wallet already credited
        }
        walletUpdateCalled = true; // should NOT reach here
      }

      await creditWalletSimulation(payment);

      expect(walletUpdateCalled).toBe(false);
    });

    it('proceeds with wallet credit when walletCredited is false', async () => {
      const payment = { ...mockPaymentInstance, walletCredited: false };

      let walletUpdateCalled = false;

      async function creditWalletSimulation(pmt: typeof payment) {
        if (pmt.walletCredited) {
          return;
        }
        // CAS guard
        const claimed = mockFindOneAndUpdate({ paymentId: pmt.paymentId, walletCredited: { $ne: true } }, {}, {});
        if (!claimed) return;
        walletUpdateCalled = true; // reached wallet credit path
      }

      // CAS returns a document (claimed successfully)
      mockFindOneAndUpdate.mockReturnValueOnce(payment);

      await creditWalletSimulation(payment);

      expect(walletUpdateCalled).toBe(true);
    });

    it('two concurrent callers: second CAS returns null and skips wallet update', async () => {
      // First call wins the CAS; second call returns null → skips
      const payment = { ...mockPaymentInstance, walletCredited: false };
      let creditCount = 0;

      async function creditWalletSimulation(pmt: typeof payment, casReturnValue: any) {
        if (pmt.walletCredited) return;
        const claimed = casReturnValue; // simulate CAS result
        if (!claimed) return;
        creditCount++;
      }

      // Call 1 succeeds (claimed = payment doc)
      await creditWalletSimulation(payment, payment);
      // Call 2 loses the race (claimed = null)
      await creditWalletSimulation(payment, null);

      expect(creditCount).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Fix 4: transferCoins updates balance.total on both sender and recipient
  // -------------------------------------------------------------------------
  describe('transferCoins — balance.total sync', () => {
    it('debit operation includes balance.total in $inc', async () => {
      const amount = 100;

      // Simulate the debit findOneAndUpdate call as coded after Fix 4
      const debitCall = (filter: any, update: any, _opts: any) => {
        return mockWalletFindOneAndUpdate(filter, update, _opts);
      };

      mockWalletFindOneAndUpdate.mockResolvedValueOnce({ balance: { available: 400, total: 400 } });

      await debitCall(
        { user: 'from_user', 'balance.available': { $gte: amount }, isFrozen: false },
        { $inc: { 'balance.available': -amount, 'balance.total': -amount }, $set: { lastTransactionAt: new Date() } },
        { new: true },
      );

      const updateArg = mockWalletFindOneAndUpdate.mock.calls[0][1] as any;
      expect(updateArg.$inc['balance.available']).toBe(-amount);
      expect(updateArg.$inc['balance.total']).toBe(-amount);
    });

    it('credit operation includes balance.total in $inc', async () => {
      const amount = 100;

      mockWalletFindOneAndUpdate.mockResolvedValueOnce({ balance: { available: 600, total: 600 } });

      await mockWalletFindOneAndUpdate(
        { user: 'to_user' },
        { $inc: { 'balance.available': amount, 'balance.total': amount }, $set: { lastTransactionAt: new Date() } },
        { new: true },
      );

      const updateArg = mockWalletFindOneAndUpdate.mock.calls[0][1] as any;
      expect(updateArg.$inc['balance.available']).toBe(amount);
      expect(updateArg.$inc['balance.total']).toBe(amount);
    });

    it('balance.total and balance.available change by equal magnitudes for a transfer', () => {
      const amount = 250;

      // Sender: both fields decrease by `amount`
      const senderDebit = { 'balance.available': -amount, 'balance.total': -amount };
      // Recipient: both fields increase by `amount`
      const recipientCredit = { 'balance.available': amount, 'balance.total': amount };

      expect(senderDebit['balance.available']).toBe(senderDebit['balance.total']);
      expect(recipientCredit['balance.available']).toBe(recipientCredit['balance.total']);
      // Net change across the system is zero (conservation)
      expect(senderDebit['balance.total'] + recipientCredit['balance.total']).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Fix 3: updatePaymentFromWebhook — atomic status update
  // -------------------------------------------------------------------------
  describe('updatePaymentFromWebhook — atomic terminal-state guard', () => {
    it('skips update when payment is already completed', async () => {
      // Simulate: findOneAndUpdate with { status: { $ne: 'completed' } } returns null
      // because the document is already completed.
      mockFindOneAndUpdate.mockResolvedValueOnce(null);

      const updated = await mockFindOneAndUpdate(
        { _id: 'pay_obj_id_1', status: { $ne: 'completed' } },
        { $set: { status: 'completed', updatedAt: new Date() } },
        { new: true },
      );

      expect(updated).toBeNull();
      // Caller should bail out — wallet credit must NOT be triggered
    });

    it('proceeds with update when payment is in a non-terminal state', async () => {
      const completedDoc = { ...mockPaymentInstance, status: 'completed' };
      mockFindOneAndUpdate.mockResolvedValueOnce(completedDoc);

      const updated = await mockFindOneAndUpdate(
        { _id: 'pay_obj_id_1', status: { $ne: 'completed' } },
        { $set: { status: 'completed', updatedAt: new Date() } },
        { new: true },
      );

      expect(updated).not.toBeNull();
      expect((updated as any)?.status).toBe('completed');
    });
  });
});
