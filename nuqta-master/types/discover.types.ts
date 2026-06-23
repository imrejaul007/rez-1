// discover.types.ts - Types for Discover & Shop component

export type DiscoverTabType = 'reels' | 'posts' | 'articles' | 'images';

export interface DiscoverProduct {
  _id: string;
  id?: string;
  name: string;
  title?: string;
  image: string;
  images?: string[];
  price: number;
  salePrice?: number;
  cashbackPercent?: number;
  store?: {
    _id: string;
    name: string;
    logo?: string;
  };
  category?: string;
  rating?: number;
  inStock?: boolean;
}

export interface DiscoverCreator {
  _id: string;
  id?: string;
  name: string;
  username?: string;
  avatar?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  storeId?: string;
  isVerified?: boolean;
  followerCount?: number;
}

export interface DiscoverEngagement {
  views: number;
  likes: string[] | number;
  shares: number;
  comments: number;
  saves?: number;
  liked?: boolean;
  bookmarked?: boolean;
}

export interface DiscoverReel {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnail: string;
  duration?: number;
  contentType: 'ugc' | 'merchant';
  creator: DiscoverCreator;
  products: DiscoverProduct[];
  hashtags?: string[];
  tags?: string[];
  engagement: DiscoverEngagement;
  metrics?: {
    views: number;
    likes: number;
  };
  store?: {
    _id: string;
    name: string;
    logo?: string;
  };
  createdAt?: string;
}

export interface DiscoverPost {
  _id: string;
  id?: string;
  type: 'photo' | 'video';
  contentType: 'ugc' | 'merchant';
  mediaUrl: string;
  thumbnail?: string;
  caption?: string;
  creator: DiscoverCreator;
  products: DiscoverProduct[];
  hashtags?: string[];
  engagement: DiscoverEngagement;
  isBrandPost: boolean;
  createdAt?: string;
}

export interface DiscoverArticle {
  _id: string;
  id?: string;
  title: string;
  excerpt?: string;
  content?: string;
  featuredImage: string;
  category: string;
  author: DiscoverCreator;
  products: DiscoverProduct[];
  tags?: string[];
  readTime?: number;
  engagement: {
    views: number;
    likes: number;
    bookmarks: number;
    shares: number;
  };
  publishedAt?: string;
  createdAt?: string;
}

export interface DiscoverImage {
  _id: string;
  id?: string;
  imageUrl: string;
  caption?: string;
  creator: DiscoverCreator;
  products: DiscoverProduct[];
  productTags?: Array<{
    productId: string;
    position: { x: number; y: number };
  }>;
  engagement: DiscoverEngagement;
  createdAt?: string;
}

export interface CategoryCard {
  id: string;
  label: string;
  icon: string;
  productName: string;
  cashback: string;
  gradient: [string, string];
  categoryId?: string;
}

export interface DiscoverContentState {
  reels: DiscoverReel[];
  posts: DiscoverPost[];
  articles: DiscoverArticle[];
  images: DiscoverImage[];
  loading: boolean;
  loadingByTab: Record<DiscoverTabType, boolean>;
  error: string | null;
  pagination: Record<DiscoverTabType, {
    page: number;
    hasMore: boolean;
    total?: number;
  }>;
}

export interface DiscoverContentActions {
  fetchTabContent: (tab: DiscoverTabType, refresh?: boolean) => Promise<void>;
  loadMoreContent: (tab: DiscoverTabType) => Promise<void>;
  refreshContent: () => Promise<void>;
}

export interface UseDiscoverContentReturn {
  state: DiscoverContentState;
  actions: DiscoverContentActions;
}
