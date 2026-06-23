/**
 * Dummy Data for Offers Page Redesign
 *
 * This data is used for sections that don't have backend API support yet.
 * Replace with real API calls when backend is ready.
 */

import {
  LightningDeal,
  NearbyOffer,
  TodaysOffer,
  DiscountBucket,
  TrendingOffer,
  AIRecommendedOffer,
  FriendRedeemedOffer,
  HotspotDeal,
  CashbackStore,
  DoubleCashbackCampaign,
  ExclusiveCategory,
  ExclusiveZoneOffer,
  SaleOffer,
  BOGOOffer,
  FreeDeliveryOffer,
  CoinDrop,
  UploadBillStore,
  BankOffer,
  LoyaltyProgress,
  SpecialProfile,
} from '@/types/offers.types';

// Helper to create future date
const futureDate = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const pastDate = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

// ============================================================================
// LIGHTNING DEALS
// ============================================================================
export const dummyLightningDeals: LightningDeal[] = [
  {
    id: 'ld-1',
    title: 'Flash Pizza Deal',
    subtitle: 'Large Pizza + 2 Sides',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    store: {
      id: 's1',
      name: 'Pizza Palace',
      logo: '',
      rating: 4.5,
      verified: true,
    },
    originalPrice: 15.0,
    discountedPrice: 9.99,
    cashbackPercentage: 15,
    discountPercentage: 33,
    totalQuantity: 100,
    claimedQuantity: 67,
    endTime: futureDate(2),
    promoCode: 'FLASH33',
  },
  {
    id: 'ld-2',
    title: 'Burger Bonanza',
    subtitle: 'Double Whopper Combo',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    store: {
      id: 's2',
      name: 'Burger King',
      logo: '',
      rating: 4.3,
      verified: true,
    },
    originalPrice: 12.0,
    discountedPrice: 7.99,
    cashbackPercentage: 10,
    discountPercentage: 33,
    totalQuantity: 50,
    claimedQuantity: 42,
    endTime: futureDate(1),
    promoCode: 'BKFLASH',
  },
  {
    id: 'ld-3',
    title: 'Coffee Rush Hour',
    subtitle: 'Any Grande Drink',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    store: {
      id: 's3',
      name: 'Starbucks',
      logo: '',
      rating: 4.7,
      verified: true,
    },
    originalPrice: 6.0,
    discountedPrice: 3.99,
    cashbackPercentage: 20,
    discountPercentage: 33,
    totalQuantity: 200,
    claimedQuantity: 156,
    endTime: futureDate(0.5),
  },
  {
    id: 'ld-4',
    title: 'Sushi Special',
    subtitle: '12pc Assorted Roll',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400',
    store: {
      id: 's4',
      name: 'Sushi Express',
      logo: '',
      rating: 4.6,
      verified: true,
    },
    originalPrice: 18.0,
    discountedPrice: 11.99,
    cashbackPercentage: 12,
    discountPercentage: 33,
    totalQuantity: 75,
    claimedQuantity: 23,
    endTime: futureDate(3),
  },
];

// ============================================================================
// NEARBY OFFERS
// ============================================================================
export const dummyNearbyOffers: NearbyOffer[] = [
  {
    id: 'no-1',
    title: 'Burger King',
    subtitle: 'Whopper Combo Deal',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400',
    store: {
      id: 's2',
      name: 'Burger King',
      logo: '',
      rating: 4.3,
      verified: true,
    },
    cashbackPercentage: 10,
    distance: '0.5 km',
    deliveryFee: 0,
    deliveryTime: '25 min',
    rating: 4.3,
    isFreeDelivery: true,
  },
  {
    id: 'no-2',
    title: 'KFC',
    subtitle: '5pc Chicken Bucket',
    image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400',
    store: {
      id: 's5',
      name: 'KFC',
      logo: '',
      rating: 4.2,
      verified: true,
    },
    cashbackPercentage: 8,
    distance: '0.8 km',
    deliveryFee: 2.0,
    deliveryTime: '30 min',
    rating: 4.2,
    isFreeDelivery: false,
  },
  {
    id: 'no-3',
    title: 'Subway',
    subtitle: 'Footlong Sub Deal',
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400',
    store: {
      id: 's6',
      name: 'Subway',
      logo: '',
      rating: 4.4,
      verified: true,
    },
    cashbackPercentage: 15,
    distance: '1.2 km',
    deliveryFee: 0,
    deliveryTime: '20 min',
    rating: 4.4,
    isFreeDelivery: true,
  },
  {
    id: 'no-4',
    title: "McDonald's",
    subtitle: 'McValue Meal',
    image: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400',
    store: {
      id: 's7',
      name: "McDonald's",
      logo: '',
      rating: 4.1,
      verified: true,
    },
    cashbackPercentage: 12,
    distance: '0.3 km',
    deliveryFee: 1.5,
    deliveryTime: '15 min',
    rating: 4.1,
    isFreeDelivery: false,
  },
  {
    id: 'no-5',
    title: 'Dominos',
    subtitle: 'Medium Pizza + Sides',
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400',
    store: {
      id: 's8',
      name: 'Dominos',
      logo: '',
      rating: 4.5,
      verified: true,
    },
    cashbackPercentage: 20,
    distance: '1.5 km',
    deliveryFee: 0,
    deliveryTime: '35 min',
    rating: 4.5,
    isFreeDelivery: true,
  },
];

// ============================================================================
// TODAY'S OFFERS
// ============================================================================
export const dummyTodaysOffers: TodaysOffer[] = [
  {
    id: 'to-1',
    title: 'Morning Breakfast',
    subtitle: 'Full English Breakfast',
    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400',
    store: {
      id: 's9',
      name: 'The Breakfast Club',
      logo: '',
      rating: 4.6,
      verified: true,
    },
    discountPercentage: 25,
    cashbackPercentage: 10,
    expiresAt: futureDate(8),
    isNew: true,
  },
  {
    id: 'to-2',
    title: 'Lunch Special',
    subtitle: 'Grilled Chicken Salad',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    store: {
      id: 's10',
      name: 'Healthy Bites',
      logo: '',
      rating: 4.4,
      verified: true,
    },
    discountPercentage: 30,
    cashbackPercentage: 15,
    expiresAt: futureDate(6),
    isTrending: true,
  },
  {
    id: 'to-3',
    title: 'Dinner Deal',
    subtitle: 'Pasta & Wine Combo',
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400',
    store: {
      id: 's11',
      name: 'Italian Kitchen',
      logo: '',
      rating: 4.7,
      verified: true,
    },
    discountPercentage: 20,
    cashbackPercentage: 12,
    expiresAt: futureDate(10),
  },
  {
    id: 'to-4',
    title: 'Dessert Time',
    subtitle: 'Ice Cream Sundae',
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400',
    store: {
      id: 's12',
      name: 'Sweet Treats',
      logo: '',
      rating: 4.3,
      verified: false,
    },
    discountPercentage: 40,
    cashbackPercentage: 8,
    expiresAt: futureDate(5),
    isNew: true,
    isTrending: true,
  },
];

// ============================================================================
// DISCOUNT BUCKETS
// ============================================================================
export const dummyDiscountBuckets: DiscountBucket[] = [
  {
    id: 'db-1',
    label: '25% OFF',
    icon: 'pricetag',
    backgroundColor: '#D1FAE5',
    textColor: '#059669',
    iconColor: '#10B981',
    count: 45,
    filterValue: '25',
  },
  {
    id: 'db-2',
    label: '50% OFF',
    icon: 'flash',
    backgroundColor: '#FEF3C7',
    textColor: '#D97706',
    iconColor: '#F59E0B',
    count: 23,
    filterValue: '50',
  },
  {
    id: 'db-3',
    label: '80% OFF',
    icon: 'flame',
    backgroundColor: '#FEE2E2',
    textColor: '#DC2626',
    iconColor: '#EF4444',
    count: 8,
    filterValue: '80',
  },
  {
    id: 'db-4',
    label: 'Free Delivery',
    icon: 'car',
    backgroundColor: '#DBEAFE',
    textColor: '#2563EB',
    iconColor: '#3B82F6',
    count: 67,
    filterValue: 'free_delivery',
  },
];

// ============================================================================
// TRENDING OFFERS
// ============================================================================
export const dummyTrendingOffers: TrendingOffer[] = [
  {
    id: 'tr-1',
    title: 'Viral Chicken Wings',
    subtitle: '12pc Buffalo Wings',
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400',
    store: {
      id: 's13',
      name: 'Wing Stop',
      logo: '',
      rating: 4.5,
      verified: true,
    },
    cashbackPercentage: 18,
    redemptionCount: 2345,
    rank: 1,
  },
  {
    id: 'tr-2',
    title: 'Best Seller Burrito',
    subtitle: 'Loaded Chicken Burrito',
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400',
    store: {
      id: 's14',
      name: 'Chipotle',
      logo: '',
      rating: 4.4,
      verified: true,
    },
    cashbackPercentage: 15,
    redemptionCount: 1876,
    rank: 2,
  },
  {
    id: 'tr-3',
    title: 'Popular Ramen',
    subtitle: 'Tonkotsu Ramen Bowl',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400',
    store: {
      id: 's15',
      name: 'Ichiran',
      logo: '',
      rating: 4.8,
      verified: true,
    },
    cashbackPercentage: 12,
    redemptionCount: 1654,
    rank: 3,
  },
  {
    id: 'tr-4',
    title: 'Trending Tacos',
    subtitle: '3 Tacos + Nachos',
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400',
    store: {
      id: 's16',
      name: 'Taco Bell',
      logo: '',
      rating: 4.1,
      verified: true,
    },
    cashbackPercentage: 20,
    redemptionCount: 1432,
    rank: 4,
  },
];

// ============================================================================
// AI RECOMMENDED OFFERS
// ============================================================================
export const dummyAIRecommendedOffers: AIRecommendedOffer[] = [
  {
    id: 'ai-1',
    title: 'Thai Green Curry',
    subtitle: 'Authentic Thai Cuisine',
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400',
    store: {
      id: 's17',
      name: 'Thai Palace',
      logo: '',
      rating: 4.6,
      verified: true,
    },
    cashbackPercentage: 15,
    matchScore: 95,
    reason: 'Based on your love for Asian cuisine',
  },
  {
    id: 'ai-2',
    title: 'Vegan Buddha Bowl',
    subtitle: 'Fresh & Healthy',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
    store: {
      id: 's18',
      name: 'Green Garden',
      logo: '',
      rating: 4.7,
      verified: true,
    },
    cashbackPercentage: 18,
    matchScore: 92,
    reason: 'Matches your healthy eating preferences',
  },
  {
    id: 'ai-3',
    title: 'Artisan Coffee',
    subtitle: 'Single Origin Brew',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    store: {
      id: 's19',
      name: 'Coffee Lab',
      logo: '',
      rating: 4.8,
      verified: true,
    },
    cashbackPercentage: 22,
    matchScore: 88,
    reason: 'You often order coffee in mornings',
  },
];

// ============================================================================
// FRIENDS REDEEMED (DUMMY - NO BACKEND)
// ============================================================================
export const dummyFriendsRedeemed: FriendRedeemedOffer[] = [
  {
    id: 'fr-1',
    friendId: 'f1',
    friendName: 'Rahul S.',
    friendAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    offer: {
      id: 'o1',
      title: '50% Off Pizza',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      store: 'Dominos',
      savings: 8.5,
      cashbackPercentage: 15,
    },
    redeemedAt: pastDate(2),
  },
  {
    id: 'fr-2',
    friendId: 'f2',
    friendName: 'Priya M.',
    friendAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    offer: {
      id: 'o2',
      title: 'Free Coffee',
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
      store: 'Starbucks',
      savings: 5.0,
      cashbackPercentage: 20,
    },
    redeemedAt: pastDate(4),
  },
  {
    id: 'fr-3',
    friendId: 'f3',
    friendName: 'Arjun K.',
    friendAvatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    offer: {
      id: 'o3',
      title: 'Burger Combo',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      store: 'Burger King',
      savings: 6.0,
      cashbackPercentage: 10,
    },
    redeemedAt: pastDate(6),
  },
  {
    id: 'fr-4',
    friendId: 'f4',
    friendName: 'Sneha R.',
    friendAvatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    offer: {
      id: 'o4',
      title: 'Sushi Platter',
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400',
      store: 'Sushi Express',
      savings: 12.0,
      cashbackPercentage: 12,
    },
    redeemedAt: pastDate(8),
  },
];

// ============================================================================
// HOTSPOT DEALS (DUMMY - NO BACKEND)
// ============================================================================
export const dummyHotspotDeals: HotspotDeal[] = [
  {
    id: 'hs-1',
    areaName: 'Koramangala',
    areaId: 'koramangala',
    coordinates: { lat: 12.9352, lng: 77.6245 },
    deals: [],
    totalDeals: 45,
  },
  {
    id: 'hs-2',
    areaName: 'Indiranagar',
    areaId: 'indiranagar',
    coordinates: { lat: 12.9784, lng: 77.6408 },
    deals: [],
    totalDeals: 38,
  },
  {
    id: 'hs-3',
    areaName: 'HSR Layout',
    areaId: 'hsr-layout',
    coordinates: { lat: 12.9116, lng: 77.6389 },
    deals: [],
    totalDeals: 32,
  },
  {
    id: 'hs-4',
    areaName: 'Whitefield',
    areaId: 'whitefield',
    coordinates: { lat: 12.9698, lng: 77.7500 },
    deals: [],
    totalDeals: 28,
  },
];

// ============================================================================
// CASHBACK STORES
// ============================================================================
export const dummySuperCashbackStores: CashbackStore[] = [
  {
    id: 'cs-1',
    name: 'Swiggy',
    logo: '',
    cashbackPercentage: 25,
    category: 'Food Delivery',
    isSuper: true,
    maxCashback: 100,
  },
  {
    id: 'cs-2',
    name: 'Zomato',
    logo: '',
    cashbackPercentage: 20,
    category: 'Food Delivery',
    isSuper: true,
    maxCashback: 80,
  },
  {
    id: 'cs-3',
    name: 'Amazon',
    logo: '',
    cashbackPercentage: 15,
    category: 'Shopping',
    isSuper: true,
    maxCashback: 500,
  },
  {
    id: 'cs-4',
    name: 'Flipkart',
    logo: '',
    cashbackPercentage: 18,
    category: 'Shopping',
    isSuper: true,
    maxCashback: 400,
  },
  {
    id: 'cs-5',
    name: 'Myntra',
    logo: '',
    cashbackPercentage: 22,
    category: 'Fashion',
    isSuper: false,
    maxCashback: 300,
  },
];

// ============================================================================
// DOUBLE CASHBACK CAMPAIGN (DUMMY - NO BACKEND)
// ============================================================================
export const dummyDoubleCashbackCampaign: DoubleCashbackCampaign = {
  id: 'dc-1',
  title: 'Double Cashback Weekend',
  subtitle: 'Earn 2X coins on all orders!',
  multiplier: 2,
  startTime: new Date().toISOString(),
  endTime: futureDate(48),
  eligibleStores: ['Swiggy', 'Zomato', 'Dominos', 'Pizza Hut'],
  terms: ['Min order Rs. 200', 'Max cashback Rs. 100', 'Valid on first 2 orders'],
  backgroundColor: '#FEF3C7',
};

// ============================================================================
// EXCLUSIVE CATEGORIES
// ============================================================================
export const dummyExclusiveCategories: ExclusiveCategory[] = [
  {
    id: 'ec-1',
    name: 'Student',
    slug: 'student',
    icon: 'school',
    iconColor: '#6366F1',
    backgroundColor: '#EEF2FF',
    offersCount: 34,
    description: 'Exclusive offers for students',
  },
  {
    id: 'ec-2',
    name: 'Corporate',
    slug: 'corporate',
    icon: 'briefcase',
    iconColor: '#0EA5E9',
    backgroundColor: '#E0F2FE',
    offersCount: 28,
    description: 'Special deals for corporates',
  },
  {
    id: 'ec-3',
    name: 'Women',
    slug: 'women',
    icon: 'woman',
    iconColor: '#EC4899',
    backgroundColor: '#FCE7F3',
    offersCount: 45,
    description: 'Exclusive offers for women',
  },
  {
    id: 'ec-4',
    name: 'Birthday',
    slug: 'birthday',
    icon: 'gift',
    iconColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
    offersCount: 12,
    description: 'Birthday month specials',
  },
];

// ============================================================================
// EXCLUSIVE ZONE OFFERS (DUMMY - PARTIAL BACKEND)
// ============================================================================
export const dummyCorporateOffers: ExclusiveZoneOffer[] = [
  {
    id: 'eo-1',
    title: 'Office Lunch Deal',
    subtitle: 'Healthy Meal Box',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    store: {
      id: 's20',
      name: 'Fresh Box',
      logo: '',
      rating: 4.5,
      verified: true,
    },
    cashbackPercentage: 25,
    zone: 'corporate',
    eligibilityRequirement: 'Valid corporate email required',
  },
  {
    id: 'eo-2',
    title: 'Team Party Package',
    subtitle: '10+ People Catering',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
    store: {
      id: 's21',
      name: 'Party Feast',
      logo: '',
      rating: 4.3,
      verified: true,
    },
    cashbackPercentage: 30,
    zone: 'corporate',
  },
];

export const dummyWomenOffers: ExclusiveZoneOffer[] = [
  {
    id: 'wo-1',
    title: 'Spa & Wellness',
    subtitle: 'Full Body Massage',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
    store: {
      id: 's22',
      name: 'Zen Spa',
      logo: '',
      rating: 4.8,
      verified: true,
    },
    cashbackPercentage: 35,
    zone: 'women',
  },
  {
    id: 'wo-2',
    title: 'Beauty Box',
    subtitle: 'Premium Skincare Kit',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    store: {
      id: 's23',
      name: 'Nykaa',
      logo: '',
      rating: 4.6,
      verified: true,
    },
    cashbackPercentage: 28,
    zone: 'women',
  },
];

export const dummyBirthdayOffers: ExclusiveZoneOffer[] = [
  {
    id: 'bo-1',
    title: 'Free Birthday Cake',
    subtitle: '1kg Chocolate Cake',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
    store: {
      id: 's24',
      name: 'Cake Paradise',
      logo: '',
      rating: 4.7,
      verified: true,
    },
    cashbackPercentage: 100,
    zone: 'birthday',
    eligibilityRequirement: 'Valid in your birthday month',
  },
  {
    id: 'bo-2',
    title: 'Birthday Dinner',
    subtitle: '50% Off on your special day',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
    store: {
      id: 's25',
      name: 'The Grand',
      logo: '',
      rating: 4.9,
      verified: true,
    },
    cashbackPercentage: 50,
    zone: 'birthday',
  },
];

// ============================================================================
// LAST CHANCE OFFERS (Uses same structure as Lightning Deals)
// ============================================================================
export const dummyLastChanceOffers: LightningDeal[] = [
  {
    id: 'lc-1',
    title: 'Ending Soon!',
    subtitle: '2 Large Pizzas @ Rs.499',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
    store: {
      id: 's26',
      name: 'Pizza Hut',
      logo: '',
      rating: 4.4,
      verified: true,
    },
    originalPrice: 25.0,
    discountedPrice: 12.99,
    cashbackPercentage: 10,
    discountPercentage: 48,
    totalQuantity: 30,
    claimedQuantity: 28,
    endTime: futureDate(0.25), // 15 mins
  },
  {
    id: 'lc-2',
    title: 'Almost Gone!',
    subtitle: 'Premium Biryani',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
    store: {
      id: 's27',
      name: 'Behrouz Biryani',
      logo: '',
      rating: 4.6,
      verified: true,
    },
    originalPrice: 18.0,
    discountedPrice: 9.99,
    cashbackPercentage: 15,
    discountPercentage: 44,
    totalQuantity: 50,
    claimedQuantity: 47,
    endTime: futureDate(0.5), // 30 mins
  },
];

// ============================================================================
// NEW TODAY OFFERS
// ============================================================================
export const dummyNewTodayOffers: TodaysOffer[] = [
  {
    id: 'nt-1',
    title: 'Just Launched!',
    subtitle: 'New Gourmet Menu',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    store: {
      id: 's28',
      name: 'Chef Special',
      logo: '',
      rating: 4.5,
      verified: true,
    },
    discountPercentage: 30,
    cashbackPercentage: 20,
    expiresAt: futureDate(24),
    isNew: true,
  },
  {
    id: 'nt-2',
    title: 'Fresh Addition',
    subtitle: 'Artisan Ice Cream',
    image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400',
    store: {
      id: 's29',
      name: 'Cream Stone',
      logo: '',
      rating: 4.4,
      verified: true,
    },
    discountPercentage: 25,
    cashbackPercentage: 15,
    expiresAt: futureDate(20),
    isNew: true,
  },
];

// ============================================================================
// SALES & CLEARANCE OFFERS
// ============================================================================
export const dummySaleOffers: SaleOffer[] = [
  {
    id: 'sale-1',
    title: 'Clearance Pizza',
    subtitle: '2 Medium Pizzas',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
    store: {
      id: 's30',
      name: 'Pizza Express',
      logo: '',
      rating: 4.2,
      verified: true,
    },
    originalPrice: 25.0,
    salePrice: 9.99,
    discountPercentage: 60,
    cashbackPercentage: 10,
    tag: 'clearance',
  },
  {
    id: 'sale-2',
    title: 'Last Pieces Burger',
    subtitle: 'Triple Patty Burger',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400',
    store: {
      id: 's31',
      name: 'Shake Shack',
      logo: '',
      rating: 4.5,
      verified: true,
    },
    originalPrice: 18.0,
    salePrice: 7.99,
    discountPercentage: 55,
    cashbackPercentage: 15,
    tag: 'last_pieces',
  },
  {
    id: 'sale-3',
    title: 'End of Season',
    subtitle: 'Seasonal Menu Items',
    image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400',
    store: {
      id: 's32',
      name: 'Seasons Cafe',
      logo: '',
      rating: 4.4,
      verified: true,
    },
    originalPrice: 30.0,
    salePrice: 12.99,
    discountPercentage: 57,
    cashbackPercentage: 12,
    tag: 'sale',
  },
  {
    id: 'sale-4',
    title: '70% Off Desserts',
    subtitle: 'Premium Pastries',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    store: {
      id: 's33',
      name: 'Sweet Delights',
      logo: '',
      rating: 4.6,
      verified: true,
    },
    originalPrice: 15.0,
    salePrice: 4.99,
    discountPercentage: 70,
    cashbackPercentage: 8,
    tag: 'clearance',
  },
];

// ============================================================================
// BUY 1 GET 1 OFFERS
// ============================================================================
export const dummyBOGOOffers: BOGOOffer[] = [
  {
    id: 'bogo-1',
    title: 'Buy 1 Get 1 Pizza',
    subtitle: 'Any Medium Pizza',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
    store: {
      id: 's1',
      name: 'Pizza Palace',
      logo: '',
      rating: 4.5,
      verified: true,
    },
    originalPrice: 15.0,
    bogoType: 'buy1get1',
    cashbackPercentage: 10,
    validUntil: futureDate(48),
  },
  {
    id: 'bogo-2',
    title: 'Buy 2 Get 1 Free',
    subtitle: 'All Burgers',
    image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400',
    store: {
      id: 's2',
      name: 'Burger King',
      logo: '',
      rating: 4.3,
      verified: true,
    },
    originalPrice: 8.0,
    bogoType: 'buy2get1',
    cashbackPercentage: 12,
    validUntil: futureDate(72),
  },
  {
    id: 'bogo-3',
    title: 'Buy 1 Get 50% Off',
    subtitle: 'Grande Coffee',
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
    store: {
      id: 's3',
      name: 'Starbucks',
      logo: '',
      rating: 4.7,
      verified: true,
    },
    originalPrice: 5.0,
    bogoType: 'buy1get50',
    cashbackPercentage: 15,
    validUntil: futureDate(24),
  },
  {
    id: 'bogo-4',
    title: 'Buy 1 Get 1 Sushi',
    subtitle: 'California Rolls',
    image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400',
    store: {
      id: 's4',
      name: 'Sushi Express',
      logo: '',
      rating: 4.6,
      verified: true,
    },
    originalPrice: 12.0,
    bogoType: 'buy1get1',
    cashbackPercentage: 8,
    validUntil: futureDate(36),
  },
];

// ============================================================================
// FREE DELIVERY OFFERS
// ============================================================================
export const dummyFreeDeliveryOffers: FreeDeliveryOffer[] = [
  {
    id: 'fd-1',
    title: 'Free Delivery Special',
    subtitle: 'No minimum order',
    image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400',
    store: {
      id: 's34',
      name: 'McDonald\'s',
      logo: '',
      rating: 4.1,
      verified: true,
    },
    cashbackPercentage: 10,
    rating: 4.1,
  },
  {
    id: 'fd-2',
    title: 'Zero Delivery Fee',
    subtitle: 'Orders above Rs. 199',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    store: {
      id: 's2',
      name: 'Burger King',
      logo: '',
      rating: 4.3,
      verified: true,
    },
    cashbackPercentage: 12,
    minOrderValue: 199,
    rating: 4.3,
  },
  {
    id: 'fd-3',
    title: 'Free Home Delivery',
    subtitle: 'Within 5km radius',
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400',
    store: {
      id: 's8',
      name: 'Dominos',
      logo: '',
      rating: 4.5,
      verified: true,
    },
    cashbackPercentage: 15,
    rating: 4.5,
  },
  {
    id: 'fd-4',
    title: 'Delivery on Us',
    subtitle: 'All day free delivery',
    image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400',
    store: {
      id: 's5',
      name: 'KFC',
      logo: '',
      rating: 4.2,
      verified: true,
    },
    cashbackPercentage: 8,
    rating: 4.2,
  },
];

// ============================================================================
// BIG COIN DROPS (CASHBACK TAB)
// ============================================================================
export const dummyCoinDrops: CoinDrop[] = [
  {
    id: 'cd-1',
    storeName: 'Swiggy',
    storeLogo: '',
    multiplier: 3,
    normalCashback: 10,
    boostedCashback: 30,
    endTime: futureDate(4),
    category: 'Food Delivery',
  },
  {
    id: 'cd-2',
    storeName: 'Zomato',
    storeLogo: '',
    multiplier: 2,
    normalCashback: 8,
    boostedCashback: 16,
    endTime: futureDate(6),
    category: 'Food Delivery',
  },
  {
    id: 'cd-3',
    storeName: 'Amazon',
    storeLogo: '',
    multiplier: 5,
    normalCashback: 5,
    boostedCashback: 25,
    endTime: futureDate(2),
    category: 'Shopping',
  },
  {
    id: 'cd-4',
    storeName: 'Myntra',
    storeLogo: '',
    multiplier: 4,
    normalCashback: 6,
    boostedCashback: 24,
    endTime: futureDate(8),
    category: 'Fashion',
  },
];

// ============================================================================
// UPLOAD BILL STORES (CASHBACK TAB)
// ============================================================================
export const dummyUploadBillStores: UploadBillStore[] = [
  {
    id: 'ub-1',
    name: 'Big Bazaar',
    logo: '',
    category: 'Grocery',
    coinsPerRupee: 2,
    maxCoinsPerBill: 500,
  },
  {
    id: 'ub-2',
    name: 'DMart',
    logo: '',
    category: 'Grocery',
    coinsPerRupee: 3,
    maxCoinsPerBill: 750,
  },
  {
    id: 'ub-3',
    name: 'Reliance Fresh',
    logo: '',
    category: 'Grocery',
    coinsPerRupee: 2,
    maxCoinsPerBill: 400,
  },
  {
    id: 'ub-4',
    name: 'More Supermarket',
    logo: '',
    category: 'Grocery',
    coinsPerRupee: 2,
    maxCoinsPerBill: 350,
  },
];

// ============================================================================
// BANK & WALLET OFFERS (CASHBACK TAB)
// ============================================================================
export const dummyBankOffers: BankOffer[] = [
  {
    id: 'bo-1',
    bankName: 'HDFC Bank',
    bankLogo: '',
    offerTitle: '15% Cashback',
    discountPercentage: 15,
    maxDiscount: 200,
    minTransactionAmount: 500,
    cardType: 'credit',
    validUntil: futureDate(168),
    terms: 'Valid on credit cards only',
  },
  {
    id: 'bo-2',
    bankName: 'ICICI Bank',
    bankLogo: '',
    offerTitle: '10% Instant Discount',
    discountPercentage: 10,
    maxDiscount: 150,
    minTransactionAmount: 400,
    cardType: 'debit',
    validUntil: futureDate(120),
    terms: 'Valid on all cards',
  },
  {
    id: 'bo-3',
    bankName: 'Paytm',
    bankLogo: '',
    offerTitle: '20% Cashback',
    discountPercentage: 20,
    maxDiscount: 100,
    minTransactionAmount: 200,
    cardType: 'wallet',
    validUntil: futureDate(72),
    terms: 'Use Paytm Wallet',
  },
  {
    id: 'bo-4',
    bankName: 'PhonePe',
    bankLogo: '',
    offerTitle: 'Flat Rs.50 Off',
    discountPercentage: 0,
    maxDiscount: 50,
    minTransactionAmount: 300,
    cardType: 'wallet',
    validUntil: futureDate(48),
    terms: 'First 2 transactions',
  },
];

// ============================================================================
// LOYALTY PROGRESS (EXCLUSIVE TAB)
// ============================================================================
export const dummyLoyaltyProgress: LoyaltyProgress[] = [
  {
    id: 'lp-1',
    title: 'Order 3 more times',
    description: 'Complete to unlock Gold status',
    currentValue: 7,
    targetValue: 10,
    reward: 'Gold Member',
    rewardCoins: 500,
    icon: 'trophy',
    color: '#F59E0B',
  },
  {
    id: 'lp-2',
    title: 'Spend Rs. 2000 more',
    description: 'Unlock exclusive cashback',
    currentValue: 3000,
    targetValue: 5000,
    reward: '5% Extra Cashback',
    rewardCoins: 200,
    icon: 'wallet',
    color: '#10B981',
  },
  {
    id: 'lp-3',
    title: 'Refer 2 more friends',
    description: 'Earn referral bonus',
    currentValue: 3,
    targetValue: 5,
    reward: 'Referral Master',
    rewardCoins: 300,
    icon: 'people',
    color: '#8B5CF6',
  },
];

// ============================================================================
// SPECIAL PROFILES (EXCLUSIVE TAB)
// ============================================================================
export const dummySpecialProfiles: SpecialProfile[] = [
  {
    id: 'sp-1',
    name: 'Defence',
    slug: 'defence',
    icon: 'shield',
    iconColor: '#059669',
    backgroundColor: '#D1FAE5',
    offersCount: 25,
    isVerified: false,
  },
  {
    id: 'sp-2',
    name: 'Healthcare',
    slug: 'healthcare',
    icon: 'medkit',
    iconColor: '#EF4444',
    backgroundColor: '#FEE2E2',
    offersCount: 18,
    isVerified: false,
  },
  {
    id: 'sp-3',
    name: 'Senior Citizen',
    slug: 'senior',
    icon: 'heart',
    iconColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
    offersCount: 22,
    isVerified: false,
  },
  {
    id: 'sp-4',
    name: 'Teachers',
    slug: 'teachers',
    icon: 'book',
    iconColor: '#3B82F6',
    backgroundColor: '#DBEAFE',
    offersCount: 15,
    isVerified: false,
  },
];

// Export all dummy data
export default {
  lightningDeals: dummyLightningDeals,
  nearbyOffers: dummyNearbyOffers,
  todaysOffers: dummyTodaysOffers,
  discountBuckets: dummyDiscountBuckets,
  trendingOffers: dummyTrendingOffers,
  aiRecommendedOffers: dummyAIRecommendedOffers,
  friendsRedeemed: dummyFriendsRedeemed,
  hotspotDeals: dummyHotspotDeals,
  superCashbackStores: dummySuperCashbackStores,
  doubleCashbackCampaign: dummyDoubleCashbackCampaign,
  exclusiveCategories: dummyExclusiveCategories,
  corporateOffers: dummyCorporateOffers,
  womenOffers: dummyWomenOffers,
  birthdayOffers: dummyBirthdayOffers,
  lastChanceOffers: dummyLastChanceOffers,
  newTodayOffers: dummyNewTodayOffers,
  // New sections
  saleOffers: dummySaleOffers,
  bogoOffers: dummyBOGOOffers,
  freeDeliveryOffers: dummyFreeDeliveryOffers,
  coinDrops: dummyCoinDrops,
  uploadBillStores: dummyUploadBillStores,
  bankOffers: dummyBankOffers,
  loyaltyProgress: dummyLoyaltyProgress,
  specialProfiles: dummySpecialProfiles,
};
