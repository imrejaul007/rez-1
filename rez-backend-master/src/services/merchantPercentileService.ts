import { logger } from '../config/logger';

/**
 * Merchant Health Score Percentile Engine
 *
 * Computes how a merchant ranks vs peers in their city and category.
 * Provides weekly trend, predictive warnings, and gamification badges.
 *
 * v3 Architecture: Part 9 — extends health score with percentile ranking
 * and predictive churn warnings to drive the merchant retention dopamine loop.
 *
 * Merchant Dashboard shows:
 *   Health Score 82/100 | ↑ +6 vs last week | Top 18% of cafes in Indiranagar
 *   ⚠ Repeat rate dropping — you may lose ~12 customers this month
 */

// ── Health score badges ───────────────────────────────────────────────────────
export const HEALTH_BADGES = [
  { id: 'rising_star', threshold: 70, condition: 'score', icon: '⭐', label: 'Rising Star' },
  { id: 'top_performer', threshold: 80, condition: 'score', icon: '🏆', label: 'Top Performer' },
  { id: 'city_champion', threshold: 90, condition: 'top_10pct_city', icon: '👑', label: 'City Champion' },
  { id: 'streak_7', threshold: 75, condition: '7_days_above_75', icon: '🔥', label: '7-Day Streak' },
  { id: 'clean_kitchen', threshold: 3, condition: 'waste_below_3pct', icon: '✨', label: 'Clean Kitchen' },
] as const;

// ── Result types ──────────────────────────────────────────────────────────────
export interface HealthScorePercentileResult {
  healthScore: number;
  cityPercentile: number; // 0-100: how many stores in city score lower
  categoryPercentile: number;
  weeklyTrend: 'up' | 'down' | 'stable';
  trendDelta: number; // +/- points vs last week
  predictiveWarning?: string; // "Repeat rate dropping — you may lose 12 customers"
  earnedBadges: (typeof HEALTH_BADGES)[number][];
  dataAsOf: Date;
}

// ── Helper: is a metric trend decreasing? ────────────────────────────────────
function isDecreasing(values: number[], consecutiveDays: number): boolean {
  if (values.length < consecutiveDays) return false;
  const recent = values.slice(0, consecutiveDays);
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] >= recent[i - 1]) return false;
  }
  return true;
}

// ── Core function ─────────────────────────────────────────────────────────────
/**
 * Compute health score percentile and trend for a merchant.
 *
 * @param merchantId - MongoDB ObjectId string of the merchant
 * @param city       - City name (e.g., 'Bangalore', 'Mumbai')
 * @param category   - Merchant category (e.g., 'restaurant', 'salon', 'retail')
 */
export async function computeCityPercentile(
  merchantId: string,
  city: string,
  category: string,
): Promise<HealthScorePercentileResult> {
  // Dynamic import to avoid circular deps
  const { default: MerchantDailyStat } = await import('../models/MerchantDailyStat').catch(() => ({ default: null }));

  if (!MerchantDailyStat) {
    logger.warn('[PercentileService] MerchantDailyStat model not found — returning defaults');
    return buildDefaultResult();
  }

  // Get last 7 days of health scores for this merchant
  const recentScores = await (MerchantDailyStat as any)
    .find({ merchantId })
    .sort({ date: -1 })
    .limit(7)
    .select('healthScore repeatRate wasteRate date')
    .lean();

  const currentScore = (recentScores[0] as any)?.healthScore ?? 0;
  const weekAgoScore = (recentScores[6] as any)?.healthScore ?? currentScore;
  const trendDelta = Math.round(currentScore - weekAgoScore);
  const latestDate = (recentScores[0] as any)?.date;

  // City + category percentile: how many merchants score lower on same date
  let cityPercentile = 50;
  if (latestDate) {
    const cityTotal = await (MerchantDailyStat as any).countDocuments({ city, category, date: latestDate });
    const cityBelow = await (MerchantDailyStat as any).countDocuments({
      city,
      category,
      date: latestDate,
      healthScore: { $lt: currentScore },
    });
    cityPercentile = cityTotal > 0 ? Math.round((cityBelow / cityTotal) * 100) : 50;
  }

  // Predictive warning: if repeat rate has been declining 3+ days consecutively
  let predictiveWarning: string | undefined;
  const repeatRates = recentScores.map((s: any) => s.repeatRate ?? 0);
  if (isDecreasing(repeatRates, 3)) {
    const projectedLoss = Math.max(1, Math.round(Math.abs(trendDelta) * 2.5));
    predictiveWarning = `Repeat rate dropping — you may lose ~${projectedLoss} customers this month if this continues.`;
  }

  // Waste rate warning
  const wasteRate = (recentScores[0] as any)?.wasteRate;
  if (!predictiveWarning && wasteRate > 0.08) {
    // > 8% waste
    predictiveWarning = `Waste rate at ${Math.round(wasteRate * 100)}% — review ingredient ordering to reduce food cost.`;
  }

  // Earned badges
  const earnedBadges = computeBadges(currentScore, cityPercentile, recentScores);

  return {
    healthScore: currentScore,
    cityPercentile,
    categoryPercentile: cityPercentile, // same data for now; split when we add subcategories
    weeklyTrend: trendDelta > 2 ? 'up' : trendDelta < -2 ? 'down' : 'stable',
    trendDelta,
    predictiveWarning,
    earnedBadges,
    dataAsOf: latestDate ? new Date(latestDate) : new Date(),
  };
}

// ── Badge computation ─────────────────────────────────────────────────────────
function computeBadges(
  currentScore: number,
  cityPercentile: number,
  recentScores: any[],
): (typeof HEALTH_BADGES)[number][] {
  const earned: (typeof HEALTH_BADGES)[number][] = [];

  for (const badge of HEALTH_BADGES) {
    switch (badge.condition) {
      case 'score':
        if (currentScore >= badge.threshold) earned.push(badge);
        break;
      case 'top_10pct_city':
        if (cityPercentile >= 90) earned.push(badge);
        break;
      case '7_days_above_75':
        if (recentScores.length >= 7 && recentScores.every((s: any) => (s.healthScore ?? 0) >= 75)) {
          earned.push(badge);
        }
        break;
      case 'waste_below_3pct': {
        const avgWaste =
          recentScores.reduce((sum: number, s: any) => sum + (s.wasteRate ?? 0), 0) / Math.max(recentScores.length, 1);
        if (avgWaste < 0.03) earned.push(badge);
        break;
      }
    }
  }

  return earned;
}

function buildDefaultResult(): HealthScorePercentileResult {
  return {
    healthScore: 0,
    cityPercentile: 50,
    categoryPercentile: 50,
    weeklyTrend: 'stable',
    trendDelta: 0,
    predictiveWarning: undefined,
    earnedBadges: [],
    dataAsOf: new Date(),
  };
}

export default { computeCityPercentile, HEALTH_BADGES };
