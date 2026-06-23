// data/voucherData.ts - Mock data for Online Voucher system

import { BRAND } from '@/constants/brand';
import {
  VoucherState, 
  Brand, 
  Category, 
  Offer, 
  HeroCarouselItem,
  VoucherStats 
} from '@/types/voucher.types';

export const VoucherData = {
  // Initial state
  initialState: {
    currentView: 'main',
    searchQuery: '',
    selectedCategory: null,
    selectedBrand: null,
    brands: [],
    allBrands: [], // Store all brands for local filtering
    categories: [],
    featuredOffers: [],
    loading: false,
    error: null,
    userCoins: 382,
    filters: {
      cashbackRange: [0, 30],
      minRating: 0,
      sortBy: 'popularity',
      categories: []
    }
  } as VoucherState,

  // Categories based on screenshots
  categories: [
    {
      id: 'fashion',
      name: 'Fashion',
      icon: '👗',
      color: '#EC4899',
      backgroundColor: '#FCE7F3',
      brandCount: 25,
      slug: 'fashion',
      featuredBrands: []
    },
    {
      id: 'food-delivery',
      name: 'Food delivery',
      icon: '🍔',
      color: '#ffcd57',
      backgroundColor: '#faf1e0',
      brandCount: 15,
      slug: 'food-delivery',
      featuredBrands: []
    },
    {
      id: 'beverage',
      name: 'Beverage',
      icon: '🥤',
      color: '#3B82F6',
      backgroundColor: '#DBEAFE',
      brandCount: 8,
      slug: 'beverage',
      featuredBrands: []
    },
    {
      id: 'games',
      name: 'Games',
      icon: '🎮',
      color: '#8B5CF6',
      backgroundColor: '#EDE9FE',
      brandCount: 12,
      slug: 'games',
      featuredBrands: []
    },
    {
      id: 'grocery-delivery',
      name: 'Grocery delivery',
      icon: '🛒',
      color: '#F59E0B',
      backgroundColor: '#FEF3C7',
      brandCount: 10,
      slug: 'grocery-delivery',
      featuredBrands: []
    }
  ] as Category[],

  // Mock brands based on screenshots
  brands: [
    // Fashion Brands
    {
      id: 'myntra',
      name: 'Myntra',
      logo: 'M',
      logoColor: '#FF3E6C',
      rating: 4.9,
      reviewCount: '7.8k+ users',
      rewardCount: '55 lakh+ Rewards given in last month',
      cashbackRate: 20,
      description: 'Fashion and lifestyle platform',
      categories: ['fashion'],
      featured: true,
      newlyAdded: false,
      location: 'Mumbai, Maharashtra 400001',
      address: '765 MG Road, Mumbai, Maharashtra 400001',
      offers: [],
      bigSavingDays: {
        title: 'Big Saving Days',
        description: '50-90% off Across Categories',
        discount: '50-90%'
      },
      extraOffers: ['+ Extra 10% off on Select Cards'],
      nuqtaRewards: {
        percentage: 10,
        description: `Upto 10% ${BRAND.APP_NAME} Rewards`
      },
      illustration: '👗👗👗',
      backgroundColor: '#F8F9FA'
    },
    {
      id: 'ajio',
      name: 'AJIO',
      logo: 'AJIO',
      logoColor: '#000',
      rating: 4.5,
      reviewCount: '5.2k+ users',
      cashbackRate: 10,
      description: 'Fashion destination',
      categories: ['fashion'],
      featured: true,
      newlyAdded: false,
      location: 'Multiple locations',
      offers: [],
      backgroundColor: '#FFF'
    },
    
    // Luxury Fashion Brands
    {
      id: 'hollister',
      name: 'HOLLISTER',
      logo: 'H',
      logoColor: '#000',
      rating: 4.3,
      reviewCount: '2.1k+ users',
      cashbackRate: 10,
      description: 'California lifestyle brand',
      categories: ['fashion'],
      featured: false,
      newlyAdded: false,
      location: 'Global',
      offers: [],
      backgroundColor: '#FFF'
    },
    {
      id: 'dg',
      name: 'D&G',
      logo: 'D&G',
      logoColor: '#000',
      rating: 4.8,
      reviewCount: '1.8k+ users',
      cashbackRate: 10,
      description: 'Luxury fashion brand',
      categories: ['fashion'],
      featured: false,
      newlyAdded: false,
      location: 'Global',
      offers: [],
      backgroundColor: '#FFF'
    },
    {
      id: 'givenchy',
      name: 'GIVENCHY',
      logo: 'G',
      logoColor: '#000',
      rating: 4.9,
      reviewCount: '1.2k+ users',
      cashbackRate: 10,
      description: 'French luxury fashion house',
      categories: ['fashion'],
      featured: false,
      newlyAdded: false,
      location: 'Global',
      offers: [],
      backgroundColor: '#FFF'
    },
    {
      id: 'dior',
      name: 'Dior',
      logo: 'Dior',
      logoColor: '#000',
      rating: 4.9,
      reviewCount: '2.5k+ users',
      cashbackRate: 10,
      description: 'French luxury goods company',
      categories: ['fashion'],
      featured: false,
      newlyAdded: false,
      location: 'Global',
      offers: [],
      backgroundColor: '#FFF'
    },
    {
      id: 'chanel',
      name: 'CHANEL',
      logo: '🔗',
      logoColor: '#000',
      rating: 4.9,
      reviewCount: '3.1k+ users',
      cashbackRate: 10,
      description: 'French luxury fashion house',
      categories: ['fashion'],
      featured: false,
      newlyAdded: false,
      location: 'Global',
      offers: [],
      backgroundColor: '#FFF'
    },
    {
      id: 'gucci',
      name: 'GUCCI',
      logo: 'GUCCI',
      logoColor: '#000',
      rating: 4.8,
      reviewCount: '4.2k+ users',
      cashbackRate: 10,
      description: 'Italian luxury fashion house',
      categories: ['fashion'],
      featured: false,
      newlyAdded: false,
      location: 'Global',
      offers: [],
      backgroundColor: '#FFF'
    },
    {
      id: 'lacoste',
      name: 'LACOSTE',
      logo: '🐊',
      logoColor: '#00A651',
      rating: 4.9,
      reviewCount: '3.8k+ users',
      cashbackRate: 20,
      description: 'French clothing company',
      categories: ['fashion'],
      featured: true,
      newlyAdded: false,
      location: 'Myntra',
      address: '765 MG Road, Mumbai, Maharashtra 400001',
      offers: [],
      backgroundColor: '#FFF'
    },
    {
      id: 'levis',
      name: 'Levi\'s',
      logo: 'Levi\'s',
      logoColor: '#DC143C',
      rating: 4.9,
      reviewCount: '6.2k+ users',
      cashbackRate: 20,
      description: 'American denim brand',
      categories: ['fashion'],
      featured: true,
      newlyAdded: false,
      location: 'Amazon',
      address: '45 Connaught Place, New Delhi, Delhi 110001',
      offers: [],
      backgroundColor: '#FFF'
    },
    {
      id: 'ck',
      name: 'Calvin Klein',
      logo: 'ck',
      logoColor: '#000',
      rating: 4.9,
      reviewCount: '4.5k+ users',
      cashbackRate: 20,
      description: 'American fashion house',
      categories: ['fashion'],
      featured: true,
      newlyAdded: false,
      location: 'Flipkart',
      address: '58 Tail Waggers Road, Vasant Vihar, New Delhi – 110057',
      offers: [],
      backgroundColor: '#FFF'
    },
    
    // E-commerce & Others
    {
      id: 'amazon',
      name: 'Amazon',
      logo: 'amazon pay',
      logoColor: '#FF9900',
      rating: 4.8,
      reviewCount: '50k+ users',
      cashbackRate: 20,
      description: 'Global e-commerce platform',
      categories: ['fashion', 'grocery-delivery', 'games'],
      featured: true,
      newlyAdded: false,
      location: 'Multiple locations',
      address: '45 Connaught Place, New Delhi, Delhi 110001',
      offers: [],
      backgroundColor: '#FFF'
    },
    {
      id: 'zepto',
      name: 'Zepto',
      logo: '⚡',
      logoColor: '#7C3AED',
      rating: 4.7,
      reviewCount: '15k+ users',
      cashbackRate: 12,
      description: '10-minute grocery delivery',
      categories: ['grocery-delivery'],
      featured: false,
      newlyAdded: true,
      location: 'Multiple cities',
      offers: [],
      backgroundColor: '#F3E8FF'
    },
    {
      id: 'air-india',
      name: 'Air India',
      logo: '✈️',
      logoColor: '#DC143C',
      rating: 4.2,
      reviewCount: '8k+ users',
      cashbackRate: 12,
      description: 'National airline of India',
      categories: ['travel'],
      featured: false,
      newlyAdded: true,
      location: 'India',
      offers: [],
      backgroundColor: '#EBF4FF'
    },
    {
      id: 'movie-time',
      name: 'Movie Time',
      logo: '🎬',
      logoColor: '#ffcd57',
      rating: 4.4,
      reviewCount: '12k+ users',
      cashbackRate: 12,
      description: 'Movie tickets and entertainment',
      categories: ['entertainment'],
      featured: false,
      newlyAdded: true,
      location: 'Multiple cities',
      offers: [],
      backgroundColor: '#faf1e0'
    }
  ] as Brand[],

  // Hero carousel items
  heroCarousel: [
    {
      id: 'myntra-hero',
      title: 'make my trip',
      subtitle: 'Cashback upto 10%',
      image: 'travel-illustration',
      backgroundColor: '#F97316',
      textColor: '#FFFFFF',
      cashbackRate: 10,
      brandId: 'myntra'
    },
    {
      id: 'fashion-hero',
      title: 'Fashion Sale',
      subtitle: 'Up to 70% off',
      image: 'fashion-illustration',
      backgroundColor: '#EC4899',
      textColor: '#FFFFFF',
      cashbackRate: 15
    }
  ] as HeroCarouselItem[],

  // Statistics
  stats: {
    totalBrands: 50,
    totalCategories: 5,
    totalRewardsGiven: '55 lakh+',
    averageRating: 4.7,
    topCategories: [],
    recentlyAdded: []
  } as VoucherStats,

  // API simulation
  api: {
    // Get all brands with optional filtering
    getBrands: async (request?: any): Promise<Brand[]> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      let brands = [...VoucherData.brands];
      
      if (request?.query) {
        const query = request.query.toLowerCase();
        brands = brands.filter(brand => 
          brand.name.toLowerCase().includes(query) ||
          brand.description.toLowerCase().includes(query)
        );
      }
      
      if (request?.categoryId) {
        brands = brands.filter(brand => 
          brand.categories.includes(request.categoryId)
        );
      }
      
      return brands;
    },

    // Get categories
    getCategories: async (): Promise<Category[]> => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return VoucherData.categories;
    },

    // Get brand details
    getBrandDetails: async (brandId: string): Promise<Brand | null> => {
      await new Promise(resolve => setTimeout(resolve, 600));
      return VoucherData.brands.find(brand => brand.id === brandId) || null;
    },

    // Get featured offers
    getFeaturedOffers: async (): Promise<Offer[]> => {
      await new Promise(resolve => setTimeout(resolve, 400));
      return [];
    },

    // Search brands
    searchBrands: async (query: string): Promise<Brand[]> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!query.trim()) return [];
      
      const searchQuery = query.toLowerCase();
      return VoucherData.brands.filter(brand => 
        brand.name.toLowerCase().includes(searchQuery) ||
        brand.description.toLowerCase().includes(searchQuery) ||
        brand.categories.some(cat => cat.includes(searchQuery))
      );
    }
  },

  // Helper functions
  helpers: {
    formatCashback: (rate: number, max?: number): string => {
      if (max) {
        return `Upto ${rate}% cash back (Max ₹${max})`;
      }
      return `Upto ${rate}% cash back`;
    },

    formatRating: (rating: number): string => {
      return rating.toFixed(1);
    },

    getCategoryBySlug: (slug: string): Category | null => {
      return VoucherData.categories.find(cat => cat.slug === slug) || null;
    },

    getBrandsByCategory: (categoryId: string): Brand[] => {
      return VoucherData.brands.filter(brand => 
        brand.categories.includes(categoryId)
      );
    },

    getNewlyAddedBrands: (): Brand[] => {
      return VoucherData.brands.filter(brand => brand.newlyAdded);
    },

    getFeaturedBrands: (): Brand[] => {
      return VoucherData.brands.filter(brand => brand.featured);
    },

    sortBrands: (brands: Brand[], sortBy: 'cashback' | 'rating' | 'popularity'): Brand[] => {
      return [...brands].sort((a, b) => {
        switch (sortBy) {
          case 'cashback':
            return b.cashbackRate - a.cashbackRate;
          case 'rating':
            return b.rating - a.rating;
          case 'popularity':
            return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
          default:
            return 0;
        }
      });
    }
  }
};

export default VoucherData;