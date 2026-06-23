import { create } from 'zustand';
import { Achievement, AchievementProgress } from '@/services/achievementApi';
import { PointsBalance } from '@/services/pointsApi';

// ---------------------------------------------------------------------------
// State types (mirrors GamificationContext)
// ---------------------------------------------------------------------------
type CoinBalance = PointsBalance;

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  progress: number;
  target: number;
  reward: number;
  expiresAt: string;
  completed: boolean;
}

interface AchievementUnlock {
  achievement: Achievement;
  timestamp: string;
  shown: boolean;
}

interface GamificationState {
  achievements: Achievement[];
  achievementProgress: AchievementProgress | null;
  coinBalance: CoinBalance;
  challenges: Challenge[];
  achievementQueue: AchievementUnlock[];
  dailyStreak: number;
  lastLoginDate: string | null;
  isLoading: boolean;
  error: string | null;
  featureFlags: {
    ENABLE_ACHIEVEMENTS: boolean;
    ENABLE_COINS: boolean;
    ENABLE_CHALLENGES: boolean;
    ENABLE_LEADERBOARD: boolean;
    ENABLE_NOTIFICATIONS: boolean;
  };
}

interface GamificationActions {
  loadGamificationData: (forceRefresh?: boolean) => Promise<void>;
  syncCoinsFromWallet: () => Promise<void>;
  triggerAchievementCheck: (eventType: string, data?: any) => Promise<Achievement[]>;
  awardCoins: (amount: number, reason: string) => Promise<void>;
  spendCoins: (amount: number, reason: string) => Promise<void>;
  updateDailyStreak: () => Promise<void>;
  markAchievementAsShown: (achievementId: string) => void;
  refreshAchievements: () => Promise<void>;
  clearError: () => void;
}

interface GamificationComputed {
  unlockedCount: number;
  completionPercentage: number;
  pendingAchievements: AchievementUnlock[];
  hasUnshownAchievements: boolean;
  canEarnCoins: boolean;
}

interface GamificationContextShape {
  state: GamificationState;
  actions: GamificationActions;
  computed: GamificationComputed;
}

interface GamificationStoreState extends GamificationContextShape {
  _setFromProvider: (data: GamificationContextShape) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const GAMIFICATION_FLAGS = {
  ENABLE_ACHIEVEMENTS: true,
  ENABLE_COINS: true,
  ENABLE_CHALLENGES: true,
  ENABLE_LEADERBOARD: true,
  ENABLE_NOTIFICATIONS: true,
};

const initialState: GamificationState = {
  achievements: [],
  achievementProgress: null,
  coinBalance: { total: 0, earned: 0, spent: 0, pending: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
  challenges: [],
  achievementQueue: [],
  dailyStreak: 0,
  lastLoginDate: null,
  isLoading: false,
  error: null,
  featureFlags: GAMIFICATION_FLAGS,
};

const noopAsync = async () => {};
const noop = () => {};

const defaultActions: GamificationActions = {
  loadGamificationData: noopAsync,
  syncCoinsFromWallet: noopAsync,
  triggerAchievementCheck: async () => [],
  awardCoins: noopAsync,
  spendCoins: noopAsync,
  updateDailyStreak: noopAsync,
  markAchievementAsShown: noop,
  refreshAchievements: noopAsync,
  clearError: noop,
};

const defaultComputed: GamificationComputed = {
  unlockedCount: 0,
  completionPercentage: 0,
  pendingAchievements: [],
  hasUnshownAchievements: false,
  canEarnCoins: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useGamificationStore = create<GamificationStoreState>((set) => ({
  state: initialState,
  actions: defaultActions,
  computed: defaultComputed,

  // Called by GamificationProvider on every render to keep store in sync
  _setFromProvider: (data: GamificationContextShape) => {
    set({ state: data.state, actions: data.actions, computed: data.computed });
  },
}));
