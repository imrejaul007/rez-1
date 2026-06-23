// Tournament API Service
// Handles all tournament-related API calls

import apiClient from './apiClient';

export interface TournamentPrize {
  rank: number;
  coins: number;
  badge?: string;
  description: string;
}

export interface Tournament {
  _id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  gameType: 'quiz' | 'memory_match' | 'coin_hunt' | 'guess_price' | 'mixed';
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  entryFee: number;
  maxParticipants: number;
  minParticipants: number;
  prizes: TournamentPrize[];
  rules: string[];
  totalPrizePool: number;
  image?: string;
  featured: boolean;
  participantsCount?: number;
}

export interface TournamentLeaderboardEntry {
  rank: number;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  score: number;
  gamesPlayed: number;
  joinedAt: string;
  lastPlayedAt?: string;
}

export interface UserTournament {
  _id: string;
  name: string;
  type: string;
  gameType: string;
  status: string;
  startDate: string;
  endDate: string;
  userScore: number;
  userRank: number;
  totalParticipants: number;
  prizes: TournamentPrize[];
}

export interface UserRankInTournament {
  rank: number;
  score: number;
  gamesPlayed: number;
  totalParticipants: number;
  prize: TournamentPrize | null;
  isWinner: boolean;
}

export interface LiveTournament {
  id: string;
  title: string;
  description?: string;
  type: string;
  gameType: string;
  status: 'upcoming' | 'active';
  icon: string;
  prize: string;
  prizePool: TournamentPrize[];
  participants: number;
  maxParticipants: number;
  endsIn?: string;
  startsIn?: string;
  startDate: string;
  endDate: string;
  featured: boolean;
  path: string;
  isParticipant: boolean;
  userRank: number | null;
  userScore: number | null;
}

class TournamentApi {
  // Get all tournaments
  async getTournaments(
    status?: 'upcoming' | 'active' | 'completed',
    type?: 'daily' | 'weekly' | 'monthly' | 'special',
    limit: number = 20,
    offset: number = 0
  ) {
    return apiClient.get<Tournament[]>('/tournaments', { status, type, limit, offset });
  }

  // Get featured tournaments
  async getFeaturedTournaments(limit: number = 5) {
    return apiClient.get<Tournament[]>('/tournaments/featured', { limit });
  }

  // Get tournament by ID
  async getTournamentById(id: string) {
    return apiClient.get<Tournament>(`/tournaments/${id}`);
  }

  // Join tournament
  async joinTournament(tournamentId: string) {
    return apiClient.post<{
      tournamentId: string;
      name: string;
      participantsCount: number;
    }>(`/tournaments/${tournamentId}/join`);
  }

  // Leave tournament
  async leaveTournament(tournamentId: string) {
    return apiClient.post<void>(`/tournaments/${tournamentId}/leave`);
  }

  // Get tournament leaderboard
  async getTournamentLeaderboard(tournamentId: string, limit: number = 100) {
    return apiClient.get<TournamentLeaderboardEntry[]>(
      `/tournaments/${tournamentId}/leaderboard`,
      { limit }
    );
  }

  // Get user's rank in tournament
  async getMyRankInTournament(tournamentId: string) {
    return apiClient.get<UserRankInTournament>(`/tournaments/${tournamentId}/my-rank`);
  }

  // Get user's tournaments
  async getMyTournaments() {
    return apiClient.get<UserTournament[]>('/tournaments/my-tournaments');
  }

  // Get live/upcoming tournaments (for Play & Earn hub)
  async getLiveTournaments(limit: number = 5) {
    try {
      const response = await apiClient.get<any>('/tournaments/live', { limit });

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            tournaments: (data.tournaments || []).map((t: any) => ({
              id: t.id || t._id,
              title: t.title || t.name,
              description: t.description,
              type: t.type,
              gameType: t.gameType,
              status: t.status,
              icon: t.icon || '🏆',
              prize: t.prize || '0 coins',
              prizePool: t.prizePool || [],
              participants: t.participants || 0,
              maxParticipants: t.maxParticipants || 100,
              endsIn: t.endsIn,
              startsIn: t.startsIn,
              startDate: t.startDate,
              endDate: t.endDate,
              featured: t.featured ?? false,
              path: `/playandearn/TournamentDetail?id=${t.id || t._id}`,
              isParticipant: t.isParticipant ?? false,
              userRank: t.userRank,
              userScore: t.userScore,
            })) as LiveTournament[],
            total: data.total || data.tournaments?.length || 0,
          },
        };
      }

      // Return empty array if API fails (graceful degradation)
      return {
        success: true,
        data: {
          tournaments: [] as LiveTournament[],
          total: 0,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export default new TournamentApi();
