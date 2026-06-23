// Gamification Type Definitions
// Types for mini-games, challenges, achievements, and leaderboards

export interface SpinWheelSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  icon?: string;
  type: 'coins' | 'discount' | 'cashback' | 'voucher' | 'nothing';
}

export interface CouponDetails {
  storeName: string;
  storeId: string;
  productName?: string | null;
  productId?: string | null;
  productImage?: string | null;
  isProductSpecific: boolean;
  applicableOn: string;
}

export interface SpinWheelResult {
  segment: SpinWheelSegment;
  prize: {
    type: 'coins' | 'discount' | 'cashback' | 'voucher' | 'nothing';
    value: number;
    description: string;
    couponDetails?: CouponDetails | null;
  };
  rotation: number;
}

export interface ScratchCardPrize {
  id: string;
  type: 'discount' | 'cashback' | 'coin' | 'voucher' | 'nothing';
  value: number;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface ScratchCardData {
  id: string;
  userId: string;
  prize: ScratchCardPrize;
  isScratched: boolean;
  isRedeemed: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  timeLimit: number; // in seconds
}

export interface QuizGame {
  id: string;
  userId: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  coinsEarned: number;
  startedAt: Date;
  completedAt?: Date;
  isCompleted: boolean;
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number;
  coinsEarned: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  difficulty: 'easy' | 'medium' | 'hard';
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
  rewards: {
    coins: number;
    badges?: string[];
    vouchers?: {
      type: string;
      value: number;
    }[];
  };
  status: 'active' | 'completed' | 'claimed' | 'expired';
  startDate: Date;
  endDate: Date;
  icon: string;
  color: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  coinReward: number;
  unlockedAt?: Date;
  isUnlocked: boolean;
  progress?: {
    current: number;
    target: number;
  };
  category: 'shopping' | 'social' | 'referral' | 'engagement' | 'special';
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatar?: string;
  coins: number;
  level: number;
  tier: 'free' | 'premium' | 'vip';
  achievements: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardData {
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  entries: LeaderboardEntry[];
  userRank?: LeaderboardEntry;
  totalUsers: number;
  updatedAt: Date;
}

export interface GamificationStats {
  totalCoins: number;
  coinsEarnedToday: number;
  coinsEarnedThisWeek: number;
  coinsEarnedThisMonth: number;
  level: number;
  experiencePoints: number;
  nextLevelXP: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  challengesCompleted: number;
  activeChallenges: number;
  currentStreak: number;
  longestStreak: number;
  rank: number;
  totalUsers: number;
}

export interface CoinTransaction {
  id: string;
  type: 'earned' | 'spent' | 'expired' | 'refunded';
  amount: number;
  source: 'spin-wheel' | 'scratch-card' | 'quiz' | 'challenge' | 'achievement' | 'referral' | 'purchase' | 'bonus';
  description: string;
  metadata?: any;
  createdAt: Date;
}

// API Request/Response interfaces
export interface SpinWheelRequest {
  userId?: string;
}

export interface SpinWheelResponse {
  success: boolean;
  data: {
    result: SpinWheelResult;
    coinsAdded: number;
    newBalance: number;
  };
}

export interface ScratchCardRequest {
  userId?: string;
}

export interface ScratchCardResponse {
  success: boolean;
  data: ScratchCardData;
}

export interface QuizStartRequest {
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
}

export interface QuizStartResponse {
  success: boolean;
  data: QuizGame;
}

export interface QuizAnswerRequest {
  gameId: string;
  questionId: string;
  answer: number;
}

export interface QuizAnswerResponse {
  success: boolean;
  data: {
    isCorrect: boolean;
    coinsEarned: number;
    currentScore: number;
    nextQuestion?: QuizQuestion;
    gameCompleted: boolean;
  };
}

export interface ClaimRewardRequest {
  challengeId: string;
}

export interface ClaimRewardResponse {
  success: boolean;
  data: {
    challenge: Challenge;
    rewards: {
      coins: number;
      badges: string[];
      vouchers: any[];
    };
    newBalance: number;
  };
}
