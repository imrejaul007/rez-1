export interface EarningCard {
  id: string;
  title: string;
  description: string;
  earning: number; // in rupees
  theme: 'purple' | 'teal' | 'pink';
  iconType: 'review' | 'social' | 'ugc';
  onGetStarted: () => void;
}

export interface EarningCardTheme {
  gradientColors: [string, string];
  iconColor: string;
  textColor: string;
  buttonColor: string;
}

export interface CoinIconProps {
  size?: number;
  color?: string;
  animated?: boolean;
}

export interface FloatingCoinsProps {
  count?: number;
  duration?: number;
  opacity?: number;
}

export type EarningType = 'review' | 'social' | 'ugc';

export interface EarningProgress {
  userId: string;
  earningType: EarningType;
  completed: boolean;
  earnedAmount: number;
  completedAt?: Date;
}