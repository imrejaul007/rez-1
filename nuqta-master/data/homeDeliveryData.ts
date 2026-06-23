// Home Delivery Mock Data
// This file contains sample data for the Home Delivery system

import {
  HomeDeliveryProduct,
  HomeDeliveryCategory,
  HomeDeliverySection,
  HomeDeliveryPageState,
  HomeDeliveryFilters,
  HomeDeliveryProductsResponse,
  HomeDeliverySectionsResponse,
} from '@/types/home-delivery.types';

// Categories for Home Delivery
export const homeDeliveryCategories: HomeDeliveryCategory[] = [
  {
    id: 'all',
    name: 'All',
    icon: 'apps',
    productCount: 150,
    isActive: true,
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: 'phone-portrait',
    productCount: 65,
    isActive: false,
  },
  {
    id: 'books',
    name: 'Books',
    icon: 'book',
    productCount: 45,
    isActive: false,
  },
  {
    id: 'appliances',
    name: 'Appliances',
    icon: 'home',
    productCount: 40,
    isActive: false,
  },
];

// Sample Products for Home Delivery
export const homeDeliveryProducts: HomeDeliveryProduct[] = [
  // Featured Products - Electronics
  {
    id: 'hd_product_001',
    name: 'iPhone 13',
    brand: 'Apple',
    image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400&h=400&fit=crop',
    price: {
      current: 699,
      original: 799,
      currency: '$',
      discount: 12,
    },
    cashback: {
      percentage: 12,
      maxAmount: 100,
    },
    category: 'Electronics',
    categoryId: 'electronics',
    shipping: {
      type: 'free',
      cost: 0,
      estimatedDays: '1-2 days',
      freeShippingEligible: true,
    },
    rating: {
      value: 4.8,
      count: 1247,
    },
    deliveryTime: 'Under 30min',
    isNew: false,
    isFeatured: true,
    isUnderDollarShipping: false,
    availabilityStatus: 'in_stock',
    tags: ['smartphone', 'apple', 'ios'],
    description: 'Latest iPhone 13 with advanced camera system',
    store: {
      id: 'store_electronics_01',
      name: 'TechMart',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    },
  },
  {
    id: 'hd_product_002',
    name: 'Samsung Galaxy S22',
    brand: 'Samsung',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop',
    price: {
      current: 599,
      original: 699,
      currency: '$',
      discount: 14,
    },
    cashback: {
      percentage: 15,
      maxAmount: 90,
    },
    category: 'Electronics',
    categoryId: 'electronics',
    shipping: {
      type: 'free',
      cost: 0,
      estimatedDays: '1-2 days',
      freeShippingEligible: true,
    },
    rating: {
      value: 4.7,
      count: 892,
    },
    deliveryTime: 'Under 30min',
    isNew: false,
    isFeatured: true,
    isUnderDollarShipping: false,
    availabilityStatus: 'in_stock',
    tags: ['smartphone', 'samsung', 'android'],
    description: 'Samsung Galaxy S22 with stunning display',
    store: {
      id: 'store_electronics_01',
      name: 'TechMart',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    },
  },
  // Under $1 Shipping Products
  {
    id: 'hd_product_003',
    name: 'Kindle Paperwhite',
    brand: 'Amazon',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop',
    price: {
      current: 129,
      original: 149,
      currency: '$',
      discount: 13,
    },
    cashback: {
      percentage: 8,
      maxAmount: 15,
    },
    category: 'Books',
    categoryId: 'books',
    shipping: {
      type: 'paid',
      cost: 0.99,
      estimatedDays: '2-3 days',
      freeShippingEligible: false,
    },
    rating: {
      value: 4.6,
      count: 567,
    },
    deliveryTime: '2-3 days',
    isNew: false,
    isFeatured: false,
    isUnderDollarShipping: true,
    availabilityStatus: 'in_stock',
    tags: ['ebook', 'reader', 'kindle'],
    description: 'Kindle Paperwhite - waterproof, glare-free display',
    store: {
      id: 'store_books_01',
      name: 'BookWorld',
      logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    },
  },
  {
    id: 'hd_product_004',
    name: 'Dell XPS 15',
    brand: 'Dell',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
    price: {
      current: 1299,
      original: 1499,
      currency: '$',
      discount: 13,
    },
    cashback: {
      percentage: 10,
      maxAmount: 150,
    },
    category: 'Electronics',
    categoryId: 'electronics',
    shipping: {
      type: 'paid',
      cost: 0.99,
      estimatedDays: '3-5 days',
      freeShippingEligible: false,
    },
    rating: {
      value: 4.5,
      count: 234,
    },
    deliveryTime: '3-5 days',
    isNew: true,
    isFeatured: false,
    isUnderDollarShipping: true,
    availabilityStatus: 'in_stock',
    tags: ['laptop', 'dell', 'premium'],
    description: 'Dell XPS 15 - Premium laptop with stunning display',
    store: {
      id: 'store_electronics_01',
      name: 'TechMart',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    },
  },
  // Appliances
  {
    id: 'hd_product_005',
    name: 'Instant Pot Duo',
    brand: 'Instant Pot',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    price: {
      current: 79,
      original: 99,
      currency: '$',
      discount: 20,
    },
    cashback: {
      percentage: 12,
      maxAmount: 12,
    },
    category: 'Appliances',
    categoryId: 'appliances',
    shipping: {
      type: 'free',
      cost: 0,
      estimatedDays: '1-2 days',
      freeShippingEligible: true,
    },
    rating: {
      value: 4.9,
      count: 3456,
    },
    deliveryTime: 'Under 30min',
    isNew: false,
    isFeatured: true,
    isUnderDollarShipping: false,
    availabilityStatus: 'in_stock',
    tags: ['kitchen', 'pressure-cooker', 'instant-pot'],
    description: 'Instant Pot Duo - 7-in-1 Electric Pressure Cooker',
    store: {
      id: 'store_appliances_01',
      name: 'HomeGoods',
      logo: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=100&h=100&fit=crop',
    },
  },
  // Books
  {
    id: 'hd_product_006',
    name: 'The Psychology of Money',
    brand: 'Morgan Housel',
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop',
    price: {
      current: 12,
      original: 16,
      currency: '$',
      discount: 25,
    },
    cashback: {
      percentage: 5,
      maxAmount: 2,
    },
    category: 'Books',
    categoryId: 'books',
    shipping: {
      type: 'paid',
      cost: 0.75,
      estimatedDays: '1-2 days',
      freeShippingEligible: false,
    },
    rating: {
      value: 4.8,
      count: 1234,
    },
    deliveryTime: '1-2 days',
    isNew: false,
    isFeatured: false,
    isUnderDollarShipping: true,
    availabilityStatus: 'in_stock',
    tags: ['finance', 'psychology', 'bestseller'],
    description: 'Timeless lessons on wealth, greed, and happiness',
    store: {
      id: 'store_books_01',
      name: 'BookWorld',
      logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    },
  },
];

// Product Sections
export const homeDeliverySections: HomeDeliverySection[] = [
  {
    id: 'featured_products',
    title: 'Featured Products',
    subtitle: 'Top picks with amazing cashback',
    products: homeDeliveryProducts.filter(p => p.isFeatured),
    showViewAll: true,
    maxProducts: 6,
  },
  {
    id: 'under_dollar_shipping',
    title: 'Under $1 Shipping',
    subtitle: 'Great deals with affordable shipping',
    products: homeDeliveryProducts.filter(p => p.isUnderDollarShipping),
    showViewAll: true,
    maxProducts: 6,
  },
];

// Initial Filters
export const initialHomeDeliveryFilters: HomeDeliveryFilters = {
  shipping: [],
  ratings: [],
  deliveryTime: [],
  priceRange: {
    min: 0,
    max: Infinity,
  },
  brands: [],
  availability: [],
};

// Initial Page State
export const initialHomeDeliveryPageState: HomeDeliveryPageState = {
  categories: homeDeliveryCategories,
  products: homeDeliveryProducts,
  filteredProducts: homeDeliveryProducts,
  sections: homeDeliverySections,
  activeCategory: 'all',
  searchQuery: '',
  showSearchBar: false,
  filters: initialHomeDeliveryFilters,
  loading: false,
  error: null,
  hasMore: false,
  page: 1,
  sortBy: 'default',
};

// Helper Functions
export const getProductsByCategory = (categoryId: string): HomeDeliveryProduct[] => {
  if (categoryId === 'all') {
    return homeDeliveryProducts;
  }
  return homeDeliveryProducts.filter(product => product.categoryId === categoryId);
};

export const searchProducts = (query: string): HomeDeliveryProduct[] => {
  if (!query.trim()) {
    return homeDeliveryProducts;
  }
  
  const lowercaseQuery = query.toLowerCase();
  return homeDeliveryProducts.filter(product =>
    product.name.toLowerCase().includes(lowercaseQuery) ||
    product.brand?.toLowerCase().includes(lowercaseQuery) ||
    product.description.toLowerCase().includes(lowercaseQuery) ||
    product.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getCategoryById = (categoryId: string): HomeDeliveryCategory | undefined => {
  return homeDeliveryCategories.find(category => category.id === categoryId);
};

export const getProductById = (productId: string): HomeDeliveryProduct | undefined => {
  return homeDeliveryProducts.find(product => product.id === productId);
};

export const getSectionById = (sectionId: string): HomeDeliverySection | undefined => {
  return homeDeliverySections.find(section => section.id === sectionId);
};

// Mock API Functions
export const fetchHomeDeliveryProducts = async (
  categoryId?: string,
  page: number = 1,
  limit: number = 20
): Promise<HomeDeliveryProductsResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  let products = categoryId && categoryId !== 'all' 
    ? getProductsByCategory(categoryId)
    : homeDeliveryProducts;

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = products.slice(startIndex, endIndex);

  return {
    products: paginatedProducts,
    categories: homeDeliveryCategories,
    totalCount: products.length,
    hasMore: endIndex < products.length,
    page,
  };
};

export const fetchHomeDeliverySections = async (): Promise<HomeDeliverySectionsResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    sections: homeDeliverySections,
  };
};

export const searchHomeDeliveryProducts = async (
  query: string,
  categoryId?: string,
  page: number = 1,
  limit: number = 20
): Promise<HomeDeliveryProductsResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));

  let products = searchProducts(query);
  
  if (categoryId && categoryId !== 'all') {
    products = products.filter(product => product.categoryId === categoryId);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = products.slice(startIndex, endIndex);

  return {
    products: paginatedProducts,
    categories: homeDeliveryCategories,
    totalCount: products.length,
    hasMore: endIndex < products.length,
    page,
  };
};

// Export everything as a namespace for easier imports
export const HomeDeliveryData = {
  categories: homeDeliveryCategories,
  products: homeDeliveryProducts,
  sections: homeDeliverySections,
  initialState: initialHomeDeliveryPageState,
  initialFilters: initialHomeDeliveryFilters,
  helpers: {
    getProductsByCategory,
    searchProducts,
    getCategoryById,
    getProductById,
    getSectionById,
  },
  api: {
    fetchHomeDeliveryProducts,
    fetchHomeDeliverySections,
    searchHomeDeliveryProducts,
  },
};