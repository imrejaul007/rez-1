import { colors } from '@/constants/theme';
/**
 * Food & Dining Module - Shared Constants
 */

// Rez Brand Colors used across all food-dining components
export const COLORS = {
  accentOrange: '#FF6B35',
  primaryGold: colors.warningScale[400],
  accentGold: colors.lightMustard,
  primaryGreen: colors.success,
  purple: colors.brand.purpleLight,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  border: colors.neutral[200],
};

// Default tabs (used as fallback when pageConfig.tabs is not available)
export const FOOD_TABS = [
  { id: 'delivery', label: 'Delivery', icon: 'bicycle-outline' },
  { id: 'dineIn', label: 'Dine-In', icon: 'restaurant-outline' },
  { id: 'takeaway', label: 'Takeaway', icon: 'bag-handle-outline' },
  { id: 'offers', label: 'Offers', icon: 'pricetag-outline' },
  { id: 'experiences', label: 'Experiences', icon: 'sparkles-outline' },
];

// Default dietary options (used as fallback when pageConfig.dietaryOptions is not available)
export const DIETARY_OPTIONS = [
  { id: 'veg', label: 'Veg', icon: '🟢', color: colors.success, tags: ['veg', 'pure-veg', 'vegetarian'] },
  { id: 'non-veg', label: 'Non-Veg', icon: '🔴', color: colors.error, tags: ['non-veg'] },
  { id: 'halal', label: 'Halal', icon: '☪️', color: '#0D9488', tags: ['halal'] },
  { id: 'jain', label: 'Jain', icon: '🙏', color: colors.brand.purpleLight, tags: ['jain'] },
];

// Default sort options (used as fallback when pageConfig.sortOptions is not available)
export const SORT_OPTIONS = [
  { id: 'popularity', label: 'Popularity', icon: 'trending-up-outline' },
  { id: 'rating', label: 'Rating', icon: 'star-outline' },
  { id: 'delivery_time', label: 'Delivery Time', icon: 'time-outline' },
  { id: 'newest', label: 'Newest', icon: 'sparkles-outline' },
] as const;

// Default curated collections (used as fallback when pageConfig.curatedCollections is not available)
export const CURATED_COLLECTIONS = [
  { id: 'budget-eats', title: 'Budget Eats', subtitle: 'Affordable picks', icon: '💰', gradient: [colors.warningScale[400], colors.warningScale[700]] as const, tags: 'budget' },
  { id: 'best-for-dates', title: 'Date Night', subtitle: 'Romantic spots', icon: '❤️', gradient: [colors.brand.pink, '#BE185D'] as const, tags: 'fine-dining,romantic' },
  { id: 'hidden-gems', title: 'Hidden Gems', subtitle: 'Top rated new', icon: '💎', gradient: [colors.brand.purpleLight, colors.brand.purpleDeep] as const, tags: 'hidden-gem' },
  { id: 'late-night', title: 'Late Night', subtitle: 'Open late', icon: '🌙', gradient: ['#1E3A5F', '#0F172A'] as const, tags: 'late-night' },
];

// Cuisine icon map for filter chips
export const CUISINE_ICON_MAP: Record<string, string> = {
  'indian': '🍛', 'chinese': '🥡', 'italian': '🍝', 'thai': '🍜',
  'mexican': '🌮', 'south indian': '🥘', 'north indian': '🍛',
  'continental': '🥩', 'japanese': '🍣', 'biryani': '🍗',
  'street food': '🌮', 'ice cream': '🍦', 'healthy': '🥗',
  'cafe': '☕', 'pizza': '🍕', 'dessert': '🍦', 'thali': '🍱',
  'bakery': '🥐', 'kebab': '🍢',
};

// Cuisine tag mapping for filter logic
export const CUISINE_TAG_MAP: Record<string, string[]> = {
  'indian': ['indian', 'north indian', 'south indian', 'biryani', 'curry'],
  'chinese': ['chinese', 'szechuan', 'cantonese'],
  'italian': ['italian', 'pizza', 'pasta'],
  'thai': ['thai'],
  'mexican': ['mexican', 'tex-mex'],
  'south-indian': ['south indian', 'dosa', 'idli', 'vada'],
  'north-indian': ['north indian', 'punjabi', 'mughlai'],
  'continental': ['continental', 'european'],
  'japanese': ['japanese', 'sushi'],
  'thali': ['thali', 'meals', 'platter'],
  'ice-cream': ['ice cream', 'ice-cream', 'dessert', 'desert'],
  'street-food': ['street food', 'chaat', 'snack'],
  'biryani': ['biryani', 'kebab'],
  'healthy': ['healthy', 'salad', 'diet'],
  'cafe': ['cafe', 'coffee', 'bakery'],
  'desserts': ['dessert', 'sweet', 'cake'],
};

// Pagination
export const RESTAURANTS_PER_PAGE = 10;

// Type for restaurant data used across food-dining components
export interface FoodRestaurant {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  banner?: string | string[];
  logo?: string;
  image?: string;
  tags?: string[];
  ratings?: { average?: number; count?: number };
  operationalInfo?: { deliveryTime?: string; [key: string]: any };
  offers?: { cashback?: number; [key: string]: any };
  rewardRules?: {
    estimatedCoins?: number;
    reviewBonusCoins?: number;
    baseCashbackPercent?: number;
    visitMilestoneRewards?: Array<{ visits: number; reward: number }>;
  };
  category?: { name?: string; slug?: string };
  location?: { city?: string; coordinates?: { lat: number; lng: number }; [key: string]: any };
  distance?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  hours?: Array<{ day: string; open: string; close: string; closed?: boolean }>;
  [key: string]: any; // Allow additional fields from backend
}
