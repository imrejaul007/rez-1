/**
 * Centralized query key factory for TanStack Query.
 *
 * Pattern: queryKeys.domain.scope(params)
 * Each key is an array for hierarchical invalidation:
 *   queryKeys.stores.all       → invalidates ALL store queries
 *   queryKeys.stores.list({})  → invalidates only store lists with those filters
 *   queryKeys.stores.detail(id) → invalidates one store
 */

export const queryKeys = {
  // Categories
  categories: {
    all: ['categories'] as const,
    list: (filters?: Record<string, any>) => ['categories', 'list', filters] as const,
    detail: (id: string) => ['categories', 'detail', id] as const,
    bySlug: (slug: string) => ['categories', 'slug', slug] as const,
  },

  // Reviews
  reviews: {
    all: ['reviews'] as const,
    list: (filters?: Record<string, any>) => ['reviews', 'list', filters] as const,
    byStore: (storeId: string, filters?: Record<string, any>) => ['reviews', 'store', storeId, filters] as const,
    byProduct: (productId: string) => ['reviews', 'product', productId] as const,
    detail: (id: string) => ['reviews', 'detail', id] as const,
  },

  // Leaderboard
  leaderboard: {
    all: ['leaderboard'] as const,
    list: (type?: string, filters?: Record<string, any>) => ['leaderboard', 'list', type, filters] as const,
    userRank: (userId?: string) => ['leaderboard', 'rank', userId] as const,
  },

  // Explore
  explore: {
    all: ['explore'] as const,
    stats: () => ['explore', 'stats'] as const,
    nearby: (lat: number, lon: number) => ['explore', 'nearby', lat, lon] as const,
    trending: (type?: string) => ['explore', 'trending', type] as const,
    deals: (filters?: Record<string, any>) => ['explore', 'deals', filters] as const,
    featured: () => ['explore', 'featured'] as const,
  },

  // Stores
  stores: {
    all: ['stores'] as const,
    list: (filters?: Record<string, any>) => ['stores', 'list', filters] as const,
    detail: (id: string) => ['stores', 'detail', id] as const,
    search: (query: string, filters?: Record<string, any>) => ['stores', 'search', query, filters] as const,
    nearby: (lat: number, lon: number, radius?: number) => ['stores', 'nearby', lat, lon, radius] as const,
    featured: () => ['stores', 'featured'] as const,
    menu: (storeId: string) => ['stores', 'menu', storeId] as const,
    reviews: (storeId: string, filters?: Record<string, any>) => ['stores', 'reviews', storeId, filters] as const,
    products: (storeId: string, filters?: Record<string, any>) => ['stores', 'products', storeId, filters] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, any>) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    search: (query: string, filters?: Record<string, any>) => ['products', 'search', query, filters] as const,
    byCategory: (categoryId: string) => ['products', 'category', categoryId] as const,
    byStore: (storeId: string) => ['products', 'store', storeId] as const,
    featured: () => ['products', 'featured'] as const,
    recommendations: () => ['products', 'recommendations'] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: Record<string, any>) => ['notifications', 'list', filters] as const,
    unreadCount: () => ['notifications', 'unread'] as const,
  },

  // Cart
  cart: {
    all: ['cart'] as const,
    current: () => ['cart', 'current'] as const,
    count: () => ['cart', 'count'] as const,
  },

  // Gamification
  gamification: {
    all: ['gamification'] as const,
    checkIn: () => ['gamification', 'checkin'] as const,
    streak: () => ['gamification', 'streak'] as const,
    achievements: (filters?: Record<string, any>) => ['gamification', 'achievements', filters] as const,
    spinWheel: () => ['gamification', 'spin'] as const,
    challenges: () => ['gamification', 'challenges'] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    list: (filters?: Record<string, any>) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    tracking: (id: string) => ['orders', 'tracking', id] as const,
    counts: () => ['orders', 'counts'] as const,
  },

  // Wallet
  wallet: {
    all: ['wallet'] as const,
    balance: () => ['wallet', 'balance'] as const,
    transactions: (filters?: Record<string, any>) => ['wallet', 'transactions', filters] as const,
    transactionDetail: (id: string) => ['wallet', 'transaction', id] as const,
    summary: (period?: string) => ['wallet', 'summary', period] as const,
    expiring: () => ['wallet', 'expiring'] as const,
  },

  // Prive
  prive: {
    all: ['prive'] as const,
    eligibility: () => ['prive', 'eligibility'] as const,
    tier: () => ['prive', 'tier'] as const,
    summary: () => ['prive', 'summary'] as const,
    offers: (filters?: Record<string, any>) => ['prive', 'offers', filters] as const,
    catalog: () => ['prive', 'catalog'] as const,
    habits: () => ['prive', 'habits'] as const,
  },

  // Homepage
  homepage: {
    all: ['homepage'] as const,
    batch: (regionId?: string) => ['homepage', 'batch', regionId] as const,
    section: (sectionId: string) => ['homepage', 'section', sectionId] as const,
  },

  // Category Page
  categoryPage: {
    all: ['categoryPage'] as const,
    data: (slug: string) => ['categoryPage', 'data', slug] as const,
    stores: (slug: string) => ['categoryPage', 'stores', slug] as const,
    products: (slug: string) => ['categoryPage', 'products', slug] as const,
  },

  // Going Out
  goingOut: {
    all: ['goingOut'] as const,
    categories: () => ['goingOut', 'categories'] as const,
    products: (page: number, category?: string) => ['goingOut', 'products', page, category] as const,
  },

  // Home Delivery
  homeDelivery: {
    all: ['homeDelivery'] as const,
    categories: () => ['homeDelivery', 'categories'] as const,
    products: (page: number, category?: string) => ['homeDelivery', 'products', page, category] as const,
  },

  // Cash Store
  cashStore: {
    all: ['cashStore'] as const,
    homepage: () => ['cashStore', 'homepage'] as const,
    summary: () => ['cashStore', 'summary'] as const,
    coupons: () => ['cashStore', 'coupons'] as const,
    giftCards: () => ['cashStore', 'giftCards'] as const,
    activity: () => ['cashStore', 'activity'] as const,
    brands: (category?: string) => ['cashStore', 'brands', category] as const,
  },

  // Subscription
  subscription: {
    all: ['subscription'] as const,
    plans: () => ['subscription', 'plans'] as const,
    current: () => ['subscription', 'current'] as const,
    benefits: (tier?: string) => ['subscription', 'benefits', tier] as const,
  },

  // Support
  support: {
    all: ['support'] as const,
    tickets: () => ['support', 'tickets'] as const,
    messages: (ticketId: string) => ['support', 'messages', ticketId] as const,
    faqs: () => ['support', 'faqs'] as const,
  },

  // Play & Earn
  playAndEarn: {
    all: ['playAndEarn'] as const,
    games: () => ['playAndEarn', 'games'] as const,
    challenges: () => ['playAndEarn', 'challenges'] as const,
    achievements: () => ['playAndEarn', 'achievements'] as const,
    streak: () => ['playAndEarn', 'streak'] as const,
    creators: () => ['playAndEarn', 'creators'] as const,
    programs: () => ['playAndEarn', 'programs'] as const,
    bonus: () => ['playAndEarn', 'bonus'] as const,
    quickActions: () => ['playAndEarn', 'quickActions'] as const,
  },

  // Checkout
  checkout: {
    all: ['checkout'] as const,
    addresses: () => ['checkout', 'addresses'] as const,
    coupons: (storeId?: string) => ['checkout', 'coupons', storeId] as const,
    store: (storeId: string) => ['checkout', 'store', storeId] as const,
  },

  // Payment Store
  paymentStore: {
    all: ['paymentStore'] as const,
    nearby: (lat: number, lon: number) => ['paymentStore', 'nearby', lat, lon] as const,
    recent: () => ['paymentStore', 'recent'] as const,
    popular: () => ['paymentStore', 'popular'] as const,
    search: (query: string) => ['paymentStore', 'search', query] as const,
  },
};
