/**
 * Financial Services Category Data
 */

import {
  CategoryGridItem,
  TrendingHashtag,
  AISuggestion,
  AIFilterChip,
  UGCPost,
  ExclusiveOffer,
} from '@/types/categoryTypes';

export const financialCategories: CategoryGridItem[] = [
  { id: 'insurance', name: 'Insurance', icon: '🛡️', color: '#3B82F6', cashback: 25, itemCount: 234 },
  { id: 'loans', name: 'Loans', icon: '💰', color: '#F59E0B', cashback: 20, itemCount: 156 },
  { id: 'credit-cards', name: 'Credit Cards', icon: '💳', color: '#8B5CF6', cashback: 30, itemCount: 89 },
  { id: 'investments', name: 'Investments', icon: '📈', color: '#22C55E', cashback: 15, itemCount: 123 },
  { id: 'banking', name: 'Banking', icon: '🏦', color: '#6366F1', cashback: 18, itemCount: 67 },
  { id: 'tax', name: 'Tax Filing', icon: '📋', color: '#EF4444', cashback: 22, itemCount: 45 },
  { id: 'mutual-funds', name: 'Mutual Funds', icon: '📊', color: '#EC4899', cashback: 20, itemCount: 78 },
  { id: 'gold', name: 'Digital Gold', icon: '🥇', color: '#D97706', cashback: 12, itemCount: 34 },
  { id: 'crypto', name: 'Crypto', icon: '₿', color: '#F97316', cashback: 15, itemCount: 56 },
  { id: 'savings', name: 'Savings Account', icon: '🐷', color: '#10B981', cashback: 10, itemCount: 89 },
  { id: 'demat', name: 'Demat Account', icon: '📑', color: '#64748B', cashback: 25, itemCount: 67 },
  { id: 'forex', name: 'Forex', icon: '💱', color: '#D946EF', cashback: 8, itemCount: 23 },
];

export const financialTrendingHashtags: TrendingHashtag[] = [
  { id: 'trend-1', tag: '#SmartInvesting', itemCount: 78, color: '#22C55E' },
  { id: 'trend-2', tag: '#InsuranceMatters', itemCount: 56, color: '#3B82F6' },
  { id: 'trend-3', tag: '#CreditScore', itemCount: 45, color: '#8B5CF6' },
  { id: 'trend-4', tag: '#TaxSaver', itemCount: 67, color: '#EF4444' },
  { id: 'trend-5', tag: '#MutualFunds', itemCount: 34, color: '#EC4899' },
  { id: 'trend-6', tag: '#DigitalGold', itemCount: 29, color: '#D97706' },
];

export const financialAISuggestions: AISuggestion[] = [
  { id: 1, title: 'Best insurance', icon: '🛡️', link: '/financial?filter=insurance' },
  { id: 2, title: 'Quick loans', icon: '💰', link: '/financial?filter=loans' },
  { id: 3, title: 'Top credit cards', icon: '💳', link: '/financial?filter=cards' },
  { id: 4, title: 'Tax saving', icon: '📋', link: '/financial?filter=tax' },
];

export const financialAIFilterChips: AIFilterChip[] = [
  { id: 'type', label: 'Service Type', icon: '📊' },
  { id: 'amount', label: 'Amount', icon: '💰' },
  { id: 'tenure', label: 'Tenure', icon: '📅' },
  { id: 'interest', label: 'Interest', icon: '📈' },
  { id: 'rating', label: 'Rating', icon: '⭐' },
];

export const financialAIPlaceholders: string[] = [
  'Compare health insurance for family of 4',
  'Best credit card with no annual fee',
  'Personal loan at lowest interest rate',
];

export const financialUGCPosts: UGCPost[] = [
  {
    id: 'ugc-1',
    userId: 'user-1',
    userName: 'Finance Guru',
    userAvatar: 'https://randomuser.me/api/portraits/men/91.jpg',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    hashtag: '#FinanceTips',
    likes: 567,
    comments: 45,
    coinsEarned: 250,
    isVerified: true,
  },
  {
    id: 'ugc-2',
    userId: 'user-2',
    userName: 'Investor Pro',
    userAvatar: 'https://randomuser.me/api/portraits/men/92.jpg',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
    hashtag: '#StockMarket',
    likes: 456,
    comments: 34,
    coinsEarned: 200,
    isVerified: false,
  },
  {
    id: 'ugc-3',
    userId: 'user-3',
    userName: 'Tax Saver',
    userAvatar: 'https://randomuser.me/api/portraits/women/93.jpg',
    image: 'https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=400',
    hashtag: '#TaxPlanning',
    likes: 345,
    comments: 26,
    coinsEarned: 150,
    isVerified: false,
  },
  {
    id: 'ugc-4',
    userId: 'user-4',
    userName: 'Insurance Expert',
    userAvatar: 'https://randomuser.me/api/portraits/men/94.jpg',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400',
    hashtag: '#InsurancePlan',
    likes: 289,
    comments: 22,
    coinsEarned: 130,
    isVerified: true,
  },
  {
    id: 'ugc-5',
    userId: 'user-5',
    userName: 'Wealth Builder',
    userAvatar: 'https://randomuser.me/api/portraits/women/95.jpg',
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400',
    hashtag: '#WealthCreation',
    likes: 234,
    comments: 18,
    coinsEarned: 110,
    isVerified: false,
  },
  {
    id: 'ugc-6',
    userId: 'user-6',
    userName: 'Credit Master',
    userAvatar: 'https://randomuser.me/api/portraits/men/96.jpg',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
    hashtag: '#CreditCard',
    likes: 178,
    comments: 14,
    coinsEarned: 90,
    isVerified: false,
  },
];

export const financialExclusiveOffers: ExclusiveOffer[] = [
  { id: 'insurance', title: 'Free Insurance', icon: '🛡️', discount: '1 Year Free', description: 'Term life coverage', color: '#3B82F6' },
  { id: 'card', title: 'Credit Card', icon: '💳', discount: '₹500 Voucher', description: 'On approval', color: '#8B5CF6' },
  { id: 'loan', title: 'Quick Loan', icon: '💰', discount: '0% Processing', description: 'Limited time', color: '#00C06A' },
  { id: 'invest', title: 'First Investment', icon: '📈', discount: '₹100 Bonus', description: 'Min ₹500 invest', color: '#22C55E' },
];

// Service-Type Filters (what financial service)
export const financialServiceFilters = [
  { id: 'insurance', label: 'Insurance', icon: '🛡️', color: '#3B82F6' },
  { id: 'loans', label: 'Loans', icon: '💰', color: '#F59E0B' },
  { id: 'credit-cards', label: 'Cards', icon: '💳', color: '#8B5CF6' },
  { id: 'investments', label: 'Invest', icon: '📈', color: '#22C55E' },
  { id: 'banking', label: 'Banking', icon: '🏦', color: '#6366F1' },
  { id: 'tax', label: 'Tax', icon: '📋', color: '#EF4444' },
  { id: 'savings', label: 'Savings', icon: '🐷', color: '#10B981' },
];

// Lifestyle/Preference Filters
export const financialModeFilters = [
  { id: 'best-rates', label: 'Best Rates', icon: '📊', color: '#14B8A6' },
  { id: 'instant', label: 'Instant', icon: '⚡', color: '#F59E0B' },
  { id: 'no-fees', label: 'No Fees', icon: '🆓', color: '#22C55E' },
  { id: 'high-returns', label: 'High Returns', icon: '📈', color: '#8B5CF6' },
  { id: 'short-term', label: 'Short Term', icon: '⏱️', color: '#3B82F6' },
  { id: 'govt-backed', label: 'Govt Backed', icon: '🏛️', color: '#6366F1' },
];

// Financial-specific Quick Actions
export const financialQuickActions = [
  { id: 'pay-bills', name: 'Pay Bills', icon: '📱', color: '#14B8A6', route: '/MainCategory/financial-lifestyle/search?q=bills' },
  { id: 'calculator', name: 'Calculator', icon: '🧮', color: '#8B5CF6', route: '/MainCategory/financial-lifestyle/search?q=calculator' },
  { id: 'compare', name: 'Compare', icon: '📊', color: '#3B82F6', route: '/MainCategory/financial-lifestyle/search?q=compare' },
  { id: 'offers', name: 'Offers', icon: '🏷️', color: '#EF4444', route: '/MainCategory/financial-lifestyle/offers' },
  { id: 'top-rated', name: 'Top Rated', icon: '⭐', color: '#F59E0B', route: '/MainCategory/financial-lifestyle/top-rated' },
  { id: 'apply-service', name: 'Apply Now', icon: '📝', color: '#22C55E', route: '/MainCategory/financial-lifestyle/apply-service' },
  { id: 'saved', name: 'Saved', icon: '❤️', color: '#EC4899', route: '/wishlist' },
  { id: 'loyalty', name: 'Loyalty', icon: '🪙', color: '#D97706', route: '/MainCategory/financial-lifestyle/loyalty' },
];

// Financial Products/Services
export const ALL_FINANCIAL_SERVICES = [
  { id: 'health-insurance', name: 'Health Insurance', duration: '1 Year', price: 0, icon: '🛡️', tags: ['insurance'] },
  { id: 'personal-loan', name: 'Personal Loan', duration: 'Instant', price: 0, icon: '💰', tags: ['loans'] },
  { id: 'credit-card', name: 'Credit Card', duration: '7-10 days', price: 0, icon: '💳', tags: ['credit-cards'] },
  { id: 'mutual-fund', name: 'Mutual Fund SIP', duration: 'Monthly', price: 500, icon: '📈', tags: ['investments'] },
  { id: 'savings-account', name: 'Savings Account', duration: 'Instant', price: 0, icon: '🐷', tags: ['savings', 'banking'] },
  { id: 'tax-filing', name: 'Tax Filing', duration: '2-3 days', price: 499, icon: '📋', tags: ['tax'] },
  { id: 'digital-gold', name: 'Digital Gold', duration: 'Instant', price: 100, icon: '🥇', tags: ['investments'] },
  { id: 'demat-account', name: 'Demat Account', duration: '2-3 days', price: 0, icon: '📑', tags: ['investments', 'banking'] },
];

// Bundled Export for Category Page
export const financialCategoryData = {
  categories: financialCategories,
  serviceFilters: financialServiceFilters,
  modeFilters: financialModeFilters,
  quickActions: financialQuickActions,
  trendingHashtags: financialTrendingHashtags,
  aiSuggestions: financialAISuggestions,
  aiFilterChips: financialAIFilterChips,
  aiPlaceholders: financialAIPlaceholders,
  ugcData: {
    photos: financialUGCPosts,
  },
  exclusiveOffers: financialExclusiveOffers,
};
