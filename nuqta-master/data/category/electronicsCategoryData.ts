/**
 * Electronics Category Data
 * Dummy data with API-ready structure for future backend integration
 */

import {
  CategoryGridItem,
  Vibe,
  Occasion,
  TrendingHashtag,
  AISuggestion,
  AIFilterChip,
  UGCPost,
  ExclusiveOffer,
  BankOffer,
  CategoryBrand,
  CategoryStore,
} from '@/types/categoryTypes';

// ============================================
// Category Grid (4-column)
// ============================================

export const electronicsCategories: CategoryGridItem[] = [
  { id: 'mobile-phones', name: 'Mobiles', icon: '📱', color: '#3B82F6', cashback: 12, itemCount: 2450 },
  { id: 'laptops', name: 'Laptops', icon: '💻', color: '#8B5CF6', cashback: 15, itemCount: 890 },
  { id: 'televisions', name: 'TVs', icon: '📺', color: '#EF4444', cashback: 10, itemCount: 560 },
  { id: 'audio', name: 'Audio', icon: '🎧', color: '#10B981', cashback: 18, itemCount: 1230 },
  { id: 'cameras', name: 'Cameras', icon: '📷', color: '#F59E0B', cashback: 14, itemCount: 340 },
  { id: 'gaming', name: 'Gaming', icon: '🎮', color: '#EC4899', cashback: 16, itemCount: 780 },
  { id: 'tablets', name: 'Tablets', icon: '📲', color: '#06B6D4', cashback: 12, itemCount: 420 },
  { id: 'smartwatches', name: 'Smartwatches', icon: '⌚', color: '#D946EF', cashback: 15, itemCount: 650 },
  { id: 'appliances', name: 'Appliances', icon: '🔌', color: '#64748B', cashback: 8, itemCount: 1100 },
  { id: 'accessories', name: 'Accessories', icon: '🔋', color: '#F97316', cashback: 20, itemCount: 2800 },
  { id: 'speakers', name: 'Speakers', icon: '🔊', color: '#22C55E', cashback: 15, itemCount: 590 },
  { id: 'drones', name: 'Drones', icon: '🚁', color: '#A855F7', cashback: 10, itemCount: 120 },
];

// ============================================
// Vibes (Mood-based shopping)
// ============================================

export const electronicsVibes: Vibe[] = [
  { id: 'budget', name: 'Budget Friendly', icon: '💰', color: '#22C55E', description: 'Best value gadgets' },
  { id: 'premium', name: 'Premium', icon: '👑', color: '#F59E0B', description: 'Top-tier tech' },
  { id: 'gaming', name: 'Gaming Setup', icon: '🎮', color: '#EC4899', description: 'Level up your game' },
  { id: 'work', name: 'Work From Home', icon: '🏠', color: '#3B82F6', description: 'Home office essentials' },
  { id: 'fitness', name: 'Fitness Tech', icon: '💪', color: '#10B981', description: 'Track your health' },
  { id: 'creative', name: 'Creative Pro', icon: '🎨', color: '#8B5CF6', description: 'For creators & artists' },
  { id: 'smart-home', name: 'Smart Home', icon: '🏡', color: '#06B6D4', description: 'Automate your life' },
  { id: 'portable', name: 'On The Go', icon: '🎒', color: '#F97316', description: 'Travel-friendly tech' },
];

// ============================================
// Occasions (Event-based shopping)
// ============================================

export const electronicsOccasions: Occasion[] = [
  { id: 'diwali', name: 'Diwali Sale', icon: '🪔', color: '#F59E0B', tag: 'Hot', discount: 35 },
  { id: 'republic', name: 'Republic Day', icon: '🇮🇳', color: '#FF6B35', tag: 'Coming Soon', discount: 30 },
  { id: 'newyear', name: 'New Year', icon: '🎊', color: '#8B5CF6', tag: 'Special', discount: 25 },
  { id: 'summer', name: 'Summer Sale', icon: '☀️', color: '#EF4444', tag: null, discount: 20 },
  { id: 'backtoschool', name: 'Back to School', icon: '🎓', color: '#3B82F6', tag: 'Student', discount: 28 },
  { id: 'festive', name: 'Festive Season', icon: '🎉', color: '#EC4899', tag: 'Trending', discount: 32 },
  { id: 'independence', name: 'Independence Day', icon: '🇮🇳', color: '#10B981', tag: null, discount: 22 },
  { id: 'blackfriday', name: 'Black Friday', icon: '🖤', color: '#1F2937', tag: 'Mega', discount: 40 },
];

// ============================================
// Trending Hashtags
// ============================================

export const electronicsTrendingHashtags: TrendingHashtag[] = [
  { id: 'trend-1', tag: '#iPhone15', itemCount: 45, color: '#3B82F6' },
  { id: 'trend-2', tag: '#GamingLaptop', itemCount: 32, color: '#EC4899' },
  { id: 'trend-3', tag: '#SmartWatch', itemCount: 28, color: '#8B5CF6' },
  { id: 'trend-4', tag: '#4KTV', itemCount: 22, color: '#EF4444' },
  { id: 'trend-5', tag: '#WirelessEarbuds', itemCount: 38, color: '#10B981' },
  { id: 'trend-6', tag: '#SmartHome', itemCount: 18, color: '#06B6D4' },
];

// ============================================
// AI Suggestions
// ============================================

export const electronicsAISuggestions: AISuggestion[] = [
  { id: 1, title: 'Best for you', icon: '✨', link: '/electronics?filter=recommended' },
  { id: 2, title: 'Under ₹20,000', icon: '💰', link: '/electronics?filter=budget' },
  { id: 3, title: 'Top rated', icon: '⭐', link: '/electronics?filter=toprated' },
  { id: 4, title: 'New launches', icon: '🚀', link: '/electronics?filter=new' },
];

export const electronicsAIFilterChips: AIFilterChip[] = [
  { id: 'brand', label: 'Brand', icon: '🏷️' },
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'features', label: 'Features', icon: '⚙️' },
  { id: 'rating', label: 'Rating', icon: '⭐' },
  { id: 'warranty', label: 'Warranty', icon: '🛡️' },
];

export const electronicsAIPlaceholders: string[] = [
  'Find me a gaming laptop under ₹80,000',
  'Best smartphone with good camera...',
  'Wireless earbuds for workouts...',
];

// ============================================
// UGC Posts (User Generated Content)
// ============================================

export const electronicsUGCPosts: UGCPost[] = [
  {
    id: 'ugc-1',
    userId: 'user-1',
    userName: 'Rahul K.',
    userAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    image: 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=400',
    hashtag: '#MySetup',
    likes: 345,
    comments: 28,
    coinsEarned: 200,
    isVerified: false,
  },
  {
    id: 'ugc-2',
    userId: 'user-2',
    userName: 'Amit S.',
    userAvatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    image: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400',
    hashtag: '#TechLife',
    likes: 289,
    comments: 22,
    coinsEarned: 175,
    isVerified: true,
  },
  {
    id: 'ugc-3',
    userId: 'user-3',
    userName: 'Sneha P.',
    userAvatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    hashtag: '#GadgetLover',
    likes: 512,
    comments: 56,
    coinsEarned: 250,
    isVerified: false,
  },
  {
    id: 'ugc-4',
    userId: 'user-4',
    userName: 'Vikram M.',
    userAvatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400',
    hashtag: '#PhonePhotography',
    likes: 198,
    comments: 15,
    coinsEarned: 120,
    isVerified: false,
  },
  {
    id: 'ugc-5',
    userId: 'user-5',
    userName: 'Priya R.',
    userAvatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400',
    hashtag: '#SmartWatch',
    likes: 267,
    comments: 19,
    coinsEarned: 150,
    isVerified: true,
  },
  {
    id: 'ugc-6',
    userId: 'user-6',
    userName: 'Karan D.',
    userAvatar: 'https://randomuser.me/api/portraits/men/6.jpg',
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400',
    hashtag: '#GamingSetup',
    likes: 423,
    comments: 45,
    coinsEarned: 225,
    isVerified: false,
  },
];

// ============================================
// Exclusive Offers
// ============================================

export const electronicsExclusiveOffers: ExclusiveOffer[] = [
  {
    id: 'student',
    title: 'Student Tech',
    icon: '🎓',
    discount: '15% Extra Off',
    description: 'On laptops & tablets',
    color: '#3B82F6',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    id: 'exchange',
    title: 'Exchange Bonus',
    icon: '🔄',
    discount: 'Up to ₹10,000',
    description: 'Trade in your old device',
    color: '#10B981',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    id: 'emi',
    title: 'No Cost EMI',
    icon: '💳',
    discount: '0% Interest',
    description: 'Up to 24 months',
    color: '#8B5CF6',
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    id: 'bundle',
    title: 'Bundle Deal',
    icon: '📦',
    discount: '25% Off',
    description: 'Buy 2+ accessories',
    color: '#F59E0B',
    gradient: 'from-amber-500 to-orange-500',
  },
];

// ============================================
// Brands
// ============================================

export const electronicsBrands: CategoryBrand[] = [
  { id: 'apple', name: 'Apple', logo: '🍎', cashback: 10, tag: 'Premium' },
  { id: 'samsung', name: 'Samsung', logo: '📱', cashback: 12, tag: 'Trending' },
  { id: 'sony', name: 'Sony', logo: '🎵', cashback: 14, tag: null },
  { id: 'oneplus', name: 'OnePlus', logo: '📲', cashback: 15, tag: 'Popular' },
  { id: 'hp', name: 'HP', logo: '💻', cashback: 12, tag: null },
  { id: 'dell', name: 'Dell', logo: '🖥️', cashback: 11, tag: null },
  { id: 'boat', name: 'boAt', logo: '🎧', cashback: 18, tag: 'Budget' },
  { id: 'jbl', name: 'JBL', logo: '🔊', cashback: 15, tag: null },
];

// ============================================
// Stores
// ============================================

export const electronicsStores: CategoryStore[] = [
  {
    id: 'store-1',
    name: 'Croma',
    logo: 'https://logo.clearbit.com/croma.com',
    rating: 4.5,
    cashback: 12,
    distance: '1.5 km',
    is60Min: true,
    hasPickup: true,
    categories: ['mobile-phones', 'laptops', 'televisions'],
  },
  {
    id: 'store-2',
    name: 'Reliance Digital',
    logo: 'https://logo.clearbit.com/reliancedigital.in',
    rating: 4.4,
    cashback: 14,
    distance: '2.2 km',
    is60Min: true,
    hasPickup: true,
    categories: ['mobile-phones', 'appliances', 'audio'],
  },
  {
    id: 'store-3',
    name: 'Apple Store',
    logo: 'https://logo.clearbit.com/apple.com',
    rating: 4.9,
    cashback: 8,
    distance: '4.5 km',
    is60Min: false,
    hasPickup: true,
    categories: ['mobile-phones', 'laptops', 'smartwatches'],
  },
  {
    id: 'store-4',
    name: 'Samsung Store',
    logo: 'https://logo.clearbit.com/samsung.com',
    rating: 4.6,
    cashback: 12,
    distance: '2.8 km',
    is60Min: true,
    hasPickup: true,
    categories: ['mobile-phones', 'televisions', 'tablets'],
  },
];

// ============================================
// Bank Offers
// ============================================

export const electronicsBankOffers: BankOffer[] = [
  { id: 'hdfc', bank: 'HDFC Bank', icon: '🏦', offer: '10% Instant Discount', maxDiscount: 3000, minOrder: 10000, cardType: 'Credit/Debit' },
  { id: 'icici', bank: 'ICICI Bank', icon: '🏛️', offer: 'No Cost EMI', maxDiscount: 5000, minOrder: 15000, cardType: 'Credit Card' },
  { id: 'axis', bank: 'Axis Bank', icon: '💳', offer: '5% Cashback', maxDiscount: 2500, minOrder: 8000, cardType: 'All Cards' },
  { id: 'sbi', bank: 'SBI Card', icon: '🏦', offer: 'Flat ₹2000 Off', maxDiscount: 2000, minOrder: 20000, cardType: 'Credit Card' },
];

// ============================================
// Service-Type Filters (what electronics category the user wants)
// ============================================

export const electronicsServiceFilters = [
  { id: 'mobile-phones', label: 'Mobiles', icon: '📱', color: '#3B82F6' },
  { id: 'laptops', label: 'Laptops', icon: '💻', color: '#8B5CF6' },
  { id: 'audio', label: 'Audio', icon: '🎧', color: '#10B981' },
  { id: 'gaming', label: 'Gaming', icon: '🎮', color: '#EC4899' },
  { id: 'televisions', label: 'TVs', icon: '📺', color: '#EF4444' },
  { id: 'smartwatches', label: 'Watches', icon: '⌚', color: '#D946EF' },
  { id: 'cameras', label: 'Cameras', icon: '📷', color: '#F59E0B' },
];

// ============================================
// Lifestyle/Preference Filters
// ============================================

export const electronicsModeFilters = [
  { id: 'budget', label: 'Budget', icon: '💰', color: '#22C55E' },
  { id: 'premium', label: 'Premium', icon: '👑', color: '#8B5CF6' },
  { id: 'new-launch', label: 'New Launch', icon: '🆕', color: '#EF4444' },
  { id: 'top-seller', label: 'Top Seller', icon: '⭐', color: '#F59E0B' },
  { id: 'exchange', label: 'Exchange', icon: '🔄', color: '#10B981' },
  { id: 'fast-delivery', label: 'Fast Delivery', icon: '⚡', color: '#3B82F6' },
];

// ============================================
// Quick Filters
// ============================================

export const electronicsQuickFilters = [
  { id: 'trending', icon: '🔥', label: 'Trending' },
  { id: 'fastdelivery', icon: '⚡', label: 'Fast Delivery' },
  { id: 'pickup', icon: '🏪', label: 'Store Pickup' },
  { id: 'newlaunch', icon: '🆕', label: 'New Launch' },
  { id: 'topseller', icon: '⭐', label: 'Top Seller' },
  { id: 'premium', icon: '👑', label: 'Premium' },
  { id: 'budget', icon: '💰', label: 'Budget' },
  { id: 'exchangeoffer', icon: '🔄', label: 'Exchange Offer' },
];

// ============================================
// Quick Actions
// ============================================

export const electronicsQuickActions = [
  { id: 'compare-devices', label: 'Compare', icon: 'git-compare-outline', route: '/MainCategory/electronics/compare-devices', color: '#3B82F6' },
  { id: 'offers', label: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/electronics/offers', color: '#F59E0B' },
  { id: 'top-rated', label: 'Top Rated', icon: 'star-outline', route: '/MainCategory/electronics/top-rated', color: '#EF4444' },
  { id: 'search', label: 'Explore', icon: 'search-outline', route: '/MainCategory/electronics/search', color: '#EC4899' },
  { id: 'tech-stories', label: 'Tech Stories', icon: 'camera-outline', route: '/MainCategory/electronics/tech-stories', color: '#8B5CF6' },
  { id: 'brands', label: 'Brands', icon: 'storefront-outline', route: '/MainCategory/electronics/top-rated', color: '#06B6D4' },
  { id: 'saved', label: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#10B981' },
  { id: 'loyalty', label: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/electronics/loyalty', color: '#F97316' },
];

// Bundled Export for Category Page
export const electronicsCategoryData = {
  categories: electronicsCategories,
  vibes: electronicsVibes,
  occasions: electronicsOccasions,
  trendingHashtags: electronicsTrendingHashtags,
  aiSuggestions: electronicsAISuggestions,
  aiFilterChips: electronicsAIFilterChips,
  aiPlaceholders: electronicsAIPlaceholders,
  ugcData: {
    photos: electronicsUGCPosts,
  },
  exclusiveOffers: electronicsExclusiveOffers,
  brands: electronicsBrands,
  stores: electronicsStores,
  bankOffers: electronicsBankOffers,
  serviceFilters: electronicsServiceFilters,
  modeFilters: electronicsModeFilters,
  quickFilters: electronicsQuickFilters,
  quickActions: electronicsQuickActions,
};
