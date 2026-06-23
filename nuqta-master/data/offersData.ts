import { OffersPageData, Offer, OfferSection, HeroBanner } from '@/types/offers.types';

const heroBanner: HeroBanner = {
  id: 'hero-1',
  title: 'MEGA OFFERS',
  subtitle: 'Amazing deals just for you!',
  image: 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Food+Deal',
  ctaText: 'ORDER NOW',
  ctaAction: 'order',
  backgroundColor: '#8B5CF6'
};

const offerForStudents: Offer[] = [
  {
    id: 'student-1',
    title: "Women's Dresses",
    image: 'https://picsum.photos/300/300?random=1',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'fashion',
    store: {
      name: 'Fashion Store',
      rating: 4.5,
      verified: true
    }
  },
  {
    id: 'student-2',
    title: 'Urban Trends',
    image: 'https://picsum.photos/300/300?random=2',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'fashion',
    store: {
      name: 'Urban Outlet',
      rating: 4.3,
      verified: true
    }
  }
];

const newArrivals: Offer[] = [
  {
    id: 'new-1',
    title: 'Galaxy X Pro',
    image: 'https://picsum.photos/300/300?random=3',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'electronics',
    isNew: true,
    store: {
      name: 'Tech Store',
      rating: 4.7,
      verified: true
    }
  },
  {
    id: 'new-2',
    title: 'iPhone 14',
    image: 'https://picsum.photos/300/300?random=4',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'electronics',
    isNew: true,
    store: {
      name: 'Apple Store',
      rating: 4.8,
      verified: true
    }
  }
];

const clearanceSales: Offer[] = [
  {
    id: 'clearance-1',
    title: 'Leather Chelsea Boots',
    image: 'https://picsum.photos/300/300?random=5',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'footwear',
    store: {
      name: 'Shoe Paradise',
      rating: 4.4,
      verified: true
    }
  },
  {
    id: 'clearance-2',
    title: 'Velvet Heels',
    image: 'https://picsum.photos/300/300?random=6',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'footwear',
    store: {
      name: 'Elegant Steps',
      rating: 4.6,
      verified: true
    }
  }
];

const deals: Offer[] = [
  {
    id: 'deal-1',
    title: 'Smart Blender',
    image: 'https://picsum.photos/300/300?random=7',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'appliances',
    store: {
      name: 'Home Essentials',
      rating: 4.5,
      verified: true
    }
  },
  {
    id: 'deal-2',
    title: 'Air Fryer Pro',
    image: 'https://picsum.photos/300/300?random=8',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'appliances',
    store: {
      name: 'Kitchen World',
      rating: 4.7,
      verified: true
    }
  }
];

const bestSellers: Offer[] = [
  {
    id: 'bestseller-1',
    title: 'Vitamin C Serum',
    image: 'https://picsum.photos/300/300?random=9',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'beauty',
    isBestSeller: true,
    store: {
      name: 'Beauty Hub',
      rating: 4.8,
      verified: true
    }
  },
  {
    id: 'bestseller-2',
    title: 'Hydrating Moisturizer',
    image: 'https://picsum.photos/300/300?random=10',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'beauty',
    isBestSeller: true,
    store: {
      name: 'Skin Care Plus',
      rating: 4.6,
      verified: true
    }
  }
];

const coupons: Offer[] = [
  {
    id: 'coupon-1',
    title: 'Liquid Foundation',
    image: 'https://picsum.photos/300/300?random=11',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'cosmetics',
    store: {
      name: 'Makeup Studio',
      rating: 4.5,
      verified: true
    }
  },
  {
    id: 'coupon-2',
    title: 'Volume Mascara',
    image: 'https://picsum.photos/300/300?random=12',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'cosmetics',
    store: {
      name: 'Beauty Corner',
      rating: 4.7,
      verified: true
    }
  }
];

const newOffers: Offer[] = [
  {
    id: 'newoffer-1',
    title: 'Liquid Foundation',
    image: 'https://picsum.photos/300/300?random=13',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'toys',
    isNew: true,
    store: {
      name: 'Toy World',
      rating: 4.4,
      verified: true
    }
  },
  {
    id: 'newoffer-2',
    title: 'Shape Sorting Game',
    image: 'https://picsum.photos/300/300?random=14',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'toys',
    isNew: true,
    store: {
      name: 'Educational Toys',
      rating: 4.6,
      verified: true
    }
  }
];

const offers: Offer[] = [
  {
    id: 'offer-1',
    title: 'Cork Yoga Block',
    image: 'https://picsum.photos/300/300?random=15',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'fitness',
    store: {
      name: 'Yoga Essentials',
      rating: 4.5,
      verified: true
    }
  },
  {
    id: 'offer-2',
    title: 'Meditation Cushion',
    image: 'https://picsum.photos/300/300?random=16',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'fitness',
    store: {
      name: 'Mindful Living',
      rating: 4.7,
      verified: true
    }
  }
];

const trending: Offer[] = [
  {
    id: 'trending-1',
    title: 'Vitamin C Tablets',
    image: 'https://picsum.photos/300/300?random=17',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'health',
    isTrending: true,
    store: {
      name: 'Health Plus',
      rating: 4.6,
      verified: true
    }
  },
  {
    id: 'trending-2',
    title: 'Atomic Habits',
    image: 'https://picsum.photos/300/300?random=18',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'books',
    isTrending: true,
    store: {
      name: 'Book Store',
      rating: 4.8,
      verified: true
    }
  }
];

const specialOffers: Offer[] = [
  {
    id: 'special-1',
    title: 'Weekly Planner',
    image: 'https://picsum.photos/300/300?random=19',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'stationery',
    isSpecial: true,
    store: {
      name: 'Office Supplies',
      rating: 4.4,
      verified: true
    }
  },
  {
    id: 'special-2',
    title: 'Academic Calendar',
    image: 'https://picsum.photos/300/300?random=20',
    cashBackPercentage: 12,
    distance: '1.5 km away',
    category: 'stationery',
    isSpecial: true,
    store: {
      name: 'Student Corner',
      rating: 4.5,
      verified: true
    }
  }
];

const offerSections: OfferSection[] = [
  {
    id: 'students',
    title: 'Offer for the students',
    offers: offerForStudents,
    viewAllEnabled: true
  },
  {
    id: 'new-arrival',
    title: 'New arrival',
    offers: newArrivals,
    viewAllEnabled: true
  },
  {
    id: 'clearance',
    title: 'Clearance sales page',
    offers: clearanceSales,
    viewAllEnabled: true
  },
  {
    id: 'deals',
    title: 'Deals Page',
    offers: deals,
    viewAllEnabled: true
  },
  {
    id: 'best-discount',
    title: 'Best Discount',
    offers: deals, // Same as deals as per design
    viewAllEnabled: true
  },
  {
    id: 'best-seller',
    title: 'Best Seller',
    offers: bestSellers,
    viewAllEnabled: true
  },
  {
    id: 'coupons',
    title: 'Coupons',
    offers: coupons,
    viewAllEnabled: true
  },
  {
    id: 'new-offers',
    title: 'New Offers',
    offers: newOffers,
    viewAllEnabled: true
  },
  {
    id: 'offers',
    title: 'Offers',
    offers: offers,
    viewAllEnabled: true
  },
  {
    id: 'trending',
    title: 'Trending',
    offers: trending,
    viewAllEnabled: true
  },
  {
    id: 'special-offers',
    title: 'Special Offers',
    offers: specialOffers,
    viewAllEnabled: true
  }
];

export const offersPageData: OffersPageData = {
  heroBanner,
  sections: offerSections,
  categories: [
    {
      id: 'fashion',
      name: 'Fashion',
      icon: 'shirt-outline',
      color: '#8B5CF6',
      offers: [...offerForStudents]
    },
    {
      id: 'electronics',
      name: 'Electronics',
      icon: 'phone-portrait-outline',
      color: '#3B82F6',
      offers: [...newArrivals]
    },
    {
      id: 'beauty',
      name: 'Beauty',
      icon: 'rose-outline',
      color: '#EC4899',
      offers: [...bestSellers, ...coupons]
    },
    {
      id: 'fitness',
      name: 'Fitness',
      icon: 'fitness-outline',
      color: '#10B981',
      offers: [...offers]
    },
    {
      id: 'health',
      name: 'Health',
      icon: 'medical-outline',
      color: '#EF4444',
      offers: [...trending.filter(item => item.category === 'health')]
    }
  ],
  userPoints: 362
};

export default offersPageData;