import {
  GoingOutCategory,
  GoingOutProduct,
  CashbackHubSection,
  GoingOutPageState,
} from '@/types/going-out.types';

// Categories Data
export const goingOutCategories: GoingOutCategory[] = [
  {
    id: 'all',
    name: 'All',
    slug: 'all',
    icon: 'grid-outline',
    isActive: true,
    productCount: 120,
  },
  {
    id: 'perfume',
    name: 'Perfume',
    slug: 'perfume',
    icon: 'flower-outline',
    isActive: false,
    productCount: 25,
  },
  {
    id: 'gold',
    name: 'Gold',
    slug: 'gold',
    icon: 'diamond-outline',
    isActive: false,
    productCount: 18,
  },
  {
    id: 'gifts',
    name: 'Gifts',
    slug: 'gifts',
    icon: 'gift-outline',
    isActive: false,
    productCount: 45,
  },
];

// Products Data Based on Screenshots
export const goingOutProducts: GoingOutProduct[] = [
  {
    id: 'product_001',
    name: 'Aroka',
    brand: 'Fashion Brand',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop',
    price: {
      current: 2499,
      original: 3999,
      currency: '₹',
      discount: 37,
    },
    cashback: {
      percentage: 12,
      maxAmount: 500,
    },
    category: 'Fashion',
    categoryId: 'all',
    rating: {
      value: 4.5,
      count: 128,
    },
    isNew: false,
    isFeatured: true,
    availabilityStatus: 'in_stock',
    tags: ['trending', 'fashion', 'dress'],
    description: 'Elegant red dress perfect for special occasions',
    store: {
      id: 'store_fashion_01',
      name: 'Fashion Hub',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    },
  },
  {
    id: 'product_002',
    name: 'Men\'s Shirt',
    brand: 'Classic Wear',
    image: 'https://images.unsplash.com/photo-1602810316693-3667c854239a?w=400&h=400&fit=crop',
    price: {
      current: 1299,
      original: 1999,
      currency: '₹',
      discount: 35,
    },
    cashback: {
      percentage: 18,
      maxAmount: 300,
    },
    category: 'Fashion',
    categoryId: 'all',
    rating: {
      value: 4.3,
      count: 89,
    },
    isNew: false,
    isFeatured: true,
    availabilityStatus: 'in_stock',
    tags: ['formal', 'men', 'shirt'],
    description: 'Premium cotton formal shirt for men',
    store: {
      id: 'store_fashion_02',
      name: 'Men\'s Collection',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    },
  },
  {
    id: 'product_003',
    name: 'Shoes',
    brand: 'Sport Pro',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop',
    price: {
      current: 3499,
      original: 4999,
      currency: '₹',
      discount: 30,
    },
    cashback: {
      percentage: 8,
      maxAmount: 400,
    },
    category: 'Footwear',
    categoryId: 'all',
    rating: {
      value: 4.6,
      count: 245,
    },
    isNew: false,
    isFeatured: true,
    availabilityStatus: 'in_stock',
    tags: ['sports', 'running', 'comfortable'],
    description: 'Premium sports shoes with excellent comfort',
    store: {
      id: 'store_footwear_01',
      name: 'Shoe Palace',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    },
  },
  {
    id: 'product_004',
    name: 'Earing',
    brand: 'Gold Craft',
    image: 'https://images.unsplash.com/photo-1588444837495-c6cfeb4b07b5?w=400&h=400&fit=crop',
    price: {
      current: 8999,
      original: 12999,
      currency: '₹',
      discount: 31,
    },
    cashback: {
      percentage: 6,
      maxAmount: 800,
    },
    category: 'Jewelry',
    categoryId: 'gold',
    rating: {
      value: 4.8,
      count: 67,
    },
    isNew: false,
    isFeatured: true,
    availabilityStatus: 'in_stock',
    tags: ['gold', 'jewelry', 'traditional'],
    description: 'Beautiful traditional gold earrings',
    store: {
      id: 'store_jewelry_01',
      name: 'Gold Palace',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    },
  },
  {
    id: 'product_005',
    name: 'Premium Perfume',
    brand: 'Scent Luxury',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
    price: {
      current: 4999,
      original: 6999,
      currency: '₹',
      discount: 29,
    },
    cashback: {
      percentage: 10,
      maxAmount: 600,
    },
    category: 'Fragrance',
    categoryId: 'perfume',
    rating: {
      value: 4.4,
      count: 156,
    },
    isNew: true,
    isFeatured: true,
    availabilityStatus: 'in_stock',
    tags: ['luxury', 'fragrance', 'long-lasting'],
    description: 'Long-lasting premium fragrance for special occasions',
    store: {
      id: 'store_perfume_01',
      name: 'Fragrance World',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    },
  },
  {
    id: 'product_006',
    name: 'Travel Experience',
    brand: 'Adventure Tours',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
    price: {
      current: 15999,
      original: 19999,
      currency: '₹',
      discount: 20,
    },
    cashback: {
      percentage: 5,
      maxAmount: 1000,
    },
    category: 'Travel',
    categoryId: 'all',
    rating: {
      value: 4.7,
      count: 234,
    },
    isNew: false,
    isFeatured: true,
    availabilityStatus: 'in_stock',
    tags: ['travel', 'adventure', 'scenic'],
    description: 'Beautiful mountain travel experience package',
    store: {
      id: 'store_travel_01',
      name: 'Adventure Hub',
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop',
    },
  },
];

// Cashback Hub Sections
export const cashbackHubSections: CashbackHubSection[] = [
  {
    id: 'cashback_hub_featured',
    title: 'Cashback Hub',
    subtitle: 'Best deals with maximum cashback',
    products: [
      goingOutProducts[0], // Aroka
      goingOutProducts[1], // Men's Shirt
      goingOutProducts[2], // Shoes
      goingOutProducts[3], // Earing
    ],
    showViewAll: true,
  },
  {
    id: 'new_arrivals',
    title: 'New Arrivals',
    subtitle: 'Latest products just for you',
    products: [
      goingOutProducts[4], // Premium Perfume
      goingOutProducts[5], // Travel Experience
      goingOutProducts[0], // Aroka
      goingOutProducts[2], // Shoes
    ],
    showViewAll: true,
  },
  {
    id: 'trending',
    title: 'Trending',
    subtitle: 'Most popular items right now',
    products: [
      goingOutProducts[2], // Shoes
      goingOutProducts[3], // Earing
      goingOutProducts[1], // Men's Shirt
      goingOutProducts[5], // Travel Experience
    ],
    showViewAll: true,
  },
];

// Initial Page State
export const initialGoingOutPageState: GoingOutPageState = {
  categories: goingOutCategories,
  products: goingOutProducts,
  filteredProducts: goingOutProducts,
  cashbackHubSections: cashbackHubSections,
  activeCategory: 'all',
  searchQuery: '',
  showSearchBar: false,
  loading: false,
  error: null,
  hasMore: false,
  page: 1,
  sortBy: 'default',
};

// Helper Functions
export const getProductsByCategory = (categoryId: string): GoingOutProduct[] => {
  if (categoryId === 'all') {
    return goingOutProducts;
  }
  return goingOutProducts.filter(product => 
    product.categoryId === categoryId || 
    product.category.toLowerCase().includes(categoryId.toLowerCase())
  );
};

export const searchProducts = (query: string): GoingOutProduct[] => {
  if (!query.trim()) {
    return goingOutProducts;
  }
  
  const searchTerms = query.toLowerCase().split(' ');
  return goingOutProducts.filter(product => {
    const searchableText = `${product.name} ${product.brand} ${product.description} ${product.tags?.join(' ')}`.toLowerCase();
    return searchTerms.every(term => searchableText.includes(term));
  });
};

export const getCategoryById = (categoryId: string): GoingOutCategory | undefined => {
  return goingOutCategories.find(category => category.id === categoryId);
};

export const getProductById = (productId: string): GoingOutProduct | undefined => {
  return goingOutProducts.find(product => product.id === productId);
};

export const getSectionById = (sectionId: string): CashbackHubSection | undefined => {
  return cashbackHubSections.find(section => section.id === sectionId);
};

// Mock API Functions (Backend-ready)
export const fetchGoingOutProducts = async (categoryId?: string, searchQuery?: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  let products = goingOutProducts;
  
  if (categoryId && categoryId !== 'all') {
    products = getProductsByCategory(categoryId);
  }
  
  if (searchQuery) {
    products = searchProducts(searchQuery);
  }
  
  return {
    products,
    categories: goingOutCategories,
    pagination: {
      page: 1,
      limit: 20,
      total: products.length,
      hasMore: false,
    },
  };
};

export const fetchCashbackHubSections = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  return {
    sections: cashbackHubSections,
    totalProducts: goingOutProducts.length,
  };
};

// Export all data for easy access
export default {
  categories: goingOutCategories,
  products: goingOutProducts,
  cashbackHubSections,
  initialState: initialGoingOutPageState,
  helpers: {
    getProductsByCategory,
    searchProducts,
    getCategoryById,
    getProductById,
    getSectionById,
  },
  api: {
    fetchGoingOutProducts,
    fetchCashbackHubSections,
  },
};