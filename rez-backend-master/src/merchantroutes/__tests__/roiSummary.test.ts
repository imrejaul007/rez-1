/**
 * Unit tests for roiSummary route's parseWindow helper.
 *
 * The HTTP handler itself is intentionally not end-to-end tested here
 * — it's a 10-line adapter around computeRoiReport, and computeRoi
 * has its own test suite. What we DO test is the query-string parser,
 * because that's the surface a client can poke.
 */

jest.mock('../../services/merchantRoi/computeRoi', () => ({
  computeRoiReport: jest.fn(),
  getRoiMode: jest.fn(),
}));
jest.mock('../../models/Merchant', () => ({ Merchant: {} }));
jest.mock('../../models/MerchantPlan', () => ({ MerchantPlan: {} }));
jest.mock('../../models/StorePayment', () => ({ StorePayment: {} }));
jest.mock('../../models/BroadcastCampaign', () => ({ BroadcastCampaign: {} }));
jest.mock('../../middleware/merchantauth', () => ({
  authMiddleware: (_r: unknown, _s: unknown, next: () => void) => next(),
}));
jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { __testOnly } from '../roiSummary';

const { parseWindow, DEFAULT_WINDOW_DAYS, MAX_WINDOW_DAYS } = __testOnly;

describe('roiSummary parseWindow', () => {
  it('defaults to last DEFAULT_WINDOW_DAYS when no query given', () => {
    const result = parseWindow({ query: {} } as any);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const spanDays = (result.to.getTime() - result.from.getTime()) / (24 * 3600 * 1000);
    expect(Math.round(spanDays)).toBe(DEFAULT_WINDOW_DAYS);
  });

  it('accepts custom windowDays', () => {
    const result = parseWindow({ query: { windowDays: '7' } } as any);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const spanDays = (result.to.getTime() - result.from.getTime()) / (24 * 3600 * 1000);
    expect(Math.round(spanDays)).toBe(7);
  });

  it('caps windowDays at MAX_WINDOW_DAYS', () => {
    const result = parseWindow({ query: { windowDays: '10000' } } as any);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const spanDays = (result.to.getTime() - result.from.getTime()) / (24 * 3600 * 1000);
    expect(Math.round(spanDays)).toBe(MAX_WINDOW_DAYS);
  });

  it('falls back to DEFAULT_WINDOW_DAYS when windowDays is garbage', () => {
    const result = parseWindow({ query: { windowDays: 'abc' } } as any);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const spanDays = (result.to.getTime() - result.from.getTime()) / (24 * 3600 * 1000);
    expect(Math.round(spanDays)).toBe(DEFAULT_WINDOW_DAYS);
  });

  it('accepts from + to ISO dates', () => {
    const result = parseWindow({
      query: { from: '2026-04-01', to: '2026-04-15' },
    } as any);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.from.toISOString().startsWith('2026-04-01')).toBe(true);
    expect(result.to.toISOString().startsWith('2026-04-15')).toBe(true);
  });

  it('rejects malformed dates', () => {
    const result = parseWindow({ query: { from: 'not-a-date', to: '2026-04-15' } } as any);
    expect('error' in result).toBe(true);
  });

  it('rejects when to < from', () => {
    const result = parseWindow({
      query: { from: '2026-04-15', to: '2026-04-01' },
    } as any);
    expect('error' in result).toBe(true);
  });

  it('rejects windows longer than MAX_WINDOW_DAYS', () => {
    const result = parseWindow({
      query: { from: '2024-01-01', to: '2026-12-31' },
    } as any);
    expect('error' in result).toBe(true);
    if (!('error' in result)) return;
    expect(result.error).toMatch(/window cannot exceed/i);
  });
});
