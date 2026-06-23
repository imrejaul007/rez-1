/**
 * Unit Tests for useWallet hook
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWallet } from '@/hooks/useWallet';

jest.mock('@/services/walletApi', () => ({
  getWalletBalance: jest.fn(() => Promise.resolve({ balance: 1000, currency: 'INR' })),
  getTransactions: jest.fn(() => Promise.resolve([])),
}));

describe('useWallet', () => {
  it('should load wallet balance', async () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.balance).toBe(1000);
  });

  it('should load transactions', async () => {
    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.transactions).toBeDefined();
    });
  });

  it('should handle errors', async () => {
    const walletApi = require('@/services/walletApi');
    walletApi.getWalletBalance.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
