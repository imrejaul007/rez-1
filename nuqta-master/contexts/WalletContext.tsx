// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { WalletData, CoinBalance } from '@/types/wallet';
import walletApi from '@/services/walletApi';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';

// ---------------------------------------------------------------------------
// Transform backend wallet response into frontend WalletData
// (Same logic as hooks/useWallet.ts — kept in sync)
// ---------------------------------------------------------------------------
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
      color: '#B45309',
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
      color: '#D97706',
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

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------
// Data context — changes only when actual wallet data changes (not loading state)
interface WalletDataContextType {
  walletData: WalletData | null;
  rezBalance: number;
  totalBalance: number;
  availableBalance: number;
  brandedCoins: any[];
  savingsInsights: { totalSaved: number; thisMonth: number; avgPerVisit: number };
  refreshWallet: () => Promise<void>;
  rawBackendData: any | null;
}

// Loading context — changes on loading transitions only
interface WalletLoadingContextType {
  isLoading: boolean;
  isRefreshing: boolean;
}

// Combined type for backwards compatibility
interface WalletContextType extends WalletDataContextType, WalletLoadingContextType {}

const WALLET_DATA_DEFAULTS: WalletDataContextType = {
  walletData: null,
  rezBalance: 0,
  totalBalance: 0,
  availableBalance: 0,
  brandedCoins: [],
  savingsInsights: { totalSaved: 0, thisMonth: 0, avgPerVisit: 0 },
  refreshWallet: async () => {},
  rawBackendData: null,
};

const WALLET_LOADING_DEFAULTS: WalletLoadingContextType = {
  isLoading: false,
  isRefreshing: false,
};

const WALLET_DEFAULTS: WalletContextType = { ...WALLET_DATA_DEFAULTS, ...WALLET_LOADING_DEFAULTS };

const WalletDataContext = createContext<WalletDataContextType | undefined>(undefined);
const WalletLoadingContext = createContext<WalletLoadingContextType | undefined>(undefined);
// Keep legacy context for backwards compat with any direct consumers
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ── Module-level dedup: survives component remounts caused by DeferredProviders ──
let _walletPending: Promise<void> | null = null;
let _walletLastFetch = 0;
const WALLET_DEDUP_MS = 10_000; // 10 seconds dedup window

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function WalletProvider({ children }: { children: ReactNode }) {
  const authUser = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authUserId = authUser?.id ?? authUser?._id;
  const authUserIsOnboarded = authUser?.isOnboarded ?? false;

  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [rawBackendData, setRawBackendData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Fetch wallet from API (module-level dedup prevents duplicate calls on remount)
  const fetchWallet = useCallback(async (isRefresh: boolean = false) => {
    // Coalesce with in-flight request (module-level — survives remounts)
    if (_walletPending) {
      await _walletPending;
      return;
    }

    // Skip if fetched very recently (dedup across DeferredProvider remounts)
    if (!isRefresh && Date.now() - _walletLastFetch < WALLET_DEDUP_MS) {
      return;
    }

    const promise = (async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const response = await walletApi.getBalance();

        if (abortRef.current.signal.aborted) return;

        if (response.success && response.data) {
          const userId = authUser?._id || authUser?.id || 'unknown';
          const transformed = transformWalletResponse(response.data, userId);
          setWalletData(transformed);
          setRawBackendData(response.data);
          _walletLastFetch = Date.now();
        }
      } catch (error) {
        if (abortRef.current?.signal.aborted) return;
        // silently handle
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        _walletPending = null;
      }
    })();

    _walletPending = promise;
    await promise;
  }, [authUser?._id]);

  // Stable ref for fetchWallet to break the dependency chain:
  // fetchWallet → refreshWallet → context value → all consumers re-render
  const fetchWalletRef = useRef(fetchWallet);
  fetchWalletRef.current = fetchWallet;

  // Public refresh function (always bypasses dedup cache)
  // Uses ref to maintain stable identity — prevents 46 consumer re-renders
  const refreshWallet = useCallback(async () => {
    await fetchWalletRef.current(true);
  }, []); // Empty deps — stable identity

  // Auto-fetch when user authenticates, clear on logout
  // Skip during onboarding to prevent thundering herd of API calls on Android
  useEffect(() => {
    if (isAuthenticated && authUserId && authUserIsOnboarded) {
      // Module-level dedup handles preventing duplicate fetches across remounts
      fetchWallet(false);
    } else if (!isAuthenticated) {
      // Clear on logout
      setWalletData(null);
      setRawBackendData(null);
      _walletLastFetch = 0;
      if (abortRef.current) abortRef.current.abort();
    }
  }, [isAuthenticated, authUserId, authUserIsOnboarded]);

  // Retry wallet fetch if first attempt failed (e.g., 401 race on page refresh)
  // Waits 2s then retries once if walletData is still null
  useEffect(() => {
    if (!isAuthenticated || !authUserIsOnboarded) return;
    if (walletData) return; // Already loaded
    if (isLoading) return; // Still loading

    const retryTimer = setTimeout(() => {
      if (!walletData && _walletLastFetch === 0) {
        fetchWallet(false);
      }
    }, 2000);

    return () => clearTimeout(retryTimer);
  }, [isAuthenticated, authUserIsOnboarded, walletData, isLoading, fetchWallet]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Split into two memo'd values so loading state changes don't re-render data consumers
  const dataValue = useMemo<WalletDataContextType>(() => {
    const rezBalance = walletData?.coins?.find(c => c.type === 'rez')?.amount ?? 0;
    const totalBalance = walletData?.totalBalance ?? 0;
    const availableBalance = walletData?.availableBalance ?? 0;
    const brandedCoins = walletData?.brandedCoins ?? [];
    const savingsInsights = walletData?.savingsInsights ?? { totalSaved: 0, thisMonth: 0, avgPerVisit: 0 };

    return {
      walletData, rezBalance, totalBalance, availableBalance,
      brandedCoins, savingsInsights, refreshWallet, rawBackendData,
    };
  }, [walletData, refreshWallet, rawBackendData]);

  const loadingValue = useMemo<WalletLoadingContextType>(() => ({
    isLoading, isRefreshing,
  }), [isLoading, isRefreshing]);

  // Combined value for legacy WalletContext consumers
  // FIX: Don't spread - pass primitives directly to avoid creating new object every render
  const combinedValue = useMemo<WalletContextType>(() => ({
    walletData: dataValue.walletData,
    rawBackendData: dataValue.rawBackendData,
    availableBalance: dataValue.availableBalance,
    rezBalance: dataValue.rezBalance,
    totalBalance: dataValue.totalBalance,
    brandedCoins: dataValue.brandedCoins,
    savingsInsights: dataValue.savingsInsights,
    refreshWallet: dataValue.refreshWallet,
    isLoading: loadingValue.isLoading,
    isRefreshing: loadingValue.isRefreshing,
  }), [dataValue, loadingValue]);

  // Sync to Zustand store for crash-safe fallback
  const _setFromProvider = useWalletStore((s) => s._setFromProvider);
  useEffect(() => {
    _setFromProvider(combinedValue);
  }, [combinedValue, _setFromProvider]);

  return (
    <WalletDataContext.Provider value={dataValue}>
      <WalletLoadingContext.Provider value={loadingValue}>
        <WalletContext.Provider value={combinedValue}>
          {children}
        </WalletContext.Provider>
      </WalletLoadingContext.Provider>
    </WalletDataContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
/**
 * Primary hook — reads from data context only (not affected by loading state transitions).
 * Falls back to Zustand store for crash safety when outside Provider.
 */
export function useWalletContext(): WalletContextType {
  const dataCtx = useContext(WalletDataContext);
  const loadingCtx = useContext(WalletLoadingContext);

  // Zustand fallback selectors (always called — hooks can't be conditional)
  const storeWalletData = useWalletStore((s) => s.walletData);
  const storeRezBalance = useWalletStore((s) => s.rezBalance);
  const storeTotalBalance = useWalletStore((s) => s.totalBalance);
  const storeAvailableBalance = useWalletStore((s) => s.availableBalance);
  const storeBrandedCoins = useWalletStore((s) => s.brandedCoins);
  const storeSavingsInsights = useWalletStore((s) => s.savingsInsights);
  const storeRefreshWallet = useWalletStore((s) => s.refreshWallet);
  const storeRawBackendData = useWalletStore((s) => s.rawBackendData);
  const storeIsLoading = useWalletStore((s) => s.isLoading);
  const storeIsRefreshing = useWalletStore((s) => s.isRefreshing);

  if (dataCtx && loadingCtx) {
    return { ...dataCtx, ...loadingCtx };
  }

  // Fallback to Zustand store (populated by Provider elsewhere in the tree)
  return {
    walletData: storeWalletData,
    rezBalance: storeRezBalance,
    totalBalance: storeTotalBalance,
    availableBalance: storeAvailableBalance,
    brandedCoins: storeBrandedCoins,
    savingsInsights: storeSavingsInsights,
    refreshWallet: storeRefreshWallet,
    rawBackendData: storeRawBackendData,
    isLoading: storeIsLoading,
    isRefreshing: storeIsRefreshing,
  };
}

/**
 * Loading-only hook — for consumers that need to show loading spinners.
 * Only re-renders when isLoading/isRefreshing change.
 */
export function useWalletLoading(): WalletLoadingContextType {
  const context = useContext(WalletLoadingContext);
  return context ?? WALLET_LOADING_DEFAULTS;
}

export { WalletContext, WalletDataContext, WalletLoadingContext };
