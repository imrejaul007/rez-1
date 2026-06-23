import { logger } from '../config/logger';
import Tournament, { ITournament } from '../models/Tournament';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import gamificationSocketService from './gamificationSocketService';
import mongoose from 'mongoose';
import type { Lean } from '../types/lean';

class TournamentService {
  // Get all tournaments
  async getTournaments(
    status?: 'upcoming' | 'active' | 'completed',
    type?: 'daily' | 'weekly' | 'monthly' | 'special',
    limit: number = 20,
    offset: number = 0
  ): Promise<{ tournaments: Lean<ITournament>[]; total: number }> {
    const query: any = {};

    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['upcoming', 'active'] };
    }

    if (type) {
      query.type = type;
    }

    const [tournaments, total] = await Promise.all([
      Tournament.find(query)
        .select('-participants')
        .sort({ featured: -1, startDate: 1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      Tournament.countDocuments(query)
    ]);

    return { tournaments, total };
  }

  // Get tournament details
  async getTournamentById(tournamentId: string): Promise<ITournament | null> {
    const tournament = await Tournament.findById(tournamentId)
      .populate('participants.user', 'name avatar')
      .lean().exec();

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    return tournament as unknown as ITournament | null;
  }

  // Join tournament
  async joinTournament(tournamentId: string, userId: string): Promise<ITournament> {
    const tournament = await Tournament.findById(tournamentId).lean();

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'upcoming' && tournament.status !== 'active') {
      throw new Error('Tournament is not accepting participants');
    }

    if (tournament.participants.length >= tournament.maxParticipants) {
      throw new Error('Tournament is full');
    }

    // Check if already joined
    const existingParticipant = tournament.participants.find(
      p => p.user.toString() === userId
    );

    if (existingParticipant) {
      throw new Error('Already joined this tournament');
    }

    // Enforce entry fee
    if (tournament.entryFee > 0) {
      const { walletService } = await import('./walletService');
      try {
        await walletService.debit({
          userId,
          amount: tournament.entryFee,
          source: 'tournament_entry',
          description: `Tournament entry fee: ${tournament.name}`,
          operationType: 'payment',
          referenceId: `tournament-entry:${tournament._id}:${userId}`,
          referenceModel: 'Tournament',
          metadata: { tournamentId: String(tournament._id), tournamentName: tournament.name },
        });
      } catch (err: any) {
        if (err.message?.includes('Insufficient') || err.message?.includes('concurrent')) {
          throw new Error(`Insufficient coins. Entry fee is ${tournament.entryFee} coins.`);
        }
        throw err;
      }
    }

    // Add participant
    tournament.participants.push({
      user: new mongoose.Types.ObjectId(userId),
      score: 0,
      gamesPlayed: 0,
      joinedAt: new Date()
    });

    await tournament.save();

    return tournament as unknown as ITournament;
  }

  // Leave tournament
  async leaveTournament(tournamentId: string, userId: string): Promise<void> {
    const tournament = await Tournament.findById(tournamentId).lean();

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'upcoming') {
      throw new Error('Cannot leave an active or completed tournament');
    }

    const participantIndex = tournament.participants.findIndex(
      p => p.user.toString() === userId
    );

    if (participantIndex === -1) {
      throw new Error('Not a participant in this tournament');
    }

    tournament.participants.splice(participantIndex, 1);
    await tournament.save();
  }

  // Update participant score
  async updateParticipantScore(
    tournamentId: string,
    userId: string,
    score: number
  ): Promise<void> {
    const tournament = await Tournament.findById(tournamentId).lean();

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'active') {
      throw new Error('Tournament is not active');
    }

    const participant = tournament.participants.find(
      p => p.user.toString() === userId
    );

    if (!participant) {
      throw new Error('Not a participant in this tournament');
    }

    participant.score += score;
    participant.gamesPlayed += 1;
    participant.lastPlayedAt = new Date();

    await tournament.save();

    // Emit live leaderboard update via socket (non-blocking)
    try {
      const sorted = [...tournament.participants]
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      const userRank = sorted.findIndex(p => p.user.toString() === userId) + 1;

      gamificationSocketService.emitScoreUpdate(
        tournamentId,
        userId,
        participant.score,
        userRank > 0 ? userRank : sorted.length + 1
      );

      gamificationSocketService.emitLeaderboardUpdate(
        tournamentId,
        sorted.map((p, idx) => ({
          userId: p.user.toString(),
          username: '',  // populated on client
          score: p.score,
          rank: idx + 1,
        }))
      );
    } catch (socketErr) {
      // Socket errors should never block game flow
      logger.error('[TOURNAMENT] Socket emission error:', socketErr);
    }
  }

  // Get tournament leaderboard
  async getTournamentLeaderboard(
    tournamentId: string,
    limit: number = 100
  ): Promise<any[]> {
    const tournament = await Tournament.findById(tournamentId)
      .populate('participants.user', 'name avatar')
      .lean().exec();

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Sort participants by score
    const sortedParticipants = tournament.participants
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit)
      .map((p: any, index: number) => ({
        rank: index + 1,
        user: p.user,
        score: p.score,
        gamesPlayed: p.gamesPlayed,
        joinedAt: p.joinedAt,
        lastPlayedAt: p.lastPlayedAt
      }));

    return sortedParticipants;
  }

  // Get user's tournament participation
  async getUserTournaments(userId: string): Promise<any[]> {
    const tournaments = await Tournament.find({
      'participants.user': userId
    })
      .select('name type gameType status startDate endDate prizes participants')
      .sort({ startDate: -1 })
      .limit(20)
      .lean().exec();

    return tournaments.map((t: any) => {
      const participant = t.participants.find(
        (p: any) => p.user.toString() === userId
      );

      // Calculate user's rank
      const sortedParticipants = [...t.participants].sort((a: any, b: any) => b.score - a.score);
      const userRank = sortedParticipants.findIndex(
        (p: any) => p.user.toString() === userId
      ) + 1;

      return {
        _id: t._id,
        name: t.name,
        type: t.type,
        gameType: t.gameType,
        status: t.status,
        startDate: t.startDate,
        endDate: t.endDate,
        userScore: participant?.score || 0,
        userRank,
        totalParticipants: t.participants.length,
        prizes: t.prizes
      };
    });
  }

  // Get user's rank in a tournament
  async getUserRankInTournament(tournamentId: string, userId: string): Promise<any> {
    const tournament = await Tournament.findById(tournamentId).lean();

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const participant = tournament.participants.find(
      p => p.user.toString() === userId
    );

    if (!participant) {
      return null;
    }

    // Calculate rank
    const sortedParticipants = [...tournament.participants].sort((a, b) => b.score - a.score);
    const rank = sortedParticipants.findIndex(
      p => p.user.toString() === userId
    ) + 1;

    // Check if eligible for prize
    const prize = tournament.prizes.find(p => p.rank === rank);

    return {
      rank,
      score: participant.score,
      gamesPlayed: participant.gamesPlayed,
      totalParticipants: tournament.participants.length,
      prize: prize || null,
      isWinner: rank <= tournament.prizes.length
    };
  }

  // Activate upcoming tournaments
  async activateUpcomingTournaments(): Promise<number> {
    const now = new Date();

    const result = await Tournament.updateMany(
      {
        status: 'upcoming',
        startDate: { $lte: now }
      },
      {
        status: 'active'
      }
    );

    return result.modifiedCount || 0;
  }

  // Complete ended tournaments
  async completeEndedTournaments(): Promise<number> {
    const now = new Date();

    const tournaments = await Tournament.find({
      status: 'active',
      endDate: { $lte: now }
    }).lean();

    for (const tournament of tournaments) {
      // Calculate final ranks
      const sortedParticipants = [...tournament.participants].sort((a, b) => b.score - a.score);

      sortedParticipants.forEach((p, index) => {
        const participant = tournament.participants.find(
          tp => tp.user.toString() === p.user.toString()
        );
        if (participant) {
          participant.rank = index + 1;
        }
      });

      tournament.status = 'completed';
      await tournament.save();

      // Only distribute prizes if minimum participants met
      if (tournament.participants.length >= (tournament.minParticipants || 0)) {
        await this.distributeTournamentPrizes(tournament);
      } else {
        logger.info(`⚠️ [TOURNAMENT] Skipping prize distribution for "${tournament.name}" - only ${tournament.participants.length}/${tournament.minParticipants} participants`);
        // Refund entry fees if applicable
        if (tournament.entryFee > 0) {
          const { rewardEngine } = await import('../core/rewardEngine');
          for (const participant of tournament.participants) {
            try {
              await rewardEngine.issue({
                userId: participant.user.toString(),
                amount: tournament.entryFee,
                rewardType: 'tournament_prize',
                source: 'tournament_refund' as any,
                description: `Entry fee refund: ${tournament.name} (minimum participants not met)`,
                operationType: 'refund',
                referenceId: `tournament-refund:${tournament._id}:${participant.user}`,
                referenceModel: 'Tournament',
                metadata: { tournamentId: String(tournament._id) },
                skipCap: true,
                skipMultiplier: true,
              });
            } catch (refundErr) {
              logger.error(`[TOURNAMENT] Failed to refund entry fee for user ${participant.user}:`, refundErr);
            }
          }
        }
      }
    }

    return tournaments.length;
  }

  /**
   * Distribute prizes to tournament winners
   *
   * Fixes applied:
   * 1. Creates CoinTransaction records (source of truth for earnings)
   * 2. Uses atomic $inc wallet update (no markModified needed)
   * 3. Idempotent: skips participants with prizeAwarded=true
   * 4. Sets prizeAwarded AFTER successful wallet+CoinTransaction updates
   * 5. Individual try/catch per winner so one failure doesn't block others
   */
  private async distributeTournamentPrizes(tournament: Lean<ITournament>): Promise<void> {
    logger.info(`🏆 [TOURNAMENT] Distributing prizes for tournament: ${tournament.name}`);

    const sortedParticipants = [...tournament.participants].sort((a, b) => b.score - a.score);
    const prizes = tournament.prizes || [];
    let awarded = 0;
    let skipped = 0;

    for (let i = 0; i < Math.min(sortedParticipants.length, prizes.length); i++) {
      const participant = sortedParticipants[i];
      const prize = prizes[i];

      if (!participant || !prize) continue;

      // Fix #3: Idempotency guard - skip already awarded prizes
      if (participant.prizeAwarded) {
        skipped++;
        logger.info(`⏭️ [TOURNAMENT] Skipping rank ${i + 1} - prize already awarded`);
        continue;
      }

      try {
        const userId = participant.user.toString();
        const coinsReward = prize.coins || 0;

        if (coinsReward > 0) {
          // Use rewardEngine for unified wallet + CoinTransaction + ledger
          const { rewardEngine } = await import('../core/rewardEngine');
          await rewardEngine.issue({
            userId,
            amount: coinsReward,
            rewardType: 'tournament_prize',
            source: 'tournament_prize',
            description: `Tournament prize: Rank ${i + 1} in ${tournament.name}`,
            operationType: 'tournament_prize',
            referenceId: `tournament-prize:${tournament._id}:rank${i + 1}`,
            referenceModel: 'Tournament',
            metadata: {
              tournamentId: String(tournament._id),
              tournamentName: tournament.name,
              rank: i + 1,
              badge: prize.badge || null,
            },
            skipCap: true,
            skipMultiplier: true,
          });

          logger.info(`[TOURNAMENT] Awarded ${coinsReward} coins to rank ${i + 1} (${userId})`);
        }

        // Fix #4: Set prizeAwarded AFTER successful wallet update + CoinTransaction
        // Find the actual participant in tournament.participants (not the sorted copy)
        const tournamentParticipant = tournament.participants.find(
          tp => tp.user.toString() === participant.user.toString()
        );
        if (tournamentParticipant) {
          tournamentParticipant.prizeAwarded = true;
          tournamentParticipant.prizeDetails = {
            rank: i + 1,
            coins: coinsReward,
            badge: prize.badge,
            exclusiveDeal: prize.exclusiveDeal,
            awardedAt: new Date()
          };
        }

        awarded++;
      } catch (prizeError) {
        // Fix #5: Individual try/catch - continue to next winner
        logger.error(`❌ [TOURNAMENT] Failed to award prize to rank ${i + 1}:`, prizeError);
      }
    }

    // Save updated participant prize statuses
    await tournament.save();
    logger.info(`✅ [TOURNAMENT] Prize distribution complete for: ${tournament.name} (awarded: ${awarded}, skipped: ${skipped})`);
  }

  // Get featured tournaments
  async getFeaturedTournaments(limit: number = 5): Promise<Lean<ITournament>[]> {
    return Tournament.find({
      status: { $in: ['upcoming', 'active'] },
      featured: true
    })
      .select('-participants')
      .sort({ startDate: 1 })
      .limit(limit)
      .lean().exec();
  }

  // Get live tournaments for the Play & Earn hub
  async getLiveTournaments(userId?: string, limit: number = 5): Promise<any[]> {
    const tournaments = await Tournament.find({
      status: { $in: ['upcoming', 'active'] }
    })
      .sort({ featured: -1, status: 1, startDate: 1 })
      .limit(limit)
      .lean().exec();

    const now = new Date();

    return tournaments.map((tournament: any) => {
      // Calculate time remaining
      const endDate = new Date(tournament.endDate);
      const startDate = new Date(tournament.startDate);
      let endsIn = '';
      let startsIn = '';

      if (tournament.status === 'active') {
        const diffMs = endDate.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          endsIn = `${diffDays}d ${diffHours % 24}h`;
        } else if (diffHours > 0) {
          endsIn = `${diffHours}h`;
        } else {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          endsIn = `${diffMins}m`;
        }
      } else {
        const diffMs = startDate.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          startsIn = `${diffDays}d ${diffHours % 24}h`;
        } else if (diffHours > 0) {
          startsIn = `${diffHours}h`;
        } else {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          startsIn = `${diffMins}m`;
        }
      }

      // Check if user is participating and get their rank
      let userRank: number | null = null;
      let userScore: number | null = null;
      let isParticipant = false;

      if (userId) {
        const participant = tournament.participants.find(
          (p: any) => p.user.toString() === userId
        );

        if (participant) {
          isParticipant = true;
          userScore = participant.score;

          // Calculate rank
          const sortedParticipants = [...tournament.participants].sort((a: any, b: any) => b.score - a.score);
          userRank = sortedParticipants.findIndex(
            (p: any) => p.user.toString() === userId
          ) + 1;
        }
      }

      // Get prize pool total
      const totalPrizeValue = tournament.prizes.reduce((sum: number, prize: any) => {
        return sum + (prize.coins || 0);
      }, 0);

      // Determine icon based on game type
      const iconMap: Record<string, string> = {
        'spin_wheel': '🎰',
        'memory_match': '🧠',
        'coin_hunt': '🪙',
        'guess_price': '🏷️',
        'quiz': '❓',
        'general': '🏆'
      };

      return {
        id: tournament._id,
        title: tournament.name,
        description: tournament.description,
        type: tournament.type,
        gameType: tournament.gameType,
        status: tournament.status,
        icon: iconMap[tournament.gameType] || '🏆',
        prize: `${totalPrizeValue.toLocaleString()} coins`,
        prizePool: tournament.prizes,
        participants: tournament.participants.length,
        maxParticipants: tournament.maxParticipants,
        endsIn: endsIn || undefined,
        startsIn: startsIn || undefined,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        featured: tournament.featured,
        path: `/playandearn/TournamentDetail?id=${tournament._id}`,
        // User-specific data
        isParticipant,
        userRank,
        userScore
      };
    });
  }
}

export default new TournamentService();
