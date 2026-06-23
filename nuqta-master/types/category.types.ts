// Category System Types
export interface CategoryPrice {
  current: number;
  original?: number;
  currency: string;
  discount?: number;
}

export interface CategoryRating {
  value: number;
  count: number;
  maxValue: number; // e.g., 10 for 8.6/10 format
}

export interface CategoryCashback {
  percentage: number;
  amount?: number;
  description?: string;
}

export interface CategoryLocation {
  address: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface CategoryTiming {
  deliveryTime?: string; // e.g., "6 mins"
  openingHours?: string;
  availability?: 'available' | 'busy' | 'closed';
}

export interface CategoryMetadata {
  // Restaurant specific
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  cuisine?: string;
  isVeg?: boolean;
  
  // Gift specific
  occasion?: string;
  recipient?: 'him' | 'her' | 'kids' | 'family';
  giftType?: string;
  
  // Electronics specific
  brand?: string;
  specifications?: Record<string, string>;
  warranty?: string;
  
  // Beauty specific
  skinType?: string;
  productType?: string;
  ingredients?: string[];
  size?: string;
  shade?: string;
  finish?: string;
  coverage?: string;
  colors?: string;
  hairType?: string;
  
  // Toys specific
  ageRange?: string;
  material?: string;
  pieces?: string;
  educational?: boolean;
  includes?: string[];
  features?: string[] | string;
  battery?: string;
  experiments?: string;
  
  // Traditional wear specific
  sizes?: string;
  pattern?: string;
  storage?: string;
  
  // Medicine specific
  prescription?: boolean;
  category?: string;
  manufacturer?: string;
  dosage?: string;
  quantity?: string;
  volume?: string;
  type?: string;
  flavor?: string;
  medicineWeight?: string;
  
  // Fruit specific
  origin?: string;
  variety?: string;
  weight?: string;
  freshness?: string;
  season?: string;
  organic?: boolean;
  antioxidants?: string;
  vitamin?: string;
  exotic?: boolean;
  
  // Fleet specific
  vehicleType?: string;
  model?: string;
  year?: string;
  fuelType?: string;
  seating?: string;
  transmission?: string;
  engine?: string;
  capacity?: string;
  service?: string;
  availability?: string;
  
  // General
  tags?: string[];
  description?: string;
}

export interface CategoryCarouselItem {
  id: string;
  brand: string;
  title: string;
  subtitle: string;
  image: string;
  cashback: number;
  category?: string;
  action?: {
    type: 'navigate' | 'filter' | 'search';
    target: string;
    params?: Record<string, any>;
  };
}

export interface CategoryItem {
  id: string;
  name: string;
  image: string;
  images?: string[]; // Multiple images
  price?: CategoryPrice;
  rating?: CategoryRating;
  cashback?: CategoryCashback;
  location?: CategoryLocation;
  timing?: CategoryTiming;
  metadata: CategoryMetadata;
  isFeatured?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
}

export interface CategoryFilter {
  id: string;
  name: string;
  type: 'single' | 'multiple' | 'range' | 'toggle';
  options?: {
    id: string;
    label: string;
    value: string | number;
    icon?: string;
  }[];
  range?: {
    min: number;
    max: number;
    step?: number;
  };
}

export interface CategoryBanner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  backgroundColor?: string;
  textColor?: string;
  action?: {
    label: string;
    type: 'navigate' | 'external' | 'modal';
    target: string;
  };
  cashback?: CategoryCashback;
}

export interface CategoryHeaderConfig {
  title: string;
  subtitle?: string;
  backgroundColor: string[];
  textColor: string;
  showSearch: boolean;
  showCoinBalance: boolean;
  showCart: boolean;
  searchPlaceholder?: string;
}

export interface CategoryLayoutConfig {
  type: 'grid' | 'list' | 'cards' | 'featured' | 'mixed';
  itemsPerRow?: number;
  spacing?: number;
  cardStyle?: 'elevated' | 'flat' | 'outlined';
  showQuickActions?: boolean;
}

export interface CategorySEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  shortDescription?: string;
  description: string;
  headerConfig: CategoryHeaderConfig;
  layoutConfig: CategoryLayoutConfig;
  seo: CategorySEO;
  filters: CategoryFilter[];
  banners: CategoryBanner[];
  carouselItems?: CategoryCarouselItem[];
  items: CategoryItem[];
  featuredItems?: CategoryItem[];
  popularItems?: CategoryItem[];
  sections?: CategorySection[];
  isActive: boolean;
  sortOrder: number;
  lastUpdated: string;
}

export interface CategorySection {
  id: string;
  title: string;
  subtitle?: string;
  items: CategoryItem[];
  viewAllLink?: string;
  layoutType?: 'horizontal' | 'grid' | 'list';
}

// State Management Types
export interface CategoryState {
  currentCategory: Category | null;
  categories: Category[];
  filters: Record<string, any>;
  searchQuery: string;
  sortBy: string;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CategoryContextType {
  state: CategoryState;
  actions: {
    loadCategory: (slug: string) => Promise<void>;
    loadCategories: () => Promise<void>;
    updateFilters: (filters: Record<string, any>) => void;
    updateSearch: (query: string) => void;
    updateSort: (sortBy: string) => void;
    loadMore: () => Promise<void>;
    resetFilters: () => void;
    addToCart: (item: CategoryItem) => void;
    toggleFavorite: (item: CategoryItem) => void;
  };
}

// API Types
export interface CategoryAPIResponse {
  category: Category;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface CategoriesAPIResponse {
  categories: Category[];
  meta?: {
    total: number;
  };
}

// Component Props Types
export interface CategoryPageProps {
  slug: string;
}

export interface CategoryHeaderProps {
  category: Category;
  onSearch: (query: string) => void;
  onBack: () => void;
  searchQuery: string;
}

export interface CategoryGridProps {
  items: CategoryItem[];
  layoutConfig: CategoryLayoutConfig;
  onItemPress: (item: CategoryItem) => void;
  onAddToCart: (item: CategoryItem) => void;
  onToggleFavorite: (item: CategoryItem) => void;
  loading?: boolean;
}

export interface CategoryFiltersProps {
  filters: CategoryFilter[];
  activeFilters: Record<string, any>;
  onFilterChange: (filterId: string, value: any) => void;
  onReset: () => void;
}

export interface CategoryCardProps {
  item: CategoryItem;
  layoutType?: 'compact' | 'detailed' | 'featured';
  onPress: (item: CategoryItem) => void;
  onAddToCart: (item: CategoryItem) => void;
  onToggleFavorite: (item: CategoryItem) => void;
  showQuickActions?: boolean;
}

export interface CategoryBannerProps {
  banner: CategoryBanner;
  onPress?: (banner: CategoryBanner) => void;
}

// Utility Types
export type CategorySlug = 
  | 'restaurant' 
  | 'gift' 
  | 'organic' 
  | 'electronics' 
  | 'beauty' 
  | 'toys' 
  | 'traditional' 
  | 'medicine' 
  | 'fruit' 
  | 'fleet';

export type SortOption = 
  | 'featured' 
  | 'popular' 
  | 'newest' 
  | 'price_low' 
  | 'price_high' 
  | 'rating' 
  | 'distance';

// Hook Types
export interface UseCategoryReturn {
  category: Category | null;
  items: CategoryItem[];
  filteredItems: CategoryItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadCategory: (slug: string) => Promise<void>;
  loadMore: () => Promise<void>;
  applyFilters: (filters: Record<string, any>) => void;
  search: (query: string) => void;
  sort: (option: SortOption) => void;
}

export interface UseCategoryDataReturn {
  categories: Category[];
  getCategory: (slug: string) => Category | undefined;
  getCategoryItems: (slug: string, filters?: Record<string, any>) => CategoryItem[];
  searchItems: (query: string, categorySlug?: string) => CategoryItem[];
  loading: boolean;
  error: string | null;
}