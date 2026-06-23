export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'tier' | 'achievement' | 'special' | 'limited';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;
  obtainedBy: string;
  displayOnProfile: boolean;
  displayOnReviews: boolean;
}

export const BADGES: { [key: string]: BadgeDefinition } = {
  // TIER BADGES (automatically earned based on activity level)
  BRONZE_MEMBER: {
    id: 'bronze_member',
    name: 'Bronze Member',
    description: 'Active member with 100+ coins earned',
    icon: '🥉',
    type: 'tier',
    rarity: 'common',
    color: '#CD7F32',
    obtainedBy: 'Earn 100 coins',
    displayOnProfile: true,
    displayOnReviews: false
  },

  SILVER_MEMBER: {
    id: 'silver_member',
    name: 'Silver Member',
    description: 'Valued member with 1,000+ coins earned',
    icon: '🥈',
    type: 'tier',
    rarity: 'rare',
    color: '#C0C0C0',
    obtainedBy: 'Earn 1,000 coins',
    displayOnProfile: true,
    displayOnReviews: true
  },

  GOLD_MEMBER: {
    id: 'gold_member',
    name: 'Gold Member',
    description: 'Premium member with 5,000+ coins earned',
    icon: '🥇',
    type: 'tier',
    rarity: 'epic',
    color: '#FFD700',
    obtainedBy: 'Earn 5,000 coins',
    displayOnProfile: true,
    displayOnReviews: true
  },

  PLATINUM_MEMBER: {
    id: 'platinum_member',
    name: 'Platinum Member',
    description: 'Elite member with 20,000+ coins earned',
    icon: '💎',
    type: 'tier',
    rarity: 'legendary',
    color: '#E5E4E2',
    obtainedBy: 'Earn 20,000 coins',
    displayOnProfile: true,
    displayOnReviews: true
  },

  // ACHIEVEMENT BADGES
  EARLY_ADOPTER: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined REZ in the first month',
    icon: '🚀',
    type: 'limited',
    rarity: 'legendary',
    color: '#FF6B6B',
    obtainedBy: 'Join during launch month',
    displayOnProfile: true,
    displayOnReviews: true
  },

  SHOPPING_ENTHUSIAST: {
    id: 'shopping_enthusiast',
    name: 'Shopping Enthusiast',
    description: 'Completed 10+ orders',
    icon: '🛍️',
    type: 'achievement',
    rarity: 'common',
    color: '#4ECDC4',
    obtainedBy: 'Place 10 orders',
    displayOnProfile: true,
    displayOnReviews: false
  },

  SHOPAHOLIC: {
    id: 'shopaholic',
    name: 'Shopaholic',
    description: 'Completed 50+ orders',
    icon: '🛒',
    type: 'achievement',
    rarity: 'rare',
    color: '#95E1D3',
    obtainedBy: 'Place 50 orders',
    displayOnProfile: true,
    displayOnReviews: true
  },

  SHOPPING_LEGEND: {
    id: 'shopping_legend',
    name: 'Shopping Legend',
    description: 'Completed 100+ orders',
    icon: '👑',
    type: 'achievement',
    rarity: 'epic',
    color: '#FFD93D',
    obtainedBy: 'Place 100 orders',
    displayOnProfile: true,
    displayOnReviews: true
  },

  EXPERT_REVIEWER: {
    id: 'expert_reviewer',
    name: 'Expert Reviewer',
    description: 'Written 50+ quality reviews',
    icon: '⭐',
    type: 'achievement',
    rarity: 'epic',
    color: '#6C5CE7',
    obtainedBy: 'Write 50 reviews',
    displayOnProfile: true,
    displayOnReviews: true
  },

  HELPFUL_REVIEWER: {
    id: 'helpful_reviewer',
    name: 'Helpful Reviewer',
    description: 'Reviews helped 100+ people',
    icon: '👍',
    type: 'achievement',
    rarity: 'rare',
    color: '#74B9FF',
    obtainedBy: 'Get 100 helpful votes',
    displayOnProfile: true,
    displayOnReviews: true
  },

  REZ_CHAMPION: {
    id: 'rez_champion',
    name: 'REZ Champion',
    description: 'Referred 50+ friends',
    icon: '👥',
    type: 'achievement',
    rarity: 'legendary',
    color: '#FF6348',
    obtainedBy: 'Refer 50 friends',
    displayOnProfile: true,
    displayOnReviews: true
  },

  REZ_INFLUENCER: {
    id: 'rez_influencer',
    name: 'REZ Influencer',
    description: '25+ people joined via your code',
    icon: '🌟',
    type: 'achievement',
    rarity: 'epic',
    color: '#FD79A8',
    obtainedBy: 'Get 25 referral signups',
    displayOnProfile: true,
    displayOnReviews: true
  },

  // SPECIAL BADGES
  BIG_SPENDER: {
    id: 'big_spender',
    name: 'Big Spender',
    description: 'Spent ₹10,000+ on orders',
    icon: '💰',
    type: 'special',
    rarity: 'rare',
    color: '#2ECC71',
    obtainedBy: 'Spend ₹10,000',
    displayOnProfile: true,
    displayOnReviews: false
  },

  VIP_SHOPPER: {
    id: 'vip_shopper',
    name: 'VIP Shopper',
    description: 'Spent ₹50,000+ on orders',
    icon: '💎',
    type: 'special',
    rarity: 'epic',
    color: '#9B59B6',
    obtainedBy: 'Spend ₹50,000',
    displayOnProfile: true,
    displayOnReviews: true
  },

  STORE_EXPLORER: {
    id: 'store_explorer',
    name: 'Store Explorer',
    description: 'Ordered from 10+ different stores',
    icon: '🗺️',
    type: 'achievement',
    rarity: 'rare',
    color: '#E67E22',
    obtainedBy: 'Order from 10 stores',
    displayOnProfile: true,
    displayOnReviews: false
  },

  STREAK_MASTER: {
    id: 'streak_master',
    name: 'Streak Master',
    description: '30-day login streak',
    icon: '💪',
    type: 'achievement',
    rarity: 'epic',
    color: '#E74C3C',
    obtainedBy: 'Maintain 30-day streak',
    displayOnProfile: true,
    displayOnReviews: true
  },

  LOYALTY_LEGEND: {
    id: 'loyalty_legend',
    name: 'Loyalty Legend',
    description: '100-day login streak',
    icon: '🏆',
    type: 'achievement',
    rarity: 'legendary',
    color: '#F39C12',
    obtainedBy: 'Maintain 100-day streak',
    displayOnProfile: true,
    displayOnReviews: true
  },

  CHALLENGE_SEEKER: {
    id: 'challenge_seeker',
    name: 'Challenge Seeker',
    description: 'Completed 10+ challenges',
    icon: '🎯',
    type: 'achievement',
    rarity: 'common',
    color: '#1ABC9C',
    obtainedBy: 'Complete 10 challenges',
    displayOnProfile: true,
    displayOnReviews: false
  },

  CHALLENGE_MASTER: {
    id: 'challenge_master',
    name: 'Challenge Master',
    description: 'Completed 50+ challenges',
    icon: '🏅',
    type: 'achievement',
    rarity: 'epic',
    color: '#3498DB',
    obtainedBy: 'Complete 50 challenges',
    displayOnProfile: true,
    displayOnReviews: true
  },

  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Logs in before 8 AM regularly',
    icon: '🌅',
    type: 'special',
    rarity: 'rare',
    color: '#F1C40F',
    obtainedBy: 'Login before 8 AM for 7 days',
    displayOnProfile: true,
    displayOnReviews: false
  },

  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Orders late night regularly',
    icon: '🦉',
    type: 'special',
    rarity: 'rare',
    color: '#34495E',
    obtainedBy: 'Place 5 orders after 10 PM',
    displayOnProfile: true,
    displayOnReviews: false
  },

  LUCKY_WINNER: {
    id: 'lucky_winner',
    name: 'Lucky Winner',
    description: 'Won 10+ scratch card games',
    icon: '🎰',
    type: 'special',
    rarity: 'epic',
    color: '#16A085',
    obtainedBy: 'Win 10 scratch cards',
    displayOnProfile: true,
    displayOnReviews: false
  },

  QUIZ_MASTER: {
    id: 'quiz_master',
    name: 'Quiz Master',
    description: 'Answered 100+ quiz questions correctly',
    icon: '🧠',
    type: 'achievement',
    rarity: 'epic',
    color: '#8E44AD',
    obtainedBy: 'Answer 100 questions correctly',
    displayOnProfile: true,
    displayOnReviews: true
  },

  PERFECT_SCORE: {
    id: 'perfect_score',
    name: 'Perfect Score',
    description: 'Got 10/10 on daily quiz',
    icon: '💯',
    type: 'achievement',
    rarity: 'rare',
    color: '#27AE60',
    obtainedBy: 'Score 10/10 on quiz',
    displayOnProfile: true,
    displayOnReviews: false
  },

  JACKPOT_WINNER: {
    id: 'jackpot_winner',
    name: 'Jackpot Winner',
    description: 'Won the grand prize!',
    icon: '🎊',
    type: 'special',
    rarity: 'legendary',
    color: '#C0392B',
    obtainedBy: 'Win grand prize on spin wheel',
    displayOnProfile: true,
    displayOnReviews: true
  },

  DEAL_HUNTER: {
    id: 'deal_hunter',
    name: 'Deal Hunter',
    description: 'Used 20+ exclusive deals',
    icon: '🎁',
    type: 'achievement',
    rarity: 'rare',
    color: '#D35400',
    obtainedBy: 'Use 20 exclusive deals',
    displayOnProfile: true,
    displayOnReviews: false
  },

  WEEKEND_WARRIOR: {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Orders every weekend',
    icon: '🎉',
    type: 'special',
    rarity: 'rare',
    color: '#E91E63',
    obtainedBy: 'Order on 10 consecutive weekends',
    displayOnProfile: true,
    displayOnReviews: false
  },

  CATEGORY_EXPLORER: {
    id: 'category_explorer',
    name: 'Category Explorer',
    description: 'Explored all categories',
    icon: '🧭',
    type: 'achievement',
    rarity: 'epic',
    color: '#009688',
    obtainedBy: 'Order from all 10 categories',
    displayOnProfile: true,
    displayOnReviews: false
  },

  PHOTO_PRO: {
    id: 'photo_pro',
    name: 'Photo Pro',
    description: 'Uploaded 50+ review photos',
    icon: '📸',
    type: 'achievement',
    rarity: 'rare',
    color: '#607D8B',
    obtainedBy: 'Upload 50 photos',
    displayOnProfile: true,
    displayOnReviews: true
  },

  BILL_MASTER: {
    id: 'bill_master',
    name: 'Bill Master',
    description: 'Uploaded 100+ bills',
    icon: '📝',
    type: 'achievement',
    rarity: 'epic',
    color: '#795548',
    obtainedBy: 'Upload 100 bills',
    displayOnProfile: true,
    displayOnReviews: false
  },

  // LIMITED EDITION BADGES
  DIWALI_2024: {
    id: 'diwali_2024',
    name: 'Diwali 2024',
    description: 'Participated in Diwali celebration',
    icon: '🪔',
    type: 'limited',
    rarity: 'legendary',
    color: '#FF9800',
    obtainedBy: 'Limited time event',
    displayOnProfile: true,
    displayOnReviews: true
  },

  ANNIVERSARY_YEAR_1: {
    id: 'anniversary_year_1',
    name: '1st Anniversary',
    description: 'Celebrated REZ 1st anniversary',
    icon: '🎂',
    type: 'limited',
    rarity: 'legendary',
    color: '#FF5722',
    obtainedBy: 'Limited time event',
    displayOnProfile: true,
    displayOnReviews: true
  }
};

// Get badges by type
export const getBadgesByType = (type: string): BadgeDefinition[] => {
  return Object.values(BADGES).filter(b => b.type === type);
};

// Get badges by rarity
export const getBadgesByRarity = (rarity: string): BadgeDefinition[] => {
  return Object.values(BADGES).filter(b => b.rarity === rarity);
};

// Get displayable badges
export const getProfileBadges = (): BadgeDefinition[] => {
  return Object.values(BADGES).filter(b => b.displayOnProfile);
};

export const getReviewBadges = (): BadgeDefinition[] => {
  return Object.values(BADGES).filter(b => b.displayOnReviews);
};

export default BADGES;
