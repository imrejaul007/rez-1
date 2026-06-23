/**
 * IST (Asia/Kolkata, UTC+5:30) time helpers.
 *
 * Business rules treat 'today' as the IST calendar day. Server runs UTC on
 * Render so direct setHours(0) computations are off by 5.5h for Indian users.
 * Use these helpers for ALL day-boundary math on financial aggregates,
 * leaderboards, streaks, and reporting.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns the UTC Date representing 00:00:00.000 IST on the same calendar day
 * as the input date, from an IST perspective.
 *
 * Example (input = 2026-04-19T19:00:00Z = 2026-04-20T00:30:00 IST):
 *   returns 2026-04-19T18:30:00Z (= 2026-04-20T00:00:00 IST)
 */
export function startOfDayIST(date: Date = new Date()): Date {
  const istMs = date.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istMs);
  istDate.setUTCHours(0, 0, 0, 0);
  return new Date(istDate.getTime() - IST_OFFSET_MS);
}

/**
 * Returns the UTC Date representing 23:59:59.999 IST on the same calendar day
 * as the input date.
 */
export function endOfDayIST(date: Date = new Date()): Date {
  const istMs = date.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istMs);
  istDate.setUTCHours(23, 59, 59, 999);
  return new Date(istDate.getTime() - IST_OFFSET_MS);
}

/**
 * IST day-of-week (0 = Sunday ... 6 = Saturday) for the given instant.
 */
export function dayOfWeekIST(date: Date = new Date()): number {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.getUTCDay();
}

/**
 * ISO date string (YYYY-MM-DD) representing the IST calendar day.
 * Useful for keying daily counters / Redis buckets.
 */
export function istDateKey(date: Date = new Date()): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().slice(0, 10);
}
