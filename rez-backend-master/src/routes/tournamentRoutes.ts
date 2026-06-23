import { Router } from 'express';
import tournamentController from '../controllers/tournamentController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { requireGamificationFeature } from '../middleware/gamificationFeatureGate';

const router = Router();

// PHASE 3 — disabled until core is stable
const gateTournaments = requireGamificationFeature('tournaments', { tournaments: [] });

// Rate limiters for tournament actions
const tournamentJoinLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many tournament join requests. Please try again shortly.',
});

const tournamentLeaveLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many tournament leave requests. Please try again shortly.',
});

// ======== PUBLIC/OPTIONAL AUTH ROUTES ========
// Get live/upcoming tournaments (works for logged in and anonymous users)
router.get('/live', optionalAuth, tournamentController.getLiveTournaments.bind(tournamentController));

// All routes below require authentication
router.use(authenticate);

// Gate all authenticated tournament routes
router.use(gateTournaments);

// Tournament routes
router.get('/', tournamentController.getTournaments.bind(tournamentController));
router.get('/featured', tournamentController.getFeaturedTournaments.bind(tournamentController));
router.get('/my-tournaments', tournamentController.getMyTournaments.bind(tournamentController));
router.get('/:id', tournamentController.getTournamentById.bind(tournamentController));
router.post('/:id/join', tournamentJoinLimiter, tournamentController.joinTournament.bind(tournamentController));
router.post('/:id/leave', tournamentLeaveLimiter, tournamentController.leaveTournament.bind(tournamentController));
router.get('/:id/leaderboard', tournamentController.getTournamentLeaderboard.bind(tournamentController));
router.get('/:id/my-rank', tournamentController.getMyRankInTournament.bind(tournamentController));

export default router;
