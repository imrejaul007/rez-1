/**
 * Category Theme Configuration
 * Extended color/UI config for shared MainCategory pages.
 * Single source of truth for category-specific theming and labels.
 * Used by consolidated [slug] route pages (loyalty, offers, stories, etc.)
 */

export interface CategoryTheme {
  slug: string;
  name: string;
  primaryColor: string;
  primaryColorDark: string;
  primaryColorLight: string;
  gradientColors: [string, string];
  rewardsHubTitle: string;
  rewardsHubSubtitle: string;
  loadingText: string;
  emptyBrandText: string;
  defaultMissionIcon: string;
  storiesTitle: string;
  storiesSlug: string;
  actionSlug: string;
  actionLabel: string;
  actionIcon: string;
  hasExperiences?: boolean;
  hasFastDelivery?: boolean;
}

export const SHARED_COLORS = {
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  background: '#F5F5F5',
  border: '#E5E7EB',
  green: '#059669',
  red: '#DC2626',
};

export const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Bronze: { bg: '#FEF3C7', text: '#92400E', border: '#D97706' },
  Silver: { bg: '#F3F4F6', text: '#374151', border: '#9CA3AF' },
  Gold: { bg: '#FFFBEB', text: '#92400E', border: '#F59E0B' },
  Platinum: { bg: '#EDE9FE', text: '#5B21B6', border: '#8B5CF6' },
};

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  'electronics': {
    slug: 'electronics',
    name: 'Electronics',
    primaryColor: '#3B82F6',
    primaryColorDark: '#2563EB',
    primaryColorLight: '#60A5FA',
    gradientColors: ['#3B82F6', '#60A5FA'],
    rewardsHubTitle: 'Tech Rewards Hub',
    rewardsHubSubtitle: 'Earn coins on every tech purchase',
    loadingText: 'Loading tech rewards...',
    emptyBrandText: 'No tech brands found',
    defaultMissionIcon: 'hardware-chip-outline',
    storiesTitle: 'Tech Stories',
    storiesSlug: 'tech-stories',
    actionSlug: 'compare-devices',
    actionLabel: 'Compare Devices',
    actionIcon: 'git-compare-outline',
  },

  'food-dining': {
    slug: 'food-dining',
    name: 'Food & Dining',
    primaryColor: '#F59E0B',
    primaryColorDark: '#D97706',
    primaryColorLight: '#FBBF24',
    gradientColors: ['#F59E0B', '#FBBF24'],
    rewardsHubTitle: 'Food Rewards Hub',
    rewardsHubSubtitle: 'Earn coins on every meal',
    loadingText: 'Loading food rewards...',
    emptyBrandText: 'No restaurant brands found',
    defaultMissionIcon: 'restaurant-outline',
    storiesTitle: 'Food Stories',
    storiesSlug: 'food-stories',
    actionSlug: 'book-table',
    actionLabel: 'Book a Table',
    actionIcon: 'calendar-outline',
    hasFastDelivery: true,
  },

  'grocery-essentials': {
    slug: 'grocery-essentials',
    name: 'Grocery & Essentials',
    primaryColor: '#22C55E',
    primaryColorDark: '#16A34A',
    primaryColorLight: '#4ADE80',
    gradientColors: ['#22C55E', '#4ADE80'],
    rewardsHubTitle: 'Grocery Rewards Hub',
    rewardsHubSubtitle: 'Earn coins on daily essentials',
    loadingText: 'Loading grocery rewards...',
    emptyBrandText: 'No grocery brands found',
    defaultMissionIcon: 'basket-outline',
    storiesTitle: 'Grocery Stories',
    storiesSlug: 'grocery-stories',
    actionSlug: 'compare',
    actionLabel: 'Compare Prices',
    actionIcon: 'swap-horizontal-outline',
    hasFastDelivery: true,
  },

  'beauty-wellness': {
    slug: 'beauty-wellness',
    name: 'Beauty & Wellness',
    primaryColor: '#EC4899',
    primaryColorDark: '#DB2777',
    primaryColorLight: '#F9A8D4',
    gradientColors: ['#EC4899', '#F9A8D4'],
    rewardsHubTitle: 'Beauty Rewards Hub',
    rewardsHubSubtitle: 'Earn coins on self-care',
    loadingText: 'Loading beauty rewards...',
    emptyBrandText: 'No beauty brands found',
    defaultMissionIcon: 'flower-outline',
    storiesTitle: 'Beauty Stories',
    storiesSlug: 'beauty-stories',
    actionSlug: 'book-appointment',
    actionLabel: 'Book Appointment',
    actionIcon: 'calendar-outline',
    hasExperiences: true,
  },

  'healthcare': {
    slug: 'healthcare',
    name: 'Healthcare',
    primaryColor: '#0EA5E9',
    primaryColorDark: '#0284C7',
    primaryColorLight: '#38BDF8',
    gradientColors: ['#0EA5E9', '#38BDF8'],
    rewardsHubTitle: 'Health Rewards Hub',
    rewardsHubSubtitle: 'Earn coins on health services',
    loadingText: 'Loading health rewards...',
    emptyBrandText: 'No healthcare brands found',
    defaultMissionIcon: 'medical-outline',
    storiesTitle: 'Health Stories',
    storiesSlug: 'health-stories',
    actionSlug: 'book-doctor',
    actionLabel: 'Book Doctor',
    actionIcon: 'person-outline',
  },

  'fashion': {
    slug: 'fashion',
    name: 'Fashion',
    primaryColor: '#A855F7',
    primaryColorDark: '#9333EA',
    primaryColorLight: '#C084FC',
    gradientColors: ['#A855F7', '#C084FC'],
    rewardsHubTitle: 'Fashion Rewards Hub',
    rewardsHubSubtitle: 'Earn coins on every outfit',
    loadingText: 'Loading fashion rewards...',
    emptyBrandText: 'No fashion brands found',
    defaultMissionIcon: 'shirt-outline',
    storiesTitle: 'Fashion Stories',
    storiesSlug: 'fashion-stories',
    actionSlug: 'try-and-buy',
    actionLabel: 'Try & Buy',
    actionIcon: 'body-outline',
    hasExperiences: true,
  },

  'fitness-sports': {
    slug: 'fitness-sports',
    name: 'Fitness & Sports',
    primaryColor: '#F97316',
    primaryColorDark: '#EA580C',
    primaryColorLight: '#FB923C',
    gradientColors: ['#F97316', '#FB923C'],
    rewardsHubTitle: 'Fitness Rewards Hub',
    rewardsHubSubtitle: 'Earn coins staying active',
    loadingText: 'Loading fitness rewards...',
    emptyBrandText: 'No fitness brands found',
    defaultMissionIcon: 'fitness-outline',
    storiesTitle: 'Fitness Stories',
    storiesSlug: 'fitness-stories',
    actionSlug: 'book-class',
    actionLabel: 'Book Class',
    actionIcon: 'calendar-outline',
    hasExperiences: true,
  },

  'education-learning': {
    slug: 'education-learning',
    name: 'Education & Learning',
    primaryColor: '#6366F1',
    primaryColorDark: '#4F46E5',
    primaryColorLight: '#818CF8',
    gradientColors: ['#6366F1', '#818CF8'],
    rewardsHubTitle: 'Learning Rewards Hub',
    rewardsHubSubtitle: 'Earn coins while learning',
    loadingText: 'Loading learning rewards...',
    emptyBrandText: 'No education brands found',
    defaultMissionIcon: 'school-outline',
    storiesTitle: 'Learning Stories',
    storiesSlug: 'learning-stories',
    actionSlug: 'enroll-class',
    actionLabel: 'Enroll in Class',
    actionIcon: 'school-outline',
  },

  'home-services': {
    slug: 'home-services',
    name: 'Home Services',
    primaryColor: '#F59E0B',
    primaryColorDark: '#D97706',
    primaryColorLight: '#FBBF24',
    gradientColors: ['#F59E0B', '#FBBF24'],
    rewardsHubTitle: 'Home Rewards Hub',
    rewardsHubSubtitle: 'Earn coins on home services',
    loadingText: 'Loading home rewards...',
    emptyBrandText: 'No home service brands found',
    defaultMissionIcon: 'home-outline',
    storiesTitle: 'Service Stories',
    storiesSlug: 'service-stories',
    actionSlug: 'book-service',
    actionLabel: 'Book Service',
    actionIcon: 'construct-outline',
  },

  'travel-experiences': {
    slug: 'travel-experiences',
    name: 'Travel & Experiences',
    primaryColor: '#06B6D4',
    primaryColorDark: '#0891B2',
    primaryColorLight: '#22D3EE',
    gradientColors: ['#06B6D4', '#22D3EE'],
    rewardsHubTitle: 'Travel Rewards Hub',
    rewardsHubSubtitle: 'Earn coins on adventures',
    loadingText: 'Loading travel rewards...',
    emptyBrandText: 'No travel brands found',
    defaultMissionIcon: 'airplane-outline',
    storiesTitle: 'Travel Stories',
    storiesSlug: 'travel-stories',
    actionSlug: 'plan-trip',
    actionLabel: 'Plan Trip',
    actionIcon: 'map-outline',
    hasExperiences: true,
  },

  'entertainment': {
    slug: 'entertainment',
    name: 'Entertainment',
    primaryColor: '#8B5CF6',
    primaryColorDark: '#7C3AED',
    primaryColorLight: '#A78BFA',
    gradientColors: ['#8B5CF6', '#A78BFA'],
    rewardsHubTitle: 'Entertainment Rewards Hub',
    rewardsHubSubtitle: 'Earn coins on fun experiences',
    loadingText: 'Loading entertainment rewards...',
    emptyBrandText: 'No entertainment brands found',
    defaultMissionIcon: 'film-outline',
    storiesTitle: 'Fan Stories',
    storiesSlug: 'fan-stories',
    actionSlug: 'book-tickets',
    actionLabel: 'Book Tickets',
    actionIcon: 'ticket-outline',
    hasExperiences: true,
  },

  'financial-lifestyle': {
    slug: 'financial-lifestyle',
    name: 'Financial Lifestyle',
    primaryColor: '#14B8A6',
    primaryColorDark: '#0D9488',
    primaryColorLight: '#2DD4BF',
    gradientColors: ['#14B8A6', '#2DD4BF'],
    rewardsHubTitle: 'Financial Rewards Hub',
    rewardsHubSubtitle: 'Earn coins on smart spending',
    loadingText: 'Loading financial rewards...',
    emptyBrandText: 'No financial brands found',
    defaultMissionIcon: 'wallet-outline',
    storiesTitle: 'Smart Savers',
    storiesSlug: 'smart-savers',
    actionSlug: 'apply-service',
    actionLabel: 'Apply for Service',
    actionIcon: 'document-text-outline',
  },
};

/**
 * Get category theme by slug. Falls back to electronics if not found.
 */
export const getCategoryTheme = (slug: string): CategoryTheme => {
  return CATEGORY_THEMES[slug] || CATEGORY_THEMES['electronics'];
};

/**
 * Get just the color palette for a category (for use in StyleSheet).
 */
export const getCategoryColors = (slug: string) => {
  const theme = getCategoryTheme(slug);
  return {
    primary: theme.primaryColor,
    primaryDark: theme.primaryColorDark,
    primaryLight: theme.primaryColorLight,
    gradient: theme.gradientColors,
    ...SHARED_COLORS,
  };
};

export default CATEGORY_THEMES;
