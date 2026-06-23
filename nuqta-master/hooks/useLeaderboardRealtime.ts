// @ts-nocheck
/**
 * useLeaderboardRealtime Hook
 * Manages real-time leaderboard updates via WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import {
  SocketEvents,
  LeaderboardUpdatePayload,
  LeaderboardUserScoredPayload,
  LeaderboardRankChangePayload,
} from '@/types/socket.types';
import type { LeaderboardEntry } from '@/types/gamification.types';

interface UseLeaderboardRealtimeOptions {
  onRankUp?: (userId: string, newRank: number, oldRank: number) => void;
  onPointsEarned?: (userId: string, points: number, source: string) => void;
  onLeaderboardUpdate?: () => void;
  autoScrollToUser?: boolean;
}

interface LeaderboardRealtimeState {
  entries: LeaderboardEntry[];
  isConnected: boolean;
  isUpdating: boolean;
  lastUpdate: Date | null;
  userRank: LeaderboardEntry | null;
  recentChanges: {
    userId: string;
    type: 'rank_up' | 'rank_down' | 'points_earned';
    timestamp: Date;
  }[];
}

export function useLeaderboardRealtime(
  initialEntries: LeaderboardEntry[],
  currentUserId?: string,
  options: UseLeaderboardRealtimeOptions = {}
) {
  const { socket, state: socketState, onConnect, onDisconnect } = useSocket();
  const [leaderboardState, setLeaderboardState] = useState<LeaderboardRealtimeState>({
    entries: initialEntries,
    isConnected: socketState.connected,
    isUpdating: false,
    lastUpdate: null,
    userRank: initialEntries.find(e => e.userId === currentUserId) || null,
    recentChanges: [],
  });

  const updateTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Update entries when initial data changes
  useEffect(() => {
    setLeaderboardState(prev => ({
      ...prev,
      entries: initialEntries,
      userRank: initialEntries.find(e => e.userId === currentUserId) || null,
    }));
  }, [initialEntries, currentUserId]);

  // Update connection state
  useEffect(() => {
    const unsubscribeConnect = onConnect(() => {
      setLeaderboardState(prev => ({ ...prev, isConnected: true }));

    });

    const unsubscribeDisconnect = onDisconnect(() => {
      setLeaderboardState(prev => ({ ...prev, isConnected: false }));

    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, [onConnect, onDisconnect]);

  // Handle leaderboard position update
  const handleLeaderboardUpdate = useCallback((payload: LeaderboardUpdatePayload) => {

    setLeaderboardState(prev => {
      const updatedEntries = [...prev.entries];
      const existingIndex = updatedEntries.findIndex(e => e.userId === payload.userId);

      const updatedEntry: LeaderboardEntry = {
        rank: payload.rank,
        userId: payload.userId,
        username: payload.username,
        fullName: payload.fullName,
        coins: payload.coins,
        level: 1,
        tier: 'free',
        achievements: 0,
        isCurrentUser: payload.userId === currentUserId,
      };

      if (existingIndex >= 0) {
        // Update existing entry
        const oldEntry = updatedEntries[existingIndex];
        updatedEntries[existingIndex] = { ...oldEntry, ...updatedEntry };
      } else {
        // Add new entry
        updatedEntries.push(updatedEntry);
      }

      // Sort by rank
      updatedEntries.sort((a, b) => a.rank - b.rank);

      // Update user rank if this is the current user
      const newUserRank = payload.userId === currentUserId ? updatedEntry : prev.userRank;

      return {
        ...prev,
        entries: updatedEntries,
        userRank: newUserRank,
        isUpdating: true,
        lastUpdate: new Date(),
      };
    });

    // Clear updating flag after animation
    const timeout = setTimeout(() => {
      setLeaderboardState(prev => ({ ...prev, isUpdating: false }));
      updateTimeoutsRef.current.delete(timeout);
    }, 1000);
    updateTimeoutsRef.current.add(timeout);

    // Trigger callback
    if (options.onLeaderboardUpdate) {
      options.onLeaderboardUpdate();
    }
  }, [currentUserId, options]);

  // Handle user scoring points
  const handleUserScored = useCallback((payload: LeaderboardUserScoredPayload) => {

    setLeaderboardState(prev => {
      const updatedEntries = prev.entries.map(entry => {
        if (entry.userId === payload.userId) {
          return {
            ...entry,
            coins: payload.newTotal,
          };
        }
        return entry;
      });

      // Add to recent changes
      const newChange = {
        userId: payload.userId,
        type: 'points_earned' as const,
        timestamp: new Date(),
      };

      return {
        ...prev,
        entries: updatedEntries,
        recentChanges: [...prev.recentChanges.slice(-9), newChange],
        isUpdating: true,
        lastUpdate: new Date(),
      };
    });

    // Clear updating flag
    const timeout = setTimeout(() => {
      setLeaderboardState(prev => ({ ...prev, isUpdating: false }));
      updateTimeoutsRef.current.delete(timeout);
    }, 1000);
    updateTimeoutsRef.current.add(timeout);

    // Trigger callback
    if (options.onPointsEarned) {
      options.onPointsEarned(payload.userId, payload.coinsEarned, payload.source);
    }
  }, [options]);

  // Handle rank change
  const handleRankChange = useCallback((payload: LeaderboardRankChangePayload) => {

    setLeaderboardState(prev => {
      const updatedEntries = prev.entries.map(entry => {
        if (entry.userId === payload.userId) {
          return {
            ...entry,
            rank: payload.newRank,
            coins: payload.coins,
          };
        }
        return entry;
      });

      // Sort by rank
      updatedEntries.sort((a, b) => a.rank - b.rank);

      // Add to recent changes
      const changeType = payload.direction === 'up' ? 'rank_up' : 'rank_down';
      const newChange = {
        userId: payload.userId,
        type: changeType as const,
        timestamp: new Date(),
      };

      // Update user rank if this is the current user
      let newUserRank = prev.userRank;
      if (payload.userId === currentUserId) {
        newUserRank = updatedEntries.find(e => e.userId === currentUserId) || null;
      }

      return {
        ...prev,
        entries: updatedEntries,
        userRank: newUserRank,
        recentChanges: [...prev.recentChanges.slice(-9), newChange],
        isUpdating: true,
        lastUpdate: new Date(),
      };
    });

    // Clear updating flag
    const timeout = setTimeout(() => {
      setLeaderboardState(prev => ({ ...prev, isUpdating: false }));
      updateTimeoutsRef.current.delete(timeout);
    }, 1500);
    updateTimeoutsRef.current.add(timeout);

    // Trigger rank up callback for celebration
    if (payload.direction === 'up' && payload.userId === currentUserId && options.onRankUp) {
      options.onRankUp(payload.userId, payload.newRank, payload.oldRank);
    }
  }, [currentUserId, options]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!socket) return;

    // Subscribe to leaderboard events
    socket.on(SocketEvents.LEADERBOARD_UPDATE, handleLeaderboardUpdate);
    socket.on(SocketEvents.LEADERBOARD_USER_SCORED, handleUserScored);
    socket.on(SocketEvents.LEADERBOARD_RANK_CHANGE, handleRankChange);

    // Cleanup on unmount
    return () => {
      socket.off(SocketEvents.LEADERBOARD_UPDATE, handleLeaderboardUpdate);
      socket.off(SocketEvents.LEADERBOARD_USER_SCORED, handleUserScored);
      socket.off(SocketEvents.LEADERBOARD_RANK_CHANGE, handleRankChange);

      // Clear all tracked update timeouts
      updateTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      updateTimeoutsRef.current.clear();
    };
  }, [socket, handleLeaderboardUpdate, handleUserScored, handleRankChange]);

  // Optimistically update user's own score
  const updateUserScore = useCallback((coinsToAdd: number) => {
    if (!currentUserId) return;

    setLeaderboardState(prev => {
      const updatedEntries = prev.entries.map(entry => {
        if (entry.userId === currentUserId) {
          return {
            ...entry,
            coins: entry.coins + coinsToAdd,
          };
        }
        return entry;
      });

      const newUserRank = updatedEntries.find(e => e.userId === currentUserId) || prev.userRank;

      return {
        ...prev,
        entries: updatedEntries,
        userRank: newUserRank,
      };
    });
  }, [currentUserId]);

  // Get recent changes for a specific user
  const getRecentChangesForUser = useCallback((userId: string) => {
    return leaderboardState.recentChanges.filter(change => change.userId === userId);
  }, [leaderboardState.recentChanges]);

  // Check if user recently ranked up
  const hasRecentRankUp = useCallback((userId: string, withinSeconds: number = 10) => {
    const changes = getRecentChangesForUser(userId);
    const now = new Date();

    return changes.some(change => {
      if (change.type !== 'rank_up') return false;
      const diffSeconds = (now.getTime() - change.timestamp.getTime()) / 1000;
      return diffSeconds <= withinSeconds;
    });
  }, [getRecentChangesForUser]);

  return {
    entries: leaderboardState.entries,
    userRank: leaderboardState.userRank,
    isConnected: leaderboardState.isConnected,
    isUpdating: leaderboardState.isUpdating,
    lastUpdate: leaderboardState.lastUpdate,
    recentChanges: leaderboardState.recentChanges,
    updateUserScore,
    getRecentChangesForUser,
    hasRecentRankUp,
  };
}

export default useLeaderboardRealtime;
