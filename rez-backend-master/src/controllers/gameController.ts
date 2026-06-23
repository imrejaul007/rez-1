import { Request, Response } from 'express';
import gameService, { RequestMeta } from '../services/gameService';
import { asyncHandler } from '../utils/asyncHandler';

class GameController {
  /**
   * Sanitize session data before sending to client.
   * Strips sensitive metadata (correctAnswers, actualPrice, coinPositions, etc.)
   */
  private sanitizeSession(session: any) {
    if (!session) return session;
    const obj = session.toObject ? session.toObject() : { ...session };
    delete (obj as any).metadata; // Never expose internal metadata to client
    delete (obj as any).__v;
    return obj;
  }

  /** Extract request metadata for audit/fraud logging */
  private extractRequestMeta(req: Request): RequestMeta {
    return {
      ip: req.ip || req.headers['x-forwarded-for'] as string || undefined,
      userAgent: req.headers['user-agent'] || undefined,
      deviceFingerprint: req.headers['x-device-fingerprint'] as string || undefined,
    };
  }

  // ======== SPIN WHEEL ========

  // POST /api/games/spin-wheel/create
  createSpinWheel = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { earnedFrom } = req.body;

      const session = await gameService.createSpinWheelSession(userId, earnedFrom);

      res.json({
        success: true,
        data: this.sanitizeSession(session),
        message: 'Spin wheel session created'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/games/spin-wheel/play
  playSpinWheel = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.body;

      const session = await gameService.playSpinWheel(sessionId, userId);
      const sanitized = this.sanitizeSession(session);

      // Include tournament update data if present
      if ((session as any)._tournamentUpdate) {
        sanitized.tournamentUpdate = (session as any)._tournamentUpdate;
      }

      res.json({
        success: true,
        data: sanitized,
        message: 'Spin complete!'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // ======== SCRATCH CARD ========

  // GET /api/games/scratch-card/eligibility
  getScratchCardEligibility = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      const eligibility = await gameService.getScratchCardEligibility(userId);

      res.json({
        success: true,
        data: eligibility,
        message: 'Eligibility checked'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/games/scratch-card/create
  createScratchCard = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { earnedFrom } = req.body;
      const requestMeta = this.extractRequestMeta(req);

      const session = await gameService.createScratchCardSession(userId, earnedFrom || 'daily_free', requestMeta);

      res.json({
        success: true,
        data: this.sanitizeSession(session),
        message: 'Scratch card session created'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/games/scratch-card/play
  playScratchCard = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.body;

      const session = await gameService.playScratchCard(sessionId, userId);

      res.json({
        success: true,
        data: this.sanitizeSession(session),
        message: 'Scratch card revealed!'
      });
    } catch (error: any) {
      const status = error.message?.includes('try again') ? 500 : 400;
      res.status(status).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/games/scratch-card/retry-claim
  retryScratchCardClaim = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.body;

      if (!userId || !sessionId) {
        return res.status(400).json({ success: false, message: 'userId and sessionId required' });
      }

      const session = await gameService.retryScratchCardClaim(sessionId, userId);

      res.json({
        success: true,
        data: this.sanitizeSession(session),
        message: 'Prize claimed successfully!'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // ======== QUIZ ========

  // POST /api/games/quiz/create
  createQuiz = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { questions } = req.body;

      const session = await gameService.createQuizSession(userId, questions);

      res.json({
        success: true,
        data: this.sanitizeSession(session),
        message: 'Quiz session created'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/games/quiz/submit
  submitQuiz = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { sessionId, answers, correctAnswers } = req.body;

      const session = await gameService.submitQuizAnswers(
        sessionId,
        answers,
        correctAnswers,
        userId
      );

      const sanitized = this.sanitizeSession(session);

      // Include tournament update data if present
      if ((session as any)._tournamentUpdate) {
        sanitized.tournamentUpdate = (session as any)._tournamentUpdate;
      }

      res.json({
        success: true,
        data: sanitized,
        message: 'Quiz submitted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // ======== DAILY TRIVIA ========

  // GET /api/games/daily-trivia
  getDailyTrivia = asyncHandler(async (req: Request, res: Response) => {
    try {
      const trivia = await gameService.getDailyTrivia();

      res.json({
        success: true,
        data: trivia
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/games/daily-trivia/answer
  answerDailyTrivia = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { questionId, answer } = req.body;

      const result = await gameService.answerDailyTrivia(userId, questionId, answer);

      res.json({
        success: true,
        data: result,
        message: result.correct ? 'Correct answer!' : 'Wrong answer'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // ======== GENERAL ========

  // GET /api/games/my-games
  getMyGames = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { gameType, limit } = req.query;

      const sessions = await gameService.getUserGameSessions(
        userId,
        gameType as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: sessions.map(s => this.sanitizeSession(s))
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/games/pending
  getPendingGames = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const games = await gameService.getPendingGames(userId);

      res.json({
        success: true,
        data: games.map(g => this.sanitizeSession(g))
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/games/statistics
  getGameStatistics = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const stats = await gameService.getGameStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // ======== MEMORY MATCH ========

  // POST /api/games/memory-match/start
  startMemoryMatch = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { difficulty = 'easy' } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await gameService.startMemoryMatch(userId, difficulty);

      res.json({
        success: true,
        data: result,
        message: 'Memory Match game started'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/games/memory-match/complete
  completeMemoryMatch = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { sessionId, score, timeSpent, moves } = req.body;

      const result = await gameService.completeMemoryMatch(sessionId, score, timeSpent, moves, userId);

      res.json({
        success: true,
        data: result,
        message: `You earned ${result.coins} coins!`
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // ======== COIN HUNT ========

  // POST /api/games/coin-hunt/start
  startCoinHunt = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const result = await gameService.startCoinHunt(userId);

      res.json({
        success: true,
        data: result,
        message: 'Coin Hunt game started'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/games/coin-hunt/complete
  completeCoinHunt = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { sessionId, coinsCollected, score } = req.body;

      const result = await gameService.completeCoinHunt(sessionId, coinsCollected, score, userId);

      res.json({
        success: true,
        data: result,
        message: `You collected ${result.coinsEarned} coins!`
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // ======== GUESS THE PRICE ========

  // POST /api/games/guess-price/start
  startGuessPrice = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const result = await gameService.startGuessPrice(userId);

      res.json({
        success: true,
        data: result,
        message: 'Guess the Price game started'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // POST /api/games/guess-price/submit
  submitGuessPrice = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { sessionId, guessedPrice } = req.body;

      const result = await gameService.submitGuessPrice(sessionId, guessedPrice, userId);

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });

  // ======== DAILY LIMITS ========

  // GET /api/games/daily-limits
  getDailyLimits = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const limits = await gameService.getDailyLimits(userId);

      res.json({
        success: true,
        data: limits
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/games/available
  // Returns all available games with play status (supports optional auth)
  getAvailableGames = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      const games = await gameService.getAvailableGames(userId);

      res.json({
        success: true,
        data: {
          games,
          total: games.length,
          todaysEarnings: games[0]?.todaysEarnings || 0
        },
        message: 'Available games fetched'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /api/games/:gameType/status
  // Returns play status for a specific game type (Phase 4: Frontend Polish)
  getGameStatus = asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { gameType } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      const status = await gameService.getGameStatus(userId, gameType);

      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
}

export default new GameController();
