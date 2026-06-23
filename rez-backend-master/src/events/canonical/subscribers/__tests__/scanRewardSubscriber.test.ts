/**
 * Unit tests for scanRewardSubscriber.
 *
 * Mocks: ProcessedEvent (create, findOne, deleteOne), Store (findById),
 * walletService (credit). No real Mongo.
 */

import { __testOnly } from '../scanRewardSubscriber';

const { processVisitCompleted, getScanRewardMode, dayKey, PROCESSOR_KEY } = __testOnly;

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockCreate = jest.fn();
const mockFindOne = jest.fn();
const mockDeleteOne = jest.fn();

jest.mock('../../../../models/ProcessedEvent', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    deleteOne: (...args: unknown[]) => mockDeleteOne(...args),
  },
}));

const mockStoreFindById = jest.fn();
jest.mock('../../../../models/Store', () => ({
  Store: {
    findById: (...args: unknown[]) => mockStoreFindById(...args),
  },
}));

const mockCredit = jest.fn();
jest.mock('../../../../services/walletService', () => ({
  walletService: {
    credit: (...args: unknown[]) => mockCredit(...args),
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

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_EVENT = {
  eventId: 'evt-scan-1',
  eventType: 'visit.completed' as const,
  occurredAt: '2026-04-23T10:00:00.000Z',
  merchantId: 'merchant-abc',
  storeId: 'store-xyz',
  customerId: 'user-123',
  visitId: 'visit-789',
  source: 'qr_checkin' as const,
};

const STORE_WITH_SCAN_ENABLED = {
  rewardRules: {
    scanToEarn: {
      enabled: true,
      firstScanBonus: 20,
      repeatScanCoins: 5,
      dailyCapPerCustomer: 2,
    },
  },
};

function leanResolved<T>(value: T) {
  return { select: () => ({ lean: async () => value }) };
}

const ORIGINAL_MODE = process.env.CANONICAL_SCAN_REWARD_MODE;
beforeAll(() => {
  process.env.CANONICAL_SCAN_REWARD_MODE = 'primary';
});
afterAll(() => {
  if (ORIGINAL_MODE === undefined) delete (process.env as any).CANONICAL_SCAN_REWARD_MODE;
  else process.env.CANONICAL_SCAN_REWARD_MODE = ORIGINAL_MODE;
});

beforeEach(() => {
  mockCreate.mockReset();
  mockFindOne.mockReset();
  mockDeleteOne.mockReset();
  mockStoreFindById.mockReset();
  mockCredit.mockReset();
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('getScanRewardMode', () => {
  it.each([
    [undefined, 'off'],
    ['', 'off'],
    ['off', 'off'],
    ['shadow', 'shadow'],
    ['primary', 'primary'],
    ['PRIMARY', 'primary'],
    ['nonsense', 'off'],
  ] as Array<[string | undefined, 'off' | 'shadow' | 'primary']>)(
    'env=%o → mode=%s',
    (envValue, expected) => {
      if (envValue === undefined) delete (process.env as any).CANONICAL_SCAN_REWARD_MODE;
      else process.env.CANONICAL_SCAN_REWARD_MODE = envValue;
      expect(getScanRewardMode()).toBe(expected);
    },
  );
});

describe('dayKey', () => {
  it('returns UTC YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-04-23T10:00:00Z'))).toBe('2026-04-23');
    expect(dayKey(new Date('2026-04-23T23:59:59Z'))).toBe('2026-04-23');
    expect(dayKey(new Date('2026-04-24T00:00:01Z'))).toBe('2026-04-24');
  });
});

describe('processVisitCompleted', () => {
  beforeEach(() => {
    process.env.CANONICAL_SCAN_REWARD_MODE = 'primary';
  });

  it('non-qr_checkin source is ignored (early return, no claim)', async () => {
    await processVisitCompleted({ ...VALID_EVENT, source: 'pos' });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockStoreFindById).not.toHaveBeenCalled();
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('anonymous (customerId null) is ignored', async () => {
    await processVisitCompleted({ ...VALID_EVENT, customerId: null });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('unscoped (storeId null) is ignored', async () => {
    await processVisitCompleted({ ...VALID_EVENT, storeId: null });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('redelivered event (duplicate key on claim) — skips all downstream work', async () => {
    const dup = Object.assign(new Error('E11000'), { code: 11000 });
    mockCreate.mockRejectedValueOnce(dup);
    await processVisitCompleted(VALID_EVENT);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockStoreFindById).not.toHaveBeenCalled();
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('merchant scanToEarn disabled — noop after claim', async () => {
    mockCreate.mockResolvedValueOnce({}); // event claim
    mockStoreFindById.mockReturnValueOnce(
      leanResolved({ rewardRules: { scanToEarn: { enabled: false } } }),
    );
    await processVisitCompleted(VALID_EVENT);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('happy path first scan — credits firstScanBonus', async () => {
    mockCreate.mockResolvedValueOnce({}); // event claim
    mockStoreFindById.mockReturnValueOnce(leanResolved(STORE_WITH_SCAN_ENABLED));
    // Daily-cap slot claim (i=1 succeeds)
    mockCreate.mockResolvedValueOnce({});
    // isFirstScanEver: no prior ledger entry
    mockFindOne.mockReturnValueOnce({ select: () => ({ lean: async () => null }) });
    mockCredit.mockResolvedValueOnce({});

    await processVisitCompleted(VALID_EVENT);

    expect(mockCredit).toHaveBeenCalledTimes(1);
    const args = mockCredit.mock.calls[0][0];
    expect(args.amount).toBe(20); // firstScanBonus
    expect(args.userId).toBe(VALID_EVENT.customerId);
    expect(args.referenceId).toBe(`canonical:${VALID_EVENT.eventId}`);
    expect(args.metadata.scanKind).toBe('first');
  });

  it('happy path repeat scan — credits repeatScanCoins', async () => {
    mockCreate.mockResolvedValueOnce({}); // event claim
    mockStoreFindById.mockReturnValueOnce(leanResolved(STORE_WITH_SCAN_ENABLED));
    // Daily-cap slot claim succeeds on slot 1
    mockCreate.mockResolvedValueOnce({});
    // isFirstScanEver: prior entry exists
    mockFindOne.mockReturnValueOnce({ select: () => ({ lean: async () => ({ _id: 'anything' }) }) });
    mockCredit.mockResolvedValueOnce({});

    await processVisitCompleted(VALID_EVENT);

    expect(mockCredit).toHaveBeenCalledTimes(1);
    const args = mockCredit.mock.calls[0][0];
    expect(args.amount).toBe(5); // repeatScanCoins
    expect(args.metadata.scanKind).toBe('repeat');
  });

  it('daily cap reached — no credit, logs and exits', async () => {
    mockCreate.mockResolvedValueOnce({}); // event claim
    mockStoreFindById.mockReturnValueOnce(leanResolved(STORE_WITH_SCAN_ENABLED));
    // All N slot claims return duplicate-key
    const dup = Object.assign(new Error('E11000'), { code: 11000 });
    mockCreate.mockRejectedValue(dup);

    await processVisitCompleted(VALID_EVENT);

    // Event claim (1) + cap=2 slot attempts (2) = 3 total create calls.
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('mode=off: fast path, no envelope parse, no writes', async () => {
    process.env.CANONICAL_SCAN_REWARD_MODE = 'off';
    await processVisitCompleted(VALID_EVENT);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockStoreFindById).not.toHaveBeenCalled();
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('mode=shadow: claims ledger + merchant cfg + first-scan check, but NO credit', async () => {
    process.env.CANONICAL_SCAN_REWARD_MODE = 'shadow';
    mockCreate.mockResolvedValueOnce({}); // event claim
    mockStoreFindById.mockReturnValueOnce(leanResolved(STORE_WITH_SCAN_ENABLED));
    mockCreate.mockResolvedValueOnce({}); // daily slot
    mockFindOne.mockReturnValueOnce({ select: () => ({ lean: async () => null }) });

    await processVisitCompleted(VALID_EVENT);

    expect(mockCreate).toHaveBeenCalled(); // claims happen
    expect(mockCredit).not.toHaveBeenCalled(); // but no real credit
  });

  it('walletService.credit failure rolls back event claim', async () => {
    mockCreate.mockResolvedValueOnce({}); // event claim
    mockStoreFindById.mockReturnValueOnce(leanResolved(STORE_WITH_SCAN_ENABLED));
    mockCreate.mockResolvedValueOnce({}); // slot claim
    mockFindOne.mockReturnValueOnce({ select: () => ({ lean: async () => null }) });
    mockCredit.mockRejectedValueOnce(new Error('wallet down'));
    mockDeleteOne.mockResolvedValueOnce({ deletedCount: 1 });

    await processVisitCompleted(VALID_EVENT);

    expect(mockCredit).toHaveBeenCalledTimes(1);
    expect(mockDeleteOne).toHaveBeenCalledTimes(1);
    const rollbackFilter = mockDeleteOne.mock.calls[0][0];
    expect(rollbackFilter).toEqual({
      eventId: VALID_EVENT.eventId,
      processorKey: PROCESSOR_KEY,
    });
  });

  it('wallet + rollback both fail — still never throws', async () => {
    mockCreate.mockResolvedValueOnce({});
    mockStoreFindById.mockReturnValueOnce(leanResolved(STORE_WITH_SCAN_ENABLED));
    mockCreate.mockResolvedValueOnce({});
    mockFindOne.mockReturnValueOnce({ select: () => ({ lean: async () => null }) });
    mockCredit.mockRejectedValueOnce(new Error('wallet down'));
    mockDeleteOne.mockRejectedValueOnce(new Error('mongo down'));

    await expect(processVisitCompleted(VALID_EVENT)).resolves.toBeUndefined();
  });

  it.each([
    [{}],
    [{ source: 'qr_checkin' }],
    [null],
    ['bad'],
    [{ ...VALID_EVENT, source: 'invalid_source' as any }],
  ])('malformed envelope (%o) is dropped without throwing', async (bad) => {
    mockStoreFindById.mockReturnValueOnce(leanResolved(null));
    await expect(processVisitCompleted(bad)).resolves.toBeUndefined();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('zero-coin config (both first & repeat = 0) — early return, no credit', async () => {
    mockCreate.mockResolvedValueOnce({});
    mockStoreFindById.mockReturnValueOnce(
      leanResolved({
        rewardRules: {
          scanToEarn: {
            enabled: true,
            firstScanBonus: 0,
            repeatScanCoins: 0,
            dailyCapPerCustomer: 1,
          },
        },
      }),
    );
    mockCreate.mockResolvedValueOnce({}); // slot
    mockFindOne.mockReturnValueOnce({ select: () => ({ lean: async () => null }) });

    await processVisitCompleted(VALID_EVENT);
    expect(mockCredit).not.toHaveBeenCalled();
  });
});
