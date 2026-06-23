// Mock Data for Gamification Tests
// Centralized mock data for all gamification test suites

import {
  SpinWheelSegment,
  SpinWheelResult,
  ScratchCardPrize,
  ScratchCardData,
  QuizQuestion,
  QuizGame,
  Challenge,
  Achievement,
  LeaderboardEntry,
  LeaderboardData,
  GamificationStats,
  CoinTransaction,
} from '@/types/gamification.types';

// ==================== SPIN WHEEL ====================

export const mockSpinWheelSegments: SpinWheelSegment[] = [
  { id: '1', label: '10 Coins', value: 10, color: '#FFD700', type: 'coins', icon: 'diamond' },
  { id: '2', label: '50 Coins', value: 50, color: '#FF6347', type: 'coins', icon: 'diamond' },
  { id: '3', label: '5% Discount', value: 5, color: '#4169E1', type: 'discount', icon: 'pricetag' },
  { id: '4', label: '100 Coins', value: 100, color: '#32CD32', type: 'coins', icon: 'diamond' },
  { id: '5', label: 'Nothing', value: 0, color: '#808080', type: 'nothing', icon: 'close' },
  { id: '6', label: '₹20 Cashback', value: 20, color: '#FF1493', type: 'cashback', icon: 'cash' },
  { id: '7', label: 'Voucher', value: 100, color: '#9370DB', type: 'voucher', icon: 'gift' },
  { id: '8', label: '25 Coins', value: 25, color: '#FFB6C1', type: 'coins', icon: 'diamond' },
];

export const mockSpinWheelResult: SpinWheelResult = {
  segment: mockSpinWheelSegments[1],
  prize: {
    type: 'coins',
    value: 50,
    description: 'You won 50 coins!',
  },
  rotation: 765, // 2 full rotations + 45 degrees
};

// ==================== SCRATCH CARD ====================

export const mockScratchCardPrizes: ScratchCardPrize[] = [
  {
    id: 'prize-1',
    type: 'coin',
    value: 50,
    title: '50 REZ Coins',
    description: 'You won 50 coins!',
    icon: 'diamond',
    color: '#8B5CF6',
  },
  {
    id: 'prize-2',
    type: 'discount',
    value: 10,
    title: '10% Discount',
    description: 'Get 10% off your next purchase',
    icon: 'pricetag',
    color: '#10B981',
  },
  {
    id: 'prize-3',
    type: 'cashback',
    value: 100,
    title: '₹100 Cashback',
    description: 'Earn ₹100 cashback on your next order',
    icon: 'cash',
    color: '#F59E0B',
  },
  {
    id: 'prize-4',
    type: 'voucher',
    value: 200,
    title: '₹200 Voucher',
    description: 'Free ₹200 voucher for your next purchase',
    icon: 'gift',
    color: '#EF4444',
  },
];

export const mockScratchCard: ScratchCardData = {
  id: 'card-1',
  userId: 'user-1',
  prize: mockScratchCardPrizes[0],
  isScratched: false,
  isRedeemed: false,
  expiresAt: new Date(Date.now() + 7 * 86400000),
  createdAt: new Date(),
};

// ==================== QUIZ ====================

export const mockQuizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctAnswer: 2,
    difficulty: 'easy',
    category: 'geography',
    timeLimit: 30,
  },
  {
    id: 'q2',
    question: 'Which planet is closest to the sun?',
    options: ['Venus', 'Mercury', 'Mars', 'Earth'],
    correctAnswer: 1,
    difficulty: 'medium',
    category: 'science',
    timeLimit: 30,
  },
  {
    id: 'q3',
    question: 'Who wrote Romeo and Juliet?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correctAnswer: 1,
    difficulty: 'easy',
    category: 'literature',
    timeLimit: 30,
  },
  {
    id: 'q4',
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctAnswer: 1,
    difficulty: 'easy',
    category: 'math',
    timeLimit: 15,
  },
  {
    id: 'q5',
    question: 'Which programming language is this app built with?',
    options: ['Java', 'Python', 'TypeScript', 'Ruby'],
    correctAnswer: 2,
    difficulty: 'medium',
    category: 'technology',
    timeLimit: 20,
  },
];

export const mockQuizGame: QuizGame = {
  id: 'game-1',
  userId: 'user-1',
  questions: mockQuizQuestions,
  currentQuestionIndex: 0,
  score: 0,
  coinsEarned: 0,
  startedAt: new Date(),
  isCompleted: false,
};

// ==================== CHALLENGES ====================

export const mockChallenges: Challenge[] = [
  {
    id: 'daily-1',
    title: 'Daily Shopper',
    description: 'Make 3 purchases today',
    type: 'daily',
    difficulty: 'easy',
    progress: { current: 1, target: 3, percentage: 33 },
    rewards: { coins: 50, badges: [], vouchers: [] },
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    icon: 'cart',
    color: '#10B981',
  },
  {
    id: 'weekly-1',
    title: 'Social Butterfly',
    description: 'Share 10 products this week',
    type: 'weekly',
    difficulty: 'medium',
    progress: { current: 7, target: 10, percentage: 70 },
    rewards: { coins: 200, badges: ['social-master'], vouchers: [] },
    status: 'active',
    startDate: new Date(Date.now() - 3 * 86400000),
    endDate: new Date(Date.now() + 4 * 86400000),
    icon: 'share',
    color: '#3B82F6',
  },
  {
    id: 'daily-2',
    title: 'Review Master',
    description: 'Write 5 reviews',
    type: 'daily',
    difficulty: 'hard',
    progress: { current: 5, target: 5, percentage: 100 },
    rewards: { coins: 100, badges: ['reviewer'], vouchers: [] },
    status: 'completed',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    icon: 'star',
    color: '#F59E0B',
  },
  {
    id: 'special-1',
    title: 'Holiday Spender',
    description: 'Spend ₹5000 during holiday sale',
    type: 'special',
    difficulty: 'hard',
    progress: { current: 3500, target: 5000, percentage: 70 },
    rewards: {
      coins: 500,
      badges: ['big-spender'],
      vouchers: [{ type: 'discount', value: 10 }],
    },
    status: 'active',
    startDate: new Date(Date.now() - 7 * 86400000),
    endDate: new Date(Date.now() + 7 * 86400000),
    icon: 'gift',
    color: '#EF4444',
  },
];

// ==================== ACHIEVEMENTS ====================

export const mockAchievements: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Purchase',
    description: 'Make your first purchase',
    icon: 'cart',
    badge: 'first-buyer',
    tier: 'bronze',
    coinReward: 50,
    isUnlocked: true,
    unlockedAt: new Date('2024-01-01'),
    progress: { current: 1, target: 1 },
    category: 'shopping',
  },
  {
    id: 'ach-2',
    title: 'Social Butterfly',
    description: 'Share 10 products',
    icon: 'share',
    badge: 'sharer',
    tier: 'silver',
    coinReward: 100,
    isUnlocked: false,
    progress: { current: 5, target: 10 },
    category: 'social',
  },
  {
    id: 'ach-3',
    title: 'Review Expert',
    description: 'Write 50 reviews',
    icon: 'star',
    badge: 'reviewer',
    tier: 'gold',
    coinReward: 200,
    isUnlocked: false,
    progress: { current: 20, target: 50 },
    category: 'engagement',
  },
  {
    id: 'ach-4',
    title: 'Referral King',
    description: 'Refer 20 friends',
    icon: 'people',
    badge: 'referrer',
    tier: 'platinum',
    coinReward: 500,
    isUnlocked: false,
    progress: { current: 5, target: 20 },
    category: 'referral',
  },
  {
    id: 'ach-5',
    title: 'Ultimate Shopper',
    description: 'Spend ₹100,000 total',
    icon: 'trophy',
    badge: 'ultimate',
    tier: 'diamond',
    coinReward: 1000,
    isUnlocked: false,
    progress: { current: 25000, target: 100000 },
    category: 'shopping',
  },
];

// ==================== LEADERBOARD ====================

export const mockLeaderboardEntries: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: 'user-1',
    username: 'champion123',
    fullName: 'John Champion',
    avatar: 'https://example.com/avatar1.jpg',
    coins: 5000,
    level: 25,
    tier: 'vip',
    achievements: 45,
  },
  {
    rank: 2,
    userId: 'user-2',
    username: 'pro_gamer',
    fullName: 'Jane Pro',
    avatar: 'https://example.com/avatar2.jpg',
    coins: 4500,
    level: 23,
    tier: 'premium',
    achievements: 40,
  },
  {
    rank: 3,
    userId: 'user-3',
    username: 'speedster',
    fullName: 'Bob Speed',
    coins: 4000,
    level: 22,
    tier: 'premium',
    achievements: 38,
  },
  {
    rank: 4,
    userId: 'user-4',
    username: 'master_buyer',
    fullName: 'Alice Master',
    coins: 3500,
    level: 20,
    tier: 'free',
    achievements: 35,
  },
  {
    rank: 5,
    userId: 'user-5',
    username: 'smart_shopper',
    fullName: 'Charlie Smart',
    coins: 3000,
    level: 18,
    tier: 'free',
    achievements: 30,
  },
];

export const mockLeaderboardData: LeaderboardData = {
  period: 'monthly',
  entries: mockLeaderboardEntries,
  userRank: {
    rank: 42,
    userId: 'current-user',
    username: 'me',
    fullName: 'Current User',
    coins: 500,
    level: 5,
    tier: 'free',
    achievements: 5,
    isCurrentUser: true,
  },
  totalUsers: 10000,
  updatedAt: new Date(),
};

// ==================== STATS ====================

export const mockGamificationStats: GamificationStats = {
  totalCoins: 1000,
  coinsEarnedToday: 50,
  coinsEarnedThisWeek: 200,
  coinsEarnedThisMonth: 500,
  level: 10,
  experiencePoints: 2500,
  nextLevelXP: 3000,
  achievementsUnlocked: 5,
  totalAchievements: 50,
  challengesCompleted: 15,
  activeChallenges: 3,
  currentStreak: 7,
  longestStreak: 15,
  rank: 42,
  totalUsers: 10000,
};

// ==================== TRANSACTIONS ====================

export const mockCoinTransactions: CoinTransaction[] = [
  {
    id: 'txn-1',
    type: 'earned',
    amount: 50,
    source: 'spin-wheel',
    description: 'Spin wheel reward',
    metadata: { gameId: 'spin-1' },
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'txn-2',
    type: 'earned',
    amount: 100,
    source: 'quiz',
    description: 'Quiz completion bonus',
    metadata: { score: 90, gameId: 'quiz-1' },
    createdAt: new Date('2024-01-14'),
  },
  {
    id: 'txn-3',
    type: 'spent',
    amount: 200,
    source: 'purchase',
    description: 'Redeemed for 10% discount',
    metadata: { orderId: 'order-1', discountPercentage: 10 },
    createdAt: new Date('2024-01-13'),
  },
  {
    id: 'txn-4',
    type: 'earned',
    amount: 200,
    source: 'achievement',
    description: 'Achievement unlocked: Social Butterfly',
    metadata: { achievementId: 'ach-2' },
    createdAt: new Date('2024-01-12'),
  },
  {
    id: 'txn-5',
    type: 'earned',
    amount: 500,
    source: 'referral',
    description: 'Referral bonus',
    metadata: { referredUserId: 'user-ref-1' },
    createdAt: new Date('2024-01-11'),
  },
];

// ==================== HELPER FUNCTIONS ====================

export const createMockSpinResult = (
  segmentIndex: number = 1
): SpinWheelResult => ({
  segment: mockSpinWheelSegments[segmentIndex],
  prize: {
    type: mockSpinWheelSegments[segmentIndex].type,
    value: mockSpinWheelSegments[segmentIndex].value,
    description: `You won ${mockSpinWheelSegments[segmentIndex].label}!`,
  },
  rotation: 720 + segmentIndex * 45,
});

export const createMockChallenge = (
  overrides: Partial<Challenge> = {}
): Challenge => ({
  ...mockChallenges[0],
  ...overrides,
});

export const createMockAchievement = (
  overrides: Partial<Achievement> = {}
): Achievement => ({
  ...mockAchievements[0],
  ...overrides,
});

export const createMockTransaction = (
  overrides: Partial<CoinTransaction> = {}
): CoinTransaction => ({
  ...mockCoinTransactions[0],
  ...overrides,
});
