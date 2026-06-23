/**
 * Tests for resolveCustomerIdentity + normalisePhone.
 * Uses jest mocks rather than an in-memory Mongo — all DB access is mocked
 * via the User model mock. Avoids spinning up a Mongo instance for a pure
 * resolver unit test.
 */

import * as mongoose from 'mongoose';
import { normalisePhone, resolveCustomerIdentity } from '../resolveCustomerIdentity';

// ─── Mock User model ──────────────────────────────────────────────────────────

const mockFindById = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('../../models/User', () => ({
  User: {
    findById: (...args: any[]) => mockFindById(...args),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
  },
}));

beforeEach(() => {
  mockFindById.mockReset();
  mockFindOneAndUpdate.mockReset();
});

// ─── normalisePhone ───────────────────────────────────────────────────────────

describe('normalisePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['+91-98765-43210', '+919876543210'],
    ['+91(98765)43210', '+919876543210'],
    ['91 98765 43210', '+919876543210'],
  ])('normalises %s → %s', (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
  });

  it('leaves non-Indian E.164 untouched', () => {
    expect(normalisePhone('+14155550123')).toBe('+14155550123');
  });

  it('rejects empty/malformed input', () => {
    expect(normalisePhone(null)).toBeNull();
    expect(normalisePhone('')).toBeNull();
    expect(normalisePhone('abc')).toBeNull();
    expect(normalisePhone('123')).toBeNull(); // too short
    expect(normalisePhone('0123456789')).not.toBe('+910123456789'); // Indian mobiles must start with 6-9
  });

  it('rejects 10-digit numbers that do not start with 6-9', () => {
    expect(normalisePhone('1234567890')).not.toMatch(/^\+91/);
    expect(normalisePhone('5876543210')).not.toMatch(/^\+91/);
  });
});

// ─── resolveCustomerIdentity ──────────────────────────────────────────────────

describe('resolveCustomerIdentity', () => {
  const validObjectId = new mongoose.Types.ObjectId().toString();

  it('returns existing resolution when customerId already valid', async () => {
    const id = new mongoose.Types.ObjectId();
    mockFindById.mockReturnValue({ select: () => ({ lean: async () => ({ _id: id }) }) });
    const result = await resolveCustomerIdentity({ customerId: id.toString(), source: 'pos' });
    expect(result).toEqual({ customerId: id.toString(), resolution: 'existing' });
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('falls through to phone when customerId is a valid ObjectId but no row', async () => {
    mockFindById.mockReturnValue({ select: () => ({ lean: async () => null }) });
    const newId = new mongoose.Types.ObjectId();
    mockFindOneAndUpdate.mockReturnValue({ lean: async () => ({ _id: newId }) });
    const result = await resolveCustomerIdentity({
      customerId: validObjectId,
      customerPhone: '9876543210',
      source: 'pos',
    });
    expect(mockFindOneAndUpdate).toHaveBeenCalled();
    expect(result.customerId).toBe(newId.toString());
    expect(result.normalisedPhone).toBe('+919876543210');
  });

  it('returns anonymous when neither id nor phone provided', async () => {
    const result = await resolveCustomerIdentity({ source: 'pos' });
    expect(result).toEqual({ customerId: null, resolution: 'anonymous' });
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns invalid-id when customerId malformed and no phone fallback', async () => {
    const result = await resolveCustomerIdentity({ customerId: 'not-an-objectid', source: 'pos' });
    expect(result.resolution).toBe('invalid-id');
    expect(result.customerId).toBeNull();
  });

  it('returns created on first upsert', async () => {
    // Just-created ObjectId: its embedded timestamp is "now"
    const freshId = new mongoose.Types.ObjectId();
    mockFindOneAndUpdate.mockReturnValue({ lean: async () => ({ _id: freshId }) });
    const result = await resolveCustomerIdentity({
      customerPhone: '9876543210',
      source: 'web',
    });
    expect(result.resolution).toBe('created');
    expect(result.customerId).toBe(freshId.toString());
    expect(result.normalisedPhone).toBe('+919876543210');

    // Verify upsert args
    const [filter, update, options] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ phoneNumber: '+919876543210' });
    expect(update.$setOnInsert.phoneNumber).toBe('+919876543210');
    expect(update.$setOnInsert.source).toBe('web');
    expect(options.upsert).toBe(true);
    expect(options.new).toBe(true);
  });

  it('returns existing when phone upsert matches a much-older row', async () => {
    // An old ObjectId: timestamp is 1 hour ago — not "just created"
    const oldId = mongoose.Types.ObjectId.createFromTime(
      Math.floor((Date.now() - 60 * 60 * 1000) / 1000),
    );
    mockFindOneAndUpdate.mockReturnValue({ lean: async () => ({ _id: oldId }) });
    const result = await resolveCustomerIdentity({
      customerPhone: '9876543210',
      source: 'aggregator-swiggy',
    });
    expect(result.resolution).toBe('existing');
    expect(result.customerId).toBe(oldId.toString());
  });

  it('returns invalid-id when phone fails normalisation', async () => {
    const result = await resolveCustomerIdentity({ customerPhone: 'abc', source: 'pos' });
    expect(result.resolution).toBe('invalid-id');
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns error resolution on DB failure (never throws)', async () => {
    mockFindOneAndUpdate.mockImplementation(() => {
      throw new Error('Mongo is down');
    });
    const result = await resolveCustomerIdentity({
      customerPhone: '9876543210',
      source: 'pos',
    });
    expect(result.resolution).toBe('error');
    expect(result.customerId).toBeNull();
    expect(result.normalisedPhone).toBe('+919876543210');
  });

  it('stores customerName in $setOnInsert when provided', async () => {
    const id = new mongoose.Types.ObjectId();
    mockFindOneAndUpdate.mockReturnValue({ lean: async () => ({ _id: id }) });
    await resolveCustomerIdentity({
      customerPhone: '9876543210',
      customerName: 'Ananya',
      source: 'aggregator-zomato',
    });
    const update = mockFindOneAndUpdate.mock.calls[0][1];
    expect(update.$setOnInsert.name).toBe('Ananya');
  });
});
