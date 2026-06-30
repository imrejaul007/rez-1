import { create } from 'zustand';
import { WalletData } from '@/types/wallet';
import walletApi from '@/services/walletApi';
import { useToastStore } from './toastStore';

// ---------------------------------------------------------------------------
// State types (mirrors WalletContext)
// ---------------------------------------------------------------------------
interface WalletStoreData {
  walletData: WalletData | null;
  rezBalance: number;
  totalBalance: number;
  availableBalance: number;
  brandedCoins: any[];
  savingsInsights: { totalSaved: number; thisMonth: number; avgPerVisit: number };
  refreshWallet: () => Promise<void>;
  rawBackendData: any | null;
  isLoading: boolean;
  isRefreshing: boolean;
}

interface WalletStoreState extends WalletStoreData {
  _setFromProvider: (data: WalletStoreData) => void;
  /** Optimistic balance adjustment — adds delta to rez/total/available balances */
  adjustBalance: (delta: number) => void;
  /** Optimistic addMoney — instantly credits balance, reverts on error */
  addMoney: (amount: number) => Promise<any>;
  /** Optimistic withdraw — instantly deducts balance, reverts on error */
  withdraw: (amount: number, method: 'bank' | 'upi' | 'paypal', accountDetails?: string) => Promise<any>;
  /** Optimistic transfer — instantly deducts balance, reverts on error */
  transfer: (recipientId: string, recipientPhone: string, amount: number, coinType: 'nuqta' | 'promo' | 'branded') => Promise<any>;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const defaults: WalletStoreData = {
  walletData: null,
  rezBalance: 0,
  totalBalance: 0,
  availableBalance: 0,
  brandedCoins: [],
  savingsInsights: { totalSaved: 0, thisMonth: 0, avgPerVisit: 0 },
  refreshWallet: async () => {},
  rawBackendData: null,
  isLoading: false,
  isRefreshing: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useWalletStore = create<WalletStoreState>((set, get) => ({
  ...defaults,

  // Called by WalletProvider on every render to keep store in sync
  // FIX: Compare actual data fields, not object reference
  _setFromProvider: (data: WalletStoreData) => {
    set((s) => {
      const insights = data.savingsInsights;
      const prevInsights = s.savingsInsights;
      // Only skip update if ALL relevant fields are the same
      if (s.rezBalance === data.rezBalance &&
          s.totalBalance === data.totalBalance &&
          s.availableBalance === data.availableBalance &&
          s.isLoading === data.isLoading &&
          s.isRefreshing === data.isRefreshing &&
          s.walletData === data.walletData &&
          s.brandedCoins === data.brandedCoins &&
          prevInsights?.totalSaved === insights?.totalSaved &&
          prevInsights?.thisMonth === insights?.thisMonth &&
          prevInsights?.avgPerVisit === insights?.avgPerVisit) {
        return {};
      }
      return data;
    });
  },

  // Optimistic balance adjustment for instant UI feedback after earning coins.
  // Server truth is restored by the next refreshWallet() call.
  adjustBalance: (delta: number) => {
    set((state) => {
      if (!state.walletData) return state;
      const updatedCoins = state.walletData.coins.map((c) =>
        c.type === 'rez' ? { ...c, amount: c.amount + delta } : c
      );
      return {
        rezBalance: state.rezBalance + delta,
        totalBalance: state.totalBalance + delta,
        availableBalance: state.availableBalance + delta,
        walletData: {
          ...state.walletData,
          totalBalance: state.walletData.totalBalance + delta,
          availableBalance: state.walletData.availableBalance + delta,
          coins: updatedCoins,
        },
      };
    });
  },

  addMoney: async (amount: number) => {
    const prev = get();
    // Optimistic: instantly credit the balance
    set((state) => {
      if (!state.walletData) return state;
      const updatedCoins = state.walletData.coins.map((c) =>
        c.type === 'rez' ? { ...c, amount: c.amount + amount } : c
      );
      return {
        isLoading: false,
        rezBalance: state.rezBalance + amount,
        totalBalance: state.totalBalance + amount,
        availableBalance: state.availableBalance + amount,
        walletData: {
          ...state.walletData,
          totalBalance: state.walletData.totalBalance + amount,
          availableBalance: state.walletData.availableBalance + amount,
          coins: updatedCoins,
        },
      };
    });
    try {
      const result = await walletApi.topup({ amount });
      if (!result.success) throw new Error(result.message);
      // Apply confirmed balance from server response
      const newBalance = result.data?.wallet?.balance?.available ?? result.data?.wallet?.balance?.total;
      if (newBalance != null) {
        set((state) => {
          if (!state.walletData) return state;
          const delta = newBalance - state.availableBalance;
          const updatedCoins = state.walletData.coins.map((c) =>
            c.type === 'rez' ? { ...c, amount: c.amount + delta } : c
          );
          return {
            rezBalance: state.rezBalance + delta,
            totalBalance: state.totalBalance + delta,
            availableBalance: state.availableBalance + delta,
            walletData: {
              ...state.walletData,
              totalBalance: state.walletData.totalBalance + delta,
              availableBalance: state.walletData.availableBalance + delta,
              coins: updatedCoins,
            },
          };
        });
      }
      return result;
    } catch (error: any) {
      // Revert optimistic update on failure
      set({
        rezBalance: prev.rezBalance,
        totalBalance: prev.totalBalance,
        availableBalance: prev.availableBalance,
        walletData: prev.walletData,
      });
      useToastStore.getState().showError('Failed to add money. Please try again.');
      throw error;
    }
  },

  withdraw: async (amount: number, method: 'bank' | 'upi' | 'paypal', accountDetails?: string) => {
    const prev = get();
    // Optimistic: instantly deduct the balance
    set((state) => {
      if (!state.walletData) return state;
      const updatedCoins = state.walletData.coins.map((c) =>
        c.type === 'rez' ? { ...c, amount: Math.max(0, c.amount - amount) } : c
      );
      return {
        isLoading: false,
        rezBalance: Math.max(0, state.rezBalance - amount),
        totalBalance: Math.max(0, state.totalBalance - amount),
        availableBalance: Math.max(0, state.availableBalance - amount),
        walletData: {
          ...state.walletData,
          totalBalance: Math.max(0, state.walletData.totalBalance - amount),
          availableBalance: Math.max(0, state.walletData.availableBalance - amount),
          coins: updatedCoins,
        },
      };
    });
    try {
      const result = await walletApi.withdraw({ amount, method, accountDetails });
      if (!result.success) throw new Error(result.message);
      // Apply confirmed balance from server response
      const newBalance = result.data?.wallet?.balance?.available ?? result.data?.wallet?.balance?.total;
      if (newBalance != null) {
        set((state) => {
          if (!state.walletData) return state;
          const delta = newBalance - state.availableBalance;
          const updatedCoins = state.walletData.coins.map((c) =>
            c.type === 'rez' ? { ...c, amount: Math.max(0, c.amount + delta) } : c
          );
          return {
            rezBalance: Math.max(0, state.rezBalance + delta),
            totalBalance: Math.max(0, state.totalBalance + delta),
            availableBalance: Math.max(0, state.availableBalance + delta),
            walletData: {
              ...state.walletData,
              totalBalance: Math.max(0, state.walletData.totalBalance + delta),
              availableBalance: Math.max(0, state.walletData.availableBalance + delta),
              coins: updatedCoins,
            },
          };
        });
      }
      return result;
    } catch (error: any) {
      // Revert optimistic update on failure
      set({
        rezBalance: prev.rezBalance,
        totalBalance: prev.totalBalance,
        availableBalance: prev.availableBalance,
        walletData: prev.walletData,
      });
      useToastStore.getState().showError('Withdrawal failed. Please try again.');
      throw error;
    }
  },

  transfer: async (recipientId: string, recipientPhone: string, amount: number, coinType: 'nuqta' | 'promo' | 'branded') => {
    const prev = get();
    // Optimistic: instantly deduct the balance
    set((state) => {
      if (!state.walletData) return state;
      const updatedCoins = state.walletData.coins.map((c) => {
        if (c.type === 'rez' && coinType === 'nuqta') {
          return { ...c, amount: Math.max(0, c.amount - amount) };
        }
        if (c.type === 'promo' && coinType === 'promo') {
          return { ...c, amount: Math.max(0, c.amount - amount) };
        }
        return c;
      });
      return {
        isLoading: false,
        rezBalance: coinType === 'nuqta' ? Math.max(0, state.rezBalance - amount) : state.rezBalance,
        totalBalance: Math.max(0, state.totalBalance - amount),
        availableBalance: Math.max(0, state.availableBalance - amount),
        walletData: {
          ...state.walletData,
          totalBalance: Math.max(0, state.walletData.totalBalance - amount),
          availableBalance: Math.max(0, state.walletData.availableBalance - amount),
          coins: updatedCoins,
        },
      };
    });
    try {
      const result = await walletApi.initiateTransfer({
        recipientId,
        recipientPhone,
        amount,
        coinType,
      });
      if (!result.success) throw new Error(result.message);
      // Apply confirmed balance from server response if available
      const newBalance = result.data?.wallet?.balance?.available ?? result.data?.wallet?.balance?.total;
      if (newBalance != null) {
        set((state) => {
          if (!state.walletData) return state;
          const delta = newBalance - state.availableBalance;
          const updatedCoins = state.walletData.coins.map((c) =>
            c.type === 'rez' ? { ...c, amount: Math.max(0, c.amount + delta) } : c
          );
          return {
            rezBalance: Math.max(0, state.rezBalance + delta),
            totalBalance: Math.max(0, state.totalBalance + delta),
            availableBalance: Math.max(0, state.availableBalance + delta),
            walletData: {
              ...state.walletData,
              totalBalance: Math.max(0, state.walletData.totalBalance + delta),
              availableBalance: Math.max(0, state.walletData.availableBalance + delta),
              coins: updatedCoins,
            },
          };
        });
      }
      return result;
    } catch (error: any) {
      // Revert optimistic update on failure
      set({
        rezBalance: prev.rezBalance,
        totalBalance: prev.totalBalance,
        availableBalance: prev.availableBalance,
        walletData: prev.walletData,
      });
      useToastStore.getState().showError('Transfer failed. Please try again.');
      throw error;
    }
  },
}));
