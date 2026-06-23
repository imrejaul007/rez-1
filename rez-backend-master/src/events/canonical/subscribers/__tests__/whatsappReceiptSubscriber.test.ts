/**
 * Unit tests for whatsappReceiptSubscriber.
 *
 * Mocks: ProcessedEvent (create/deleteOne), UserConsent (hasActiveConsent),
 * User (findById), Order (findById), WhatsAppMarketingService (sendText).
 * No real Mongo, no real Meta API.
 *
 * Coverage:
 *   • Mode env parsing (off / shadow / primary / unknown)
 *   • Mode=off short-circuits before any work
 *   • Malformed envelopes dropped
 *   • Anonymous (customerId=null) payments skipped
 *   • No-consent users skipped
 *   • Consent lookup failure defaults to NO-consent (fail-closed)
 *   • Duplicate event no-ops (claim returns false)
 *   • User with no phone → skip after claim
 *   • Happy-path primary send
 *   • Shadow mode skips Meta call but logs
 *   • sendText returns {success:false} → claim is rolled back
 *   • sendText throws → claim is rolled back
 *   • Build-receipt-message formatting for {cash, razorpay, other} gateways
 *     and with/without orderNumber
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPeCreate = jest.fn();
const mockPeDelete = jest.fn();
jest.mock('../../../../models/ProcessedEvent', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockPeCreate(...args),
    deleteOne: (...args: unknown[]) => mockPeDelete(...args),
  },
}));

const mockHasActiveConsent = jest.fn();
jest.mock('../../../../models/UserConsent', () => ({
  __esModule: true,
  default: {
    hasActiveConsent: (...args: unknown[]) => mockHasActiveConsent(...args),
  },
}));

const mockUserFindById = jest.fn();
jest.mock('../../../../models/User', () => ({
  User: {
    findById: (...args: unknown[]) => mockUserFindById(...args),
  },
}));

const mockOrderFindById = jest.fn();
jest.mock('../../../../models/Order', () => ({
  Order: {
    findById: (...args: unknown[]) => mockOrderFindById(...args),
  },
}));

const mockSendText = jest.fn();
jest.mock('../../../../services/WhatsAppMarketingService', () => ({
  whatsAppMarketingService: {
    sendText: (...args: unknown[]) => mockSendText(...args),
  },
}));

jest.mock('../../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../../config/bullmq-connection', () => ({
  bullmqRedis: {},
}));

import { __testOnly } from '../whatsappReceiptSubscriber';
const { processPaymentSettled, getWhatsAppReceiptMode, buildReceiptMessage, PROCESSOR_KEY } =
  __testOnly;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_EVENT = {
  eventId: 'evt-pay-1',
  eventType: 'payment.settled' as const,
  occurredAt: '2026-04-23T10:00:00.000Z',
  merchantId: 'merchant-abc',
  customerId: 'user-123',
  paymentId: 'pay_test_1',
  orderId: 'order-999',
  amount: 450,
  gateway: 'razorpay' as const,
};

function leanResolved<T>(value: T) {
  return { select: () => ({ lean: async () => value }) };
}

const ORIG_MODE = process.env.CANONICAL_WHATSAPP_RECEIPT_MODE;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('whatsappReceiptSubscriber', () => {
  beforeEach(() => {
    mockPeCreate.mockReset();
    mockPeDelete.mockReset();
    mockHasActiveConsent.mockReset();
    mockUserFindById.mockReset();
    mockOrderFindById.mockReset();
    mockSendText.mockReset();
    // Default: every model returns nothing; consent = true.
    mockHasActiveConsent.mockResolvedValue(true);
    mockUserFindById.mockReturnValue(leanResolved({ phoneNumber: '+919812345678' }));
    mockOrderFindById.mockReturnValue(leanResolved({ orderNumber: 'ORD12345' }));
    mockPeCreate.mockResolvedValue({});
    mockPeDelete.mockResolvedValue({ deletedCount: 1 });
    mockSendText.mockResolvedValue({ success: true, messageId: 'wamid.abc' });
    process.env.CANONICAL_WHATSAPP_RECEIPT_MODE = 'primary';
  });

  afterAll(() => {
    if (ORIG_MODE === undefined) {
      delete (process.env as any).CANONICAL_WHATSAPP_RECEIPT_MODE;
    } else {
      process.env.CANONICAL_WHATSAPP_RECEIPT_MODE = ORIG_MODE;
    }
  });

  // ─── Mode parsing ──────────────────────────────────────────────────────────
  describe('getWhatsAppReceiptMode', () => {
    it('returns off when env unset', () => {
      delete (process.env as any).CANONICAL_WHATSAPP_RECEIPT_MODE;
      expect(getWhatsAppReceiptMode()).toBe('off');
    });

    it('returns off when env is empty string', () => {
      process.env.CANONICAL_WHATSAPP_RECEIPT_MODE = '';
      expect(getWhatsAppReceiptMode()).toBe('off');
    });

    it('returns off for unknown values', () => {
      process.env.CANONICAL_WHATSAPP_RECEIPT_MODE = 'something-weird';
      expect(getWhatsAppReceiptMode()).toBe('off');
    });

    it('returns shadow for "shadow"', () => {
      process.env.CANONICAL_WHATSAPP_RECEIPT_MODE = 'shadow';
      expect(getWhatsAppReceiptMode()).toBe('shadow');
    });

    it('returns primary for "primary"', () => {
      process.env.CANONICAL_WHATSAPP_RECEIPT_MODE = 'primary';
      expect(getWhatsAppReceiptMode()).toBe('primary');
    });

    it('is case-insensitive', () => {
      process.env.CANONICAL_WHATSAPP_RECEIPT_MODE = 'SHADOW';
      expect(getWhatsAppReceiptMode()).toBe('shadow');
      process.env.CANONICAL_WHATSAPP_RECEIPT_MODE = 'Primary';
      expect(getWhatsAppReceiptMode()).toBe('primary');
    });
  });

  // ─── buildReceiptMessage ───────────────────────────────────────────────────
  describe('buildReceiptMessage', () => {
    it('formats amount with ₹ + Indian grouping', () => {
      expect(
        buildReceiptMessage({ amount: 12345, orderNumber: 'ORD1', gateway: 'razorpay' }),
      ).toContain('₹12,345');
    });

    it('includes order number when provided', () => {
      expect(
        buildReceiptMessage({ amount: 100, orderNumber: 'ORD777', gateway: 'razorpay' }),
      ).toContain('order ORD777');
    });

    it('omits order-number clause when orderNumber absent', () => {
      const msg = buildReceiptMessage({ amount: 100, gateway: 'razorpay' });
      expect(msg).not.toContain('order undefined');
      expect(msg).toContain('₹100');
    });

    it('labels razorpay as "card/UPI"', () => {
      expect(
        buildReceiptMessage({ amount: 100, orderNumber: 'o', gateway: 'razorpay' }),
      ).toContain('card/UPI');
    });

    it('labels cash as "cash"', () => {
      expect(
        buildReceiptMessage({ amount: 100, orderNumber: 'o', gateway: 'cash' }),
      ).toContain(' cash');
    });

    it('passes through other gateway names', () => {
      expect(buildReceiptMessage({ amount: 100, orderNumber: 'o', gateway: 'upi' })).toContain(
        ' upi',
      );
    });
  });

  // ─── Mode=off short-circuit ────────────────────────────────────────────────
  it('mode=off: does NOT validate, claim, or send', async () => {
    process.env.CANONICAL_WHATSAPP_RECEIPT_MODE = 'off';
    await processPaymentSettled(VALID_EVENT);
    expect(mockPeCreate).not.toHaveBeenCalled();
    expect(mockSendText).not.toHaveBeenCalled();
    expect(mockHasActiveConsent).not.toHaveBeenCalled();
  });

  // ─── Envelope validation ───────────────────────────────────────────────────
  it('drops malformed events (missing customerId type)', async () => {
    await processPaymentSettled({ ...VALID_EVENT, eventId: undefined });
    expect(mockPeCreate).not.toHaveBeenCalled();
    expect(mockSendText).not.toHaveBeenCalled();
  });

  it('drops events with wrong eventType', async () => {
    await processPaymentSettled({ ...VALID_EVENT, eventType: 'order.placed' });
    expect(mockPeCreate).not.toHaveBeenCalled();
  });

  // ─── Anonymous payments ────────────────────────────────────────────────────
  it('skips anonymous payments (customerId=null) without claiming', async () => {
    await processPaymentSettled({ ...VALID_EVENT, customerId: null });
    expect(mockHasActiveConsent).not.toHaveBeenCalled();
    expect(mockPeCreate).not.toHaveBeenCalled();
    expect(mockSendText).not.toHaveBeenCalled();
  });

  // ─── Consent ───────────────────────────────────────────────────────────────
  it('skips when user has no whatsapp_transactional consent', async () => {
    mockHasActiveConsent.mockResolvedValueOnce(false);
    await processPaymentSettled(VALID_EVENT);
    expect(mockHasActiveConsent).toHaveBeenCalledWith('user-123', 'whatsapp_transactional');
    expect(mockPeCreate).not.toHaveBeenCalled();
    expect(mockSendText).not.toHaveBeenCalled();
  });

  it('fails closed — if consent lookup throws, treat as NO consent', async () => {
    mockHasActiveConsent.mockRejectedValueOnce(new Error('db down'));
    await processPaymentSettled(VALID_EVENT);
    expect(mockPeCreate).not.toHaveBeenCalled();
    expect(mockSendText).not.toHaveBeenCalled();
  });

  // ─── Idempotency ───────────────────────────────────────────────────────────
  it('no-ops when claimEvent reports duplicate (code 11000)', async () => {
    const dupErr: any = new Error('dup');
    dupErr.code = 11000;
    mockPeCreate.mockRejectedValueOnce(dupErr);
    await processPaymentSettled(VALID_EVENT);
    expect(mockSendText).not.toHaveBeenCalled();
  });

  it('skips send when claimEvent fails with a non-11000 error', async () => {
    mockPeCreate.mockRejectedValueOnce(new Error('unexpected'));
    await processPaymentSettled(VALID_EVENT);
    expect(mockSendText).not.toHaveBeenCalled();
  });

  // ─── No phone on user ──────────────────────────────────────────────────────
  it('skips (claim stays) when user has no phone', async () => {
    mockUserFindById.mockReturnValueOnce(leanResolved({}));
    await processPaymentSettled(VALID_EVENT);
    expect(mockPeCreate).toHaveBeenCalledTimes(1);
    expect(mockSendText).not.toHaveBeenCalled();
    // Claim intentionally NOT rolled back — we'd just re-encounter the
    // same no-phone user on retry; burning the idempotency token keeps
    // the event from looping.
    expect(mockPeDelete).not.toHaveBeenCalled();
  });

  it('accepts user.phone as fallback when phoneNumber missing', async () => {
    mockUserFindById.mockReturnValueOnce(leanResolved({ phone: '+919000000000' }));
    await processPaymentSettled(VALID_EVENT);
    expect(mockSendText).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+919000000000' }),
    );
  });

  // ─── Happy path (primary) ──────────────────────────────────────────────────
  it('primary: claim + lookup + sendText with correct payload', async () => {
    await processPaymentSettled(VALID_EVENT);
    expect(mockPeCreate).toHaveBeenCalledWith({
      eventId: 'evt-pay-1',
      processorKey: PROCESSOR_KEY,
      processedAt: expect.any(Date),
    });
    expect(mockHasActiveConsent).toHaveBeenCalledWith('user-123', 'whatsapp_transactional');
    expect(mockUserFindById).toHaveBeenCalledWith('user-123');
    expect(mockOrderFindById).toHaveBeenCalledWith('order-999');
    expect(mockSendText).toHaveBeenCalledWith({
      to: '+919812345678',
      message: expect.stringContaining('ORD12345'),
      campaignId: 'receipt:evt-pay-1',
      merchantId: 'merchant-abc',
    });
  });

  it('tolerates missing orderId — no Order lookup, simpler message', async () => {
    await processPaymentSettled({ ...VALID_EVENT, orderId: undefined });
    expect(mockOrderFindById).not.toHaveBeenCalled();
    expect(mockSendText).toHaveBeenCalled();
    const call = mockSendText.mock.calls[0][0];
    expect(call.message).not.toContain('undefined');
  });

  it('tolerates Order lookup throwing — still sends, without order number', async () => {
    mockOrderFindById.mockImplementationOnce(() => {
      throw new Error('lookup exploded');
    });
    await processPaymentSettled(VALID_EVENT);
    expect(mockSendText).toHaveBeenCalled();
  });

  // ─── Shadow mode ───────────────────────────────────────────────────────────
  it('shadow: claims but does NOT call sendText', async () => {
    process.env.CANONICAL_WHATSAPP_RECEIPT_MODE = 'shadow';
    await processPaymentSettled(VALID_EVENT);
    expect(mockPeCreate).toHaveBeenCalled();
    expect(mockSendText).not.toHaveBeenCalled();
  });

  // ─── Send failure rollback ─────────────────────────────────────────────────
  it('rolls back claim when sendText returns {success:false}', async () => {
    mockSendText.mockResolvedValueOnce({ success: false, error: 'rate-limited' });
    await processPaymentSettled(VALID_EVENT);
    expect(mockPeDelete).toHaveBeenCalledWith({
      eventId: 'evt-pay-1',
      processorKey: PROCESSOR_KEY,
    });
  });

  it('rolls back claim when sendText throws', async () => {
    mockSendText.mockRejectedValueOnce(new Error('network error'));
    await processPaymentSettled(VALID_EVENT);
    expect(mockPeDelete).toHaveBeenCalledWith({
      eventId: 'evt-pay-1',
      processorKey: PROCESSOR_KEY,
    });
  });

  it('never throws even if rollback also fails', async () => {
    mockSendText.mockRejectedValueOnce(new Error('network error'));
    mockPeDelete.mockRejectedValueOnce(new Error('db down during rollback'));
    await expect(processPaymentSettled(VALID_EVENT)).resolves.toBeUndefined();
  });

  it('treats deduped:true from WhatsApp service as success (no rollback)', async () => {
    mockSendText.mockResolvedValueOnce({ success: true, deduped: true });
    await processPaymentSettled(VALID_EVENT);
    expect(mockPeDelete).not.toHaveBeenCalled();
  });
});
