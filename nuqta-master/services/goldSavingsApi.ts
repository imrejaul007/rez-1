import apiClient, { ApiResponse } from './apiClient';

// ============================================================================
// TYPES
// ============================================================================

export interface GoldPriceData {
  pricePerGram: number;
  currency: string;
  source: string;
  effectiveAt: string;
}

export interface GoldHoldingData {
  balanceGrams: number;
  totalInvested: number;
  totalSold: number;
  currentValue: number;
  pricePerGram?: number;
}

export interface GoldTransaction {
  _id: string;
  type: 'buy' | 'sell';
  grams: number;
  pricePerGram: number;
  amount: number;
  date: string;
}

export interface GoldTradeResult {
  type: 'buy' | 'sell';
  grams: number;
  amount: number;
  pricePerGram: number;
  date: string;
  newBalance: number;
  duplicate?: boolean;
}

// ============================================================================
// API CALLS
// ============================================================================

export const goldSavingsApi = {
  /** Get current gold price (public) */
  getPrice: async (): Promise<ApiResponse<GoldPriceData>> => {
    return apiClient.get<GoldPriceData>('/gold/price');
  },

  /** Get user's gold holding */
  getHolding: async (): Promise<ApiResponse<GoldHoldingData>> => {
    return apiClient.get<GoldHoldingData>('/gold/holding');
  },

  /** Buy gold with amount */
  buyGold: async (amount: number, idempotencyKey: string): Promise<ApiResponse<GoldTradeResult>> => {
    return apiClient.post<GoldTradeResult>('/gold/buy', { amount, idempotencyKey });
  },

  /** Sell gold by grams */
  sellGold: async (grams: number, idempotencyKey: string): Promise<ApiResponse<GoldTradeResult>> => {
    return apiClient.post<GoldTradeResult>('/gold/sell', { grams, idempotencyKey });
  },

  /** Get paginated transaction history */
  getTransactions: async (page: number = 1, limit: number = 10): Promise<ApiResponse<GoldTransaction[]>> => {
    return apiClient.get<GoldTransaction[]>(`/gold/transactions?page=${page}&limit=${limit}`);
  },
};
