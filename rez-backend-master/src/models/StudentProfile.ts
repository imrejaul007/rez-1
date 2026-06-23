// Student Tier Configuration
export const STUDENT_TIERS = {
  freshman: {
    minCoins: 0,
    multiplier: 1.5,
    badge: 'FRESHMEN',
    color: '#8B5CF6', // Purple
    perks: ['5% extra coins', 'Basic offers'],
  },
  sophomore: {
    minCoins: 500,
    multiplier: 1.75,
    badge: 'SOPHOMORE',
    color: '#3B82F6', // Blue
    perks: ['7% extra coins', 'Priority offers', 'Exclusive deals'],
  },
  junior: {
    minCoins: 1500,
    multiplier: 2.0,
    badge: 'JUNIOR',
    color: '#10B981', // Green
    perks: ['10% extra coins', 'Early access', 'Premium deals'],
  },
  senior: {
    minCoins: 3000,
    multiplier: 2.5,
    badge: 'SENIOR',
    color: '#F59E0B', // Amber
    perks: ['15% extra coins', 'VIP support', 'Beta features'],
  },
  scholar: {
    minCoins: 5000,
    multiplier: 3.0,
    badge: 'SCHOLAR',
    color: '#EF4444', // Red
    perks: ['20% extra coins', 'Personal concierge', 'Influencer badge'],
  },
} as const;

export type StudentTierKey = keyof typeof STUDENT_TIERS;

// Student Missions Configuration
export const STUDENT_MISSIONS = [
  {
    id: 'first_student_order',
    title: 'First Bite',
    description: 'Complete your first order as a student',
    coins: 100,
    target: 1,
    type: 'order_count',
    expiresIn: 30,
  },
  {
    id: 'refer_5_classmates',
    title: 'Study Group Builder',
    description: 'Refer 5 classmates to join',
    coins: 500,
    target: 5,
    type: 'referral_count',
    expiresIn: 90,
  },
  {
    id: 'campus_explorer',
    title: 'Campus Explorer',
    description: 'Order from 3 different campus partners',
    coins: 200,
    target: 3,
    type: 'unique_merchant_count',
    expiresIn: 60,
  },
  {
    id: 'exam_week_survivor',
    title: 'Exam Week Survivor',
    description: 'Order during exam season',
    coins: 300,
    target: 5,
    type: 'order_count',
    expiresIn: 14,
    seasonal: true,
  },
  {
    id: 'graduation_gold',
    title: 'Golden Graduate',
    description: 'Reach Scholar tier before graduation',
    coins: 1000,
    target: 1,
    type: 'tier_reached',
    tierRequired: 'scholar',
    expiresIn: 365,
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Order before 9 AM',
    coins: 50,
    target: 10,
    type: 'early_order_count',
    expiresIn: 30,
  },
  {
    id: 'social_shopper',
    title: 'Social Shopper',
    description: 'Share 5 deals on social media',
    coins: 150,
    target: 5,
    type: 'social_share_count',
    expiresIn: 30,
  },
] as const;

export type MissionId = (typeof STUDENT_MISSIONS)[number]['id'];
