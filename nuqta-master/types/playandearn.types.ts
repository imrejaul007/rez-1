// Play & Earn Types
// Centralized type definitions for all Play & Earn features

// Re-export types from API services for convenience
export type { Creator, CreatorProfile, CreatorPick, CreatorStats } from '@/services/creatorsApi';
export type { AvailableGame, DailyLimits, GameStats, GameSession } from '@/services/gameApi';
export type { LiveTournament, Tournament, TournamentPrize, UserTournament } from '@/services/tournamentApi';
export type {
  BonusOpportunity,
  StreakData,
  CheckInResult,
  SpinEligibility,
  GamificationStats,
  AffiliateStats,
  PromotionalPoster,
  ShareSubmission,
  StreakBonus,
  ReviewableItem
} from '@/services/gamificationApi';

// ============================================
// PLAY & EARN PAGE SPECIFIC TYPES
// ============================================

export interface PlayAndEarnTab {
  id: string;
  label: string;
  icon: string;
}

export interface MiniGameCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  reward: string;
  playsRemaining?: number;
  maxDaily?: number;
  isAvailable: boolean;
  backgroundColor?: string;
  gradient?: [string, string];
}

export interface DailyGameCard {
  id: string;
  title: string;
  icon: string;
  plays: string;
  earnings: string;
  path: string;
  isAvailable: boolean;
  backgroundColor?: string;
}

export interface TournamentCard {
  id: string;
  title: string;
  icon: string;
  prize: string;
  participants: number;
  endsIn?: string;
  startsIn?: string;
  status: 'upcoming' | 'active' | 'completed';
  rank?: number | null;
  path: string;
  isParticipant: boolean;
}

export interface BonusCard {
  id: string;
  title: string;
  description: string;
  reward: string;
  timeLeft: string;
  icon: string;
  type: 'challenge' | 'coin_drop' | 'campaign' | 'event';
  path?: string;
  urgent?: boolean;
}

export interface CreatorCard {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  rating: number;
  totalPicks: number;
  followers: number;
}

export interface TrendingPickCard {
  id: string;
  title: string;
  productImage: string;
  productPrice: number;
  productBrand: string;
  tag: string;
  views: number;
  purchases: number;
  creator?: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
  };
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PlayAndEarnPageData {
  // User's current status
  coinBalance: number;
  currentStreak: number;
  hasCheckedInToday: boolean;
  todaysEarnings: number;

  // Sections data
  featuredCreators: CreatorCard[];
  trendingPicks: TrendingPickCard[];
  bonusOpportunities: BonusCard[];
  dailyGames: DailyGameCard[];
  tournaments: TournamentCard[];
  miniGames: MiniGameCard[];

  // Spin wheel status
  spinEligibility: {
    canSpin: boolean;
    spinsRemaining: number;
    nextSpinAt?: string;
  };
}

// ============================================
// HOMEPAGE SECTION TYPES
// ============================================

export interface PlayAndEarnSectionData {
  games: MiniGameCard[];
  todaysEarnings: number;
  totalPlaysRemaining: number;
}

// ============================================
// NAVIGATION TYPES
// ============================================

export type PlayAndEarnScreen =
  | 'spin'
  | 'daily-checkin'
  | 'quiz'
  | 'memory-match'
  | 'coin-hunt'
  | 'guess-price'
  | 'scratch-card'
  | 'tournaments'
  | 'share-and-earn'
  | 'review-and-earn'
  | 'challenges';

// ============================================
// UTILITY TYPES
// ============================================

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  formatted: string;
}

export function formatTimeLeft(endDate: Date | string): TimeLeft {
  const now = new Date();
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, formatted: 'Ended' };
  }

  const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
  const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else {
    formatted = `${minutes}m`;
  }

  return { days, hours, minutes, formatted };
}

export function formatCoins(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}
