/**
 * Push Notification Service Tests (ITER15)
 *
 * Tests for src/services/pushNotificationService.ts
 *
 * ITER15 fix: `isInvalidTokenError()` now treats BOTH `DeviceNotRegistered`
 * AND `InvalidExpoPushToken[xxx]` as dead tokens. Previously only the first
 * was handled — invalid-format tokens accumulated in the user record.
 *
 * `isInvalidTokenError` is a private function. We test it indirectly through
 * the public `handleReceipts()` API: tokens whose receipts come back with
 * either error must be removed from the user record; non-invalid errors must
 * not.
 */

import { Types } from 'mongoose';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUserFindByIdAndUpdate = jest.fn();
const mockUserFind = jest.fn();

jest.mock('../models/User', () => ({
  User: {
    findByIdAndUpdate: (...args: any[]) => mockUserFindByIdAndUpdate(...args),
    find: (...args: any[]) => ({
      select: () => ({
        lean: () => mockUserFind(...args),
      }),
    }),
    findById: (...args: any[]) => ({
      select: () => ({
        lean: () => mockUserFind(...args),
      }),
    }),
  },
}));

const mockMerchantUserFind = jest.fn();
const mockMerchantUserFindByIdAndUpdate = jest.fn();
jest.mock('../models/MerchantUser', () => ({
  MerchantUser: {
    find: (...args: any[]) => ({
      select: () => ({
        lean: () => mockMerchantUserFind(...args),
      }),
    }),
    findByIdAndUpdate: (...args: any[]) => mockMerchantUserFindByIdAndUpdate(...args),
  },
}));

// Mock twilio
jest.mock('twilio', () => jest.fn(() => ({ messages: { create: jest.fn() } })));

// Mock logger
jest.mock('../config/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  createServiceLogger: () => ({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }),
}));

// Mock the expo-server-sdk so we can inject fake receipts
const mockExpo = {
  chunkPushNotificationReceiptIds: jest.fn((ids: string[]) => [ids]),
  getPushNotificationReceiptsAsync: jest.fn(),
};
jest.mock('expo-server-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockExpo),
}));

// ─── Import after mocks ──────────────────────────────────────────────────────
import pushNotificationService from './pushNotificationService';
import { User } from '../models/User';

describe('pushNotificationService (ITER15 InvalidExpoPushToken handling)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any pendingTickets from prior tests by draining handleReceipts.
    // We poke private state via `as any` since this is a unit-test concern.
    (pushNotificationService as any).pendingTickets = [];
  });

  // ── ITER15 happy path: token receipt ok → no removal ──────────────────────

  it('handleReceipts returns 0 invalid when receipts are all ok', async () => {
    // Seed pendingTickets
    (pushNotificationService as any).pendingTickets = [
      { ticketId: 't1', token: 'ExponentPushToken[valid1]', userId: 'user1' },
    ];
    mockExpo.getPushNotificationReceiptsAsync.mockResolvedValueOnce({
      t1: { status: 'ok' },
    });

    const result = await pushNotificationService.handleReceipts();
    expect(result.checked).toBe(1);
    expect(result.invalidRemoved).toBe(0);
    expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  // ── ITER15 edge case: DeviceNotRegistered → token removed ─────────────────

  it('handleReceipts removes token when receipt returns DeviceNotRegistered', async () => {
    (pushNotificationService as any).pendingTickets = [
      { ticketId: 't2', token: 'ExponentPushToken[uninstalled]', userId: 'user2' },
    ];
    mockExpo.getPushNotificationReceiptsAsync.mockResolvedValueOnce({
      t2: { status: 'error', details: { error: 'DeviceNotRegistered' }, message: 'unregistered' },
    });
    mockUserFindByIdAndUpdate.mockResolvedValueOnce({});

    const result = await pushNotificationService.handleReceipts();
    expect(result.checked).toBe(1);
    expect(result.invalidRemoved).toBe(1);
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
      'user2',
      { $pull: { pushTokens: { token: 'ExponentPushToken[uninstalled]' } } }
    );
  });

  // ── ITER15 attack scenario: InvalidExpoPushToken[xxx] → token removed ──────

  it('handleReceipts removes token for InvalidExpoPushToken[xxx] (NEW in ITER15)', async () => {
    // ATTACK SCENARIO: malformed tokens (e.g. forged tokens from a different
    // Expo project, or tokens corrupted by a buggy client) used to accumulate
    // silently. Now they should be removed just like DeviceNotRegistered.
    const forgedToken = 'InvalidExpoPushToken[FAKE_TOKEN_xxx]';
    (pushNotificationService as any).pendingTickets = [
      { ticketId: 't3', token: forgedToken, userId: 'user3' },
    ];
    mockExpo.getPushNotificationReceiptsAsync.mockResolvedValueOnce({
      t3: {
        status: 'error',
        details: { error: 'InvalidExpoPushToken[FAKE_TOKEN_xxx]' },
        message: 'token is not a valid Expo push token',
      },
    });
    mockUserFindByIdAndUpdate.mockResolvedValueOnce({});

    const result = await pushNotificationService.handleReceipts();
    expect(result.invalidRemoved).toBe(1);
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
      'user3',
      { $pull: { pushTokens: { token: forgedToken } } }
    );
  });

  // ── ITER15 negative case: non-invalid error → token NOT removed ───────────

  it('handleReceipts does NOT remove token for non-invalid errors (e.g. MessageRateExceeded)', async () => {
    // The fix is selective: only DeviceNotRegistered and InvalidExpoPushToken[xxx]
    // should trigger removal. Other errors (rate limits, invalid payload) should
    // NOT remove the token — they may succeed on retry.
    (pushNotificationService as any).pendingTickets = [
      { ticketId: 't4', token: 'ExponentPushToken[ok-token]', userId: 'user4' },
    ];
    mockExpo.getPushNotificationReceiptsAsync.mockResolvedValueOnce({
      t4: { status: 'error', details: { error: 'MessageRateExceeded' }, message: 'rate limit' },
    });

    const result = await pushNotificationService.handleReceipts();
    expect(result.invalidRemoved).toBe(0);
    expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  // ── ITER15: empty queue returns 0/0 ──────────────────────────────────────

  it('handleReceipts returns zeros when no pending tickets', async () => {
    (pushNotificationService as any).pendingTickets = [];
    const result = await pushNotificationService.handleReceipts();
    expect(result.checked).toBe(0);
    expect(result.invalidRemoved).toBe(0);
    expect(mockExpo.getPushNotificationReceiptsAsync).not.toHaveBeenCalled();
  });
});