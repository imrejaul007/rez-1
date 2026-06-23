// UGC Test Mock Data
// Sample data for testing UGC system

import { UGCVideoItem } from '@/types/playPage.types';
import { ProductSelectorProduct } from '@/types/product-selector.types';

// ============================================
// Mock Users
// ============================================
export const mockUsers = {
  testUser: {
    _id: 'test-user-id',
    profile: {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
  },
  creator1: {
    _id: 'creator-1',
    profile: {
      fullName: 'Jane Creator',
      email: 'jane@example.com',
      phone: '9876543210',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
  },
  creator2: {
    _id: 'creator-2',
    profile: {
      fullName: 'John Maker',
      email: 'john@example.com',
      phone: '5555555555',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
  },
};

// ============================================
// Mock Products
// ============================================
export const mockProducts: ProductSelectorProduct[] = [
  {
    _id: 'prod-1',
    name: 'Wireless Headphones',
    description: 'Premium noise-cancelling wireless headphones',
    basePrice: 3999,
    salePrice: 2999,
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'],
    category: 'Electronics',
    store: {
      _id: 'store-1',
      name: 'TechStore',
      logo: 'https://via.placeholder.com/100',
    },
    rating: {
      average: 4.5,
      count: 120,
    },
    inStock: true,
    availability: 'in_stock',
  },
  {
    _id: 'prod-2',
    name: 'Smart Watch',
    description: 'Fitness tracking smart watch with heart rate monitor',
    basePrice: 2499,
    salePrice: 1999,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'],
    category: 'Electronics',
    store: {
      _id: 'store-2',
      name: 'WearableHub',
      logo: 'https://via.placeholder.com/100',
    },
    rating: {
      average: 4.3,
      count: 89,
    },
    inStock: true,
    availability: 'in_stock',
  },
  {
    _id: 'prod-3',
    name: 'Laptop Backpack',
    description: 'Durable laptop backpack with USB charging port',
    basePrice: 1299,
    salePrice: 899,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300'],
    category: 'Accessories',
    store: {
      _id: 'store-3',
      name: 'BagWorld',
      logo: 'https://via.placeholder.com/100',
    },
    rating: {
      average: 4.7,
      count: 203,
    },
    inStock: true,
    availability: 'in_stock',
  },
  {
    _id: 'prod-4',
    name: 'Running Shoes',
    description: 'Lightweight running shoes with superior cushioning',
    basePrice: 4999,
    salePrice: 3499,
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300'],
    category: 'Footwear',
    store: {
      _id: 'store-4',
      name: 'SportShoes',
      logo: 'https://via.placeholder.com/100',
    },
    rating: {
      average: 4.6,
      count: 156,
    },
    inStock: true,
    availability: 'in_stock',
  },
  {
    _id: 'prod-5',
    name: 'Portable Speaker',
    description: 'Bluetooth speaker with 360° sound',
    basePrice: 1799,
    salePrice: 1299,
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300'],
    category: 'Electronics',
    store: {
      _id: 'store-1',
      name: 'TechStore',
      logo: 'https://via.placeholder.com/100',
    },
    rating: {
      average: 4.4,
      count: 78,
    },
    inStock: false,
    availability: 'out_of_stock',
  },
];

// ============================================
// Mock Videos
// ============================================
export const mockVideos: UGCVideoItem[] = [
  {
    id: 'video-1',
    description: 'Unboxing My New Wireless Headphones - Check out these amazing wireless headphones! Sound quality is incredible. #tech #headphones #review',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    viewCount: '15.2K',
    category: 'trending_me',
    contentType: 'ugc',
    hashtags: ['#tech', '#headphones', '#review', '#unboxing'],
    productCount: 1,
    isLiked: false,
    isShared: false,
    author: 'Jane Creator',
    duration: 180,
    createdAt: '2025-01-05T10:30:00Z',
    likes: 1240,
    shares: 45,
    products: [
      {
        id: 'prod-1',
        title: 'Wireless Headphones',
        price: '₹2,999',
        rating: 4.5,
        cashbackText: '10% cashback',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
        category: 'Electronics',
      },
    ],
  },
  {
    id: 'video-2',
    description: 'My Fitness Journey - Smart Watch Review - How this smart watch helped me track my fitness goals #fitness #smartwatch #health',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    viewCount: '8.5K',
    category: 'trending_her',
    contentType: 'ugc',
    hashtags: ['#fitness', '#smartwatch', '#health'],
    productCount: 1,
    isLiked: true,
    isShared: false,
    author: 'John Maker',
    duration: 240,
    createdAt: '2025-01-04T14:20:00Z',
    likes: 720,
    shares: 22,
    products: [
      {
        id: 'prod-2',
        title: 'Smart Watch',
        price: '₹1,999',
        rating: 4.3,
        cashbackText: '15% cashback',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
        category: 'Wearables',
      },
    ],
  },
  {
    id: 'video-3',
    description: 'Perfect Laptop Backpack for Students - Everything you need in a backpack - USB charging, lots of pockets! #backpack #student #lifestyle',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    viewCount: '12.3K',
    category: 'waist',
    contentType: 'ugc',
    hashtags: ['#backpack', '#student', '#lifestyle', '#review'],
    productCount: 1,
    isLiked: false,
    isShared: false,
    author: 'Jane Creator',
    duration: 150,
    createdAt: '2025-01-03T09:15:00Z',
    likes: 980,
    shares: 38,
    products: [
      {
        id: 'prod-3',
        title: 'Laptop Backpack',
        price: '₹899',
        rating: 4.7,
        cashbackText: '20% cashback',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300',
        category: 'Accessories',
      },
    ],
  },
];

// ============================================
// Mock API Responses
// ============================================
export const mockApiResponses = {
  // Successful video fetch
  getVideosSuccess: {
    success: true,
    data: {
      videos: mockVideos,
      pagination: {
        current: 1,
        pages: 1,
        total: mockVideos.length,
        limit: 20,
      },
      filters: {
        categories: [
          { id: 'cat-tech', name: 'Tech Reviews', count: 1 },
          { id: 'cat-fitness', name: 'Fitness', count: 1 },
          { id: 'cat-lifestyle', name: 'Lifestyle', count: 1 },
        ],
        tags: [
          { name: 'tech', count: 1 },
          { name: 'fitness', count: 1 },
          { name: 'review', count: 2 },
        ],
      },
    },
  },

  // Successful video upload
  uploadVideoSuccess: {
    success: true,
    data: {
      videoId: 'new-video-id',
      uploadUrl: 'https://cloudinary.com/upload/new-video-id',
      message: 'Video uploaded successfully',
    },
  },

  // Successful product search
  searchProductsSuccess: {
    success: true,
    data: {
      products: mockProducts,
      pagination: {
        current: 1,
        pages: 1,
        total: mockProducts.length,
        limit: 20,
      },
    },
  },

  // Successful video like
  likeVideoSuccess: {
    success: true,
    data: {
      liked: true,
      likesCount: 1241,
    },
  },

  // Successful video report
  reportVideoSuccess: {
    success: true,
    data: {
      reportId: 'report-123',
      message: 'Report submitted successfully',
    },
  },

  // Error responses
  errors: {
    unauthorized: {
      success: false,
      message: 'Unauthorized. Please sign in.',
      statusCode: 401,
    },
    notFound: {
      success: false,
      message: 'Video not found',
      statusCode: 404,
    },
    badRequest: {
      success: false,
      message: 'Invalid request data',
      statusCode: 400,
    },
    serverError: {
      success: false,
      message: 'Internal server error',
      statusCode: 500,
    },
    networkError: {
      success: false,
      message: 'Network error. Please check your connection.',
    },
  },
};

// ============================================
// Mock Upload Progress
// ============================================
export const mockUploadProgress = {
  initial: {
    progress: 0,
    stage: 'initializing',
    message: 'Preparing upload...',
  },
  uploading: {
    progress: 45,
    stage: 'uploading',
    message: 'Uploading video...',
  },
  processing: {
    progress: 80,
    stage: 'processing',
    message: 'Processing video...',
  },
  complete: {
    progress: 100,
    stage: 'complete',
    message: 'Upload complete!',
  },
};

// ============================================
// Mock Report Reasons
// ============================================
export const mockReportReasons = [
  {
    value: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'Contains offensive or inappropriate material',
  },
  {
    value: 'spam',
    label: 'Spam',
    description: 'Spam or misleading content',
  },
  {
    value: 'copyright',
    label: 'Copyright Violation',
    description: 'Violates copyright or intellectual property',
  },
  {
    value: 'misleading',
    label: 'Misleading Information',
    description: 'Contains false or misleading information',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other reason not listed above',
  },
];

// ============================================
// Mock Categories
// ============================================
export const mockCategories = [
  {
    type: 'trending_me',
    label: 'Trending',
    color: '#8B5CF6',
  },
  {
    type: 'trending_her',
    label: 'For Her',
    color: '#EC4899',
  },
  {
    type: 'article',
    label: 'Articles',
    color: '#10B981',
  },
  {
    type: 'all',
    label: 'All',
    color: '#6B7280',
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Generate mock video with custom properties
 */
export function createMockVideo(overrides: Partial<UGCVideoItem> = {}): UGCVideoItem {
  return {
    ...mockVideos[0],
    id: `video-${Date.now()}`,
    ...overrides,
  };
}

/**
 * Generate mock product with custom properties
 */
export function createMockProduct(overrides: Partial<ProductSelectorProduct> = {}): ProductSelectorProduct {
  return {
    ...mockProducts[0],
    _id: `prod-${Date.now()}`,
    ...overrides,
  };
}

/**
 * Generate array of mock videos
 */
export function createMockVideos(count: number): UGCVideoItem[] {
  return Array.from({ length: count }, (_, i) =>
    createMockVideo({
      id: `video-${i + 1}`,
      description: `Test Video ${i + 1} - Sample video description for testing`,
    })
  );
}

/**
 * Generate array of mock products
 */
export function createMockProducts(count: number): ProductSelectorProduct[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProduct({
      _id: `prod-${i + 1}`,
      name: `Test Product ${i + 1}`,
    })
  );
}
