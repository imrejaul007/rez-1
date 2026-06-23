/**
 * Gamification Feature Flags
 *
 * Controls which gamification subsystems are active at the route/handler/job level.
 * Disabled features return 200 with empty data (graceful degradation).
 *
 * To re-enable a feature: flip the boolean to `true` and deploy.
 */

export const GAMIFICATION_FLAGS = {
  // ── PHASE 1 (KEEP) ─────────────────────────────────────
  // Coins-on-purchase lives in orderController → coinService.
  // These endpoints let users read their balance and transaction history.
  coins: true,

  // ── PHASE 2 (RE-ENABLE after core stable) ──────────────
  streaks: false,
  dailyCheckin: false,
  bonusZones: false,

  // ── PHASE 3 (BUILD after Phase 2 validated) ────────────
  achievements: false,
  challenges: false,
  leaderboard: false,
  activityFeed: false,
  miniGames: true,      // spin wheel, scratch card, quiz
  badges: false,
  tournaments: false,
  affiliate: false,
} as const;

export type GamificationFeature = keyof typeof GAMIFICATION_FLAGS;

export function isGamificationEnabled(feature: GamificationFeature): boolean {
  return GAMIFICATION_FLAGS[feature];
}
