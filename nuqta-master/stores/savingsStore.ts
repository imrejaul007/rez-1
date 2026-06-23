/**
 * Savings Store — B-feature migration (Phase 1.1)
 *
 * Zustand store for the Savings Dashboard. Mirrors the `{ state, actions }`
 * envelope pattern used by other feature stores (auth, cart, gamification).
 *
 * All data flows in through `services/b/savingsApi` — this store never
 * instantiates `fetch` directly.
 */

import { create } from 'zustand';
import { savingsApi } from '@/services/b/savingsApi';
import type {
  SavingsDashboard,
  SavingsSummary,
  SavingsHistoryItem,
  SavingsGoal,
  SavingsStreak,
  SavingsProjection,
  SavingsRecommendation,
} from '@/types/savings.types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface SavingsState {
  /** Top-level dashboard aggregation. */
  dashboard: SavingsDashboard | null;
  /** Period-bounded summary (7/30/90 days). */
  summary: SavingsSummary | null;
  /** Accumulated history rows (capped to the most recent page-loads). */
  history: SavingsHistoryItem[];
  /** 1-indexed current page of the loaded history window. */
  historyPage: number;
  /** Whether the backend has more history pages to load. */
  historyHasMore: boolean;
  /** Total record count reported by the backend. */
  historyTotal: number;
  /** All savings goals for the user. */
  goals: SavingsGoal[];
  /** Daily-activity streak snapshot. */
  streak: SavingsStreak | null;
  /** Forward-looking projection. */
  projection: SavingsProjection | null;
  /** Active savings recommendations / nudges. */
  recommendations: SavingsRecommendation[];
  /** True while the top-level dashboard fetch is in flight. */
  isLoading: boolean;
  /** True while a history fetch (initial or page) is in flight. */
  isLoadingHistory: boolean;
  /** True while a goal mutation (create/update/delete) is in flight. */
  isMutating: boolean;
  /** Last error message surfaced to the UI. */
  error: string | null;
  /** ISO 8601 timestamp of the most recent successful fetch. */
  lastFetchedAt: string | null;
}

// ---------------------------------------------------------------------------
// Actions shape
// ---------------------------------------------------------------------------

export interface SavingsActions {
  /** Fetch the dashboard aggregation. */
  fetchDashboard: () => Promise<void>;
  /** Fetch the period summary; replaces any prior summary. */
  fetchSummary: (periodDays: 7 | 30 | 90) => Promise<void>;
  /**
   * Fetch the first page of history. When `reset` is true (default) the
   * in-memory history list is cleared before the new page is appended.
   */
  fetchHistory: (opts?: { reset?: boolean; limit?: number }) => Promise<void>;
  /** Fetch the next page of history and append it to the existing list. */
  fetchMoreHistory: () => Promise<void>;
  /** Fetch all savings goals. */
  fetchGoals: () => Promise<void>;
  /** Create a new savings goal and append it to the local list. */
  createGoal: (input: {
    name: string;
    targetAmountPaise: number;
    deadline: string;
    category?: string;
  }) => Promise<SavingsGoal | null>;
  /** Patch an existing goal and replace it in the local list. */
  updateGoal: (
    id: string,
    patch: Partial<Pick<SavingsGoal, 'name' | 'targetAmountPaise' | 'deadline'>>
  ) => Promise<SavingsGoal | null>;
  /** Delete a goal and remove it from the local list. */
  deleteGoal: (id: string) => Promise<boolean>;
  /** Fetch the latest streak snapshot. */
  fetchStreak: () => Promise<void>;
  /** Fetch the latest projection. */
  fetchProjection: () => Promise<void>;
  /** Fetch the latest recommendations. */
  fetchRecommendations: () => Promise<void>;
  /** Clear the current error message. */
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Context envelope (matches other feature stores)
// ---------------------------------------------------------------------------

export interface SavingsContextShape {
  state: SavingsState;
  actions: SavingsActions;
}

export interface SavingsStoreState extends SavingsContextShape {
  /** Bridge hook for the eventual context provider; keep stable. */
  _setFromProvider: (data: SavingsContextShape) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const initialState: SavingsState = {
  dashboard: null,
  summary: null,
  history: [],
  historyPage: 0,
  historyHasMore: false,
  historyTotal: 0,
  goals: [],
  streak: null,
  projection: null,
  recommendations: [],
  isLoading: false,
  isLoadingHistory: false,
  isMutating: false,
  error: null,
  lastFetchedAt: null,
};

const noopAsync = async () => {};
const noop = () => {};

const defaultActions: SavingsActions = {
  fetchDashboard: noopAsync,
  fetchSummary: noopAsync,
  fetchHistory: noopAsync,
  fetchMoreHistory: noopAsync,
  fetchGoals: noopAsync,
  createGoal: async () => null,
  updateGoal: async () => null,
  deleteGoal: async () => false,
  fetchStreak: noopAsync,
  fetchProjection: noopAsync,
  fetchRecommendations: noopAsync,
  clearError: noop,
};

/** Default page size for `fetchHistory` / `fetchMoreHistory`. */
const DEFAULT_HISTORY_LIMIT = 20;

/** Narrow an unknown error into a string suitable for `state.error`. */
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

/**
 * Internal creator — exposed separately so tests can spin up an
 * isolated instance without colliding with the singleton below.
 */
export const createSavingsStore = () =>
  create<SavingsStoreState>((set, get) => {
    const actions: SavingsActions = {
      fetchDashboard: async () => {
        set((s) => ({ state: { ...s.state, isLoading: true, error: null } }));
        try {
          const dashboard = await savingsApi.getDashboard();
          set((s) => ({
            state: {
              ...s.state,
              dashboard,
              isLoading: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isLoading: false, error: toErrorMessage(err) },
          }));
        }
      },

      fetchSummary: async (periodDays: 7 | 30 | 90) => {
        set((s) => ({ state: { ...s.state, isLoading: true, error: null } }));
        try {
          const summary = await savingsApi.getSummary(periodDays);
          set((s) => ({
            state: {
              ...s.state,
              summary,
              isLoading: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isLoading: false, error: toErrorMessage(err) },
          }));
        }
      },

      fetchHistory: async (opts?: { reset?: boolean; limit?: number }) => {
        const reset = opts?.reset !== false;
        const limit = opts?.limit ?? DEFAULT_HISTORY_LIMIT;
        set((s) => ({ state: { ...s.state, isLoadingHistory: true, error: null } }));
        try {
          const page = await savingsApi.getHistory({ page: 1, limit });
          set((s) => ({
            state: {
              ...s.state,
              history: reset ? page.items : [...s.state.history, ...page.items],
              historyPage: page.page,
              historyHasMore: page.hasMore,
              historyTotal: page.total,
              isLoadingHistory: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isLoadingHistory: false, error: toErrorMessage(err) },
          }));
        }
      },

      fetchMoreHistory: async () => {
        const { state } = get();
        if (state.isLoadingHistory || !state.historyHasMore) return;
        set((s) => ({ state: { ...s.state, isLoadingHistory: true, error: null } }));
        try {
          const next = state.historyPage + 1;
          const page = await savingsApi.getHistory({
            page: next,
            limit: DEFAULT_HISTORY_LIMIT,
          });
          set((s) => ({
            state: {
              ...s.state,
              history: [...s.state.history, ...page.items],
              historyPage: page.page,
              historyHasMore: page.hasMore,
              historyTotal: page.total,
              isLoadingHistory: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isLoadingHistory: false, error: toErrorMessage(err) },
          }));
        }
      },

      fetchGoals: async () => {
        set((s) => ({ state: { ...s.state, isLoading: true, error: null } }));
        try {
          const goals = await savingsApi.getGoals();
          set((s) => ({
            state: {
              ...s.state,
              goals,
              isLoading: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isLoading: false, error: toErrorMessage(err) },
          }));
        }
      },

      createGoal: async (input) => {
        set((s) => ({ state: { ...s.state, isMutating: true, error: null } }));
        try {
          const created = await savingsApi.createGoal(input);
          set((s) => ({
            state: {
              ...s.state,
              goals: [created, ...s.state.goals.filter((g) => g.id !== created.id)],
              isMutating: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
          return created;
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isMutating: false, error: toErrorMessage(err) },
          }));
          return null;
        }
      },

      updateGoal: async (id, patch) => {
        set((s) => ({ state: { ...s.state, isMutating: true, error: null } }));
        try {
          const updated = await savingsApi.updateGoal(id, patch);
          set((s) => ({
            state: {
              ...s.state,
              goals: s.state.goals.map((g) => (g.id === updated.id ? updated : g)),
              isMutating: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
          return updated;
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isMutating: false, error: toErrorMessage(err) },
          }));
          return null;
        }
      },

      deleteGoal: async (id) => {
        set((s) => ({ state: { ...s.state, isMutating: true, error: null } }));
        try {
          await savingsApi.deleteGoal(id);
          set((s) => ({
            state: {
              ...s.state,
              goals: s.state.goals.filter((g) => g.id !== id),
              isMutating: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
          return true;
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isMutating: false, error: toErrorMessage(err) },
          }));
          return false;
        }
      },

      fetchStreak: async () => {
        set((s) => ({ state: { ...s.state, isLoading: true, error: null } }));
        try {
          const streak = await savingsApi.getStreak();
          set((s) => ({
            state: {
              ...s.state,
              streak,
              isLoading: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isLoading: false, error: toErrorMessage(err) },
          }));
        }
      },

      fetchProjection: async () => {
        set((s) => ({ state: { ...s.state, isLoading: true, error: null } }));
        try {
          const projection = await savingsApi.getProjection();
          set((s) => ({
            state: {
              ...s.state,
              projection,
              isLoading: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isLoading: false, error: toErrorMessage(err) },
          }));
        }
      },

      fetchRecommendations: async () => {
        set((s) => ({ state: { ...s.state, isLoading: true, error: null } }));
        try {
          const recommendations = await savingsApi.getRecommendations();
          set((s) => ({
            state: {
              ...s.state,
              recommendations,
              isLoading: false,
              lastFetchedAt: new Date().toISOString(),
            },
          }));
        } catch (err: unknown) {
          set((s) => ({
            state: { ...s.state, isLoading: false, error: toErrorMessage(err) },
          }));
        }
      },

      clearError: () => {
        set((s) => ({ state: { ...s.state, error: null } }));
      },
    };

    return {
      state: initialState,
      actions,

      _setFromProvider: (data: SavingsContextShape) => {
        set({ state: data.state, actions: data.actions });
      },
    };
  });

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/**
 * Singleton Savings store. Use the granular selectors in
 * `stores/selectors.ts` (e.g. `useSavingsDashboard`, `useSavingsGoals`)
 * for maximum performance.
 */
export const useSavingsStore = createSavingsStore();
