/**
 * useWalletOperations - Optimistic updates for wallet mutations
 *
 * Provides optimistic update patterns with automatic rollback for wallet operations:
 * - withdraw: Transfer funds from wallet to bank/UPI
 * - addMoney: Add funds to wallet via top-up
 * - transferFunds: Transfer coins to another user
 */

import { useState, useCallback, useRef } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useToastStore } from '@/stores/toastStore';
import walletApi from '@/services/walletApi';

interface OptimisticOperationState<T> {
  isPending: boolean;
  error: Error | null;
  data: T | null;
}

/**
 * Hook for wallet operations with optimistic updates and automatic rollback.
 *
 * @example
 * ```typescript
 * const { withdraw, isPending } = useWalletOperations();
 *
 * // Optimistic withdraw - balance updates immediately, rolls back on failure
 * await withdraw({ amount: 1000, method: 'bank', accountDetails: '...' });
 * ```
 */
export function useWalletOperations() {
  const [withdrawState, setWithdrawState] = useState<OptimisticOperationState<any>>({
    isPending: false,
    error: null,
    data: null,
  });

  const [addMoneyState, setAddMoneyState] = useState<OptimisticOperationState<any>>({
    isPending: false,
    error: null,
    data: null,
  });

  const [transferState, setTransferState] = useState<OptimisticOperationState<any>>({
    isPending: false,
    error: null,
    data: null,
  });

  // Store selectors
  const walletData = useWalletStore((s) => s.walletData);
  const rezBalance = useWalletStore((s) => s.rezBalance);
  const totalBalance = useWalletStore((s) => s.totalBalance);
  const availableBalance = useWalletStore((s) => s.availableBalance);
  const adjustBalance = useWalletStore((s) => s.adjustBalance);
  const refreshWallet = useWalletStore((s) => s.refreshWallet);

  // Toast helper
  const showError = useToastStore((s) => s.showError);
  const showSuccess = useToastStore((s) => s.showSuccess);

  // Request dedup ref
  const requestIdRef = useRef(0);

  /**
   * Withdraw funds from wallet to bank/UPI/PayPal
   * - Optimistically deducts the amount from balance
   * - Rolls back on failure and shows error toast
   */
  const withdraw = useCallback(async (data: {
    amount: number;
    method: 'bank' | 'upi' | 'paypal';
    accountDetails?: string;
  }): Promise<boolean> => {
    const currentRequestId = ++requestIdRef.current;
    setWithdrawState({ isPending: true, error: null, data: null });

    // 1. Snapshot for rollback
    const previousBalance = {
      rezBalance,
      totalBalance,
      availableBalance,
      walletData: walletData ? { ...walletData } : null,
    };

    // 2. Optimistic update - deduct the amount
    adjustBalance(-data.amount);

    try {
      // 3. Server call
      const response = await walletApi.withdraw(data);

      if (currentRequestId !== requestIdRef.current) return false;

      if (!response.success) {
        throw new Error(response.message || 'Withdrawal failed');
      }

      setWithdrawState({ isPending: false, error: null, data: response.data });
      showSuccess('Withdrawal initiated successfully');

      // 4. Refresh wallet to get confirmed balance
      refreshWallet();

      return true;
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return false;

      // 5. Rollback on failure — reverse the optimistic delta
      const error = err instanceof Error ? err : new Error(String(err));

      adjustBalance(data.amount);
      refreshWallet();

      setWithdrawState({ isPending: false, error, data: null });
      showError('Withdrawal failed. Please try again.');

      return false;
    }
  }, [walletData, rezBalance, totalBalance, availableBalance, adjustBalance, refreshWallet, showError, showSuccess]);

  /**
   * Add money to wallet via top-up
   * - Optimistically adds the amount to balance
   * - Rolls back on failure and shows error toast
   */
  const addMoney = useCallback(async (amount: number): Promise<boolean> => {
    const currentRequestId = ++requestIdRef.current;
    setAddMoneyState({ isPending: true, error: null, data: null });

    // 1. Snapshot for rollback
    const previousBalance = {
      rezBalance,
      totalBalance,
      availableBalance,
      walletData: walletData ? { ...walletData } : null,
    };

    // 2. Optimistic update - add the amount
    adjustBalance(amount);

    try {
      // 3. Server call
      const response = await walletApi.topup({ amount });

      if (currentRequestId !== requestIdRef.current) return false;

      if (!response.success) {
        throw new Error(response.message || 'Top-up failed');
      }

      setAddMoneyState({ isPending: false, error: null, data: response.data });
      showSuccess('Money added to wallet');

      // 4. Refresh wallet to get confirmed balance
      refreshWallet();

      return true;
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return false;

      // 5. Rollback on failure — reverse the optimistic delta
      const error = err instanceof Error ? err : new Error(String(err));

      adjustBalance(-amount);
      refreshWallet();

      setAddMoneyState({ isPending: false, error, data: null });
      showError('Failed to add money. Please try again.');

      return false;
    }
  }, [walletData, rezBalance, totalBalance, availableBalance, adjustBalance, refreshWallet, showError, showSuccess]);

  /**
   * Transfer funds to another user
   * - Optimistically deducts the amount from balance
   * - Rolls back on failure and shows error toast
   */
  const transferFunds = useCallback(async (data: {
    recipientPhone?: string;
    recipientId?: string;
    amount: number;
    coinType?: 'nuqta' | 'promo' | 'branded';
    note?: string;
  }): Promise<boolean> => {
    const currentRequestId = ++requestIdRef.current;
    setTransferState({ isPending: true, error: null, data: null });

    // 1. Snapshot for rollback
    const previousBalance = {
      rezBalance,
      totalBalance,
      availableBalance,
      walletData: walletData ? { ...walletData } : null,
    };

    // 2. Optimistic update - deduct the amount
    adjustBalance(-data.amount);

    try {
      // 3. Server call
      const response = await walletApi.initiateTransfer(data);

      if (currentRequestId !== requestIdRef.current) return false;

      if (!response.success) {
        throw new Error(response.message || 'Transfer failed');
      }

      // If OTP is required, we need to confirm with OTP
      if (response.data?.requiresOtp) {
        // Don't complete the rollback yet - user needs to enter OTP
        // The balance will be updated after OTP confirmation
        setTransferState({
          isPending: false,
          error: null,
          data: { ...response.data, pendingOtp: true },
        });
        return true;
      }

      setTransferState({ isPending: false, error: null, data: response.data });
      showSuccess('Transfer initiated successfully');

      // 4. Refresh wallet to get confirmed balance
      refreshWallet();

      return true;
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return false;

      // 5. Rollback on failure — reverse the optimistic delta
      const error = err instanceof Error ? err : new Error(String(err));

      adjustBalance(data.amount);
      refreshWallet();

      setTransferState({ isPending: false, error, data: null });
      showError('Transfer failed. Please try again.');

      return false;
    }
  }, [walletData, rezBalance, totalBalance, availableBalance, adjustBalance, refreshWallet, showError, showSuccess]);

  /**
   * Confirm a transfer that required OTP verification
   */
  const confirmTransfer = useCallback(async (transferId: string, otp: string): Promise<boolean> => {
    const currentRequestId = ++requestIdRef.current;

    try {
      const response = await walletApi.confirmTransfer({ transferId, otp });

      if (currentRequestId !== requestIdRef.current) return false;

      if (!response.success) {
        throw new Error(response.message || 'Transfer confirmation failed');
      }

      showSuccess('Transfer completed successfully');
      refreshWallet();

      setTransferState({ isPending: false, error: null, data: response.data });
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Refresh to restore correct balance
      refreshWallet();

      setTransferState({ isPending: false, error, data: null });
      showError('Transfer confirmation failed. Please try again.');

      return false;
    }
  }, [refreshWallet, showError, showSuccess]);

  return {
    // Withdrawal
    withdraw,
    withdrawState,
    isWithdrawPending: withdrawState.isPending,

    // Add money
    addMoney,
    addMoneyState,
    isAddMoneyPending: addMoneyState.isPending,

    // Transfer
    transferFunds,
    confirmTransfer,
    transferState,
    isTransferPending: transferState.isPending,
  };
}

export default useWalletOperations;
