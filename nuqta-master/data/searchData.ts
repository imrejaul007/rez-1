import {
  SearchSection,
  SearchCategory,
  SearchResult,
  SearchSuggestion,
  SearchFilter,
  SearchHistory,
} from '@/types/search.types';

// Search Categories based on the screenshots
export const goingOutCategories: SearchCategory[] = [
  {
    id: 'perfume-1',
    name: 'Perfume',
    slug: 'perfume',
    description: 'Premium fragrances and perfumes',
    cashbackPercentage: 12,
    isPopular: true,
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop',
  },
  {
    id: 'gold-1',
    name: 'Gold',
    slug: 'gold',
    description: 'Gold jewelry and ornaments',
    cashbackPercentage: 18,
    isPopular: true,
    image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=200&h=200&fit=crop',
  },
  {
    id: 'fashion-1',
    name: 'Fashion',
    slug: 'fashion',
    description: 'Latest fashion and clothing',
    cashbackPercentage: 8,
    isPopular: false,
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop',
  },
  {
    id: 'gifts-1',
    name: 'Gifts',
    slug: 'gifts',
    description: 'Perfect gifts for every occasion',
    cashbackPercentage: 6,
    isPopular: true,
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=200&h=200&fit=crop',
  },
];

export const homeDeliveryCategories: SearchCategory[] = [
  {
    id: 'electronics-1',
    name: 'Electronic',
    slug: 'electronics',
    description: 'Latest electronics and gadgets',
    cashbackPercentage: 10,
    isPopular: true,
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop',
  },
  {
    id: 'restaurant-1',
    name: 'Restaurant',
    slug: 'restaurant',
    description: 'Food delivery from top restaurants',
    cashbackPercentage: 5,
    isPopular: true,
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop',
  },
  {
    id: 'groceries-1',
    name: 'Groceries',
    slug: 'groceries',
    description: 'Fresh groceries delivered to your door',
    cashbackPercentage: 12,
    isPopular: false,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
  },
  {
    id: 'fruits-1',
    name: 'Fruits',
    slug: 'fruits',
    description: 'Fresh fruits and vegetables',
    cashbackPercentage: 15,
    isPopular: true,
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&h=200&fit=crop',
  },
  {
    id: 'meat-1',
    name: 'Meat & Seafood',
    slug: 'meat',
    description: 'Fresh meat and seafood',
    cashbackPercentage: 8,
    isPopular: false,
    image: 'https://images.unsplash.com/photo-1588347818121-31f31b4db071?w=200&h=200&fit=crop',
  },
  {
    id: 'pets-1',
    name: 'Pet Care',
    slug: 'pets',
    description: 'Pet food and accessories',
    cashbackPercentage: 7,
    isPopular: false,
    image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=200&h=200&fit=crop',
  },
];

// Search Sections
export const searchSections: SearchSection[] = [
  {
    id: 'going-out',
    title: 'Going Out',
    subtitle: 'Services for when you\'re out and about',
    categories: goingOutCategories,
    viewAllLink: '/categories/going-out',
  },
  {
    id: 'home-delivery',
    title: 'Home Delivery',
    subtitle: 'Everything delivered to your doorstep',
    categories: homeDeliveryCategories,
    viewAllLink: '/categories/home-delivery',
  },
];

// Search Results (dummy data for various categories)
export const searchResults: SearchResult[] = [
  // Perfume results
  {
    id: 'result-1',
    title: 'Chanel No. 5 Eau de Parfum',
    description: 'Classic and timeless fragrance for women',
    category: 'Perfume',
    cashbackPercentage: 12,
    rating: 4.8,
    price: { current: 8999, original: 11999, currency: 'INR' },
    location: 'BTM Layout, Bangalore',
    isPopular: true,
    tags: ['luxury', 'women', 'classic'],
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=300&h=300&fit=crop',
  },
  {
    id: 'result-2',
    title: 'Dior Sauvage Men\'s Cologne',
    description: 'Fresh and woody fragrance for men',
    category: 'Perfume',
    cashbackPercentage: 15,
    rating: 4.7,
    price: { current: 7499, original: 9999, currency: 'INR' },
    location: 'Koramangala, Bangalore',
    isPopular: true,
    tags: ['men', 'woody', 'fresh'],
    image: 'https://images.unsplash.com/photo-1594736797933-d0bdb4f30565?w=300&h=300&fit=crop',
  },
  
  // Gold jewelry results
  {
    id: 'result-3',
    title: 'Traditional Gold Necklace Set',
    description: 'Handcrafted 22K gold necklace with matching earrings',
    category: 'Gold',
    cashbackPercentage: 18,
    rating: 4.9,
    price: { current: 45000, original: 52000, currency: 'INR' },
    location: 'Commercial Street, Bangalore',
    isPopular: true,
    tags: ['traditional', '22k', 'handcrafted'],
    image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=300&h=300&fit=crop',
  },
  {
    id: 'result-4',
    title: 'Modern Gold Bracelet',
    description: 'Contemporary design 18K gold bracelet',
    category: 'Gold',
    cashbackPercentage: 16,
    rating: 4.6,
    price: { current: 25000, original: 28000, currency: 'INR' },
    location: 'Brigade Road, Bangalore',
    isPopular: false,
    tags: ['modern', '18k', 'bracelet'],
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop',
  },

  // Fashion results
  {
    id: 'result-5',
    title: 'Designer Evening Dress',
    description: 'Elegant evening dress for special occasions',
    category: 'Fashion',
    cashbackPercentage: 8,
    rating: 4.5,
    price: { current: 3999, original: 5999, currency: 'INR' },
    location: 'UB City Mall, Bangalore',
    isPopular: true,
    tags: ['evening', 'designer', 'elegant'],
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=300&fit=crop',
  },
  {
    id: 'result-6',
    title: 'Casual Summer Collection',
    description: 'Comfortable and stylish summer wear',
    category: 'Fashion',
    cashbackPercentage: 10,
    rating: 4.3,
    price: { current: 1599, original: 2499, currency: 'INR' },
    location: 'Forum Mall, Bangalore',
    isPopular: false,
    tags: ['summer', 'casual', 'comfortable'],
    image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&h=300&fit=crop',
  },

  // Electronics results
  {
    id: 'result-7',
    title: 'iPhone 15 Pro Max',
    description: 'Latest flagship iPhone with advanced features',
    category: 'Electronic',
    cashbackPercentage: 10,
    rating: 4.8,
    price: { current: 134900, original: 139900, currency: 'INR' },
    location: 'Electronics Store, HSR Layout',
    isPopular: true,
    tags: ['iphone', 'flagship', 'smartphone'],
    image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=300&h=300&fit=crop',
  },
  {
    id: 'result-8',
    title: 'MacBook Air M3',
    description: '13-inch MacBook Air with M3 chip',
    category: 'Electronic',
    cashbackPercentage: 12,
    rating: 4.7,
    price: { current: 114900, original: 119900, currency: 'INR' },
    location: 'Apple Store, UB City',
    isPopular: true,
    tags: ['macbook', 'm3', 'laptop'],
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop',
  },

  // Restaurant results
  {
    id: 'result-9',
    title: 'Biryani Palace',
    description: 'Authentic Hyderabadi biryani and Indian cuisine',
    category: 'Restaurant',
    cashbackPercentage: 5,
    rating: 4.4,
    price: { current: 299, original: 399, currency: 'INR' },
    location: 'Indiranagar, Bangalore',
    isPopular: true,
    tags: ['biryani', 'indian', 'authentic'],
    image: 'https://images.unsplash.com/photo-1563379091339-03246963d888?w=300&h=300&fit=crop',
  },
  {
    id: 'result-10',
    title: 'Pizza Corner',
    description: 'Wood-fired pizzas and Italian delicacies',
    category: 'Restaurant',
    cashbackPercentage: 8,
    rating: 4.2,
    price: { current: 399, original: 499, currency: 'INR' },
    location: 'Koramangala, Bangalore',
    isPopular: false,
    tags: ['pizza', 'italian', 'wood-fired'],
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=300&fit=crop',
  },

  // Groceries results
  {
    id: 'result-11',
    title: 'Fresh Vegetables Bundle',
    description: 'Daily fresh vegetables delivered to your door',
    category: 'Groceries',
    cashbackPercentage: 12,
    rating: 4.6,
    price: { current: 599, original: 699, currency: 'INR' },
    location: 'BigBasket Warehouse',
    isPopular: true,
    tags: ['fresh', 'vegetables', 'daily'],
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=300&fit=crop',
  },
  {
    id: 'result-12',
    title: 'Organic Rice & Pulses',
    description: 'Premium quality organic rice and lentils',
    category: 'Groceries',
    cashbackPercentage: 15,
    rating: 4.7,
    price: { current: 899, original: 1099, currency: 'INR' },
    location: 'Organic Store, Jayanagar',
    isPopular: false,
    tags: ['organic', 'rice', 'pulses'],
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop',
  },
];

// Search Suggestions
export const searchSuggestions: SearchSuggestion[] = [
  {
    id: 'suggestion-1',
    text: 'Perfume',
    type: 'category',
    categoryId: 'perfume-1',
    resultCount: 45,
    isRecent: false,
  },
  {
    id: 'suggestion-2',
    text: 'Gold jewelry',
    type: 'category',
    categoryId: 'gold-1',
    resultCount: 23,
    isRecent: true,
  },
  {
    id: 'suggestion-3',
    text: 'iPhone 15',
    type: 'product',
    resultCount: 8,
    isRecent: true,
  },
  {
    id: 'suggestion-4',
    text: 'Biryani delivery',
    type: 'service',
    resultCount: 67,
    isRecent: false,
  },
  {
    id: 'suggestion-5',
    text: 'Designer dresses',
    type: 'product',
    resultCount: 34,
    isRecent: false,
  },
  {
    id: 'suggestion-6',
    text: 'Fresh fruits',
    type: 'category',
    categoryId: 'fruits-1',
    resultCount: 156,
    isRecent: true,
  },
  {
    id: 'suggestion-7',
    text: 'Electronics store near me',
    type: 'location',
    resultCount: 12,
    isRecent: false,
  },
  {
    id: 'suggestion-8',
    text: 'Gift hampers',
    type: 'product',
    categoryId: 'gifts-1',
    resultCount: 89,
    isRecent: false,
  },
];

// Search Filters
export const searchFilters: SearchFilter[] = [
  {
    id: 'category-filter',
    name: 'Category',
    type: 'category',
    values: [
      { id: 'cat-perfume', label: 'Perfume', value: 'perfume', count: 45 },
      { id: 'cat-gold', label: 'Gold', value: 'gold', count: 23 },
      { id: 'cat-fashion', label: 'Fashion', value: 'fashion', count: 78 },
      { id: 'cat-electronics', label: 'Electronics', value: 'electronics', count: 156 },
      { id: 'cat-restaurant', label: 'Restaurant', value: 'restaurant', count: 234 },
      { id: 'cat-groceries', label: 'Groceries', value: 'groceries', count: 189 },
    ],
  },
  {
    id: 'cashback-filter',
    name: 'Cashback',
    type: 'cashback',
    values: [
      { id: 'cb-5', label: '5% and above', value: 5, count: 456 },
      { id: 'cb-10', label: '10% and above', value: 10, count: 234 },
      { id: 'cb-15', label: '15% and above', value: 15, count: 123 },
      { id: 'cb-20', label: '20% and above', value: 20, count: 45 },
    ],
  },
  {
    id: 'price-filter',
    name: 'Price Range',
    type: 'price',
    values: [
      { id: 'price-1', label: 'Under ₹500', value: '0-500', count: 234 },
      { id: 'price-2', label: '₹500 - ₹2000', value: '500-2000', count: 345 },
      { id: 'price-3', label: '₹2000 - ₹10000', value: '2000-10000', count: 456 },
      { id: 'price-4', label: 'Above ₹10000', value: '10000+', count: 123 },
    ],
  },
  {
    id: 'rating-filter',
    name: 'Rating',
    type: 'rating',
    values: [
      { id: 'rating-4', label: '4+ Stars', value: 4, count: 567 },
      { id: 'rating-3', label: '3+ Stars', value: 3, count: 789 },
      { id: 'rating-2', label: '2+ Stars', value: 2, count: 890 },
    ],
  },
];

// Recent search history (dummy data)
export const searchHistory: SearchHistory[] = [
  {
    id: 'history-1',
    query: 'iPhone 15 Pro',
    timestamp: '2024-08-22T10:30:00Z',
    resultCount: 8,
    selectedCategory: 'electronics',
  },
  {
    id: 'history-2',
    query: 'Gold necklace',
    timestamp: '2024-08-22T09:15:00Z',
    resultCount: 23,
    selectedCategory: 'gold',
  },
  {
    id: 'history-3',
    query: 'Biryani delivery',
    timestamp: '2024-08-21T19:45:00Z',
    resultCount: 67,
    selectedCategory: 'restaurant',
  },
  {
    id: 'history-4',
    query: 'Designer dress',
    timestamp: '2024-08-21T15:20:00Z',
    resultCount: 34,
    selectedCategory: 'fashion',
  },
  {
    id: 'history-5',
    query: 'Fresh fruits',
    timestamp: '2024-08-21T08:10:00Z',
    resultCount: 156,
    selectedCategory: 'fruits',
  },
];

// Complete dummy data export
export const searchDummyData = {
  sections: searchSections,
  categories: {
    goingOut: goingOutCategories,
    homeDelivery: homeDeliveryCategories,
  },
  results: searchResults,
  suggestions: searchSuggestions,
  filters: searchFilters,
  history: searchHistory,
};

// Utility functions for search data management
export const getCategoryById = (categoryId: string): SearchCategory | undefined => {
  const allCategories = [...goingOutCategories, ...homeDeliveryCategories];
  return allCategories.find(category => category.id === categoryId);
};

export const getCategoriesBySection = (sectionId: string): SearchCategory[] => {
  switch (sectionId) {
    case 'going-out':
      return goingOutCategories;
    case 'home-delivery':
      return homeDeliveryCategories;
    default:
      return [];
  }
};

export const searchInResults = (query: string, category?: string): SearchResult[] => {
  return searchResults.filter(result => {
    const matchesQuery = result.title.toLowerCase().includes(query.toLowerCase()) ||
                        result.description.toLowerCase().includes(query.toLowerCase()) ||
                        result.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
    
    const matchesCategory = !category || result.category.toLowerCase() === category.toLowerCase();
    
    return matchesQuery && matchesCategory;
  });
};

export const getPopularCategories = (): SearchCategory[] => {
  const allCategories = [...goingOutCategories, ...homeDeliveryCategories];
  return allCategories.filter(category => category.isPopular);
};

export const getSuggestionsByQuery = (query: string): SearchSuggestion[] => {
  if (!query.trim()) return searchSuggestions.slice(0, 5);
  
  return searchSuggestions.filter(suggestion =>
    suggestion.text.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);
};

// Mock API functions (for future backend integration)
export const mockSearchAPI = {
  getSearchSections: async (): Promise<SearchSection[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return searchSections;
  },

  searchResults: async (query: string, filters?: any): Promise<SearchResult[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return searchInResults(query, filters?.category);
  },

  getSuggestions: async (query: string): Promise<SearchSuggestion[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return getSuggestionsByQuery(query);
  },

  getFilters: async (): Promise<SearchFilter[]> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return searchFilters;
  },
};

export default {
  searchSections,
  goingOutCategories,
  homeDeliveryCategories,
  searchResults,
  searchSuggestions,
  searchFilters,
  searchHistory,
  searchDummyData,
  mockSearchAPI,
  // Utility functions
  getCategoryById,
  getCategoriesBySection,
  searchInResults,
  getPopularCategories,
  getSuggestionsByQuery,
};