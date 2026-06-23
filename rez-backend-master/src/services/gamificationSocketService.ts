import { logger } from '../config/logger';
import { Server as SocketIOServer } from 'socket.io';

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

class GamificationSocketService {
  private io: SocketIOServer | null = null;
  private static instance: GamificationSocketService;

  // Throttle: track last emission per tournament to max 1 per 5 seconds
  private lastEmission: Map<string, number> = new Map();
  private static THROTTLE_MS = 5000;

  private constructor() {}

  static getInstance(): GamificationSocketService {
    if (!GamificationSocketService.instance) {
      GamificationSocketService.instance = new GamificationSocketService();
    }
    return GamificationSocketService.instance;
  }

  initialize(io: SocketIOServer) {
    this.io = io;
    logger.info('✅ [GAMIFICATION SOCKET] Gamification socket service initialized');

    io.on('connection', (socket) => {
      // Join tournament room for live leaderboard
      socket.on('join-tournament', (tournamentId: string) => {
        if (!tournamentId) return;
        socket.join(`tournament-${tournamentId}`);
        logger.info(`✅ [GAMIFICATION SOCKET] Client ${socket.id} joined tournament-${tournamentId}`);
      });

      // Leave tournament room
      socket.on('leave-tournament', (tournamentId: string) => {
        if (!tournamentId) return;
        socket.leave(`tournament-${tournamentId}`);
      });

      socket.on('disconnect', () => {
        // Rooms are auto-cleaned by socket.io
      });
    });
  }

  /**
   * Emit full leaderboard update to all clients watching a tournament.
   * Throttled to max 1 emission per 5 seconds per tournament.
   */
  emitLeaderboardUpdate(tournamentId: string, leaderboard: LeaderboardEntry[]) {
    if (!this.io) return;

    const now = Date.now();
    const lastTime = this.lastEmission.get(tournamentId) || 0;
    if (now - lastTime < GamificationSocketService.THROTTLE_MS) return;

    this.lastEmission.set(tournamentId, now);

    this.io.to(`tournament-${tournamentId}`).emit('leaderboard-update', {
      tournamentId,
      leaderboard,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit a targeted score update for a specific user in a tournament.
   */
  emitScoreUpdate(tournamentId: string, userId: string, newScore: number, newRank: number) {
    if (!this.io) return;

    this.io.to(`tournament-${tournamentId}`).emit('score-update', {
      tournamentId,
      userId,
      newScore,
      newRank,
      timestamp: new Date().toISOString(),
    });
  }
}

const gamificationSocketService = GamificationSocketService.getInstance();
export default gamificationSocketService;
