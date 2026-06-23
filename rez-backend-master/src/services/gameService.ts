import { logger } from '../config/logger';
import GameSession, { IGameSession } from '../models/GameSession';
import GameConfig, { IGameConfig } from '../models/GameConfig';
import Tournament from '../models/Tournament';
import { User } from '../models/User';
import tournamentService from './tournamentService';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import coinService from './coinService';
import gamificationEventBus from '../events/gamificationEventBus';
import { Lean } from '../types/lean';
import { ledgerService } from './ledgerService';
import { Types } from 'mongoose';
import { CoinTransaction } from '../models/CoinTransaction';
/** Metadata extracted from the HTTP request for audit/fraud logging */
export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}
// In-memory cache for GameConfig (5-min TTL)
const gameConfigCache: Map<string, { config: Lean<IGameConfig> | null; cachedAt: number }> = new Map();
const GAME_CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
async function getCachedGameConfig(gameType: string): Promise<Lean<IGameConfig> | null> {
  const cached = gameConfigCache.get(gameType);
  if (cached && Date.now() - cached.cachedAt < GAME_CONFIG_CACHE_TTL) {
    return cached.config;
  }
  try {
    const config = await GameConfig.findOne({ gameType, isEnabled: true }).lean();
    gameConfigCache.set(gameType, { config, cachedAt: Date.now() });
    return config
  } catch (err) {
    logger.error(`[GAME SERVICE] Failed to fetch GameConfig for ${gameType}:`, err);
    return null;
  }
}
/** Invalidate cached game config (called when admin updates config) */
export function invalidateGameConfigCache(gameType?: string): void {
  if (gameType) {
    gameConfigCache.delete(gameType);
  } else {
    gameConfigCache.clear();
  }
}
// ======== DEFAULT PRIZE CONFIGURATIONS (fallback if DB config not found) ========
const DEFAULT_SPIN_WHEEL_PRIZES = [
  { type: 'coins', value: 50, weight: 30, description: '50 Coins' },
  { type: 'coins', value: 100, weight: 25, description: '100 Coins' },
  { type: 'coins', value: 200, weight: 15, description: '200 Coins' },
  { type: 'coins', value: 500, weight: 10, description: '500 Coins' },
  { type: 'discount', value: 10, weight: 15, description: '10% Off Next Order' },
  { type: 'discount', value: 20, weight: 10, description: '20% Off Next Order' },
  { type: 'free_delivery', value: 1, weight: 20, description: 'Free Delivery' },
  { type: 'cashback_multiplier', value: 1.5, weight: 8, description: '1.5x Cashback' },
  { type: 'cashback_multiplier', value: 2, weight: 5, description: '2x Cashback' },
  { type: 'coins', value: 1000, weight: 2, description: 'JACKPOT - 1000 Coins!' }
];
const DEFAULT_SCRATCH_CARD_PRIZES = [
  { type: 'coins', value: 25, weight: 40, description: '25 Coins' },
  { type: 'coins', value: 50, weight: 30, description: '50 Coins' },
  { type: 'coins', value: 100, weight: 20, description: '100 Coins' },
  { type: 'coins', value: 250, weight: 8, description: '250 Coins' },
  { type: 'badge', value: 'lucky_winner', weight: 2, description: 'Lucky Winner Badge!' }
];
const DEFAULT_MEMORY_MATCH_PRIZES: Record<string, { baseCoins: number; perfectBonus: number; timeBonus: number }> = {
  easy: { baseCoins: 10, perfectBonus: 20, timeBonus: 5 },
  medium: { baseCoins: 25, perfectBonus: 50, timeBonus: 10 },
  hard: { baseCoins: 50, perfectBonus: 100, timeBonus: 20 }
};
const DEFAULT_GUESS_PRICE_PRODUCTS = [
  { id: '1', name: 'Wireless Earbuds', image: '/products/earbuds.jpg', actualPrice: 2499 },
  { id: '2', name: 'Smart Watch', image: '/products/watch.jpg', actualPrice: 4999 },
  { id: '3', name: 'Bluetooth Speaker', image: '/products/speaker.jpg', actualPrice: 1799 },
  { id: '4', name: 'Power Bank 20000mAh', image: '/products/powerbank.jpg', actualPrice: 1299 },
  { id: '5', name: 'Gaming Mouse', image: '/products/mouse.jpg', actualPrice: 899 }
];
// Default daily game limits (fallback if GameConfig not found in DB)
const DEFAULT_DAILY_GAME_LIMITS: Record<string, number> = {
  memory_match: 3,
  coin_hunt: 3,
  guess_price: 5,
  spin_wheel: 1,
  quiz: 3,
  scratch_card: 2
};
// Minimum play duration per game type (in seconds) to prevent instant-complete cheating
const MIN_PLAY_DURATION_SECONDS: Record<string, number> = {
  spin_wheel: 1,      // Spin animation takes ~1s
  scratch_card: 1,    // Scratch takes ~1s
  quiz: 3,            // At least 3s to read and answer
  memory_match: 3,    // At least 3s to match cards
  coin_hunt: 2,       // At least 2s to play
  guess_price: 2,     // At least 2s to guess
};
class GameService {
  /**
   * Anti-cheat: validate that enough time has passed since session creation.
   * Rejects sessions completed suspiciously fast.
   */
  private validateMinPlayDuration(session: IGameSession): void {
    const minSeconds = MIN_PLAY_DURATION_SECONDS[session.gameType] || 2;
    const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
    if (elapsedMs < minSeconds * 1000) {
      logger.warn(
        `[ANTI-CHEAT] Suspiciously fast completion: ${session.gameType} session ${session.sessionId} ` +
        `completed in ${elapsedMs}ms (min: ${minSeconds * 1000}ms), user: ${session.user}`
      );
      this.emitFraudEvent(session.user.toString(), session.gameType, 'fast_completion', {
        elapsedMs, minMs: minSeconds * 1000, sessionId: session.sessionId
      });
      throw new Error('Game completed too quickly. Please play fairly.');
    }
  }
  /**
   * Check if user is banned from playing games.
   */
  private async checkUserGameAccess(userId: string): Promise<void> {
    const user = await User.findById(userId).select('isActive gameBanned').lean();
    if (!user) throw new Error('User not found');
    if (!user.isActive) throw new Error('Your account is inactive');
    if ((user as any).gameBanned) throw new Error('Your game access has been suspended. Contact support for help.');
  }
  /**
   * Load prizes from DB GameConfig, falling back to default prizes.
   */
  private async getSpinWheelPrizes(): Promise<any[]> {
    const config = await getCachedGameConfig('spin_wheel');
    if (config?.config?.prizes && Array.isArray(config.config.prizes) && config.config.prizes.length > 0) {
      return config.config.prizes;
    }
    return DEFAULT_SPIN_WHEEL_PRIZES;
  }
  private async getScratchCardPrizes(): Promise<any[]> {
    const config = await getCachedGameConfig('scratch_card');
    if (config?.config?.prizes && Array.isArray(config.config.prizes) && config.config.prizes.length > 0) {
      return config.config.prizes;
    }
    return DEFAULT_SCRATCH_CARD_PRIZES;
  }
  private async getMemoryMatchPrizes(difficulty: string): Promise<{ baseCoins: number; perfectBonus: number; timeBonus: number }> {
    const config = await getCachedGameConfig('memory_match');
    if (config?.config?.prizes && config.config.prizes[difficulty]) {
      return config.config.prizes[difficulty];
    }
    return DEFAULT_MEMORY_MATCH_PRIZES[difficulty] || DEFAULT_MEMORY_MATCH_PRIZES.easy;
  }
  private async getGuessPriceProducts(): Promise<any[]> {
    const config = await getCachedGameConfig('guess_price');
    if (config?.config?.products && Array.isArray(config.config.products) && config.config.products.length > 0) {
      return config.config.products;
    }
    return DEFAULT_GUESS_PRICE_PRODUCTS;
  }
  /**
   * Emit game event to the gamification event bus.
   */
  private emitGameEvent(userId: string, gameType: string, won: boolean, reward: number, metadata?: Record<string, any>): void {
    gamificationEventBus.emit('game_won', {
      userId,
      entityId: gameType,
      entityType: 'game',
      amount: reward,
      metadata: { gameType, won, ...metadata },
      source: { controller: 'gameService', action: `complete_${gameType}` }
    });
  }
  /**
   * Emit fraud suspicion event for monitoring.
   */
  private emitFraudEvent(userId: string, gameType: string, reason: string, data: Record<string, any>): void {
    logger.warn(`[FRAUD] ${reason} for user ${userId} on ${gameType}:`, data);
    // Log to gamification event bus for monitoring
    gamificationEventBus.emit('game_won', {
      userId,
      entityId: gameType,
      entityType: 'fraud_alert',
      amount: 0,
      metadata: { reason, gameType, fraudAlert: true, ...data },
      source: { controller: 'gameService', action: 'fraud_detection' }
    });
  }
  /**
   * Update tournament scores for a user after game completion.
   * Non-blocking: errors are logged but don't affect game results.
   */
  private async updateTournamentScores(userId: string, gameType: string, score: number): Promise<{ tournamentName: string; pointsAdded: number; newRank: number } | null> {
    try {
      const activeTournaments = await Tournament.find({
        status: 'active',
        gameType: { $in: [gameType, 'mixed'] },
        'participants.user': userId
      }).select('_id name participants').limit(100).lean();
      let firstUpdate: { tournamentName: string; pointsAdded: number; newRank: number } | null = null;
      for (const tournament of activeTournaments) {
        try {
          await tournamentService.updateParticipantScore(String(tournament._id), userId, score);
          // Calculate new rank for feedback
          if (!firstUpdate) {
            const sorted = [...tournament.participants].sort((a, b) => {
              const aScore = a.user.toString() === userId ? a.score + score : a.score;
              const bScore = b.user.toString() === userId ? b.score + score : b.score;
              return bScore - aScore;
            });
            const newRank = sorted.findIndex(p => p.user.toString() === userId) + 1;
            firstUpdate = { tournamentName: tournament.name, pointsAdded: score, newRank: newRank || 1 };
          }
        } catch (err) {
          logger.error(`[GAME SERVICE] Tournament score update failed for ${tournament.name}:`, err);
        }
      }
      return firstUpdate;
    } catch (err) {
      logger.error('[GAME SERVICE] Tournament score lookup failed:', err);
      return null;
    }
  }
  // ======== SPIN WHEEL ========
  // Create spin wheel session
  async createSpinWheelSession(
    userId: string,
    earnedFrom: string = 'daily_free'
  ): Promise<IGameSession> {
    await this.checkUserGameAccess(userId);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
    if (earnedFrom === 'daily_free') {
      // Use atomic daily limit guard for free spins
      return this.createSessionWithDailyLimitGuard(userId, 'spin_wheel', {
        status: 'pending',
        earnedFrom,
        expiresAt
      });
    }
    // Non-daily-free spins (earned from purchases etc.) skip daily limit
    return GameSession.create({
      user: userId,
      gameType: 'spin_wheel',
      sessionId: uuidv4(),
      status: 'pending',
      earnedFrom,
      expiresAt
    });
  }
  // Play spin wheel
  async playSpinWheel(sessionId: string, userId?: string): Promise<IGameSession> {
    // Atomic status transition: only one request can play a spin
    const query: any = { sessionId, status: 'pending', expiresAt: { $gt: new Date() } };
    if (userId) query.user = userId; // Ownership validation
    const session = await GameSession.findOneAndUpdate(
      query,
      { $set: { status: 'completed', completedAt: new Date() } },
      { new: true }
    );
    if (!session) {
      const existing = await GameSession.findOne({ sessionId }).lean();
      if (!existing) throw new Error('Game session not found');
      if (existing.status === 'completed') throw new Error('Game already played');
      if (existing.status === 'expired' || new Date() > existing.expiresAt) throw new Error('Game session expired');
      throw new Error('Game already played');
    }
    this.validateMinPlayDuration(session);
    // Determine prize using weighted random selection (DB-driven with fallback)
    const prizes = await this.getSpinWheelPrizes();
    const prize = this.getWeightedRandomPrize(prizes);
    const result = {
      won: true,
      prize: {
        type: prize.type as any,
        value: prize.value,
        description: prize.description
      }
    };
    // Save result to the already-completed session
    session.result = result;
    await session.save();
    const spinUserId = session.user.toString();
    // Credit coins to user's wallet (if prize is coins)
    if (result.prize.type === 'coins' && typeof result.prize.value === 'number' && result.prize.value > 0) {
      try {
        await coinService.awardCoins(
          spinUserId,
          result.prize.value,
          'spin_wheel',
          `Spin & Win: ${result.prize.description}`,
          { sessionId }
        );
      } catch (err) {
        logger.error(`[GAME SERVICE] Spin wheel coin award failed for user ${spinUserId}:`, err);
      }
    }
    // Emit game event (Phase 6: Analytics)
    this.emitGameEvent(spinUserId, 'spin_wheel', true, result.prize.type === 'coins' ? (result.prize.value as number) : 0, { sessionId, prizeType: result.prize.type });
    // Update tournament scores
    let tournamentUpdate = null;
    if (result.prize?.value && result.prize.type === 'coins') {
      tournamentUpdate = await this.updateTournamentScores(spinUserId, 'spin_wheel', result.prize.value as number).catch((err) => {
        logger.error('[GAME] Tournament score update failed:', err.message);
        return null;
      });
    }
    // Attach tournament data to session for response
    if (tournamentUpdate) {
      (session as any)._tournamentUpdate = tournamentUpdate;
    }
    return session;
  }
  // ======== SCRATCH CARD ========
  /**
   * Create scratch card session with daily limit guard + cooldown enforcement.
   * Returns a session in "pending" state with NO prize (prize generated on play).
   */
  async createScratchCardSession(
    userId: string,
    earnedFrom: string,
    requestMeta?: RequestMeta
  ): Promise<IGameSession> {
    await this.checkUserGameAccess(userId);
    // Enforce cooldown: check last completed scratch card session
    const config = await getCachedGameConfig('scratch_card');
    const cooldownMinutes = config?.cooldownMinutes ?? 120;
    if (cooldownMinutes > 0) {
      const lastCompleted = await GameSession.findOne({
        user: userId,
        gameType: 'scratch_card',
        status: 'completed'
      }).sort({ completedAt: -1 }).select('completedAt').lean();
      if (lastCompleted?.completedAt) {
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const elapsed = Date.now() - new Date(lastCompleted.completedAt).getTime();
        if (elapsed < cooldownMs) {
          const remainingSec = Math.ceil((cooldownMs - elapsed) / 1000);
          throw new Error(`Cooldown active. Please wait ${remainingSec} seconds before playing again.`);
        };
      }
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry
    const session = await this.createSessionWithDailyLimitGuard(userId, 'scratch_card', {
      status: 'pending',
      earnedFrom,
      expiresAt,
      metadata: requestMeta ? {
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
        deviceFingerprint: requestMeta.deviceFingerprint,
      } : undefined,
    });
    logger.info(`[SCRATCH_CARD:CREATE] userId=${userId} sessionId=${session.sessionId} ip=${requestMeta?.ip || 'unknown'}`);
    return session;
  }
  /**
   * Play scratch card: atomic status transition → server-side prize generation → wallet credit → ledger entry.
   *
   * Security guarantees:
   * - findOneAndUpdate ensures only one request can transition pending → completed (idempotent)
   * - Idempotency key on coinService prevents double-award on retry
   * - On coin award failure, session reverts to pending so user can retry
   * - Ledger entry creates auditable debit/credit pair
   */
  async playScratchCard(sessionId: string, userId?: string): Promise<Lean<IGameSession> | IGameSession> {
    // Atomic status transition: only one request can play a scratch card
    const query: any = { sessionId, status: 'pending', expiresAt: { $gt: new Date() } };
    if (userId) query.user = userId; // Ownership validation
    const session = await GameSession.findOneAndUpdate(
      query,
      { $set: { status: 'completed', completedAt: new Date() } },
      { new: true }
    );
    if (!session) {
      const existing = await GameSession.findOne({ sessionId }).lean();
      if (!existing) throw new Error('Game session not found');
      if (existing.status === 'completed') {
        // Already played — return existing result (idempotent read)
        return existing
      }
      if (existing.status === 'expired' || new Date() > existing.expiresAt) throw new Error('Game session expired');
      throw new Error('Game already played');
    }
    this.validateMinPlayDuration(session);
    // Determine prize (DB-driven with fallback)
    const prizes = await this.getScratchCardPrizes();
    const prize = this.getWeightedRandomPrize(prizes);
    const result = {
      won: true,
      prize: {
        type: prize.type as any,
        value: prize.value,
        description: prize.description
      }
    };
    // Save result to the already-completed session
    session.result = result;
    await session.save();
    const scratchUserId = session.user.toString();
    const idempotencyKey = `scratch_card:${sessionId}`;
    logger.info(`[SCRATCH_CARD:PLAY] userId=${scratchUserId} sessionId=${sessionId} prizeType=${result.prize.type} prizeValue=${result.prize.value}`);
    // Credit coins to user's wallet (if prize is coins)
    if (result.prize.type === 'coins' && typeof result.prize.value === 'number' && result.prize.value > 0) {
      try {
        const awardResult = await coinService.awardCoins(
          scratchUserId,
          result.prize.value,
          'scratch_card',
          `Scratch & Win: ${result.prize.description}`,
          { idempotencyKey, sessionId }
        );
        logger.info(`[SCRATCH_CARD:AWARD] userId=${scratchUserId} sessionId=${sessionId} amount=${result.prize.value} newBalance=${awardResult?.newBalance}`);
        // Record ledger entry (double-entry: debit platform_float → credit user_wallet)
        try {
          const pairId = await ledgerService.recordEntry({
            debitAccount: { type: 'platform_float', id: new Types.ObjectId('000000000000000000000002') },
            creditAccount: { type: 'user_wallet', id: new Types.ObjectId(scratchUserId) },
            amount: result.prize.value,
            coinType: 'nuqta',
            operationType: 'scratch_card_prize',
            referenceId: sessionId,
            referenceModel: 'GameSession',
            metadata: {
              idempotencyKey,
              description: `Scratch & Win: ${result.prize.description}`,
            },
          });
          logger.info(`[SCRATCH_CARD:LEDGER] userId=${scratchUserId} sessionId=${sessionId} pairId=${pairId} amount=${result.prize.value}`);
        } catch (ledgerErr) {
          // Ledger failure is non-blocking — coins already credited, reconciliation can fix
          logger.error(`[SCRATCH_CARD:LEDGER_FAIL] userId=${scratchUserId} sessionId=${sessionId}`, ledgerErr);
        }
      } catch (err) {
        // Coin award failed — revert session to pending so user can retry
        logger.error(`[SCRATCH_CARD:AWARD_FAIL] userId=${scratchUserId} sessionId=${sessionId}`, err);
        await GameSession.findOneAndUpdate(
          { sessionId, status: 'completed' },
          { $set: { status: 'pending' }, $unset: { completedAt: 1 } }
        );
        throw new Error('Failed to credit reward. Please try again.');
      }
    }
    // Emit game event
    this.emitGameEvent(scratchUserId, 'scratch_card', true, result.prize.type === 'coins' ? (result.prize.value as number) : 0, { sessionId });
    return session;
  }
  /**
   * Retry claiming a scratch card prize that failed to credit.
   * Safe to call multiple times — idempotency key prevents double-award.
   */
  async retryScratchCardClaim(sessionId: string, userId: string): Promise<Lean<IGameSession>> {
    // Find the session — must be pending (reverted) with a result already set
    const session = await GameSession.findOne({
      sessionId,
      user: userId,
      'result.won': true,
      expiresAt: { $gt: new Date() }
    }).lean();
    if (!session) {
      throw new Error('Session not found or expired');
    };
    if (!session.result?.prize) {
      throw new Error('No prize to claim');
    }
    // Check if coins were already awarded (idempotent check)
    const idempotencyKey = `scratch_card:${sessionId}`;
    const existingTx = await CoinTransaction.findOne({ 'metadata.idempotencyKey': idempotencyKey }).lean();
    if (existingTx) {
      // Already claimed successfully — ensure session is marked completed
      if (session.status !== 'completed') {
        session.status = 'completed';
        session.completedAt = new Date();
        await session.save();
      }
      return session
    }
    // Re-attempt the award (same logic as playScratchCard)
    const prize = session.result.prize;
    const scratchUserId = session.user.toString();
    if (prize.type === 'coins' && typeof prize.value === 'number' && prize.value > 0) {
      const awardResult = await coinService.awardCoins(
        scratchUserId,
        prize.value,
        'scratch_card',
        `Scratch & Win: ${prize.description}`,
        { idempotencyKey, sessionId }
      );
      logger.info(`[SCRATCH_CARD:RETRY_AWARD] userId=${scratchUserId} sessionId=${sessionId} amount=${prize.value} newBalance=${awardResult?.newBalance}`);
      // Record ledger entry
      try {
        const pairId = await ledgerService.recordEntry({
          debitAccount: { type: 'platform_float', id: new Types.ObjectId('000000000000000000000002') },
          creditAccount: { type: 'user_wallet', id: new Types.ObjectId(scratchUserId) },
          amount: prize.value,
          coinType: 'nuqta',
          operationType: 'scratch_card_prize',
          referenceId: sessionId,
          referenceModel: 'GameSession',
          metadata: { idempotencyKey, description: `Scratch & Win (retry): ${prize.description}` },
        });
        logger.info(`[SCRATCH_CARD:RETRY_LEDGER] userId=${scratchUserId} sessionId=${sessionId} pairId=${pairId}`);
      } catch (ledgerErr) {
        logger.error(`[SCRATCH_CARD:RETRY_LEDGER_FAIL] userId=${scratchUserId} sessionId=${sessionId}`, ledgerErr);
      }
    }
    // Mark session as completed
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();
    return session
  }
  /**
   * Get scratch card eligibility for a user (server-driven, never trust client).
   * Returns remaining plays, cooldown, and server time.
   */
  async getScratchCardEligibility(userId: string): Promise<{
    canPlay: boolean;
    remainingToday: number;
    dailyLimit: number;
    cooldownSeconds: number;
    nextAvailableAt: string | null;
    serverTime: string;
  }> {
    const config = await getCachedGameConfig('scratch_card');
    const dailyLimit = config?.dailyLimit ?? DEFAULT_DAILY_GAME_LIMITS['scratch_card'] ?? 2;
    const cooldownMinutes = config?.cooldownMinutes ?? 120;
    const isEnabled = config?.isEnabled ?? true;
    // Check schedule
    if (config?.schedule?.availableDays && config.schedule.availableDays.length > 0) {
      const todayDayOfWeek = new Date().getUTCDay();
      if (!config.schedule.availableDays.includes(todayDayOfWeek)) {
        return {
          canPlay: false,
          remainingToday: 0,
          dailyLimit,
          cooldownSeconds: 0,
          nextAvailableAt: null,
          serverTime: new Date().toISOString(),
        };
      }
    }
    // Count today's sessions (UTC boundary)
    const todayUTC = new Date().toISOString().split('T')[0];
    const todayStart = new Date(todayUTC + 'T00:00:00.000Z');
    const todayCount = await GameSession.countDocuments({
      user: userId,
      gameType: 'scratch_card',
      createdAt: { $gte: todayStart }
    });
    const remainingToday = Math.max(0, dailyLimit - todayCount);
    // Check cooldown
    let cooldownSeconds = 0;
    let nextAvailableAt: string | null = null;
    if (cooldownMinutes > 0) {
      const lastCompleted = await GameSession.findOne({
        user: userId,
        gameType: 'scratch_card',
        status: 'completed'
      }).sort({ completedAt: -1 }).select('completedAt').lean();
      if (lastCompleted?.completedAt) {
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const elapsed = Date.now() - new Date(lastCompleted.completedAt).getTime();
        if (elapsed < cooldownMs) {
          cooldownSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
          nextAvailableAt = new Date(new Date(lastCompleted.completedAt).getTime() + cooldownMs).toISOString();
        }
      }
    }
    // Also check for pending (unclaimed) sessions
    const pendingSession = await GameSession.findOne({
      user: userId,
      gameType: 'scratch_card',
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).select('sessionId').lean();
    const canPlay = isEnabled && remainingToday > 0 && cooldownSeconds === 0;
    return {
      canPlay,
      remainingToday,
      dailyLimit,
      cooldownSeconds,
      nextAvailableAt,
      serverTime: new Date().toISOString(),
      ...(pendingSession ? { pendingSessionId: (pendingSession as any).sessionId } : {}),
    } as any;
  }
  // ======== QUIZ ========
  // Create quiz session
  async createQuizSession(
    userId: string,
    questions: any[]
  ): Promise<IGameSession> {
    await this.checkUserGameAccess(userId);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
    // Store correct answers server-side for secure validation
    const correctAnswers = questions.map(q => ({
      questionId: q.id,
      answer: q.correctAnswer
    }));
    const session = await GameSession.create({
      user: userId,
      gameType: 'quiz',
      sessionId: uuidv4(),
      status: 'pending',
      earnedFrom: 'daily_quiz',
      expiresAt,
      // Store correct answers in metadata (never returned to client)
      metadata: {
        questionCount: questions.length,
        correctAnswers: correctAnswers
      }
    });
    return session;
  }
  // Submit quiz answers - SECURE: uses server-side stored answers
  async submitQuizAnswers(
    sessionId: string,
    answers: { questionId: string; answer: string }[],
    _clientCorrectAnswers?: { questionId: string; answer: string }[], // Ignored for security
    userId?: string
  ): Promise<IGameSession> {
    // Atomic status transition: only one request can submit a quiz
    const query: any = { sessionId, status: { $in: ['pending', 'playing'] }, expiresAt: { $gt: new Date() } };
    if (userId) query.user = userId; // Ownership validation
    const session = await GameSession.findOneAndUpdate(
      query,
      { $set: { status: 'completed', completedAt: new Date() } },
      { new: true }
    );
    if (!session) {
      const existing = await GameSession.findOne({ sessionId }).lean();
      if (!existing) throw new Error('Game session not found');
      if (existing.status === 'completed') throw new Error('Quiz already submitted');
      if (new Date() > existing.expiresAt) throw new Error('Quiz session expired');
      throw new Error('Quiz already submitted');
    }
    this.validateMinPlayDuration(session);
    // SECURITY: Retrieve correct answers from stored session metadata, NOT from client
    const storedCorrectAnswers = session.metadata?.correctAnswers || [];
    if (storedCorrectAnswers.length === 0) {
      throw new Error('Quiz session data corrupted - no answer key found');
    }
    // Calculate score using server-side stored answers
    let correct = 0;
    answers.forEach(userAnswer => {
      const correctAnswer = storedCorrectAnswers.find(
        (ca: any) => ca.questionId === userAnswer.questionId
      );
      if (correctAnswer && correctAnswer.answer === userAnswer.answer) {
        correct++;
      }
    });
    const score = correct;
    const total = storedCorrectAnswers.length;
    const percentage = (correct / total) * 100;
    // Calculate coins based on score
    const coinsPerCorrect = 10;
    const bonusForPerfect = percentage === 100 ? 50 : 0;
    const coins = (score * coinsPerCorrect) + bonusForPerfect;
    const result = {
      won: score > 0,
      prize: coins > 0 ? {
        type: 'coins' as const,
        value: coins,
        description: `${coins} Coins for ${score}/${total} correct!`
      } : undefined,
      score: percentage
    };
    // Save result to the already-completed session
    session.result = result;
    await session.save();
    const quizUserId = session.user.toString();
    // Credit coins to user's wallet (if any earned)
    if (coins > 0) {
      try {
        await coinService.awardCoins(
          quizUserId,
          coins,
          'quiz_game',
          `Quiz: ${coins} coins for ${score}/${total} correct!`,
          { sessionId, score, total, percentage: Math.round(percentage) }
        );
      } catch (err) {
        logger.error(`[GAME SERVICE] Quiz coin award failed for user ${quizUserId}:`, err);
      }
    }
    // Emit game event
    this.emitGameEvent(quizUserId, 'quiz', score > 0, coins, { sessionId, score, total, percentage: Math.round(percentage) });
    // Update tournament scores
    let tournamentUpdate = null;
    if (coins > 0) {
      tournamentUpdate = await this.updateTournamentScores(quizUserId, 'quiz', coins).catch((err) => {
        logger.error('[GAME] Tournament score update failed:', err.message);
        return null;
      });
    }
    if (tournamentUpdate) {
      (session as any)._tournamentUpdate = tournamentUpdate;
    }
    return session;
  }
  // ======== DAILY TRIVIA ========
  // Get daily trivia question
  async getDailyTrivia(): Promise<any> {
    // Questions pool (in production, fetch from database)
    const triviaQuestions = [
      {
        id: '1',
        question: 'What is the capital of France?',
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correctAnswer: 'Paris',
        category: 'Geography'
      },
      {
        id: '2',
        question: 'How many days are there in a week?',
        options: ['5', '6', '7', '8'],
        correctAnswer: '7',
        category: 'General'
      }
      // Add more questions
    ];
    // Select random question
    const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    return {
      id: question.id,
      question: question.question,
      options: question.options,
      category: question.category,
      reward: 20 // coins for correct answer
    };
  }
  // Answer daily trivia
  async answerDailyTrivia(
    userId: string,
    questionId: string,
    answer: string
  ): Promise<{ correct: boolean; coins: number }> {
    // Check if already answered today (UTC boundary)
    const todayUTC = new Date().toISOString().split('T')[0];
    const todayStart = new Date(todayUTC + 'T00:00:00.000Z');
    const existingToday = await GameSession.countDocuments({
      user: userId,
      gameType: 'daily_trivia',
      createdAt: { $gte: todayStart }
    });
    if (existingToday > 0) {
      throw new Error('Daily trivia already answered today');
    }
    // Get correct answer (in production, fetch from database)
    const triviaQuestions: any = {
      '1': 'Paris',
      '2': '7'
    };
    const correctAnswer = triviaQuestions[questionId];
    const isCorrect = answer === correctAnswer;
    const coins = isCorrect ? 20 : 0;
    // Create game session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    const triviaSessionId = uuidv4();
    await GameSession.create({
      user: userId,
      gameType: 'daily_trivia',
      sessionId: triviaSessionId,
      status: 'completed',
      earnedFrom: 'daily_trivia',
      expiresAt,
      result: {
        won: isCorrect,
        prize: isCorrect ? {
          type: 'coins',
          value: coins,
          description: `${coins} Coins for correct answer!`
        } : undefined
      }
    });
    // Credit coins to user's wallet (if correct answer)
    if (coins > 0) {
      try {
        await coinService.awardCoins(
          userId,
          coins,
          'quiz_game',
          `Daily Trivia: ${coins} coins for correct answer!`,
          { sessionId: triviaSessionId, questionId }
        );
      } catch (err) {
        logger.error(`[GAME SERVICE] Daily trivia coin award failed for user ${userId}:`, err);
      }
    }
    return {
      correct: isCorrect,
      coins
    };
  }
  // ======== GENERAL ========
  // Get user's game sessions
  async getUserGameSessions(
    userId: string,
    gameType?: string,
    limit: number = 20
  ): Promise<Lean<IGameSession>[]> {
    const query: any = { user: userId };
    if (gameType) {
      query.gameType = gameType;
    }
    return GameSession.find(query)
      .sort({ createdAt: -1 })
        .limit(limit)
          .lean().exec();
  }
  // Get pending games for user
  async getPendingGames(userId: string): Promise<Lean<IGameSession>[]> {
    const now = new Date();
    return GameSession.find({
      user: userId,
      status: 'pending',
      expiresAt: { $gt: now }
    })
      .sort({ createdAt: 1 })
        .limit(100)
          .lean().exec();
  }
  // Get game statistics
  async getGameStats(userId: string): Promise<any> {
    const stats = await GameSession.aggregate([
      {
        $match: { user: userId, status: 'completed' }
      },
      {
        $group: {
          _id: '$gameType',
          totalPlayed: { $sum: 1 },
          totalWon: {
            $sum: { $cond: ['$result.won', 1, 0] }
          },
          totalCoins: {
            $sum: {
              $cond: [
                { $eq: ['$result.prize.type', 'coins'] },
                '$result.prize.value',
                0
              ]
            }
          }
        }
      }
    ]);
    const gameStats: any = {
      spin_wheel: { totalPlayed: 0, totalWon: 0, totalCoins: 0 },
      scratch_card: { totalPlayed: 0, totalWon: 0, totalCoins: 0 },
      quiz: { totalPlayed: 0, totalWon: 0, totalCoins: 0 },
      daily_trivia: { totalPlayed: 0, totalWon: 0, totalCoins: 0 }
    };
    stats.forEach(stat => {
      gameStats[stat._id] = {
        totalPlayed: stat.totalPlayed,
        totalWon: stat.totalWon,
        totalCoins: stat.totalCoins,
        winRate: Math.round((stat.totalWon / stat.totalPlayed) * 100)
      };
    });
    return gameStats;
  }
  // ======== DAILY LIMIT GUARD (RACE-CONDITION SAFE) ========
  /**
   * Atomically check and enforce daily play limits.
   * Creates the session first, then verifies count. If over limit,
   * deletes the session and throws. This eliminates the TOCTOU race
   * where two concurrent requests both pass the count check.
   */
  private async createSessionWithDailyLimitGuard(
    userId: string,
    gameType: string,
    sessionData: Partial<IGameSession>
  ): Promise<IGameSession> {
    const config = await getCachedGameConfig(gameType);
    // Check if game is disabled
    if (config && !config.isEnabled) {
      throw new Error(`${gameType} is currently disabled`);
    }
    // Check schedule availability (UTC day of week)
    if (config?.schedule?.availableDays && config.schedule.availableDays.length > 0) {
      const todayDayOfWeek = new Date().getUTCDay();
      if (!config.schedule.availableDays.includes(todayDayOfWeek)) {
        throw new Error(`${gameType} is not available today`);
      }
    }
    const limit = config?.dailyLimit ?? DEFAULT_DAILY_GAME_LIMITS[gameType] ?? 3;
    // UTC daily boundary
    const todayUTC = new Date().toISOString().split('T')[0];
    const todayStart = new Date(todayUTC + 'T00:00:00.000Z');
    // Pre-check (fast reject for obvious over-limit)
    const currentCount = await GameSession.countDocuments({
      user: userId,
      gameType,
      createdAt: { $gte: todayStart }
    });
    if (currentCount >= limit) {
      throw new Error(`Daily limit reached for ${gameType}`);
    }
    // Create session
    const session = await GameSession.create({
      user: userId,
      gameType,
      sessionId: uuidv4(),
      ...sessionData
    });
    // Post-creation verification: if concurrent requests slipped through, roll back
    const verifiedCount = await GameSession.countDocuments({
      user: userId,
      gameType,
      createdAt: { $gte: todayStart }
    });
    if (verifiedCount > limit) {
      // Race condition detected — roll back this session
      await GameSession.deleteOne({ _id: session._id });
      throw new Error(`Daily limit reached for ${gameType}`);
    }
    return session;
  }
  // ======== MEMORY MATCH ========
  // Start memory match game
  async startMemoryMatch(
    userId: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'easy'
  ): Promise<any> {
    await this.checkUserGameAccess(userId);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry
    // Generate card pairs based on difficulty
    const pairCounts = { easy: 6, medium: 8, hard: 12 };
    const pairs = pairCounts[difficulty];
    // Atomic daily limit check + session creation
    const session = await this.createSessionWithDailyLimitGuard(userId, 'memory_match', {
      status: 'playing',
      earnedFrom: 'game_play',
      expiresAt,
      metadata: {
        difficulty,
        pairs,
        startTime: new Date()
      }
    });
    const rewards = await this.getMemoryMatchPrizes(difficulty);
    return {
      sessionId: session.sessionId,
      difficulty,
      pairs,
      expiresAt,
      rewards
    };
  }
  // Complete memory match game
  async completeMemoryMatch(
    sessionId: string,
    score: number,
    timeSpent: number,
    moves: number,
    userId?: string
  ): Promise<any> {
    // Input validation (before DB lookup)
    if (score < 0) throw new Error('Invalid score: cannot be negative');
    if (timeSpent < 0) throw new Error('Invalid time spent: cannot be negative');
    if (moves < 0) throw new Error('Invalid moves: cannot be negative');
    // Atomic status transition: only one request can complete a session
    const query: any = { sessionId, status: { $in: ['pending', 'playing'] } };
    if (userId) query.user = userId; // Ownership validation
    const session = await GameSession.findOneAndUpdate(
      query,
      { $set: { status: 'completed', completedAt: new Date() } },
      { new: true }
    );
    if (!session) {
      // Either not found or already completed
      const existing = await GameSession.findOne({ sessionId }).lean();
      if (!existing) throw new Error('Game session not found');
      throw new Error('Game already completed');
    }
    this.validateMinPlayDuration(session);
    const sessionOwnerId = session.user.toString();
    const metadata = session.metadata as any;
    const difficulty = metadata?.difficulty || 'easy';
    const prizes = await this.getMemoryMatchPrizes(difficulty);
    const pairs = metadata?.pairs || 6;
    // Minimum time check — realistic minimum is ~10 seconds
    if (timeSpent > 0 && timeSpent < 10000) {
      logger.warn(`[ANTI-CHEAT] Suspicious fast completion: ${timeSpent}ms, ${moves} moves for session ${sessionId}`);
    }
    // Maximum score sanity check
    const maxPossibleCoins = pairs * 100; // generous upper bound
    if (score > maxPossibleCoins) {
      throw new Error('Invalid score: exceeds maximum possible');
    }
    // Moves must be at least equal to number of pairs (minimum to complete)
    if (moves < pairs) {
      throw new Error('Invalid moves: fewer than minimum required');
    }
    // Calculate coins
    let coins = prizes.baseCoins;
    // Perfect match bonus (no wrong moves)
    if (moves === pairs) {
      coins += prizes.perfectBonus;
    }
    // Time bonus (complete within 30 seconds — timeSpent is in milliseconds)
    if (timeSpent > 0 && timeSpent < 30000) {
      coins += prizes.timeBonus;
    }
    const result = {
      won: true,
      prize: {
        type: 'coins' as const,
        value: coins,
        description: `${coins} Coins earned!`
      },
      score
    };
    // Save result to the already-completed session
    session.result = result;
    await session.save();
    // Credit coins to user's wallet (try-catch: session is already completed, don't fail the response)
    let newBalance = 0;
    if (coins > 0) {
      try {
        const coinResult = await coinService.awardCoins(
          sessionOwnerId,
          coins,
          'memory_match',
          `Memory Match game: ${coins} coins earned!`,
          { sessionId, timeSpent, moves, perfectMatch: moves === pairs }
        );
        newBalance = coinResult.newBalance;
      } catch (err) {
        logger.error(`[GAME SERVICE] Memory Match coin award failed for user ${sessionOwnerId}:`, err);
      }
    }
    // Emit game event
    this.emitGameEvent(sessionOwnerId, 'memory_match', true, coins, { sessionId, score, timeSpent, moves, difficulty });
    // Update tournament scores (non-blocking)
    this.updateTournamentScores(sessionOwnerId, 'memory_match', score).catch((err) => logger.error('[GAME] Tournament score update failed:', err.message));
    return {
      sessionId,
      coins,
      score,
      timeSpent,
      moves,
      perfectMatch: moves === pairs,
      timeBonus: timeSpent > 0 && timeSpent < 30000,
      newBalance // Return updated wallet balance
    };
  }
  // ======== COIN HUNT ========
  // Start coin hunt game
  async startCoinHunt(userId: string): Promise<any> {
    await this.checkUserGameAccess(userId);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minute expiry
    // Generate coin positions server-side (stored in session for validation)
    const coins = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      value: Math.random() < 0.1 ? 10 : Math.random() < 0.3 ? 5 : 1,
      x: Math.random() * 100,
      y: Math.random() * 100
    }));
    // Atomic daily limit check + session creation
    const session = await this.createSessionWithDailyLimitGuard(userId, 'coin_hunt', {
      status: 'playing',
      earnedFrom: 'game_play',
      expiresAt,
      metadata: {
        totalCoins: coins.length,
        maxValue: coins.reduce((sum, c) => sum + c.value, 0),
        coinPositions: coins, // Store for server-side validation on complete
        startTime: new Date()
      }
    });
    return {
      sessionId: session.sessionId,
      coins,
      duration: 60, // 60 seconds to collect
      expiresAt
    };
  }
  // Complete coin hunt game
  async completeCoinHunt(
    sessionId: string,
    coinsCollected: number,
    score: number,
    userId?: string
  ): Promise<any> {
    // Input validation (before DB lookup)
    if (coinsCollected < 0) throw new Error('Invalid coins collected: cannot be negative');
    if (score < 0) throw new Error('Invalid score: cannot be negative');
    // Atomic status transition: only one request can complete a session
    const query: any = { sessionId, status: { $in: ['pending', 'playing'] } };
    if (userId) query.user = userId; // Ownership validation
    const session = await GameSession.findOneAndUpdate(
      query,
      { $set: { status: 'completed', completedAt: new Date() } },
      { new: true }
    );
    if (!session) {
      const existing = await GameSession.findOne({ sessionId }).lean();
      if (!existing) throw new Error('Game session not found');
      throw new Error('Game already completed');
    }
    this.validateMinPlayDuration(session);
    // Sanity check: score can't exceed theoretical maximum
    const maxValue = session.metadata?.maxValue || 200;
    if (score > maxValue) {
      throw new Error(`Invalid score: exceeds maximum possible (${maxValue})`);
    }
    if (coinsCollected > (session.metadata?.totalCoins || 20)) {
      throw new Error('Invalid coins collected: exceeds total available');
    }
    const sessionOwnerId = session.user.toString();
    const result = {
      won: coinsCollected > 0,
      prize: coinsCollected > 0 ? {
        type: 'coins' as const,
        value: score,
        description: `${score} Coins collected!`
      } : undefined,
      score
    };
    // Save result to the already-completed session
    session.result = result;
    await session.save();
    // Credit coins to user's wallet (try-catch: session is already completed, don't fail the response)
    let newBalance = 0;
    if (score > 0) {
      try {
        const coinResult = await coinService.awardCoins(
          sessionOwnerId,
          score,
          'coin_hunt',
          `Coin Hunt game: ${score} coins collected!`,
          { sessionId, coinsCollected }
        );
        newBalance = coinResult.newBalance;
      } catch (err) {
        logger.error(`[GAME SERVICE] Coin Hunt coin award failed for user ${sessionOwnerId}:`, err);
      }
    }
    // Emit game event
    this.emitGameEvent(sessionOwnerId, 'coin_hunt', coinsCollected > 0, score, { sessionId, coinsCollected });
    // Fraud check: abnormally high collection rate
    const totalCoins = session.metadata?.totalCoins || 20;
    if (coinsCollected === totalCoins && score > (session.metadata?.maxValue || 200) * 0.9) {
      this.emitFraudEvent(sessionOwnerId, 'coin_hunt', 'perfect_collection', {
        coinsCollected, score, totalCoins, sessionId
      });
    }
    // Update tournament scores (non-blocking)
    this.updateTournamentScores(sessionOwnerId, 'coin_hunt', score).catch((err) => logger.error('[GAME] Tournament score update failed:', err.message));
    return {
      sessionId,
      coinsCollected,
      coinsEarned: score,
      success: true,
      newBalance // Return updated wallet balance
    };
  }
  // ======== GUESS THE PRICE ========
  // Start guess price game
  async startGuessPrice(userId: string): Promise<any> {
    await this.checkUserGameAccess(userId);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    // Load products from DB config with fallback to defaults
    const products = await this.getGuessPriceProducts();
    const product = products[Math.floor(Math.random() * products.length)];
    // Atomic daily limit check + session creation
    const session = await this.createSessionWithDailyLimitGuard(userId, 'guess_price', {
      status: 'playing',
      earnedFrom: 'game_play',
      expiresAt,
      metadata: {
        productId: product.id,
        productName: product.name,
        actualPrice: product.actualPrice,
        startTime: new Date()
      }
    });
    return {
      sessionId: session.sessionId,
      product: {
        id: product.id,
        name: product.name,
        image: product.image,
        // Only provide a general category hint, NOT a price range (prevents binary-search exploitation)
        category: product.actualPrice >= 3000 ? 'Premium' : product.actualPrice >= 1000 ? 'Mid-Range' : 'Budget'
      },
      expiresAt
    };
  }
  // Submit guess price answer
  async submitGuessPrice(
    sessionId: string,
    guessedPrice: number,
    userId?: string
  ): Promise<any> {
    // Input validation (before DB lookup)
    if (guessedPrice <= 0) throw new Error('Invalid guess: price must be positive');
    if (guessedPrice > 1000000) throw new Error('Invalid guess: price unreasonably high');
    // Atomic status transition: only one request can complete a session
    const query: any = { sessionId, status: { $in: ['pending', 'playing'] } };
    if (userId) query.user = userId; // Ownership validation
    const session = await GameSession.findOneAndUpdate(
      query,
      { $set: { status: 'completed', completedAt: new Date() } },
      { new: true }
    );
    if (!session) {
      const existing = await GameSession.findOne({ sessionId }).lean();
      if (!existing) throw new Error('Game session not found');
      throw new Error('Game already completed');
    }
    this.validateMinPlayDuration(session);
    const sessionOwnerId = session.user.toString();
    const metadata = session.metadata as any;
    const actualPrice = metadata?.actualPrice || 0;
    // Calculate accuracy
    const difference = Math.abs(guessedPrice - actualPrice);
    const accuracy = Math.max(0, 100 - (difference / actualPrice * 100));
    // Calculate coins based on accuracy
    let coins = 0;
    let message = '';
    if (accuracy >= 95) {
      coins = 50;
      message = 'Perfect! You nailed it!';
    } else if (accuracy >= 85) {
      coins = 30;
      message = 'Excellent guess!';
    } else if (accuracy >= 70) {
      coins = 20;
      message = 'Good guess!';
    } else if (accuracy >= 50) {
      coins = 10;
      message = 'Close enough!';
    } else {
      coins = 5;
      message = 'Better luck next time!';
    }
    const result = {
      won: true,
      prize: {
        type: 'coins' as const,
        value: coins,
        description: `${coins} Coins earned!`
      },
      score: Math.round(accuracy)
    };
    // Save result to the already-completed session
    session.result = result;
    await session.save();
    // Credit coins to user's wallet (try-catch: session is already completed, don't fail the response)
    let newBalance = 0;
    if (coins > 0) {
      try {
        const coinResult = await coinService.awardCoins(
          sessionOwnerId,
          coins,
          'guess_price',
          `Guess the Price game: ${coins} coins earned!`,
          { sessionId, accuracy: Math.round(accuracy), guessedPrice, actualPrice }
        );
        newBalance = coinResult.newBalance;
      } catch (err) {
        logger.error(`[GAME SERVICE] Guess Price coin award failed for user ${sessionOwnerId}:`, err);
      }
    }
    // Emit game event
    this.emitGameEvent(sessionOwnerId, 'guess_price', coins > 0, coins, { sessionId, accuracy: Math.round(accuracy) });
    // Update tournament scores (non-blocking)
    this.updateTournamentScores(sessionOwnerId, 'guess_price', Math.round(accuracy)).catch((err) => logger.error('[GAME] Tournament score update failed:', err.message));
    return {
      sessionId,
      guessedPrice,
      actualPrice,
      accuracy: Math.round(accuracy),
      coins,
      message,
      productName: metadata?.productName,
      newBalance // Return updated wallet balance
    };
  }
  // ======== DAILY LIMITS ========
  // Get remaining plays for a game type
  // All daily limits use UTC midnight as the reset boundary
  async getDailyPlaysRemaining(userId: string, gameType: string): Promise<number> {
    // Check GameConfig first, fall back to hardcoded defaults
    const config = await getCachedGameConfig(gameType);
    // If game is disabled in config, return 0 plays
    if (config && !config.isEnabled) {
      return 0;
    }
    // Check schedule availability
    if (config?.schedule?.availableDays && config.schedule.availableDays.length > 0) {
      const today = new Date().getUTCDay();
      if (!config.schedule.availableDays.includes(today)) {
        return 0;
      }
    }
    // UTC daily boundary (consistent with createSessionWithDailyLimitGuard)
    const todayUTC = new Date().toISOString().split('T')[0];
    const todayStart = new Date(todayUTC + 'T00:00:00.000Z');
    const playedToday = await GameSession.countDocuments({
      user: userId,
      gameType,
      createdAt: { $gte: todayStart }
    });
    const limit = config?.dailyLimit ?? DEFAULT_DAILY_GAME_LIMITS[gameType] ?? 3;
    return Math.max(0, limit - playedToday);
  }
  // Get the configured daily limit for a game type
  async getDailyLimitForGame(gameType: string): Promise<number> {
    const config = await getCachedGameConfig(gameType);
    return config?.dailyLimit ?? DEFAULT_DAILY_GAME_LIMITS[gameType] ?? 3;
  }
  // Get all daily limits status
  async getDailyLimits(userId: string): Promise<any> {
    const gameTypes = Object.keys(DEFAULT_DAILY_GAME_LIMITS);
    const limits = await Promise.all(
      gameTypes.map(async gameType => {
        const config = await getCachedGameConfig(gameType);
        const limit = config?.dailyLimit ?? DEFAULT_DAILY_GAME_LIMITS[gameType] ?? 3;
        const remaining = await this.getDailyPlaysRemaining(userId, gameType);
        return { gameType, limit, remaining };
      })
    );
    return limits.reduce((acc, item) => {
      acc[item.gameType] = {
        limit: item.limit,
        remaining: item.remaining,
        played: item.limit - item.remaining
      };
      return acc;
    }, {} as any);
  }
  // Get game status for a specific game type (Phase 4: Frontend Polish)
  async getGameStatus(userId: string, gameType: string): Promise<{
    playsToday: number;
    maxPlays: number;
    playsRemaining: number;
    nextResetAt: string;
    isAvailable: boolean;
    cooldownMinutes: number;
    lastPlayedAt: string | null;
  }> {
    const config = await getCachedGameConfig(gameType);
    const maxPlays = config?.dailyLimit ?? DEFAULT_DAILY_GAME_LIMITS[gameType] ?? 3;
    const cooldownMinutes = config?.cooldownMinutes ?? 0;
    // UTC daily boundary
    const todayUTC = new Date().toISOString().split('T')[0];
    const todayStart = new Date(todayUTC + 'T00:00:00.000Z');
    const playedToday = await GameSession.countDocuments({
      user: userId,
      gameType,
      createdAt: { $gte: todayStart }
    });
    // Get last played session
    const lastSession = await GameSession.findOne({
      user: userId,
      gameType,
      status: 'completed'
    }).sort({ completedAt: -1 }).select('completedAt').lean();
    // Calculate next UTC midnight reset
    const tomorrow = new Date(todayStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const remaining = Math.max(0, maxPlays - playedToday);
    // Check cooldown
    let isAvailable = remaining > 0;
    if (isAvailable && cooldownMinutes > 0 && lastSession?.completedAt) {
      const cooldownEnd = new Date(lastSession.completedAt);
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + cooldownMinutes);
      if (new Date() < cooldownEnd) {
        isAvailable = false;
      }
    }
    // Check if game is enabled
    if (config && !config.isEnabled) {
      isAvailable = false;
    }
    return {
      playsToday: playedToday,
      maxPlays,
      playsRemaining: remaining,
      nextResetAt: tomorrow.toISOString(),
      isAvailable,
      cooldownMinutes,
      lastPlayedAt: lastSession?.completedAt ? new Date(lastSession.completedAt).toISOString() : null,
    };
  }
  // Get game analytics for admin (Phase 5: Admin Dashboard)
  async getGameAnalytics(gameType?: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const matchFilter: any = { status: 'completed', createdAt: { $gte: startDate } };
    if (gameType) matchFilter.gameType = gameType;
    const [stats, dailyStats, topPlayers] = await Promise.all([
      // Overall stats per game type
      GameSession.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$gameType',
            totalPlayed: { $sum: 1 },
            totalWon: { $sum: { $cond: ['$result.won', 1, 0] } },
            totalCoins: {
              $sum: { $cond: [{ $eq: ['$result.prize.type', 'coins'] }, '$result.prize.value', 0] }
            },
            avgScore: { $avg: '$result.score' },
            uniquePlayers: { $addToSet: '$user' },
          }
        },
        { $project: {
          _id: 1, totalPlayed: 1, totalWon: 1, totalCoins: 1, avgScore: 1,
          uniquePlayers: { $size: '$uniquePlayers' },
          winRate: { $multiply: [{ $divide: ['$totalWon', { $max: ['$totalPlayed', 1] }] }, 100] }
        }}
      ]),
      // Daily participation trend
      GameSession.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              gameType: '$gameType'
            },
            count: { $sum: 1 },
            coins: { $sum: { $cond: [{ $eq: ['$result.prize.type', 'coins'] }, '$result.prize.value', 0] } }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      // Top players by coins earned
      GameSession.aggregate([
        { $match: { ...matchFilter, 'result.prize.type': 'coins' } },
        {
          $group: {
            _id: '$user',
            totalCoins: { $sum: '$result.prize.value' },
            gamesPlayed: { $sum: 1 }
          }
        },
        { $sort: { totalCoins: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
            pipeline: [{ $project: { fullName: 1, username: 1, phoneNumber: 1 } }]
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
      ])
    ]);
    return { stats, dailyStats, topPlayers, period: { days, startDate } };
  }
  // Helper: Weighted random selection
  private getWeightedRandomPrize(prizes: readonly any[]): any {
    const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
    let random = Math.random() * totalWeight;
    for (const prize of prizes) {
      random -= prize.weight;
      if (random <= 0) {
        return prize;
      }
    }
    return prizes[0]; // Fallback
  }
  // Expire old sessions (run via cron)
  async expireOldSessions(): Promise<number> {
    const result = await GameSession.expireSessions();
    return result.modifiedCount || 0;
  }
  // Get today's total earnings for a user (UTC boundary)
  async getTodaysEarnings(userId: string): Promise<number> {
    const todayUTC = new Date().toISOString().split('T')[0];
    const today = new Date(todayUTC + 'T00:00:00.000Z');
    const result = await GameSession.aggregate([
      {
        $match: {
          user: userId,
          status: 'completed',
          createdAt: { $gte: today },
          'result.prize.type': 'coins'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$result.prize.value' }
        }
      }
    ]);
    return result[0]?.total || 0;
  }
  // Default game display info (fallback if no DB config)
  private static readonly DEFAULT_GAME_DISPLAY: Record<string, { title: string; description: string; icon: string; path: string; reward: string }> = {
    spin_wheel: { title: 'Spin & Win', description: 'Spin the wheel to win coins and rewards', icon: '🎰', path: '/explore/spin-win', reward: 'Up to 1000 coins' },
    memory_match: { title: 'Memory Match', description: 'Match pairs to earn coins', icon: '🧠', path: '/playandearn/memorymatch', reward: 'Up to 170 coins' },
    coin_hunt: { title: 'Coin Hunt', description: 'Collect coins before time runs out', icon: '🪙', path: '/playandearn/coinhunt', reward: 'Up to 50 coins' },
    guess_price: { title: 'Guess the Price', description: 'Guess product prices to win', icon: '🏷️', path: '/playandearn/guessprice', reward: 'Up to 50 coins' },
    quiz: { title: 'Daily Quiz', description: 'Test your knowledge', icon: '❓', path: '/playandearn/quiz', reward: 'Up to 150 coins' },
    scratch_card: { title: 'Scratch & Win', description: 'Scratch to reveal prizes', icon: '🎫', path: '/playandearn/luckydraw', reward: 'Up to 250 coins' },
  };
  // Get available games with status (DB-driven with fallback)
  async getAvailableGames(userId?: string): Promise<any[]> {
    // Try loading game configs from DB
    let dbConfigs: Lean<IGameConfig>[] = [];
    try {
      dbConfigs = await GameConfig.find({}).sort({ sortOrder: 1 }).limit(1000).lean()
    } catch (err) {
      logger.error('[GAME SERVICE] Failed to load GameConfig from DB, using defaults:', err);
    }
    let games: any[];
    if (dbConfigs.length > 0) {
      // DB-driven: build game list from GameConfig entries
      const defaultPaths: Record<string, string> = {
        spin_wheel: '/explore/spin-win', memory_match: '/playandearn/memorymatch',
        coin_hunt: '/playandearn/coinhunt', guess_price: '/playandearn/guessprice',
        quiz: '/playandearn/quiz', scratch_card: '/playandearn/luckydraw',
      };
      games = dbConfigs
        .filter(c => c.isEnabled)
          .map(c => ({
          id: c.gameType.replace(/_/g, '-'),
          title: c.displayName,
          description: c.description,
          icon: c.config?.emoji || GameService.DEFAULT_GAME_DISPLAY[c.gameType]?.icon || '🎮',
          path: c.config?.path || defaultPaths[c.gameType] || `/playandearn/${c.gameType}`,
          maxDaily: c.dailyLimit,
          reward: c.config?.rewardText || `Up to ${c.rewards?.maxCoins || 100} coins`,
          featured: c.featured,
          sortOrder: c.sortOrder,
          cooldownMinutes: c.cooldownMinutes,
        }));
    } else {
      // Fallback: use hardcoded defaults
      games = Object.entries(GameService.DEFAULT_GAME_DISPLAY).map(([gameType, display]) => ({
        id: gameType.replace(/_/g, '-'),
        title: display.title,
        description: display.description,
        icon: display.icon,
        path: display.path,
        maxDaily: DEFAULT_DAILY_GAME_LIMITS[gameType] ?? 3,
        reward: display.reward,
        featured: false,
        sortOrder: 0,
        cooldownMinutes: 0,
      }));
    }
    // If user is authenticated, add their remaining plays
    if (userId) {
      const limits = await this.getDailyLimits(userId);
      const todaysEarnings = await this.getTodaysEarnings(userId);
      return games.map(game => {
        const gameTypeKey = game.id.replace(/-/g, '_');
        const limitData = limits[gameTypeKey];
        return {
          ...game,
          playsRemaining: limitData?.remaining ?? game.maxDaily,
          playsUsed: limitData?.played ?? 0,
          isAvailable: limitData ? limitData.remaining > 0 : true,
          todaysEarnings
        };
      });
    }
    // For unauthenticated users, return games with default availability
    return games.map(game => ({
      ...game,
      playsRemaining: game.maxDaily,
      playsUsed: 0,
      isAvailable: true,
      todaysEarnings: 0
    }));
  }
}
export default new GameService();