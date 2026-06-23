export interface ChallengeTemplate {
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  title: string;
  description: string;
  icon: string;
  requirements: {
    action: string;
    target: number;
    stores?: string[];
    categories?: string[];
    minAmount?: number;
  };
  rewards: {
    coins: number;
    badges?: string[];
    multiplier?: number;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  durationDays?: number;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // DAILY CHALLENGES - EASY
  {
    type: 'daily',
    title: 'Daily Explorer',
    description: 'Visit 3 different stores today',
    icon: '🗺️',
    requirements: {
      action: 'visit_stores',
      target: 3
    },
    rewards: { coins: 50 },
    difficulty: 'easy',
    durationDays: 1
  },

  {
    type: 'daily',
    title: 'Quick Order',
    description: 'Place 1 order today',
    icon: '⚡',
    requirements: {
      action: 'order_count',
      target: 1
    },
    rewards: { coins: 100 },
    difficulty: 'easy',
    durationDays: 1
  },

  {
    type: 'daily',
    title: 'Share the Love',
    description: 'Share 2 deals with friends',
    icon: '💝',
    requirements: {
      action: 'share_deals',
      target: 2
    },
    rewards: { coins: 75 },
    difficulty: 'easy',
    durationDays: 1
  },

  {
    type: 'daily',
    title: 'Review Writer',
    description: 'Write 1 review today',
    icon: '✍️',
    requirements: {
      action: 'review_count',
      target: 1
    },
    rewards: { coins: 80 },
    difficulty: 'easy',
    durationDays: 1
  },

  {
    type: 'daily',
    title: 'Category Explorer',
    description: 'Browse 5 different categories',
    icon: '🧭',
    requirements: {
      action: 'explore_categories',
      target: 5
    },
    rewards: { coins: 60 },
    difficulty: 'easy',
    durationDays: 1
  },

  // DAILY CHALLENGES - MEDIUM
  {
    type: 'daily',
    title: 'Double Order',
    description: 'Place 2 orders today',
    icon: '🛍️',
    requirements: {
      action: 'order_count',
      target: 2
    },
    rewards: { coins: 200 },
    difficulty: 'medium',
    durationDays: 1
  },

  {
    type: 'daily',
    title: 'Big Spender',
    description: 'Spend ₹500 or more today',
    icon: '💰',
    requirements: {
      action: 'spend_amount',
      target: 500,
      minAmount: 500
    },
    rewards: { coins: 150, multiplier: 1.1 },
    difficulty: 'medium',
    durationDays: 1
  },

  {
    type: 'daily',
    title: 'Bill Upload Master',
    description: 'Upload 3 bills today',
    icon: '📝',
    requirements: {
      action: 'upload_bills',
      target: 3
    },
    rewards: { coins: 120 },
    difficulty: 'medium',
    durationDays: 1
  },

  // WEEKLY CHALLENGES
  {
    type: 'weekly',
    title: 'Weekly Shopping Spree',
    description: 'Place 5 orders this week',
    icon: '🛒',
    requirements: {
      action: 'order_count',
      target: 5
    },
    rewards: { coins: 500, multiplier: 1.15 },
    difficulty: 'medium',
    durationDays: 7
  },

  {
    type: 'weekly',
    title: 'Store Hopper',
    description: 'Order from 7 different stores this week',
    icon: '🏪',
    requirements: {
      action: 'visit_stores',
      target: 7
    },
    rewards: { coins: 600 },
    difficulty: 'medium',
    durationDays: 7
  },

  {
    type: 'weekly',
    title: 'Review Marathon',
    description: 'Write 10 reviews this week',
    icon: '⭐',
    requirements: {
      action: 'review_count',
      target: 10
    },
    rewards: { coins: 700 },
    difficulty: 'hard',
    durationDays: 7
  },

  {
    type: 'weekly',
    title: 'Big Week',
    description: 'Spend ₹2,000 this week',
    icon: '💎',
    requirements: {
      action: 'spend_amount',
      target: 2000,
      minAmount: 2000
    },
    rewards: { coins: 800, multiplier: 1.2 },
    difficulty: 'hard',
    durationDays: 7
  },

  {
    type: 'weekly',
    title: 'Social Butterfly',
    description: 'Refer 3 friends this week',
    icon: '🦋',
    requirements: {
      action: 'refer_friends',
      target: 3
    },
    rewards: { coins: 900 },
    difficulty: 'hard',
    durationDays: 7
  },

  {
    type: 'weekly',
    title: 'Consistent Shopper',
    description: 'Place an order every day this week',
    icon: '🔥',
    requirements: {
      action: 'login_streak',
      target: 7
    },
    rewards: { coins: 1000, multiplier: 1.25 },
    difficulty: 'hard',
    durationDays: 7
  },

  // MONTHLY CHALLENGES
  {
    type: 'monthly',
    title: 'Monthly Marathon',
    description: 'Place 20 orders this month',
    icon: '🏃',
    requirements: {
      action: 'order_count',
      target: 20
    },
    rewards: { coins: 2000, multiplier: 1.3 },
    difficulty: 'hard',
    durationDays: 30
  },

  {
    type: 'monthly',
    title: 'Ultimate Explorer',
    description: 'Order from 15 different stores this month',
    icon: '🌍',
    requirements: {
      action: 'visit_stores',
      target: 15
    },
    rewards: { coins: 1500 },
    difficulty: 'medium',
    durationDays: 30
  },

  {
    type: 'monthly',
    title: 'VIP Spender',
    description: 'Spend ₹10,000 this month',
    icon: '👑',
    requirements: {
      action: 'spend_amount',
      target: 10000,
      minAmount: 10000
    },
    rewards: { coins: 3000, multiplier: 1.5 },
    difficulty: 'hard',
    durationDays: 30
  },

  {
    type: 'monthly',
    title: 'Review Champion',
    description: 'Write 30 reviews this month',
    icon: '🏆',
    requirements: {
      action: 'review_count',
      target: 30
    },
    rewards: { coins: 2500, badges: ['expert_reviewer'] },
    difficulty: 'hard',
    durationDays: 30
  },

  {
    type: 'monthly',
    title: 'Referral King',
    description: 'Refer 10 friends this month',
    icon: '👥',
    requirements: {
      action: 'refer_friends',
      target: 10
    },
    rewards: { coins: 3500 },
    difficulty: 'hard',
    durationDays: 30
  },

  // SPECIAL CHALLENGES
  {
    type: 'special',
    title: 'Weekend Warrior',
    description: 'Place 3 orders this weekend',
    icon: '🎉',
    requirements: {
      action: 'order_count',
      target: 3
    },
    rewards: { coins: 400, multiplier: 1.2 },
    difficulty: 'medium',
    durationDays: 2
  },

  {
    type: 'special',
    title: 'Flash Sale Hunter',
    description: 'Buy from 5 flash sale items today',
    icon: '⚡',
    requirements: {
      action: 'order_count',
      target: 5
    },
    rewards: { coins: 500 },
    difficulty: 'medium',
    durationDays: 1
  },

  {
    type: 'special',
    title: 'Festival Shopper',
    description: 'Place 10 orders during festival week',
    icon: '🎊',
    requirements: {
      action: 'order_count',
      target: 10
    },
    rewards: { coins: 1500, multiplier: 2.0 },
    difficulty: 'hard',
    durationDays: 7
  },

  {
    type: 'special',
    title: 'New Store Discovery',
    description: 'Be among the first 100 to order from newly listed stores',
    icon: '🆕',
    requirements: {
      action: 'visit_stores',
      target: 3
    },
    rewards: { coins: 800 },
    difficulty: 'easy',
    durationDays: 7
  },

  {
    type: 'special',
    title: 'Midnight Madness',
    description: 'Place orders between 12 AM - 6 AM',
    icon: '🌙',
    requirements: {
      action: 'order_count',
      target: 2
    },
    rewards: { coins: 600 },
    difficulty: 'medium',
    durationDays: 3
  }
];

export default CHALLENGE_TEMPLATES;
