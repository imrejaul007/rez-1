/**
 * Savings API service — B-feature migration
 *
 * Wraps the backend endpoints at `/api/b/savings/*` (the path is appended
 * to the shared `apiClient` base URL which already terminates at `/api`).
 *
 * All monetary amounts are exchanged in **paise** (smallest INR unit) —
 * see `@/utils/priceFormatter` for display conversion.
 *
 * All methods unwrap the standard `{ success, data }` envelope returned by
 * `apiClient` and throw a descriptive `Error` on failure (after logging
 * via `utils/logger`).
 */

import apiClient from '../apiClient';
import logger from '@/utils/logger';
import type {
  SavingsDashboard,
  SavingsSummary,
  SavingsHistoryPage,
  SavingsGoal,
  SavingsStreak,
  SavingsProjection,
  SavingsRecommendation,
} from '@/types/savings.types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Endpoint prefix for the B-feature savings surface. */
const B_SAVINGS_PREFIX = '/b/savings';

/**
 * Unwrap a standard `{ success, data }` envelope and throw on failure.
 *
 * The shared `apiClient` already unwraps the backend's `data` field, so
 * `response.data` is the typed payload. We additionally guard against
 * `{ success: false }` envelopes (rare but emitted by some endpoints).
 *
 * @throws Error with a descriptive message when the call did not succeed.
 */
function unwrap<T>(response: { success: boolean; data?: T; error?: string; message?: string }): T {
  if (!response.success || response.data === undefined || response.data === null) {
    const message = response.error || response.message || 'Unknown savings API error';
    throw new Error(message);
  }
  return response.data;
}

/**
 * Narrow an unknown thrown value into a string suitable for logging.
 */
function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

/**
 * Build an `Error` instance whose `message` carries both the underlying
 * error string and the structured context object. The logger surfaces the
 * message verbatim and the monitoring layer receives a real `Error`.
 */
function buildLogError(eventName: string, context: Record<string, unknown>, original: unknown): Error {
  const detail = errorToString(original);
  const message = `${eventName} | ${JSON.stringify(context)} | cause: ${detail}`;
  const err = new Error(message);
  err.name = eventName;
  return err;
}

// ---------------------------------------------------------------------------
// Public service — read endpoints
// ---------------------------------------------------------------------------

/**
 * Fetch the full Savings Dashboard aggregation in one round-trip.
 *
 * @returns Resolved `SavingsDashboard` payload.
 * @throws Error when the network call fails or the envelope is malformed.
 *
 * @example
 * const dashboard = await savingsApi.getDashboard();
 * console.log(dashboard.totalSavedPaise); // 1234500
 */
async function getDashboard(): Promise<SavingsDashboard> {
  try {
    const response = await apiClient.get<SavingsDashboard>(`${B_SAVINGS_PREFIX}/dashboard`);
    return unwrap(response);
  } catch (error: unknown) {
    logger.error(
      'savingsApi_getDashboard_failed',
      buildLogError('savingsApi_getDashboard_failed', { message: errorToString(error) }, error),
      'B Features'
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

/**
 * Fetch the savings summary for a fixed window.
 *
 * @param periodDays One of the supported windows: 7, 30 or 90 days.
 * @throws Error when the period is invalid or the call fails.
 *
 * @example
 * const summary = await savingsApi.getSummary(30);
 * console.log(summary.comparedToPreviousPeriodPct); // 18.5
 */
async function getSummary(periodDays: 7 | 30 | 90): Promise<SavingsSummary> {
  if (![7, 30, 90].includes(periodDays)) {
    throw new Error(`Invalid periodDays: ${periodDays}. Must be 7, 30 or 90.`);
  }
  try {
    const response = await apiClient.get<SavingsSummary>(
      `${B_SAVINGS_PREFIX}/summary`,
      { periodDays }
    );
    return unwrap(response);
  } catch (error: unknown) {
    logger.error(
      'savingsApi_getSummary_failed',
      buildLogError('savingsApi_getSummary_failed', { periodDays, message: errorToString(error) }, error),
      'B Features'
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

/**
 * Fetch a page of the savings history ledger.
 *
 * @param opts Optional pagination — `page` is 1-indexed, `limit` defaults
 *   server-side when omitted.
 * @throws Error when the call fails.
 *
 * @example
 * const firstPage = await savingsApi.getHistory({ page: 1, limit: 20 });
 * console.log(firstPage.items.length, firstPage.hasMore);
 */
async function getHistory(opts?: { page?: number; limit?: number }): Promise<SavingsHistoryPage> {
  try {
    const response = await apiClient.get<SavingsHistoryPage>(
      `${B_SAVINGS_PREFIX}/history`,
      {
        page: opts?.page,
        limit: opts?.limit,
      }
    );
    return unwrap(response);
  } catch (error: unknown) {
    logger.error(
      'savingsApi_getHistory_failed',
      buildLogError('savingsApi_getHistory_failed', { opts, message: errorToString(error) }, error),
      'B Features'
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

/**
 * Fetch all savings goals for the authenticated user.
 *
 * @returns Array of goals (empty array when none exist).
 * @throws Error when the call fails.
 *
 * @example
 * const goals = await savingsApi.getGoals();
 * console.log(goals.map((g) => g.name));
 */
async function getGoals(): Promise<SavingsGoal[]> {
  try {
    const response = await apiClient.get<SavingsGoal[]>(`${B_SAVINGS_PREFIX}/goals`);
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  } catch (error: unknown) {
    logger.error(
      'savingsApi_getGoals_failed',
      buildLogError('savingsApi_getGoals_failed', { message: errorToString(error) }, error),
      'B Features'
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

/**
 * Fetch the user's daily-activity savings streak.
 *
 * @throws Error when the call fails.
 *
 * @example
 * const streak = await savingsApi.getStreak();
 * console.log(streak.currentStreakDays, streak.isAtRisk);
 */
async function getStreak(): Promise<SavingsStreak> {
  try {
    const response = await apiClient.get<SavingsStreak>(`${B_SAVINGS_PREFIX}/streak`);
    return unwrap(response);
  } catch (error: unknown) {
    logger.error(
      'savingsApi_getStreak_failed',
      buildLogError('savingsApi_getStreak_failed', { message: errorToString(error) }, error),
      'B Features'
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

/**
 * Fetch the forward-looking savings projection (next 30 / 90 days).
 *
 * @throws Error when the call fails.
 *
 * @example
 * const projection = await savingsApi.getProjection();
 * console.log(projection.paceVsTarget); // 'on_track'
 */
async function getProjection(): Promise<SavingsProjection> {
  try {
    const response = await apiClient.get<SavingsProjection>(`${B_SAVINGS_PREFIX}/projection`);
    return unwrap(response);
  } catch (error: unknown) {
    logger.error(
      'savingsApi_getProjection_failed',
      buildLogError('savingsApi_getProjection_failed', { message: errorToString(error) }, error),
      'B Features'
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

/**
 * Fetch savings recommendations / nudges.
 *
 * @returns Array of recommendations (empty array when none exist).
 * @throws Error when the call fails.
 *
 * @example
 * const recs = await savingsApi.getRecommendations();
 * recs.forEach((r) => console.log(r.title, r.ctaRoute));
 */
async function getRecommendations(): Promise<SavingsRecommendation[]> {
  try {
    const response = await apiClient.get<SavingsRecommendation[]>(
      `${B_SAVINGS_PREFIX}/recommendations`
    );
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  } catch (error: unknown) {
    logger.error(
      'savingsApi_getRecommendations_failed',
      buildLogError('savingsApi_getRecommendations_failed', { message: errorToString(error) }, error),
      'B Features'
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

// ---------------------------------------------------------------------------
// Public service — goal mutations
// ---------------------------------------------------------------------------

/**
 * Create a new savings goal.
 *
 * @param input Goal definition. `targetAmountPaise` is in paise, `deadline`
 *   is an ISO 8601 string.
 * @returns The persisted `SavingsGoal` as returned by the backend.
 * @throws Error when validation fails or the call is rejected.
 *
 * @example
 * const goal = await savingsApi.createGoal({
 *   name: 'Goa Trip',
 *   targetAmountPaise: 5_000_000, // ₹50,000
 *   deadline: '2026-12-31T23:59:59.000Z',
 *   category: 'travel'
 * });
 */
async function createGoal(input: {
  name: string;
  targetAmountPaise: number;
  deadline: string;
  category?: string;
}): Promise<SavingsGoal> {
  try {
    const response = await apiClient.post<SavingsGoal>(
      `${B_SAVINGS_PREFIX}/goals`,
      input
    );
    return unwrap(response);
  } catch (error: unknown) {
    logger.error(
      'savingsApi_createGoal_failed',
      buildLogError(
        'savingsApi_createGoal_failed',
        { input: { ...input, targetAmountPaise: input.targetAmountPaise }, message: errorToString(error) },
        error
      ),
      'B Features'
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

/**
 * Patch an existing savings goal. Only `name`, `targetAmountPaise` and
 * `deadline` are mutable; progress (`savedAmountPaise`) is server-managed.
 *
 * @param id Goal id to update.
 * @param patch Partial update payload.
 * @returns The updated `SavingsGoal`.
 * @throws Error when the goal is missing or the call fails.
 *
 * @example
 * const updated = await savingsApi.updateGoal('gl_01HXY', { name: 'Goa Trip' });
 */
async function updateGoal(
  id: string,
  patch: Partial<Pick<SavingsGoal, 'name' | 'targetAmountPaise' | 'deadline'>>
): Promise<SavingsGoal> {
  try {
    const response = await apiClient.put<SavingsGoal>(
      `${B_SAVINGS_PREFIX}/goals/${encodeURIComponent(id)}`,
      patch
    );
    return unwrap(response);
  } catch (error: unknown) {
    logger.error(
      'savingsApi_updateGoal_failed',
      buildLogError('savingsApi_updateGoal_failed', { id, patch, message: errorToString(error) }, error),
      'B Features'
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

/**
 * Delete a savings goal permanently.
 *
 * @param id Goal id to remove.
 * @returns Object containing the deleted id (for cache invalidation).
 * @throws Error when the goal is missing or the call fails.
 *
 * @example
 * const { id } = await savingsApi.deleteGoal('gl_01HXY');
 */
async function deleteGoal(id: string): Promise<{ id: string }> {
  try {
    const response = await apiClient.delete<{ id: string }>(
      `${B_SAVINGS_PREFIX}/goals/${encodeURIComponent(id)}`
    );
    return unwrap(response);
  } catch (error: unknown) {
    logger.error(
      'savingsApi_deleteGoal_failed',
      buildLogError('savingsApi_deleteGoal_failed', { id, message: errorToString(error) }, error),
      'B Features'
    );
    throw error instanceof Error ? error : new Error(errorToString(error));
  }
}

// ---------------------------------------------------------------------------
// Aggregate export
// ---------------------------------------------------------------------------

/**
 * Convenience re-export of the `SavingsHistoryItem` type so consumers can
 * import the shape alongside the service from a single module.
 */
export type { SavingsHistoryItem } from '@/types/savings.types';

/**
 * The Savings API service object. Import as:
 *
 *   import { savingsApi } from '@/services/b/savingsApi';
 */
export const savingsApi = {
  getDashboard,
  getSummary,
  getHistory,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getStreak,
  getProjection,
  getRecommendations,
};

export default savingsApi;