// @ts-nocheck
import { useEffect, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuthUser } from '@/stores/selectors';

interface EarningsUpdate {
  earnings: {
    totalEarned: number;
    breakdown: {
      projects: number;
      referrals: number;
      shareAndEarn: number;
      spin: number;
    };
  };
  timestamp: string;
}

interface ProjectStatusUpdate {
  status: {
    completeNow: number;
    inReview: number;
    completed: number;
  };
  timestamp: string;
}

interface BalanceUpdate {
  balance: number;
  pendingBalance: number;
  timestamp: string;
}

interface NewTransaction {
  transaction: any;
  timestamp: string;
}

interface CoinsEarnedUpdate {
  amount: number;
  source: string;
  description: string;
  timestamp: string;
}

interface ChallengeCompletedUpdate {
  challengeTitle: string;
  coinsReward: number;
  timestamp: string;
}

interface AchievementUnlockedUpdate {
  title: string;
  icon: string;
  coinReward: number;
  timestamp: string;
}

interface LeaderboardUpdateData {
  rank: number;
  previousRank: number;
  timestamp: string;
}

export function useEarningsSocket() {
  const { socket, state } = useSocket();
  const user = useAuthUser();

  // Join earnings room when socket is connected and user is authenticated
  useEffect(() => {
    if (socket && state.connected && user) {
      const userId = user._id || user.id;
      if (userId) {
        socket.emit('join-earnings-room', userId.toString());
      }

      return () => {
        if (socket && userId) {
          socket.emit('leave-earnings-room', userId.toString());
        }
      };
    }
  }, [socket, state.connected, user]);

  // Subscribe to earnings updates
  const onEarningsUpdate = useCallback((callback: (data: EarningsUpdate) => void) => {
    if (!socket) return () => {};

    socket.on('earnings-update', callback);

    return () => {
      socket.off('earnings-update', callback);
    };
  }, [socket]);

  // Subscribe to project status updates
  const onProjectStatusUpdate = useCallback((callback: (data: ProjectStatusUpdate) => void) => {
    if (!socket) return () => {};

    socket.on('project-status-update', callback);

    return () => {
      socket.off('project-status-update', callback);
    };
  }, [socket]);

  // Subscribe to balance updates
  const onBalanceUpdate = useCallback((callback: (data: BalanceUpdate) => void) => {
    if (!socket) return () => {};

    socket.on('balance-update', callback);

    return () => {
      socket.off('balance-update', callback);
    };
  }, [socket]);

  // Subscribe to new transactions
  const onNewTransaction = useCallback((callback: (data: NewTransaction) => void) => {
    if (!socket) return () => {};

    socket.on('new-transaction', callback);

    return () => {
      socket.off('new-transaction', callback);
    };
  }, [socket]);

  // Subscribe to earnings notifications
  const onEarningsNotification = useCallback((callback: (data: { notification: any; timestamp: string }) => void) => {
    if (!socket) return () => {};

    socket.on('earnings-notification', callback);

    return () => {
      socket.off('earnings-notification', callback);
    };
  }, [socket]);

  // Subscribe to coins earned events (gamification actions)
  const onCoinsEarned = useCallback((callback: (data: CoinsEarnedUpdate) => void) => {
    if (!socket) return () => {};

    socket.on('coins-earned', callback);

    return () => {
      socket.off('coins-earned', callback);
    };
  }, [socket]);

  // Subscribe to challenge completed events
  const onChallengeCompleted = useCallback((callback: (data: ChallengeCompletedUpdate) => void) => {
    if (!socket) return () => {};

    socket.on('challenge-completed', callback);

    return () => {
      socket.off('challenge-completed', callback);
    };
  }, [socket]);

  // Subscribe to achievement unlocked events
  const onAchievementUnlocked = useCallback((callback: (data: AchievementUnlockedUpdate) => void) => {
    if (!socket) return () => {};

    socket.on('achievement-unlocked', callback);

    return () => {
      socket.off('achievement-unlocked', callback);
    };
  }, [socket]);

  // Subscribe to leaderboard rank updates
  const onLeaderboardUpdate = useCallback((callback: (data: LeaderboardUpdateData) => void) => {
    if (!socket) return () => {};

    socket.on('leaderboard-update', callback);

    return () => {
      socket.off('leaderboard-update', callback);
    };
  }, [socket]);

  return {
    connected: state.connected,
    onEarningsUpdate,
    onProjectStatusUpdate,
    onBalanceUpdate,
    onNewTransaction,
    onEarningsNotification,
    onCoinsEarned,
    onChallengeCompleted,
    onAchievementUnlocked,
    onLeaderboardUpdate,
  };
}

