import { Router } from 'express';
import gameController from '../controllers/gameController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { requireGamificationFeature } from '../middleware/gamificationFeatureGate';

const router = Router();

// PHASE 3 — disabled until core is stable
const gateMiniGames = requireGamificationFeature('miniGames', { games: [] });

// Rate limiters for game actions
const gameSessionLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many game requests. Please slow down.',
});

const gameCompletionLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many game completion requests. Please slow down.',
});

// ======== PUBLIC/OPTIONAL AUTH ROUTES ========
// Get available games with status (works for logged in and anonymous users)
router.get('/available', optionalAuth, gameController.getAvailableGames.bind(gameController));

// All routes below require authentication
router.use(authenticate);

// Gate all authenticated game routes
router.use(gateMiniGames);

// ======== SPIN WHEEL ========
router.post('/spin-wheel/create', gameSessionLimiter, gameController.createSpinWheel.bind(gameController));
router.post('/spin-wheel/play', gameCompletionLimiter, gameController.playSpinWheel.bind(gameController));

// ======== SCRATCH CARD ========
router.get('/scratch-card/eligibility', gameController.getScratchCardEligibility.bind(gameController));
router.post('/scratch-card/create', gameSessionLimiter, gameController.createScratchCard.bind(gameController));
router.post('/scratch-card/play', gameCompletionLimiter, gameController.playScratchCard.bind(gameController));
router.post('/scratch-card/retry-claim', gameCompletionLimiter, gameController.retryScratchCardClaim.bind(gameController));

// ======== QUIZ ========
router.post('/quiz/create', gameSessionLimiter, gameController.createQuiz.bind(gameController));
router.post('/quiz/submit', gameCompletionLimiter, gameController.submitQuiz.bind(gameController));

// ======== DAILY TRIVIA ========
router.get('/daily-trivia', gameController.getDailyTrivia.bind(gameController));
router.post('/daily-trivia/answer', gameCompletionLimiter, gameController.answerDailyTrivia.bind(gameController));

// ======== MEMORY MATCH ========
router.post('/memory-match/start', gameSessionLimiter, gameController.startMemoryMatch.bind(gameController));
router.post('/memory-match/complete', gameCompletionLimiter, gameController.completeMemoryMatch.bind(gameController));

// ======== COIN HUNT ========
router.post('/coin-hunt/start', gameSessionLimiter, gameController.startCoinHunt.bind(gameController));
router.post('/coin-hunt/complete', gameCompletionLimiter, gameController.completeCoinHunt.bind(gameController));

// ======== GUESS THE PRICE ========
router.post('/guess-price/start', gameSessionLimiter, gameController.startGuessPrice.bind(gameController));
router.post('/guess-price/submit', gameCompletionLimiter, gameController.submitGuessPrice.bind(gameController));

// ======== GENERAL ========
router.get('/my-games', gameController.getMyGames.bind(gameController));
router.get('/pending', gameController.getPendingGames.bind(gameController));
router.get('/statistics', gameController.getGameStatistics.bind(gameController));
router.get('/daily-limits', gameController.getDailyLimits.bind(gameController));

// Game status for specific game type (plays remaining, cooldown, next reset)
router.get('/:gameType/status', gameController.getGameStatus.bind(gameController));

export default router;
