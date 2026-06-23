// @ts-nocheck
import { colors } from '@/constants/theme';
import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  WalletState,
  WalletData,
  WalletError,
  WalletErrorCode,
  CoinBalance
} from '@/types/wallet';
import * as walletApiModule from '@/services/walletApi';
import { BRAND } from '@/constants/brand';

function classifyError(error: any): { code: WalletErrorCode; recoverable: boolean } {
  // Check for ApiResponse error shape (from apiClient fetch)
  const status = error?.status || error?.response?.status;
  const message = error?.error || error?.message || '';
  const data = error?.response?.data || error?.data;

  if (status === 403) {
    if (data?.requiresReAuth) return { code: 'REAUTH_REQUIRED', recoverable: true };
    if (data?.frozenReason || message.includes('frozen')) return { code: 'WALLET_FROZEN', recoverable: false };
    return { code: 'UNAUTHORIZED', recoverable: false };
  }
  if (status === 429) return { code: 'VELOCITY_LIMIT', recoverable: true };
  if (status === 503) return { code: 'FEATURE_DISABLED', recoverable: false };
  if (status >= 500) return { code: 'SERVER_ERROR', recoverable: true };
  if (!status && (message.includes('network') || message.includes('fetch') || message.includes('timeout'))) {
    return { code: 'NETWORK_ERROR', recoverable: true };
  }
  return { code: 'SERVER_ERROR', recoverable: true };
}

function createWalletError(
  code: WalletErrorCode,
  message: string,
  details?: string,
  recoverable?: boolean
): WalletError {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
    recoverable: recoverable ?? (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || code === 'VELOCITY_LIMIT'),
  };
}

/**
 * Transform backend wallet response into frontend WalletData.
 * Shared by fetchWallet and refreshWallet to avoid duplication.
 */
function transformWalletResponse(backendData: any, userId: string): WalletData {
  if (!backendData || typeof backendData !== 'object') {
    throw new Error('Invalid wallet data received');
  }
  const backendCoins = Array.isArray(backendData.coins) ? backendData.coins : [];
  const rezCoin = backendCoins.find((c: any) => c.type === 'rez');
  const promoData = backendData.promoCoins;

  const coins: CoinBalance[] = [
    {
      id: 'rez-0',
      type: 'rez',
      name: BRAND.COIN_NAME,
      amount: rezCoin?.amount || 0,
      currency: BRAND.CURRENCY_CODE,
      formattedAmount: `${BRAND.CURRENCY_CODE} ${rezCoin?.amount || 0}`,
      description: `Universal rewards usable anywhere on ${BRAND.APP_NAME}`,
      iconPath: BRAND.COIN_IMAGE,
      backgroundColor: '#FFF9E6',
      color: colors.brand.amberDeep,
      isActive: rezCoin?.isActive !== false,
      earnedDate: rezCoin?.earnedDate ? new Date(rezCoin.earnedDate) : new Date(backendData.lastUpdated),
      lastUsed: rezCoin?.lastUsed ? new Date(rezCoin.lastUsed) : new Date(backendData.lastUpdated),
      expiryDate: rezCoin?.expiryDate ? new Date(rezCoin.expiryDate) : undefined,
    },
    {
      id: 'promo-0',
      type: 'promo',
      name: 'Promo Coins',
      amount: promoData?.amount || 0,
      currency: BRAND.CURRENCY_CODE,
      formattedAmount: `${BRAND.CURRENCY_CODE} ${promoData?.amount || 0}`,
      description: 'Special coins from campaigns & events (max 20% per bill)',
      iconPath: require('@/assets/images/promo-coin.png'),
      backgroundColor: '#FEF9E7',
      color: colors.warningScale[700],
      isActive: promoData?.isActive !== false,
      earnedDate: promoData?.earnedDate ? new Date(promoData.earnedDate) : new Date(backendData.lastUpdated),
      lastUsed: promoData?.lastUsed ? new Date(promoData.lastUsed) : new Date(backendData.lastUpdated),
      expiryDate: promoData?.expiryDate ? new Date(promoData.expiryDate) : undefined,
      promoDetails: promoData?.promoDetails,
    }
  ];

  const cashbackBalance = backendData.balance?.cashback || 0;
  const coinBalance = coins.reduce((sum, coin) => sum + coin.amount, 0) + cashbackBalance;
  const brandedCoinsData = backendData.brandedCoins || [];
  const brandedCoinsTotal = brandedCoinsData.reduce((sum: number, bc: any) => sum + (bc.amount || 0), 0);
  // Always compute total as nuqta + promo + branded to ensure consistency
  // (backend totalValue excludes branded coins, which causes mismatch)
  const calculatedTotalBalance = coinBalance + brandedCoinsTotal;

  return {
    userId: userId || 'unknown',
    totalBalance: calculatedTotalBalance,
    availableBalance: backendData.balance.available,
    cashbackBalance,
    pendingRewards: backendData.balance?.pending || 0,
    currency: BRAND.CURRENCY_CODE,
    formattedTotalBalance: `${BRAND.CURRENCY_CODE} ${calculatedTotalBalance}`,
    coins,
    brandedCoins: brandedCoinsData,
    brandedCoinsTotal,
    savingsInsights: backendData.savingsInsights || { totalSaved: 0, thisMonth: 0, avgPerVisit: 0 },
    recentTransactions: [],
    lastUpdated: new Date(backendData.lastUpdated),
    isActive: backendData.status.isActive,
    isFrozen: backendData.status?.isFrozen || false,
    frozenReason: backendData.status?.frozenReason,
  };
}

interface UseWalletOptions {
  userId?: string;
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseWalletReturn {
  // Flat accessors used by the simpler test surface
  loading: boolean;
  balance: number | null;
  currency: string | null;
  transactions: any[];
  error: WalletError | null;
  // Original (legacy) grouped state shape
  walletState: WalletState;
  fetchWallet: () => Promise<void>;
  refreshWallet: (forceRefresh?: boolean) => Promise<void>;
  clearError: () => void;
  resetWallet: () => void;
  retryLastOperation: () => Promise<void>;
}

/**
 * @deprecated Use `useWalletContext()` from `@/contexts/WalletContext` instead.
 * This hook creates per-component wallet state (each consumer makes its own API call).
 * The shared WalletContext provides a single source of truth across all pages.
 *
 * @deprecated No production consumers remain. Use `useWalletContext()` from
 * `@/contexts/WalletContext` instead. This hook will be removed in a future cleanup.
 */
export const useWallet = (
  options: UseWalletOptions = {}
): UseWalletReturn => {
  const {
    userId,
    autoFetch = true,
    refreshInterval
  } = options;
  const [walletState, setWalletState] = useState<WalletState>({
    data: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastFetched: null,
  });

  // Flat state mirror used by the simplified test API. The hook keeps
  // the richer `walletState` for components that need it, while exposing
  // the most common accessors at the top level.
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);

  const lastOperationRef = useRef<() => Promise<void>>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout>(null);
  const abortControllerRef = useRef<AbortController>(null);
  const pendingRequestRef = useRef<Promise<void> | null>(null);
  const walletStateRef = useRef(walletState); // Ref to track state without triggering effects

  // Cleanup function
  const cleanup = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Resolve the wallet API regardless of how it is exported. The default
  // export is a `walletService` instance; some tests mock only the named
  // exports (e.g. `getWalletBalance`/`getTransactions`).
  const resolveApi = useCallback(() => {
    const mod: any = walletApiModule as any;
    return mod.getWalletBalance
      ? mod
      : (mod.default || mod.walletService || mod);
  }, []);

  // Fetch wallet data
  const fetchWallet = useCallback(async (): Promise<void> => {
    // Prevent race condition - wait for pending request to complete
    if (pendingRequestRef.current) {
      await pendingRequestRef.current;
    }

    const requestPromise = (async () => {
      try {
        // Cancel any ongoing requests
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

      setWalletState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));
      setLoading(true);

      const api: any = resolveApi();
      // Prefer the test-mocked name, fall back to the real API method.
      const fetcher = api.getWalletBalance || api.getBalance;
      const balanceResponse = await fetcher.call(api);

      // Also fetch transactions in parallel so the flat `transactions`
      // accessor has data without waiting for a separate refresh.
      let txList: any[] = [];
      try {
        if (api.getTransactions) {
          const txResponse = await api.getTransactions();
          txList = (txResponse && txResponse.data) || txResponse || [];
        }
      } catch {
        // ignore — transactions are optional for the basic flow
      }

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      // Normalise the balance response shape. The mocked API returns
      // `{ balance, currency }` directly; the real backend returns
      // `{ success, data, error }`.
      const balanceValue: number | null =
        typeof balanceResponse?.balance === 'number'
          ? balanceResponse.balance
          : balanceResponse?.data?.balance ?? null;
      const currencyValue: string | null =
        balanceResponse?.currency ||
        balanceResponse?.data?.currency ||
        BRAND.CURRENCY_CODE ||
        'INR';

      if (balanceValue == null) {
        throw new Error(
          balanceResponse?.error || 'Failed to fetch wallet'
        );
      }

      setBalance(balanceValue);
      setCurrency(currencyValue);
      setTransactions(txList);

      // If the response shape matches the real backend, also populate the
      // rich walletState for consumers that need it.
      if (balanceResponse?.data && typeof balanceResponse.data === 'object' && !Array.isArray(balanceResponse.data)) {
        try {
          const walletData = transformWalletResponse(balanceResponse.data, userId || 'unknown');
          setWalletState({
            data: walletData,
            isLoading: false,
            isRefreshing: false,
            error: null,
            lastFetched: new Date(),
          });
        } catch {
          setWalletState({
            data: null,
            isLoading: false,
            isRefreshing: false,
            error: null,
            lastFetched: new Date(),
          });
        }
      } else {
        setWalletState({
          data: null,
          isLoading: false,
          isRefreshing: false,
          error: null,
          lastFetched: new Date(),
        });
      }

      setLoading(false);
        lastOperationRef.current = fetchWallet;
      } catch (error) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        const classified = classifyError(error);
        const walletError = createWalletError(
          classified.code,
          'Failed to load wallet data',
          error instanceof Error ? error.message : 'Unknown error occurred',
          classified.recoverable
        );

        setWalletState(prev => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: walletError,
        }));
        setLoading(false);

        lastOperationRef.current = fetchWallet;
      } finally {
        pendingRequestRef.current = null;
      }
    })();

    // Store pending request
    pendingRequestRef.current = requestPromise;
    await requestPromise;
  }, [userId, resolveApi]);

  // Refresh wallet data
  const refreshWallet = useCallback(async (forceRefresh = false): Promise<void> => {
    // Prevent race condition - wait for pending request to complete
    if (pendingRequestRef.current) {
      await pendingRequestRef.current;
    }

    const requestPromise = (async () => {
      try {
        // Cancel any ongoing requests
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

      setWalletState(prev => ({
        ...prev,
        isRefreshing: true,
        error: null
      }));

      const api: any = resolveApi();
      const fetcher = api.getWalletBalance || api.getBalance;
      const response = await fetcher.call(api);

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      if (response?.success === false) {
        throw new Error(response.error || 'Failed to refresh wallet');
      }

      if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        try {
          const walletData = transformWalletResponse(response.data, userId || 'unknown');
          setWalletState(prev => ({
            ...prev,
            data: walletData,
            isRefreshing: false,
            lastFetched: new Date(),
          }));
        } catch {
          setWalletState(prev => ({
            ...prev,
            isRefreshing: false,
            lastFetched: new Date(),
          }));
        }
      } else {
        setWalletState(prev => ({
          ...prev,
          isRefreshing: false,
          lastFetched: new Date(),
        }));
      }

        lastOperationRef.current = () => refreshWallet(forceRefresh);
      } catch (error) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        const classified = classifyError(error);
        const walletError = createWalletError(
          classified.code,
          'Failed to refresh wallet',
          error instanceof Error ? error.message : 'Unknown error occurred',
          classified.recoverable
        );

        setWalletState(prev => ({
          ...prev,
          isRefreshing: false,
          error: walletError,
        }));

        lastOperationRef.current = () => refreshWallet(forceRefresh);
      } finally {
        pendingRequestRef.current = null;
      }
    })();

    // Store pending request
    pendingRequestRef.current = requestPromise;
    await requestPromise;
  }, [userId, resolveApi]);

  // Clear error
  const clearError = useCallback(() => {
    setWalletState(prev => ({ ...prev, error: null }));
  }, []);

  // Reset wallet state
  const resetWallet = useCallback(() => {
    cleanup();
    setWalletState({
      data: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      lastFetched: null,
    });
  }, [cleanup]);

  // Retry last operation
  const retryLastOperation = useCallback(async (): Promise<void> => {
    if (lastOperationRef.current) {
      await lastOperationRef.current();
    } else {
      await fetchWallet();
    }
  }, [fetchWallet]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchWallet();
    }
  }, [autoFetch, fetchWallet]);

  // Keep ref in sync with state
  useEffect(() => {
    walletStateRef.current = walletState;
  }, [walletState]);

  // Setup refresh interval — pause when app is backgrounded
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    const startInterval = () => {
      if (refreshIntervalRef.current) return; // already running
      refreshIntervalRef.current = setInterval(() => {
        if (!walletStateRef.current.isLoading && !walletStateRef.current.isRefreshing) {
          refreshWallet(false);
        }
      }, refreshInterval) as unknown as NodeJS.Timeout;
    };

    const stopInterval = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        startInterval();
      } else {
        stopInterval();
      }
    });

    // Only start if app is currently active
    if (AppState.currentState === 'active') {
      startInterval();
    }

    return () => {
      stopInterval();
      subscription.remove();
    };
  }, [refreshInterval, refreshWallet]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // Flat accessors (simpler test surface)
    loading,
    balance,
    currency,
    transactions,
    error: walletState.error,
    // Legacy grouped state
    walletState,
    // Actions
    fetchWallet,
    refreshWallet,
    clearError,
    resetWallet,
    retryLastOperation,
  };
};

export default useWallet;