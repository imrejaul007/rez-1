// ScratchCard API Service
// Uses unified game system endpoints (/api/games/scratch-card/*)
// Prize is generated server-side on play, never on create.

import apiClient from './apiClient';

/** Server-driven eligibility response */
export interface ScratchCardEligibility {
  canPlay: boolean;
  remainingToday: number;
  dailyLimit: number;
  cooldownSeconds: number;
  nextAvailableAt: string | null;
  serverTime: string;
  pendingSessionId?: string;
}

/** Prize returned from server after play */
export interface ScratchCardPrize {
  type: 'coins' | 'badge' | 'discount' | 'cashback' | 'free_delivery' | 'cashback_multiplier';
  value: number | string;
  description: string;
}

/** Game session returned from backend */
export interface ScratchCardSession {
  _id: string;
  sessionId: string;
  user: string;
  gameType: string;
  status: 'pending' | 'playing' | 'completed' | 'expired';
  result?: {
    won: boolean;
    prize: ScratchCardPrize;
  };
  earnedFrom?: string;
  startedAt: string;
  completedAt?: string;
  expiresAt: string;
}

/** API response wrapper */
interface ApiRes<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ScratchCardApiService {
  private baseUrl = '/games/scratch-card';

  /**
   * Check eligibility: remaining plays, cooldown, server time.
   * All timing data comes from server — never trust client clock.
   */
  async checkEligibility(): Promise<ApiRes<ScratchCardEligibility>> {
    try {
      return await apiClient.get(`${this.baseUrl}/eligibility`);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to check eligibility' };
    }
  }

  /**
   * Create a new scratch card session (pending state, NO prize yet).
   * Prize is only generated when play() is called.
   */
  async createSession(): Promise<ApiRes<ScratchCardSession>> {
    try {
      return await apiClient.post(`${this.baseUrl}/create`, { earnedFrom: 'daily_free' });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create session' };
    }
  }

  /**
   * Play (scratch) the card — triggers server-side prize generation + wallet credit.
   * This is the critical call: prize is generated, coins awarded, ledger recorded.
   */
  async play(sessionId: string): Promise<ApiRes<ScratchCardSession>> {
    try {
      return await apiClient.post(`${this.baseUrl}/play`, { sessionId });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to play scratch card' };
    }
  }

  /**
   * Retry claiming a prize that failed to credit.
   * Safe to call multiple times — idempotency key prevents double-award.
   */
  async retryClaim(sessionId: string): Promise<ApiRes<ScratchCardSession>> {
    try {
      return await apiClient.post(`${this.baseUrl}/retry-claim`, { sessionId });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to retry claim' };
    }
  }
}

// Singleton
const SCRATCH_CARD_API_KEY = '__rezScratchCardApiService__';

function getScratchCardApiService(): ScratchCardApiService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[SCRATCH_CARD_API_KEY]) {
      (globalThis as any)[SCRATCH_CARD_API_KEY] = new ScratchCardApiService();
    }
    return (globalThis as any)[SCRATCH_CARD_API_KEY];
  }
  return new ScratchCardApiService();
}

export default getScratchCardApiService();
