import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

interface LeaderboardUpdateData {
  tournamentId: string;
  leaderboard: LeaderboardEntry[];
  timestamp: string;
}

interface ScoreUpdateData {
  tournamentId: string;
  userId: string;
  newScore: number;
  newRank: number;
  timestamp: string;
}

export function useTournamentSocket(tournamentId: string | null) {
  const { socket, state } = useSocket();
  const joinedRef = useRef<string | null>(null);

  // Join/leave tournament room
  useEffect(() => {
    if (!socket || !state.connected || !tournamentId) return;

    // Already joined this tournament
    if (joinedRef.current === tournamentId) return;

    // Leave previous room if any
    if (joinedRef.current) {
      socket.emit('leave-tournament', joinedRef.current);
    }

    socket.emit('join-tournament', tournamentId);
    joinedRef.current = tournamentId;

    return () => {
      if (socket && joinedRef.current) {
        socket.emit('leave-tournament', joinedRef.current);
        joinedRef.current = null;
      }
    };
  }, [socket, state.connected, tournamentId]);

  const onLeaderboardUpdate = useCallback(
    (callback: (data: LeaderboardUpdateData) => void) => {
      if (!socket) return () => {};

      socket.on('leaderboard-update', callback);
      return () => {
        socket.off('leaderboard-update', callback);
      };
    },
    [socket]
  );

  const onScoreUpdate = useCallback(
    (callback: (data: ScoreUpdateData) => void) => {
      if (!socket) return () => {};

      socket.on('score-update', callback);
      return () => {
        socket.off('score-update', callback);
      };
    },
    [socket]
  );

  return {
    onLeaderboardUpdate,
    onScoreUpdate,
    isConnected: state.connected,
  };
}
