// MainStore type definitions for data consistency across components

export interface MainStoreProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  location: string;
  distance: string;
  isOpen: boolean;
  images: ProductImage[];
  logo?: string; // Store logo for circular display
  cashbackPercentage: string;
  storeName: string;
  storeId: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
}

export interface ProductImage {
  id: string;
  uri: string;
  alt?: string;
}

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance: string;
  isOpen: boolean;
  openingHours?: {
    [key: string]: string;
  };
}

export interface UGCContent {
  id: string;
  imageUri: string;
  viewCount: string;
  userId?: string;
  productId?: string;
  createdAt?: Date;
}

export interface MainStoreTabContent {
  about?: {
    description: string;
    features: string[];
    specifications?: Record<string, string>;
  };
  deals?: {
    offers: Offer[];
    walkInDeals: WalkInDeal[];
  };
  reviews?: {
    averageRating: number;
    totalReviews: number;
    reviews: Review[];
  };
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discountPercentage: number;
  validUntil: Date;
  termsAndConditions: string[];
}

export interface WalkInDeal {
  id: string;
  title: string;
  description: string;
  discountAmount: number;
  minPurchase?: number;
  validUntil: Date;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  helpful: number;
}

// Props interfaces for components
export interface MainStorePageProps {
  productId?: string;
  initialProduct?: MainStoreProduct;
}

export interface ProductDisplayProps {
  images?: ProductImage[];
  onSharePress?: () => void;
  onFavoritePress?: () => void;
  isFavorited?: boolean;
  activeIndex?: number;
  onIndexChange?: React.Dispatch<React.SetStateAction<number>>;
}

export interface ProductDetailsProps {
  title?: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  location?: string;
  distance?: string;
  isOpen?: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface CashbackOfferProps {
  percentage?: string;
  title?: string;
  showIcon?: boolean;
}

export interface UGCSectionProps {
  title?: string;
  images?: UGCContent[];
  onViewAllPress?: () => void;
  onImagePress?: (imageId: string) => void;
}

// Cart integration types
export interface CartItemFromProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  cashback: string;
  category: 'products' | 'service';
}

// API response types (for future integration)
export interface MainStoreApiResponse {
  success: boolean;
  data?: MainStoreProduct;
  error?: string;
}

export interface UGCApiResponse {
  success: boolean;
  data?: UGCContent[];
  error?: string;
}

export interface TabContentApiResponse {
  success: boolean;
  data?: MainStoreTabContent;
  error?: string;
}