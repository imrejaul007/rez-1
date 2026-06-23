import {
  EventItem,
  StoreItem,
  ProductItem,
  BrandedStoreItem,
  RecommendationItem,
  HomepageSection
} from '@/types/homepage.types';

/**
 * Offline Fallback Data
 * Sample data to show when backend is unavailable and no cache exists
 * This provides a better user experience than showing empty screens
 */

// Fallback Events
export const fallbackEvents: EventItem[] = [
  {
    id: 'fallback_event_001',
    type: 'event',
    title: 'Weekend Shopping Festival',
    subtitle: 'Free Entry • Multiple Stores',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=200&fit=crop',
    description: 'Join us for a weekend of amazing deals and discounts across all your favorite stores. Free entry for all shoppers!',
    price: { amount: 0, currency: '₹', isFree: true },
    location: 'City Mall',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '10:00 AM - 8:00 PM',
    category: 'Shopping',
    organizer: 'City Mall',
    isOnline: false,
    registrationRequired: false,
    availableSlots: [
      { id: 'slot1', time: '10:00 AM', available: true, maxCapacity: 500, bookedCount: 0 },
      { id: 'slot2', time: '2:00 PM', available: true, maxCapacity: 500, bookedCount: 0 },
      { id: 'slot3', time: '6:00 PM', available: true, maxCapacity: 500, bookedCount: 0 },
    ]
  },
  {
    id: 'fallback_event_002',
    type: 'event',
    title: 'Virtual Product Launch',
    subtitle: 'Free • Online Event',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop',
    description: 'Be the first to see our latest product lineup. Join us online for an exclusive virtual product launch event.',
    price: { amount: 0, currency: '₹', isFree: true },
    location: 'Online',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '7:00 PM',
    category: 'Technology',
    organizer: 'Tech Store',
    isOnline: true,
    registrationRequired: true,
    bookingUrl: 'https://example.com/register'
  },
  {
    id: 'fallback_event_003',
    type: 'event',
    title: 'Fashion Show & Sale',
    subtitle: '₹199 • Fashion District',
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=200&fit=crop',
    description: 'Experience the latest fashion trends with live runway shows and exclusive discounts on designer collections.',
    price: { amount: 199, currency: '₹', isFree: false },
    location: 'Fashion District Mall',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '5:00 PM',
    category: 'Fashion',
    organizer: 'Fashion District',
    isOnline: false,
    registrationRequired: true,
    availableSlots: [
      { id: 'slot1', time: '5:00 PM', available: true, maxCapacity: 200, bookedCount: 0 },
      { id: 'slot2', time: '7:00 PM', available: true, maxCapacity: 200, bookedCount: 0 },
    ]
  }
];

// Fallback Recommendations
export const fallbackRecommendations: RecommendationItem[] = [
  {
    id: 'fallback_rec_001',
    type: 'product',
    title: 'Premium Wireless Headphones',
    name: 'Premium Wireless Headphones',
    brand: 'AudioTech',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    description: 'High-quality wireless headphones with active noise cancellation',
    price: {
      current: 2999,
      original: 4999,
      currency: '₹',
      discount: 40
    },
    category: 'Electronics',
    rating: { value: 4.5, count: 234 },
    availabilityStatus: 'in_stock',
    tags: ['popular', 'wireless', 'audio'],
    isRecommended: true,
    recommendationReason: 'Based on your recent purchases',
    recommendationScore: 0.95,
    personalizedFor: 'electronics'
  },
  {
    id: 'fallback_rec_002',
    type: 'product',
    title: 'Smart Fitness Watch',
    name: 'Smart Fitness Watch',
    brand: 'FitPro',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
    description: 'Track your fitness goals with this feature-rich smartwatch',
    price: {
      current: 3499,
      original: 5999,
      currency: '₹',
      discount: 42
    },
    category: 'Wearables',
    rating: { value: 4.7, count: 567 },
    availabilityStatus: 'in_stock',
    tags: ['fitness', 'smartwatch', 'health'],
    isRecommended: true,
    recommendationReason: 'Popular in your area',
    recommendationScore: 0.88,
    personalizedFor: 'fitness'
  },
  {
    id: 'fallback_rec_003',
    type: 'product',
    title: 'Organic Cotton T-Shirt',
    name: 'Organic Cotton T-Shirt',
    brand: 'EcoWear',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop',
    description: 'Comfortable and sustainable organic cotton t-shirt',
    price: {
      current: 599,
      original: 999,
      currency: '₹',
      discount: 40
    },
    category: 'Fashion',
    rating: { value: 4.3, count: 189 },
    availabilityStatus: 'in_stock',
    tags: ['organic', 'sustainable', 'casual'],
    isRecommended: true,
    recommendationReason: 'Matches your style preferences',
    recommendationScore: 0.82,
    personalizedFor: 'fashion'
  },
  {
    id: 'fallback_rec_004',
    type: 'product',
    title: 'Stainless Steel Water Bottle',
    name: 'Stainless Steel Water Bottle',
    brand: 'HydroLife',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop',
    description: 'Insulated water bottle keeps drinks cold for 24 hours',
    price: {
      current: 799,
      original: 1299,
      currency: '₹',
      discount: 38
    },
    category: 'Home & Kitchen',
    rating: { value: 4.6, count: 412 },
    availabilityStatus: 'in_stock',
    tags: ['eco-friendly', 'insulated', 'durable'],
    isRecommended: true,
    recommendationReason: 'Frequently bought together',
    recommendationScore: 0.79,
    personalizedFor: 'general'
  }
];

// Fallback Trending Stores
export const fallbackTrendingStores: StoreItem[] = [
  {
    id: 'fallback_store_001',
    type: 'store',
    title: 'TechHub Electronics',
    name: 'TechHub Electronics',
    image: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=200&fit=crop',
    description: 'Latest gadgets and electronics at unbeatable prices',
    logo: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=100&h=100&fit=crop',
    rating: { value: 4.5, count: 892, maxValue: 5 },
    cashback: { percentage: 10, maxAmount: 1000 },
    category: 'Electronics',
    location: { address: 'Tech Plaza', city: 'Bangalore', distance: '2.5 km' },
    isTrending: true,
    deliveryTime: '30-45 mins',
    minimumOrder: 499
  },
  {
    id: 'fallback_store_002',
    type: 'store',
    title: 'Fresh Mart Groceries',
    name: 'Fresh Mart Groceries',
    image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&h=200&fit=crop',
    description: 'Farm-fresh produce and daily essentials',
    logo: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=100&h=100&fit=crop',
    rating: { value: 4.7, count: 1234, maxValue: 5 },
    cashback: { percentage: 8, maxAmount: 500 },
    category: 'Grocery',
    location: { address: 'Main Street', city: 'Bangalore', distance: '1.2 km' },
    isTrending: true,
    deliveryTime: '20-30 mins',
    minimumOrder: 299
  },
  {
    id: 'fallback_store_003',
    type: 'store',
    title: 'Style Studio Fashion',
    name: 'Style Studio Fashion',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=200&fit=crop',
    description: 'Trendy fashion and accessories for all ages',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop',
    rating: { value: 4.4, count: 678, maxValue: 5 },
    cashback: { percentage: 12, maxAmount: 800 },
    category: 'Fashion',
    location: { address: 'Fashion Street', city: 'Bangalore', distance: '3.8 km' },
    isTrending: true,
    deliveryTime: '45-60 mins',
    minimumOrder: 599
  }
];

// Fallback New Arrivals
export const fallbackNewArrivals: ProductItem[] = [
  {
    id: 'fallback_arrival_001',
    type: 'product',
    title: 'Wireless Mouse',
    name: 'Wireless Mouse',
    brand: 'TechGear',
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=300&fit=crop',
    description: 'Ergonomic wireless mouse with precision tracking',
    price: {
      current: 699,
      original: 1299,
      currency: '₹',
      discount: 46
    },
    category: 'Electronics',
    rating: { value: 4.4, count: 156 },
    availabilityStatus: 'in_stock',
    tags: ['new', 'wireless', 'ergonomic'],
    isNewArrival: true,
    arrivalDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  {
    id: 'fallback_arrival_002',
    type: 'product',
    title: 'Yoga Mat Premium',
    name: 'Yoga Mat Premium',
    brand: 'FitLife',
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=300&fit=crop',
    description: 'Non-slip yoga mat with extra cushioning',
    price: {
      current: 899,
      original: 1699,
      currency: '₹',
      discount: 47
    },
    category: 'Sports',
    rating: { value: 4.6, count: 243 },
    availabilityStatus: 'in_stock',
    tags: ['new', 'yoga', 'fitness'],
    isNewArrival: true,
    arrivalDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  {
    id: 'fallback_arrival_003',
    type: 'product',
    title: 'Coffee Maker Deluxe',
    name: 'Coffee Maker Deluxe',
    brand: 'BrewMaster',
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400&h=300&fit=crop',
    description: 'Programmable coffee maker with thermal carafe',
    price: {
      current: 2499,
      original: 3999,
      currency: '₹',
      discount: 38
    },
    category: 'Home & Kitchen',
    rating: { value: 4.7, count: 324 },
    availabilityStatus: 'in_stock',
    tags: ['new', 'coffee', 'kitchen'],
    isNewArrival: true,
    arrivalDate: new Date().toISOString().split('T')[0]
  },
  {
    id: 'fallback_arrival_004',
    type: 'product',
    title: 'LED Desk Lamp',
    name: 'LED Desk Lamp',
    brand: 'LightPro',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop',
    description: 'Adjustable LED desk lamp with USB charging port',
    price: {
      current: 1299,
      original: 2299,
      currency: '₹',
      discount: 43
    },
    category: 'Home & Office',
    rating: { value: 4.5, count: 189 },
    availabilityStatus: 'in_stock',
    tags: ['new', 'lighting', 'desk'],
    isNewArrival: true,
    arrivalDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
];

// Fallback Branded Stores
export const fallbackBrandedStores: BrandedStoreItem[] = [
  {
    id: 'fallback_branded_001',
    type: 'branded_store',
    title: 'Nike',
    brandName: 'Nike',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=200&fit=crop',
    brandLogo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop',
    backgroundColor: '#FFE8E8',
    description: 'Just Do It - Premium sportswear and athletic gear',
    discount: { percentage: 25, description: '25% off on all items' },
    cashback: { percentage: 10, description: 'Up to 10% cash back' },
    category: 'Sports',
    isPartner: true,
    partnerLevel: 'gold',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  {
    id: 'fallback_branded_002',
    type: 'branded_store',
    title: 'Adidas',
    brandName: 'Adidas',
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=200&fit=crop',
    brandLogo: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=100&h=100&fit=crop',
    backgroundColor: '#E8E8FF',
    description: 'Impossible is Nothing - Quality sports apparel',
    discount: { percentage: 20, description: '20% off on footwear' },
    cashback: { percentage: 12, description: 'Up to 12% cash back' },
    category: 'Sports',
    isPartner: true,
    partnerLevel: 'gold',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  {
    id: 'fallback_branded_003',
    type: 'branded_store',
    title: 'Samsung',
    brandName: 'Samsung',
    image: 'https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?w=400&h=200&fit=crop',
    brandLogo: 'https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?w=100&h=100&fit=crop',
    backgroundColor: '#E8FFE8',
    description: 'Latest smartphones and electronics',
    discount: { percentage: 15, description: '15% off on electronics' },
    cashback: { percentage: 8, description: 'Up to 8% cash back' },
    category: 'Electronics',
    isPartner: true,
    partnerLevel: 'silver',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
];

// Fallback Homepage Sections
export const fallbackHomepageSections: HomepageSection[] = [
  {
    id: 'events',
    title: 'Events',
    type: 'events',
    showViewAll: false,
    isHorizontalScroll: true,
    items: fallbackEvents,
    loading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 1
  },
  {
    id: 'just_for_you',
    title: 'Just for you',
    type: 'recommendations',
    showViewAll: false,
    isHorizontalScroll: true,
    items: fallbackRecommendations,
    loading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 2
  },
  {
    id: 'trending_stores',
    title: 'Trending Stores',
    type: 'stores',
    showViewAll: false,
    isHorizontalScroll: true,
    items: fallbackTrendingStores,
    loading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 3
  },
  {
    id: 'new_arrivals',
    title: 'New Arrivals',
    type: 'products',
    showViewAll: false,
    isHorizontalScroll: true,
    items: fallbackNewArrivals,
    loading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 6
  },
  {
    id: 'top_stores',
    title: "Today's top stores",
    type: 'branded_stores',
    showViewAll: false,
    isHorizontalScroll: true,
    items: fallbackBrandedStores,
    loading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 5
  }
];

/**
 * Get fallback data for a specific section
 */
export function getFallbackSectionData(sectionId: string): HomepageSection | null {
  return fallbackHomepageSections.find(section => section.id === sectionId) || null;
}

/**
 * Get all fallback sections
 */
export function getAllFallbackSections(): HomepageSection[] {
  return fallbackHomepageSections;
}

/**
 * Check if offline fallback data is being used
 */
export function isUsingFallbackData(section: HomepageSection): boolean {
  const fallbackSection = getFallbackSectionData(section.id);

  if (!fallbackSection) {
    return false;
  }

  // Check if the items match fallback items (by comparing IDs)
  const fallbackIds = new Set(fallbackSection.items.map(item => item.id));
  return section.items.every(item => fallbackIds.has(item.id));
}

export default {
  fallbackEvents,
  fallbackRecommendations,
  fallbackTrendingStores,
  fallbackNewArrivals,
  fallbackBrandedStores,
  fallbackHomepageSections,
  getFallbackSectionData,
  getAllFallbackSections,
  isUsingFallbackData
};
