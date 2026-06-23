import { logger } from '../config/logger';
import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { requireGamificationFeature } from '../middleware/gamificationFeatureGate';
import { asyncHandler } from '../utils/asyncHandler';

// Rate limiters for sensitive gamification endpoints
const checkInLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute (idempotent, but prevents abuse)
  message: 'Too many check-in attempts. Please wait a moment.',
});

const challengeJoinLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 join attempts per minute
  message: 'Too many join attempts. Please wait a moment.',
});

const challengeClaimLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 claim attempts per minute
  message: 'Too many claim attempts. Please wait a moment.',
});

const affiliateSubmitLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 submissions per hour
  message: 'Too many submissions. Please try again later.',
});

// Import all gamification controllers
import {
  getChallenges,
  getActiveChallenge,
  getUnifiedChallenges,
  claimChallengeReward,
  joinChallenge,
  getChallengeLeaderboard,
  getAchievements,
  getUserAchievements,
  getMyAchievements,
  getBadges,
  getUserBadges,
  getLeaderboard,
  getUserRank,
  getMyRank,
  getCoinBalance,
  getCoinTransactions,
  awardCoins,
  deductCoins,
  getDailyStreak,
  incrementStreak,
  createSpinWheel,
  spinWheel,
  getSpinWheelEligibility,
  getSpinWheelData,
  getSpinWheelHistory,
  createScratchCard,
  scratchCard,
  claimScratchCard,
  startQuiz,
  submitQuizAnswer,
  getQuizProgress,
  completeQuiz,
  getMyChallengeProgress,
  getGamificationStats,
  getPlayAndEarnData,
  claimSurpriseDrop,
  streakCheckin,
  claimStreakMilestone,
  getStreakMilestones,
  // Affiliate / Share endpoints
  getAffiliateStats,
  getPromotionalPosters,
  getShareSubmissions,
  submitSharePost,
  getStreakBonuses,
  getReviewableItems,
  getBonusOpportunities,
  getCheckinConfigEndpoint
} from '../controllers/gamificationController';

// Import streak controller
import streakController from '../controllers/streakController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ========================================
// CHALLENGES — PHASE 3
// ========================================
const gateChallenges = requireGamificationFeature('challenges', { challenges: [] });
router.get('/challenges', gateChallenges, getChallenges);
router.get('/challenges/unified', gateChallenges, getUnifiedChallenges);
router.get('/challenges/active', gateChallenges, getActiveChallenge);
router.get('/challenges/my-progress', gateChallenges, getMyChallengeProgress);
router.get('/challenges/:id/leaderboard', gateChallenges, getChallengeLeaderboard);
router.post('/challenges/:id/claim', gateChallenges, challengeClaimLimiter, claimChallengeReward);
router.post('/challenges/:id/join', gateChallenges, challengeJoinLimiter, joinChallenge);

// ========================================
// ACHIEVEMENTS
// ========================================
// Moved to standalone route file: achievementRoutes.ts (registered at /api/achievements)
// router.get('/achievements', getAchievements);
// router.get('/achievements/me', getMyAchievements);
// router.get('/achievements/user/:userId', getUserAchievements);
// REMOVED: POST /achievements/unlock — achievement unlocking must be server-driven only

// ========================================
// BADGES — PHASE 3
// ========================================
const gateBadges = requireGamificationFeature('badges', { badges: [] });
router.get('/badges', gateBadges, getBadges);
router.get('/badges/user/:userId', gateBadges, getUserBadges);

// ========================================
// LEADERBOARD — PHASE 3
// ========================================
const gateLeaderboard = requireGamificationFeature('leaderboard', { entries: [], myRank: null });
// Rate limiters for leaderboard (prevents cache-busting spam)
const leaderboardLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many leaderboard requests. Please wait.',
});
const myRankLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many rank requests. Please wait.',
});
// GET /api/gamification/leaderboard?type=spending&period=weekly&limit=10
// type: spending | reviews | referrals | cashback | coins
// period: daily | weekly | monthly | all-time
router.get('/leaderboard', gateLeaderboard, leaderboardLimiter, getLeaderboard);
router.get('/leaderboard/my-rank', gateLeaderboard, myRankLimiter, getMyRank);
router.get('/leaderboard/rank/:userId', gateLeaderboard, myRankLimiter, getUserRank);

// ========================================
// COINS (CURRENCY SYSTEM) — PHASE 1 (ALWAYS ACTIVE)
// ========================================
router.get('/coins/balance', getCoinBalance);
router.get('/coins/transactions', getCoinTransactions);
// Admin-only: direct coin manipulation must not be user-callable
router.post('/coins/award', requireAdmin, awardCoins);
router.post('/coins/deduct', requireAdmin, deductCoins);

// ========================================
// DAILY STREAK — PHASE 2
// ========================================
const gateStreaks = requireGamificationFeature('streaks', { streak: null });
// Also available via standalone streakRoutes.ts (registered at /api/streak)
router.get('/streaks', gateStreaks, streakController.getCurrentUserStreak.bind(streakController));
router.get('/streak/bonuses', gateStreaks, getStreakBonuses);
router.post('/streak/checkin', gateStreaks, checkInLimiter, streakCheckin);
router.post('/streak/claim-milestone', gateStreaks, streakController.claimMilestone.bind(streakController));
router.post('/streak/freeze', gateStreaks, streakController.freezeStreak.bind(streakController));

// ========================================
// MINI-GAMES — PHASE 3
// ========================================
const gateMiniGames = requireGamificationFeature('miniGames', { eligible: false });

// Spin Wheel
router.post('/spin-wheel/create', gateMiniGames, createSpinWheel);
router.post('/spin-wheel/spin', gateMiniGames, spinWheel);
router.get('/spin-wheel/eligibility', gateMiniGames, getSpinWheelEligibility);
router.get('/spin-wheel/data', gateMiniGames, getSpinWheelData);
router.get('/spin-wheel/history', gateMiniGames, getSpinWheelHistory);

// Scratch Card
// Moved to standalone route file: scratchCardRoutes.ts (registered at /api/scratch-cards)
// Also available via gameRoutes.ts (registered at /api/games)
// router.post('/scratch-card/create', createScratchCard);
// router.post('/scratch-card/scratch', scratchCard);
// router.post('/scratch-card/:id/claim', claimScratchCard);

// Quiz Game
router.post('/quiz/start', gateMiniGames, startQuiz);
router.post('/quiz/:quizId/answer', gateMiniGames, submitQuizAnswer);
router.get('/quiz/:quizId/progress', gateMiniGames, getQuizProgress);
router.post('/quiz/:quizId/complete', gateMiniGames, completeQuiz);

// ========================================
// GAMIFICATION STATS — PHASE 3
// ========================================
// Get complete user gamification statistics
// Gated because it calls streakService, challengeService, leaderboardService, achievementService
const gateStats = requireGamificationFeature('achievements', {
  gamesPlayed: 0, gamesWon: 0, totalCoins: 0, achievements: 0,
  streak: 0, longestStreak: 0, challengesCompleted: 0, challengesActive: 0,
  rank: 0, allRanks: { spending: 0, reviews: 0, referrals: 0, coins: 0, cashback: 0 }
});
router.get('/stats', gateStats, getGamificationStats);

// ========================================
// PLAY & EARN HUB — PHASE 3
// ========================================
// Gated because it calls spinWheelService, challengeService, streakService
const gatePlayAndEarn = requireGamificationFeature('miniGames', {
  dailySpin: { spinsRemaining: 0, maxSpins: 3, lastSpinAt: null, canSpin: false, nextSpinAt: null },
  challenges: { active: [], totalActive: 0, completedToday: 0 },
  streak: { type: 'app_open', currentStreak: 0, longestStreak: 0, todayCheckedIn: false, nextMilestone: { day: 3, coins: 50 } },
  surpriseDrop: { available: false, coins: 0, message: null, expiresAt: null },
  coinBalance: 0
});
router.get('/play-and-earn', gatePlayAndEarn, getPlayAndEarnData);

// Bonus Opportunities (time-limited challenges, drops, campaigns)
const gateBonusZones = requireGamificationFeature('bonusZones', { opportunities: [] });
router.get('/bonus-opportunities', gateBonusZones, getBonusOpportunities);

// Surprise Coin Drops
router.post('/surprise-drop/claim', gateMiniGames, claimSurpriseDrop);

// Daily Check-in Config (day rewards, pro tips, etc.)
const gateDailyCheckin = requireGamificationFeature('dailyCheckin', { config: null });
router.get('/checkin-config', gateDailyCheckin, getCheckinConfigEndpoint);

// Daily Streak Check-in also available via streakRoutes.ts (registered at /api/streak)

// ========================================
// AFFILIATE / SHARE — PHASE 3
// ========================================
const gateAffiliate = requireGamificationFeature('affiliate', { stats: null, submissions: [] });
router.get('/affiliate/stats', gateAffiliate, getAffiliateStats);
router.get('/affiliate/submissions', gateAffiliate, getShareSubmissions);
router.post('/affiliate/submit', gateAffiliate, affiliateSubmitLimiter, submitSharePost);

// Promotional Posters (for sharing)
router.get('/promotional-posters', gateAffiliate, getPromotionalPosters);

// REVIEWABLE ITEMS
router.get('/reviewable-items', getReviewableItems);

// ========================================
// QUICK ACTIONS (Personalized) — PHASE 3
// ========================================
const gateAchievements = requireGamificationFeature('achievements', { actions: [] });
router.get('/quick-actions', gateAchievements, asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    const quickActionService = (await import('../services/quickActionService')).default;
    const actions = await quickActionService.getPersonalized(userId);
    const { sendSuccess } = await import('../utils/response');
    sendSuccess(res, { actions });
}));

export default router;
