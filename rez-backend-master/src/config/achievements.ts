export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  category: 'shopping' | 'social' | 'engagement' | 'special';
  target: number;
  rewards: {
    coins: number;
    badge?: string;
    title?: string;
    multiplier?: number;
  };
  hidden?: boolean; // Secret achievements
}

export const ACHIEVEMENTS: { [key: string]: AchievementDefinition } = {
  // SHOPPING ACHIEVEMENTS
  FIRST_ORDER: {
    id: 'first_order',
    title: 'First Steps',
    description: 'Complete your first order',
    icon: '🎯',
    tier: 'bronze',
    category: 'shopping',
    target: 1,
    rewards: { coins: 100 }
  },

  SHOPPING_SPREE: {
    id: 'shopping_spree',
    title: 'Shopping Spree',
    description: 'Place 10 orders',
    icon: '🛍️',
    tier: 'silver',
    category: 'shopping',
    target: 10,
    rewards: { coins: 500, badge: 'Shopping Enthusiast' }
  },

  SHOPAHOLIC: {
    id: 'shopaholic',
    title: 'Shopaholic',
    description: 'Place 50 orders',
    icon: '🛒',
    tier: 'gold',
    category: 'shopping',
    target: 50,
    rewards: { coins: 2000, badge: 'Shopaholic', multiplier: 1.1 }
  },

  SHOPPING_LEGEND: {
    id: 'shopping_legend',
    title: 'Shopping Legend',
    description: 'Place 100 orders',
    icon: '👑',
    tier: 'platinum',
    category: 'shopping',
    target: 100,
    rewards: { coins: 5000, badge: 'Shopping Legend', multiplier: 1.2 }
  },

  BIG_SPENDER: {
    id: 'big_spender',
    title: 'Big Spender',
    description: 'Spend ₹10,000 in total',
    icon: '💰',
    tier: 'silver',
    category: 'shopping',
    target: 10000,
    rewards: { coins: 1000, badge: 'Big Spender' }
  },

  VIP_SHOPPER: {
    id: 'vip_shopper',
    title: 'VIP Shopper',
    description: 'Spend ₹50,000 in total',
    icon: '💎',
    tier: 'gold',
    category: 'shopping',
    target: 50000,
    rewards: { coins: 5000, badge: 'VIP Shopper', multiplier: 1.15 }
  },

  EXPLORER: {
    id: 'explorer',
    title: 'Explorer',
    description: 'Order from 10 different stores',
    icon: '🗺️',
    tier: 'silver',
    category: 'shopping',
    target: 10,
    rewards: { coins: 750, badge: 'Store Explorer' }
  },

  // SOCIAL ACHIEVEMENTS
  FIRST_REVIEW: {
    id: 'first_review',
    title: 'First Impression',
    description: 'Write your first review',
    icon: '✍️',
    tier: 'bronze',
    category: 'social',
    target: 1,
    rewards: { coins: 50 }
  },

  REVIEW_MASTER: {
    id: 'review_master',
    title: 'Review Master',
    description: 'Write 50 reviews',
    icon: '⭐',
    tier: 'gold',
    category: 'social',
    target: 50,
    rewards: { coins: 2000, badge: 'Expert Reviewer', title: 'Expert Reviewer' }
  },

  HELPFUL_REVIEWER: {
    id: 'helpful_reviewer',
    title: 'Helpful Reviewer',
    description: 'Get 100 helpful votes on your reviews',
    icon: '👍',
    tier: 'gold',
    category: 'social',
    target: 100,
    rewards: { coins: 1500, badge: 'Helpful Reviewer' }
  },

  FIRST_REFERRAL: {
    id: 'first_referral',
    title: 'Spread the Word',
    description: 'Refer your first friend',
    icon: '🤝',
    tier: 'bronze',
    category: 'social',
    target: 1,
    rewards: { coins: 100 }
  },

  REFERRAL_CHAMPION: {
    id: 'referral_champion',
    title: 'Referral Champion',
    description: 'Refer 50 friends',
    icon: '👥',
    tier: 'platinum',
    category: 'social',
    target: 50,
    rewards: { coins: 5000, badge: 'REZ Champion', multiplier: 1.25 }
  },

  INFLUENCER: {
    id: 'influencer',
    title: 'Influencer',
    description: 'Have 25 people join using your referral code',
    icon: '🌟',
    tier: 'gold',
    category: 'social',
    target: 25,
    rewards: { coins: 3000, badge: 'REZ Influencer', title: 'Influencer' }
  },

  // ENGAGEMENT ACHIEVEMENTS
  EARLY_BIRD: {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Log in before 8 AM for 7 consecutive days',
    icon: '🌅',
    tier: 'silver',
    category: 'engagement',
    target: 7,
    rewards: { coins: 500, badge: 'Early Bird' }
  },

  NIGHT_OWL: {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Place 5 orders after 10 PM',
    icon: '🦉',
    tier: 'silver',
    category: 'engagement',
    target: 5,
    rewards: { coins: 400, badge: 'Night Owl' }
  },

  WEEK_WARRIOR: {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7-day login streak',
    icon: '🔥',
    tier: 'silver',
    category: 'engagement',
    target: 7,
    rewards: { coins: 300 }
  },

  MONTH_MASTER: {
    id: 'month_master',
    title: 'Month Master',
    description: 'Maintain a 30-day login streak',
    icon: '💪',
    tier: 'gold',
    category: 'engagement',
    target: 30,
    rewards: { coins: 2000, badge: 'Streak Master', multiplier: 1.1 }
  },

  LOYALTY_LEGEND: {
    id: 'loyalty_legend',
    title: 'Loyalty Legend',
    description: 'Maintain a 100-day login streak',
    icon: '🏆',
    tier: 'platinum',
    category: 'engagement',
    target: 100,
    rewards: { coins: 10000, badge: 'Loyalty Legend', multiplier: 1.3 }
  },

  CHALLENGE_SEEKER: {
    id: 'challenge_seeker',
    title: 'Challenge Seeker',
    description: 'Complete 10 daily challenges',
    icon: '🎯',
    tier: 'silver',
    category: 'engagement',
    target: 10,
    rewards: { coins: 600, badge: 'Challenge Seeker' }
  },

  CHALLENGE_MASTER: {
    id: 'challenge_master',
    title: 'Challenge Master',
    description: 'Complete 50 challenges',
    icon: '🏅',
    tier: 'gold',
    category: 'engagement',
    target: 50,
    rewards: { coins: 3000, badge: 'Challenge Master', multiplier: 1.15 }
  },

  WISHLIST_COLLECTOR: {
    id: 'wishlist_collector',
    title: 'Wishlist Collector',
    description: 'Add 50 items to your wishlist',
    icon: '❤️',
    tier: 'silver',
    category: 'engagement',
    target: 50,
    rewards: { coins: 400 }
  },

  // SPECIAL ACHIEVEMENTS
  EARLY_ADOPTER: {
    id: 'early_adopter',
    title: 'Early Adopter',
    description: 'Join REZ in the first month of launch',
    icon: '🚀',
    tier: 'diamond',
    category: 'special',
    target: 1,
    rewards: { coins: 1000, badge: 'Early Adopter', title: 'Pioneer' },
    hidden: true
  },

  LUCKY_WINNER: {
    id: 'lucky_winner',
    title: 'Lucky Winner',
    description: 'Win 10 scratch card games',
    icon: '🎰',
    tier: 'gold',
    category: 'special',
    target: 10,
    rewards: { coins: 1500, badge: 'Lucky Winner' }
  },

  QUIZ_MASTER: {
    id: 'quiz_master',
    title: 'Quiz Master',
    description: 'Answer 100 quiz questions correctly',
    icon: '🧠',
    tier: 'gold',
    category: 'special',
    target: 100,
    rewards: { coins: 2000, badge: 'Quiz Master', title: 'Quiz Master' }
  },

  PERFECT_SCORE: {
    id: 'perfect_score',
    title: 'Perfect Score',
    description: 'Get 10/10 on a daily quiz',
    icon: '💯',
    tier: 'silver',
    category: 'special',
    target: 1,
    rewards: { coins: 500, badge: 'Perfect Score' }
  },

  JACKPOT: {
    id: 'jackpot',
    title: 'Jackpot!',
    description: 'Win the grand prize on spin wheel',
    icon: '🎊',
    tier: 'diamond',
    category: 'special',
    target: 1,
    rewards: { coins: 5000, badge: 'Jackpot Winner' },
    hidden: true
  },

  DEAL_HUNTER: {
    id: 'deal_hunter',
    title: 'Deal Hunter',
    description: 'Use 20 exclusive deals',
    icon: '🎁',
    tier: 'gold',
    category: 'special',
    target: 20,
    rewards: { coins: 1000, badge: 'Deal Hunter' }
  },

  WEEKEND_WARRIOR: {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Place orders on 10 consecutive weekends',
    icon: '🎉',
    tier: 'silver',
    category: 'special',
    target: 10,
    rewards: { coins: 800, badge: 'Weekend Warrior' }
  },

  CATEGORY_EXPLORER: {
    id: 'category_explorer',
    title: 'Category Explorer',
    description: 'Order from all 10 main categories',
    icon: '🧭',
    tier: 'gold',
    category: 'special',
    target: 10,
    rewards: { coins: 1500, badge: 'Category Explorer' }
  },

  PHOTO_PRO: {
    id: 'photo_pro',
    title: 'Photo Pro',
    description: 'Upload 50 photos in reviews',
    icon: '📸',
    tier: 'silver',
    category: 'special',
    target: 50,
    rewards: { coins: 700, badge: 'Photo Pro' }
  },

  BILL_MASTER: {
    id: 'bill_master',
    title: 'Bill Master',
    description: 'Upload 100 bills',
    icon: '📝',
    tier: 'gold',
    category: 'special',
    target: 100,
    rewards: { coins: 2000, badge: 'Bill Master', multiplier: 1.1 }
  }
};

// Get achievements by category
export const getAchievementsByCategory = (category: string): AchievementDefinition[] => {
  return Object.values(ACHIEVEMENTS).filter(a => a.category === category);
};

// Get achievements by tier
export const getAchievementsByTier = (tier: string): AchievementDefinition[] => {
  return Object.values(ACHIEVEMENTS).filter(a => a.tier === tier);
};

// Get visible achievements (non-hidden)
export const getVisibleAchievements = (): AchievementDefinition[] => {
  return Object.values(ACHIEVEMENTS).filter(a => !a.hidden);
};

export default ACHIEVEMENTS;
