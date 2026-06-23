/**
 * Tests for the Week-3 shared-types validator middleware.
 *
 * Pins the mode-switching contract — off is no-op, shadow logs but
 * forwards, enforce 400s on parse fail. The middleware is the only
 * thing standing between accidental-deploy and prod 4xx storms, so
 * every branch is tested.
 */

import { z } from 'zod';
import { validateWithSharedTypes, __testOnly, __resetSharedTypesWarningMemo } from '../middleware/sharedTypesValidator';

// Mock the logger so tests can assert what was logged.
jest.mock('../config/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { logger } from '../config/logger';
const mockLogger = logger as unknown as { warn: jest.Mock; info: jest.Mock };

const TestSchema = z
  .object({
    name: z.string().min(1),
    age: z.number().int().min(0),
  })
  .strict();

function makeReqRes(body: unknown) {
  const req = { body, headers: {}, user: { id: 'u1' } } as any;
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  const res = { status, json } as any;
  const next = jest.fn();
  return { req, res, next };
}

describe('SHARED_TYPES_VALIDATION_MODE — env knob', () => {
  const original = process.env.SHARED_TYPES_VALIDATION_MODE;

  afterEach(() => {
    process.env.SHARED_TYPES_VALIDATION_MODE = original;
    __resetSharedTypesWarningMemo();
    mockLogger.warn.mockClear();
  });

  test('default (unset) → off', () => {
    delete (process.env as any).SHARED_TYPES_VALIDATION_MODE;
    expect(__testOnly.getSharedTypesValidationMode()).toBe('off');
  });

  test('explicit "off" → off', () => {
    process.env.SHARED_TYPES_VALIDATION_MODE = 'off';
    expect(__testOnly.getSharedTypesValidationMode()).toBe('off');
  });

  test('"shadow" + "enforce" recognized', () => {
    process.env.SHARED_TYPES_VALIDATION_MODE = 'shadow';
    expect(__testOnly.getSharedTypesValidationMode()).toBe('shadow');
    process.env.SHARED_TYPES_VALIDATION_MODE = 'enforce';
    expect(__testOnly.getSharedTypesValidationMode()).toBe('enforce');
  });

  test('case + whitespace tolerant', () => {
    process.env.SHARED_TYPES_VALIDATION_MODE = '  SHADOW  ';
    expect(__testOnly.getSharedTypesValidationMode()).toBe('shadow');
  });

  test('unknown mode → off, with one-time warn log', () => {
    process.env.SHARED_TYPES_VALIDATION_MODE = 'paranoid';
    expect(__testOnly.getSharedTypesValidationMode()).toBe('off');
    expect(__testOnly.getSharedTypesValidationMode()).toBe('off'); // call twice
    // Only one warn even though we called twice (memoized).
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn.mock.calls[0]![0]).toMatch(/Unknown SHARED_TYPES_VALIDATION_MODE/);
  });
});

describe('validateWithSharedTypes — off mode', () => {
  beforeEach(() => mockLogger.warn.mockClear());

  test('passes through invalid bodies without logging or 400', () => {
    const mw = validateWithSharedTypes(TestSchema, 'TEST /off', { modeOverride: 'off' });
    const { req, res, next } = makeReqRes({ name: '', age: -1 });
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});

describe('validateWithSharedTypes — shadow mode', () => {
  beforeEach(() => mockLogger.warn.mockClear());

  test('valid body → next() and no log', () => {
    const mw = validateWithSharedTypes(TestSchema, 'TEST /shadow', { modeOverride: 'shadow' });
    const { req, res, next } = makeReqRes({ name: 'a', age: 1 });
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  test('invalid body → next() AND warn log with summarized issues', () => {
    const mw = validateWithSharedTypes(TestSchema, 'TEST /shadow', { modeOverride: 'shadow' });
    const { req, res, next } = makeReqRes({ name: '', age: -1, extra: 'reject' });
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    const [, payload] = mockLogger.warn.mock.calls[0]!;
    expect(payload.event).toBe('shared-types.parse.fail');
    expect(payload.mode).toBe('shadow');
    expect(payload.endpoint).toBe('TEST /shadow');
    // PII-safe — only paths, no values
    expect(payload.issues).toEqual(expect.arrayContaining(['name', 'age']));
    expect(JSON.stringify(payload)).not.toMatch(/reject/);
  });
});

describe('validateWithSharedTypes — enforce mode', () => {
  beforeEach(() => mockLogger.warn.mockClear());

  test('valid body → next()', () => {
    const mw = validateWithSharedTypes(TestSchema, 'TEST /enforce', { modeOverride: 'enforce' });
    const { req, res, next } = makeReqRes({ name: 'a', age: 1 });
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('invalid body → 400 SHARED_TYPES_VALIDATION_FAILED + warn log + no next()', () => {
    const mw = validateWithSharedTypes(TestSchema, 'TEST /enforce', { modeOverride: 'enforce' });
    const { req, res, next } = makeReqRes({ name: '', age: 'oops' });
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'SHARED_TYPES_VALIDATION_FAILED',
        issues: expect.arrayContaining(['name', 'age']),
      }),
    );
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });
});

describe('bodyShaper — adapter for non-canonical wire shapes', () => {
  beforeEach(() => mockLogger.warn.mockClear());

  test('bodyShaper synthesizes the canonical body before parsing', () => {
    const shaper = (req: any) => ({ name: req.body.firstName, age: req.body.years });
    const mw = validateWithSharedTypes(TestSchema, 'TEST /shaped', {
      modeOverride: 'enforce',
      bodyShaper: shaper,
    });
    const { req, res, next } = makeReqRes({ firstName: 'Ada', years: 30 });
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('bodyShaper returning undefined skips validation entirely', () => {
    const shaper = () => undefined;
    const mw = validateWithSharedTypes(TestSchema, 'TEST /skip', {
      modeOverride: 'enforce',
      bodyShaper: shaper,
    });
    // Even with a body that would normally fail, undefined → skip → next()
    const { req, res, next } = makeReqRes({ firstName: '', years: -1 });
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  test('bodyShaper applied even in shadow mode', () => {
    const shaper = (req: any) => ({ name: req.body.x, age: 'not-a-number' });
    const mw = validateWithSharedTypes(TestSchema, 'TEST /shadow-shaped', {
      modeOverride: 'shadow',
      bodyShaper: shaper,
    });
    const { req, res, next } = makeReqRes({ x: 'A' });
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    const [, payload] = mockLogger.warn.mock.calls[0]!;
    expect(payload.issues).toEqual(expect.arrayContaining(['age']));
  });
});

describe('summarizeIssues — PII safety', () => {
  test('produces dotted paths with no values', () => {
    const issues = [{ path: ['user'] }, { path: ['items', 0, 'quantity'] }, { path: ['totals', 'total'] }];
    expect(__testOnly.summarizeIssues(issues)).toEqual(['items[0].quantity', 'totals.total', 'user']);
  });

  test('handles empty path → <root>', () => {
    expect(__testOnly.summarizeIssues([{ path: [] }])).toEqual(['<root>']);
  });

  test('dedupes repeated paths', () => {
    expect(__testOnly.summarizeIssues([{ path: ['name'] }, { path: ['name'] }, { path: ['age'] }])).toEqual([
      'age',
      'name',
    ]);
  });
});
