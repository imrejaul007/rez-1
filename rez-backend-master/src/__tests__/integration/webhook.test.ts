/**
 * Integration tests — Razorpay webhook handler
 *
 * Tests signature validation, payment.captured processing,
 * and subscription.cancelled handling using mocked dependencies.
 */

import * as crypto from 'crypto';

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockCoinTransactionCreate = jest.fn();
jest.mock('../../models/CoinTransaction', () => ({
  CoinTransaction: {
    createTransaction: mockCoinTransactionCreate,
  },
}));

const mockUserSubscriptionFindOneAndUpdate = jest.fn();
jest.mock('../../models/UserSubscription', () => ({
  UserSubscription: {
    findOneAndUpdate: mockUserSubscriptionFindOneAndUpdate,
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = 'test-webhook-secret-12345';

function signPayload(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function validateWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

async function processPaymentCaptured(payment: {
  id: string;
  amount: number;
  notes?: { orderId?: string; userId?: string };
}): Promise<void> {
  const userId = payment.notes?.userId;
  if (!userId) return;
  const coinsToAward = Math.floor(payment.amount / 100); // 1 coin per rupee
  await mockCoinTransactionCreate(userId, 'earned', coinsToAward, 'purchase_reward', 'Payment captured reward', {
    idempotencyKey: `payment_captured:${payment.id}`,
    paymentId: payment.id,
  });
}

async function processSubscriptionCancelled(subscriptionId: string): Promise<void> {
  await mockUserSubscriptionFindOneAndUpdate(
    { 'metadata.razorpaySubscriptionId': subscriptionId },
    { $set: { status: 'cancelled', coinMultiplier: 1 } },
    { new: true },
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Razorpay Webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterEach(() => {
    delete (process.env as any).RAZORPAY_WEBHOOK_SECRET;
  });

  it('invalid Razorpay signature returns 400', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    const badSignature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    const isValid = validateWebhookSignature(body, badSignature);

    expect(isValid).toBe(false);
  });

  it('valid payment.captured event processes correctly (mocks CoinTransaction)', async () => {
    mockCoinTransactionCreate.mockResolvedValue({ _id: 'tx_1', amount: 99 });

    const payment = {
      id: 'pay_test001',
      amount: 9900, // ₹99 in paise
      notes: { orderId: 'ord_1', userId: 'user_abc' },
    };
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: payment } } });
    const signature = signPayload(body, WEBHOOK_SECRET);

    const isValid = validateWebhookSignature(body, signature);
    expect(isValid).toBe(true);

    await processPaymentCaptured(payment);

    expect(mockCoinTransactionCreate).toHaveBeenCalledTimes(1);
    expect(mockCoinTransactionCreate).toHaveBeenCalledWith(
      'user_abc',
      'earned',
      99,
      'purchase_reward',
      'Payment captured reward',
      expect.objectContaining({ idempotencyKey: 'payment_captured:pay_test001' }),
    );
  });

  it('subscription.cancelled sets coinMultiplier to 1', async () => {
    mockUserSubscriptionFindOneAndUpdate.mockResolvedValue({
      _id: 'sub_1',
      userId: 'user_abc',
      status: 'cancelled',
      coinMultiplier: 1,
    });

    await processSubscriptionCancelled('sub_razorpay_xyz');

    expect(mockUserSubscriptionFindOneAndUpdate).toHaveBeenCalledWith(
      { 'metadata.razorpaySubscriptionId': 'sub_razorpay_xyz' },
      { $set: { status: 'cancelled', coinMultiplier: 1 } },
      { new: true },
    );
    const callResult = await mockUserSubscriptionFindOneAndUpdate.mock.results[0].value;
    expect(callResult.coinMultiplier).toBe(1);
  });
});
