// UGC Test Setup
// Mock configurations and test utilities for UGC system tests

import { jest } from '@jest/globals';

// ============================================
// Mock API Client
// ============================================
export const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  put: jest.fn(),
  uploadFile: jest.fn(),
  setRegion: jest.fn(),
};

jest.mock('@/services/apiClient', () => ({
  __esModule: true,
  default: mockApiClient,
  setRegionGetter: jest.fn(),
}));

// ============================================
// Mock FlashList (renders items inline for tests)
// ============================================
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  const FlatListMock = ({ data, renderItem, keyExtractor, ListEmptyComponent }: any) => {
    if (!data || data.length === 0) {
      return React.createElement(View, null, ListEmptyComponent || null);
    }
    return React.createElement(
      View,
      null,
      data.map((item: any, index: number) =>
        React.createElement(
          View,
          { key: keyExtractor ? keyExtractor(item, index) : index },
          renderItem({ item, index })
        )
      )
    );
  };
  return {
    FlashList: FlatListMock,
    FlatList: FlatListMock,
  };
});

// ============================================
// Mock PlayPage components (avoids React.lazy dynamic imports)
// ============================================
jest.mock('@/components/playPage/MerchantVideoSection', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/playPage/ArticleSection', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/playPage/UGCVideoSection', () => ({
  __esModule: true,
  default: () => null,
}));

// ============================================
// Mock Stores (avoids dynamic imports in regionStore)
// ============================================
jest.mock('@/services/homepageDataService', () => ({
  __esModule: true,
  default: {},
  setHomepageCurrencyGetter: jest.fn(),
}));

jest.mock('@/stores', () => ({
  __esModule: true,
  useAuthStore: jest.fn(() => ({
    user: { id: 'test-user-id' },
    isAuthenticated: true,
  })),
  useIsAuthenticated: jest.fn(() => true),
  useRegionStore: jest.fn(() => ({
    region: 'bangalore',
    setRegion: jest.fn(),
  })),
  useGamificationStore: jest.fn(() => ({})),
}));

// ============================================
// Mock Videos API
// ============================================
export const mockVideosApi = {
  getVideos: jest.fn(),
  getVideoById: jest.fn(),
  getTrendingVideos: jest.fn(),
  getFeaturedVideos: jest.fn(),
  searchVideos: jest.fn(),
  uploadVideo: jest.fn(),
  likeVideo: jest.fn(),
  unlikeVideo: jest.fn(),
  shareVideo: jest.fn(),
  reportVideo: jest.fn(),
  recordView: jest.fn(),
  getVideoComments: jest.fn(),
  addComment: jest.fn(),
};

jest.mock('@/services/realVideosApi', () => ({
  __esModule: true,
  realVideosApi: mockVideosApi,
  default: mockVideosApi,
}));

// ============================================
// Mock Products API
// ============================================
export const mockProductsApi = {
  getProducts: jest.fn(),
  getProductById: jest.fn(),
  searchProducts: jest.fn(),
  getProductsByCategory: jest.fn(),
};

jest.mock('@/services/productsApi', () => ({
  __esModule: true,
  default: mockProductsApi,
}));

// ============================================
// Mock Cloudinary Upload Service (not currently used)
// ============================================
// Note: cloudinaryService doesn't exist in the codebase yet
// Uncomment when implemented:
// export const mockCloudinaryService = {
//   uploadVideo: jest.fn(),
//   uploadImage: jest.fn(),
//   getUploadPreset: jest.fn(),
//   getCloudinaryUrl: jest.fn(),
// };
//
// jest.mock('@/services/cloudinaryService', () => ({
//   __esModule: true,
//   default: mockCloudinaryService,
// }));

// ============================================
// Mock Auth Context
// ============================================
export const mockAuthContext = {
  state: {
    isAuthenticated: true,
    loading: false,
    user: {
      _id: 'test-user-id',
      profile: {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        avatar: 'https://example.com/avatar.jpg',
      },
    },
    token: 'test-token',
  },
  actions: {
    signIn: jest.fn(),
    signOut: jest.fn(),
    refreshToken: jest.fn(),
    updateProfile: jest.fn(),
  },
};

jest.mock('@/contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: jest.fn(() => mockAuthContext),
  AuthProvider: ({ children }: any) => children,
}));

// ============================================
// Mock Cart Context
// ============================================
export const mockCartContext = {
  state: {
    items: [],
    total: 0,
    itemCount: 0,
    loading: false,
  },
  actions: {
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
  },
};

jest.mock('@/contexts/CartContext', () => ({
  __esModule: true,
  useCart: jest.fn(() => mockCartContext),
  CartProvider: ({ children }: any) => children,
}));

// ============================================
// Mock Image Picker
// ============================================
export const mockImagePicker = {
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{
        uri: 'file:///mock/video.mp4',
        type: 'video',
        duration: 30000,
        width: 1920,
        height: 1080,
      }],
    })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{
        uri: 'file:///mock/video.mp4',
        type: 'video',
        duration: 30000,
        width: 1920,
        height: 1080,
      }],
    })
  ),
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
};

jest.mock('expo-image-picker', () => ({
  __esModule: true,
  ...mockImagePicker,
  default: mockImagePicker,
}));

// ============================================
// Mock Expo AV (Video Player)
// ============================================
export const mockVideo = {
  loadAsync: jest.fn(() => Promise.resolve({ isLoaded: true })),
  unloadAsync: jest.fn(() => Promise.resolve()),
  playAsync: jest.fn(() => Promise.resolve({ isPlaying: true })),
  pauseAsync: jest.fn(() => Promise.resolve({ isPlaying: false })),
  setPositionAsync: jest.fn(() => Promise.resolve()),
  setIsMutedAsync: jest.fn(() => Promise.resolve()),
  getStatusAsync: jest.fn(() =>
    Promise.resolve({
      isLoaded: true,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 30000,
    })
  ),
};

jest.mock('expo-av', () => {
  const React = require('react');
  return {
    __esModule: true,
    Video: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => mockVideo);
      return React.createElement('Video', { ...props, testID: 'mock-video' });
    }),
    ResizeMode: {
      CONTAIN: 'contain',
      COVER: 'cover',
      STRETCH: 'stretch',
    },
    Audio: {
      Sound: jest.fn(),
    },
  };
});

// ============================================
// Mock Expo Image
// ============================================
jest.mock('expo-image', () => {
  const React = require('react');
  return {
    __esModule: true,
    Image: (props: any) => React.createElement('Image', { ...props, testID: 'mock-expo-image' }),
  };
});

// ============================================
// Mock Expo Linear Gradient
// ============================================
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    __esModule: true,
    LinearGradient: (props: any) => React.createElement('View', { ...props, testID: 'mock-linear-gradient' }, props.children),
  };
});

// ============================================
// Mock Video Preload Service
// ============================================
export const mockVideoPreloadService = {
  preloadVideos: jest.fn(() => Promise.resolve()),
  isPreloaded: jest.fn(() => true),
  clearCache: jest.fn(),
  getPreloadStatus: jest.fn(() => ({ loaded: 5, total: 10 })),
};

jest.mock('@/services/videoPreloadService', () => ({
  __esModule: true,
  useVideoPreload: jest.fn(() => mockVideoPreloadService),
}));

// ============================================
// Test Utilities
// ============================================

/**
 * Wait for async updates to complete
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Wait for specified milliseconds
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Flush all pending promises
 */
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

/**
 * Create a mock file object
 */
export const createMockFile = (name: string, size: number, type: string) => {
  const file = new Blob(['x'.repeat(size)], { type });
  return Object.assign(file, {
    name,
    lastModified: Date.now(),
  });
};

/**
 * Create mock FormData
 */
export const createMockFormData = () => {
  const data = new Map();
  return {
    append: (key: string, value: any) => data.set(key, value),
    get: (key: string) => data.get(key),
    getAll: (key: string) => [data.get(key)],
    has: (key: string) => data.has(key),
    delete: (key: string) => data.delete(key),
    entries: () => data.entries(),
    keys: () => data.keys(),
    values: () => data.values(),
  };
};

/**
 * Mock navigation router
 */
export const createMockRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
});

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();

  // Reset mock implementations
  mockApiClient.get.mockReset();
  mockApiClient.post.mockReset();
  mockApiClient.patch.mockReset();
  mockApiClient.delete.mockReset();
  mockApiClient.uploadFile.mockReset();

  mockVideosApi.getVideos.mockReset();
  mockVideosApi.getVideoById.mockReset();
  mockVideosApi.uploadVideo.mockReset();
  mockVideosApi.likeVideo.mockReset();
  mockVideosApi.shareVideo.mockReset();
  mockVideosApi.reportVideo.mockReset();

  mockProductsApi.getProducts.mockReset();
  mockProductsApi.searchProducts.mockReset();

  // mockCloudinaryService.uploadVideo.mockReset();
  // mockCloudinaryService.uploadImage.mockReset();

  mockImagePicker.launchCameraAsync.mockReset();
  mockImagePicker.launchImageLibraryAsync.mockReset();

  mockCartContext.actions.addToCart.mockReset();
};

/**
 * Setup successful API responses
 */
export const setupSuccessfulApiResponses = () => {
  (mockVideosApi.getVideos as any).mockResolvedValue({
    success: true,
    data: {
      videos: [],
      pagination: { current: 1, pages: 1, total: 0, limit: 20 },
    },
  });

  (mockVideosApi.uploadVideo as any).mockResolvedValue({
    success: true,
    data: { videoId: 'test-video-id', uploadUrl: 'https://cloudinary.com/upload' },
  });

  (mockProductsApi.searchProducts as any).mockResolvedValue({
    success: true,
    data: {
      products: [],
      pagination: { current: 1, pages: 1, total: 0, limit: 20 },
    },
  });
};

// ============================================
// Cleanup
// ============================================
afterEach(() => {
  resetAllMocks();
});
