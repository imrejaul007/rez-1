/**
 * Entertainment Category Data
 */

import {
  CategoryGridItem,
  TrendingHashtag,
  AISuggestion,
  AIFilterChip,
  UGCPost,
  ExclusiveOffer,
} from '@/types/categoryTypes';

export const entertainmentCategories: CategoryGridItem[] = [
  { id: 'movies', name: 'Movies', icon: '🎬', color: '#EF4444', cashback: 15, itemCount: 234 },
  { id: 'events', name: 'Events', icon: '🎪', color: '#8B5CF6', cashback: 18, itemCount: 156 },
  { id: 'concerts', name: 'Concerts', icon: '🎤', color: '#EC4899', cashback: 20, itemCount: 89 },
  { id: 'sports', name: 'Sports Events', icon: '🏟️', color: '#22C55E', cashback: 15, itemCount: 67 },
  { id: 'gaming', name: 'Gaming Zones', icon: '🎮', color: '#3B82F6', cashback: 22, itemCount: 145 },
  { id: 'parks', name: 'Theme Parks', icon: '🎢', color: '#F59E0B', cashback: 18, itemCount: 34 },
  { id: 'comedy', name: 'Comedy Shows', icon: '😂', color: '#F43F5E', cashback: 15, itemCount: 78 },
  { id: 'theatre', name: 'Theatre', icon: '🎭', color: '#D946EF', cashback: 20, itemCount: 56 },
  { id: 'nightlife', name: 'Nightlife', icon: '🌃', color: '#6366F1', cashback: 25, itemCount: 123 },
  { id: 'streaming', name: 'Streaming', icon: '📺', color: '#06B6D4', cashback: 30, itemCount: 45 },
  { id: 'museums', name: 'Museums', icon: '🏛️', color: '#64748B', cashback: 12, itemCount: 34 },
  { id: 'workshops', name: 'Workshops', icon: '🎨', color: '#10B981', cashback: 15, itemCount: 89 },
];

export const entertainmentTrendingHashtags: TrendingHashtag[] = [
  { id: 'trend-1', tag: '#MovieNight', itemCount: 89, color: '#EF4444' },
  { id: 'trend-2', tag: '#ConcertVibes', itemCount: 67, color: '#EC4899' },
  { id: 'trend-3', tag: '#GameOn', itemCount: 78, color: '#3B82F6' },
  { id: 'trend-4', tag: '#LiveEvents', itemCount: 56, color: '#8B5CF6' },
  { id: 'trend-5', tag: '#WeekendFun', itemCount: 45, color: '#F59E0B' },
  { id: 'trend-6', tag: '#NightOut', itemCount: 34, color: '#6366F1' },
];

export const entertainmentAISuggestions: AISuggestion[] = [
  { id: 1, title: 'Now showing', icon: '🎬', link: '/entertainment?filter=movies' },
  { id: 2, title: 'This weekend', icon: '🎪', link: '/entertainment?filter=weekend' },
  { id: 3, title: 'Near me', icon: '📍', link: '/entertainment?filter=nearby' },
  { id: 4, title: 'Family fun', icon: '👨‍👩‍👧‍👦', link: '/entertainment?filter=family' },
];

export const entertainmentAIFilterChips: AIFilterChip[] = [
  { id: 'type', label: 'Type', icon: '🎭' },
  { id: 'date', label: 'Date', icon: '📅' },
  { id: 'location', label: 'Location', icon: '📍' },
  { id: 'price', label: 'Price', icon: '💰' },
  { id: 'group', label: 'Group Size', icon: '👥' },
];

export const entertainmentAIPlaceholders: string[] = [
  'Best movies playing near me this weekend',
  'Comedy shows in Bangalore tonight',
  'Gaming zones for kids birthday party',
];

export const entertainmentUGCPosts: UGCPost[] = [
  {
    id: 'ugc-1',
    userId: 'user-1',
    userName: 'Movie Buff',
    userAvatar: 'https://randomuser.me/api/portraits/men/81.jpg',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    hashtag: '#CinemaTime',
    likes: 456,
    comments: 34,
    coinsEarned: 180,
    isVerified: false,
  },
  {
    id: 'ugc-2',
    userId: 'user-2',
    userName: 'Concert Goer',
    userAvatar: 'https://randomuser.me/api/portraits/women/82.jpg',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
    hashtag: '#LiveMusic',
    likes: 567,
    comments: 45,
    coinsEarned: 220,
    isVerified: true,
  },
  {
    id: 'ugc-3',
    userId: 'user-3',
    userName: 'Gamer Girl',
    userAvatar: 'https://randomuser.me/api/portraits/women/83.jpg',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
    hashtag: '#GamingLife',
    likes: 389,
    comments: 28,
    coinsEarned: 150,
    isVerified: false,
  },
  {
    id: 'ugc-4',
    userId: 'user-4',
    userName: 'Comedy Fan',
    userAvatar: 'https://randomuser.me/api/portraits/men/84.jpg',
    image: 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=400',
    hashtag: '#LaughNight',
    likes: 234,
    comments: 18,
    coinsEarned: 100,
    isVerified: false,
  },
  {
    id: 'ugc-5',
    userId: 'user-5',
    userName: 'Event Hunter',
    userAvatar: 'https://randomuser.me/api/portraits/women/85.jpg',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
    hashtag: '#EventLife',
    likes: 345,
    comments: 26,
    coinsEarned: 140,
    isVerified: true,
  },
  {
    id: 'ugc-6',
    userId: 'user-6',
    userName: 'Night Owl',
    userAvatar: 'https://randomuser.me/api/portraits/men/86.jpg',
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400',
    hashtag: '#NightLife',
    likes: 278,
    comments: 22,
    coinsEarned: 120,
    isVerified: false,
  },
];

export const entertainmentExclusiveOffers: ExclusiveOffer[] = [
  { id: 'first', title: 'First Booking', icon: '🎁', discount: '20% Off', description: 'On movie tickets', color: '#00C06A' },
  { id: 'combo', title: 'Movie Combo', icon: '🍿', discount: 'Free Popcorn', description: 'With 2 tickets', color: '#F59E0B' },
  { id: 'group', title: 'Group Booking', icon: '👥', discount: '25% Off', description: '4+ tickets', color: '#8B5CF6' },
  { id: 'premium', title: 'Premium Seats', icon: '👑', discount: '15% Off', description: 'IMAX & Recliners', color: '#EC4899' },
];

// Service-Type Filters (what type of entertainment)
export const entertainmentServiceFilters = [
  { id: 'movies', label: 'Movies', icon: '🎬', color: '#EF4444' },
  { id: 'live-events', label: 'Live Events', icon: '🎪', color: '#8B5CF6' },
  { id: 'concerts', label: 'Concerts', icon: '🎤', color: '#EC4899' },
  { id: 'gaming', label: 'Gaming', icon: '🎮', color: '#3B82F6' },
  { id: 'parks', label: 'Parks', icon: '🎢', color: '#F59E0B' },
  { id: 'comedy', label: 'Comedy', icon: '😂', color: '#F43F5E' },
  { id: 'theatre', label: 'Theatre', icon: '🎭', color: '#D946EF' },
];

// Lifestyle/Preference Filters
export const entertainmentModeFilters = [
  { id: 'near-me', label: 'Near Me', icon: '📍', color: '#8B5CF6' },
  { id: 'weekend', label: 'Weekend', icon: '📅', color: '#EC4899' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', color: '#22C55E' },
  { id: 'date-night', label: 'Date Night', icon: '💑', color: '#F43F5E' },
  { id: 'budget', label: 'Budget', icon: '💰', color: '#F59E0B' },
  { id: 'vip', label: 'VIP', icon: '👑', color: '#6366F1' },
];

// Entertainment-specific Quick Actions
export const entertainmentQuickActions = [
  { id: 'book-tickets', name: 'Book Tickets', icon: '🎟️', color: '#8B5CF6', route: '/MainCategory/entertainment/book-tickets' },
  { id: 'events', name: 'Events', icon: '📅', color: '#EC4899', route: '/MainCategory/entertainment/search?q=events' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', color: '#3B82F6', route: '/MainCategory/entertainment/search?q=gaming' },
  { id: 'offers', name: 'Offers', icon: '🏷️', color: '#EF4444', route: '/MainCategory/entertainment/offers' },
  { id: 'trending', name: 'Trending', icon: '🔥', color: '#F59E0B', route: '/MainCategory/entertainment/top-rated' },
  { id: 'new-releases', name: 'New', icon: '✨', color: '#22C55E', route: '/MainCategory/entertainment/search?q=new' },
  { id: 'saved', name: 'Saved', icon: '❤️', color: '#F43F5E', route: '/wishlist' },
  { id: 'loyalty', name: 'Loyalty', icon: '🪙', color: '#D97706', route: '/MainCategory/entertainment/loyalty' },
];

// Bookable Entertainment Services
export const ALL_ENTERTAINMENT_SERVICES = [
  { id: 'movie-ticket', name: 'Movie Ticket', duration: '2-3 hrs', price: 250, icon: '🎬', tags: ['movies'] },
  { id: 'event-ticket', name: 'Event Ticket', duration: 'Varies', price: 500, icon: '🎪', tags: ['live-events'] },
  { id: 'concert-ticket', name: 'Concert Ticket', duration: '3-4 hrs', price: 1500, icon: '🎤', tags: ['concerts'] },
  { id: 'gaming-session', name: 'Gaming Session', duration: '1-2 hrs', price: 400, icon: '🎮', tags: ['gaming'] },
  { id: 'park-entry', name: 'Park Entry', duration: 'Full day', price: 999, icon: '🎢', tags: ['parks'] },
  { id: 'comedy-show', name: 'Comedy Show', duration: '2 hrs', price: 700, icon: '😂', tags: ['comedy'] },
  { id: 'theatre-ticket', name: 'Theatre Ticket', duration: '2-3 hrs', price: 800, icon: '🎭', tags: ['theatre'] },
  { id: 'streaming-sub', name: 'Streaming Plan', duration: 'Monthly', price: 199, icon: '📺', tags: ['streaming'] },
];

// Bundled Export for Category Page
export const entertainmentCategoryData = {
  categories: entertainmentCategories,
  serviceFilters: entertainmentServiceFilters,
  modeFilters: entertainmentModeFilters,
  quickActions: entertainmentQuickActions,
  trendingHashtags: entertainmentTrendingHashtags,
  aiSuggestions: entertainmentAISuggestions,
  aiFilterChips: entertainmentAIFilterChips,
  aiPlaceholders: entertainmentAIPlaceholders,
  ugcData: {
    photos: entertainmentUGCPosts,
  },
  exclusiveOffers: entertainmentExclusiveOffers,
};
