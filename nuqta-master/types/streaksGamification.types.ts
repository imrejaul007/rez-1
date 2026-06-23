// Streaks Gamification Type Definitions
// Types for the homepage StreaksGamification component

import { Ionicons } from '@expo/vector-icons';

export interface StreakData {
  current: number;
  target: number;
  nextReward: number;
  type: 'order' | 'login' | 'review' | 'app_open';
  longestStreak: number;
  todayCheckedIn: boolean;
}

export interface Mission {
  id: string;
  title: string;
  progress: number;
  target: number;
  reward: number;
  icon: keyof typeof Ionicons.glyphMap;
  completed: boolean;
  expiresAt?: string;
  type?: 'daily' | 'weekly' | 'monthly' | 'special';
}

export interface StreaksGamificationState {
  streak: StreakData;
  missions: Mission[];
  loading: boolean;
  error: string | null;
  coinBalance: number;
}

export interface StreaksGamificationActions {
  refresh: () => Promise<void>;
  claimReward: (missionId: string) => Promise<boolean>;
  checkin: () => Promise<void>;
}

export interface UseStreaksGamificationResult {
  streak: StreakData;
  missions: Mission[];
  loading: boolean;
  error: string | null;
  coinBalance: number;
  actions: StreaksGamificationActions;
}

// Backend response types (from gamificationAPI.getPlayAndEarnData)
export interface PlayAndEarnResponse {
  dailySpin: {
    spinsRemaining: number;
    maxSpins: number;
    lastSpinAt: string | null;
    canSpin: boolean;
    nextSpinAt: string | null;
  };
  challenges: {
    active: Array<{
      id: string;
      title: string;
      progress: {
        current: number;
        target: number;
        percentage: number;
      };
      reward: number;
      expiresAt: string;
      requirements?: {
        action?: string;
      };
    }>;
    totalActive: number;
    completedToday: number;
  };
  streak: {
    type: string;
    currentStreak: number;
    longestStreak: number;
    nextMilestone: { day: number; coins: number };
    todayCheckedIn: boolean;
  };
  surpriseDrop: {
    id?: string;
    available: boolean;
    coins: number;
    message: string | null;
    expiresAt: string | null;
    reason?: string;
  };
  coinBalance: number;
}
