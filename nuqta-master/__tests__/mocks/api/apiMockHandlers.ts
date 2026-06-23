/**
 * API Mock Handlers for Integration Tests
 *
 * Provides mock responses for API calls used in integration tests.
 * Uses factories to generate consistent test data.
 */

import {
  createTestUser,
  createTestProduct,
  createTestCartItem,
  createTestOrder,
  createTestTransaction,
  createTestUGC,
  createTestStore,
  createTestDeal,
  createTestAddress,
  createTestReview,
  createTestNotification,
  createTestEvent,
  createBatch,
} from '../../factories/testDataFactory';

// ============================================
// Mock Database State
// ============================================

interface MockDatabase {
  users: Map<string, any>;
  products: Map<string, any>;
  cartItems: Map<string, any[]>; // userId -> cart items
  orders: Map<string, any>;
  transactions: Map<string, any[]>; // userId -> transactions
  ugcContent: any[];
  stores: Map<string, any>;
  deals: any[];
  addresses: Map<string, any[]>; // userId -> addresses
  reviews: Map<string, any[]>; // productId -> reviews
  notifications: Map<string, any[]>; // userId -> notifications
  events: Map<string, any>;
  wishlist: Map<string, any[]>; // userId -> product ids
  favorites: Map<string, any[]>; // userId -> store ids
}

let mockDB: MockDatabase = {
  users: new Map(),
  products: new Map(),
  cartItems: new Map(),
  orders: new Map(),
  transactions: new Map(),
  ugcContent: [],
  stores: new Map(),
  deals: [],
  addresses: new Map(),
  reviews: new Map(),
  notifications: new Map(),
  events: new Map(),
  wishlist: new Map(),
  favorites: new Map(),
};

// Current session
let currentUser: any = null;
let currentToken: string | null = null;

// ============================================
// Helper Functions
// ============================================

const generateToken = (userId: string): string => {
  return `mock-token-${userId}-${Date.now()}`;
};

const generateOTP = (): string => {
  return '123456'; // Always return same OTP for testing
};

const isAuthenticated = (token?: string): boolean => {
  if (!token) return false;
  return token === currentToken && currentToken !== null;
};

// ============================================
// Initialize Mock Data
// ============================================

export const initializeMockData = () => {
  // Reset database
  mockDB = {
    users: new Map(),
    products: new Map(),
    cartItems: new Map(),
    orders: new Map(),
    transactions: new Map(),
    ugcContent: [],
    stores: new Map(),
    deals: [],
    addresses: new Map(),
    reviews: new Map(),
    notifications: new Map(),
    events: new Map(),
    wishlist: new Map(),
    favorites: new Map(),
  };

  // Create sample products
  createBatch(createTestProduct, 20).forEach((product) => {
    mockDB.products.set(product.id, product);
  });

  // Create sample stores
  createBatch(createTestStore, 10).forEach((store) => {
    mockDB.stores.set(store.id, store);
  });

  // Create sample UGC content
  mockDB.ugcContent = createBatch(createTestUGC, 30);

  // Create sample deals
  mockDB.deals = createBatch(createTestDeal, 15);

  // Create sample events
  createBatch(createTestEvent, 10).forEach((event) => {
    mockDB.events.set(event.id, event);
  });

  // Add reviews to products
  Array.from(mockDB.products.keys()).forEach((productId) => {
    mockDB.reviews.set(productId, createBatch(createTestReview, 5));
  });

  currentUser = null;
  currentToken = null;
};

// ============================================
// Authentication Mock Handlers
// ============================================

export const authMockHandlers = {
  sendOTP: (phoneNumber: string, email?: string, referralCode?: string) => {
    return {
      success: true,
      message: 'OTP sent successfully',
      data: {
        otp: generateOTP(), // For testing only - never expose in real API
      },
    };
  },

  verifyOTP: (phoneNumber: string, otp: string) => {
    if (otp !== '123456') {
      return {
        success: false,
        error: 'Invalid OTP',
      };
    }

    // Check if user exists
    let user = Array.from(mockDB.users.values()).find(
      (u) => u.phoneNumber === phoneNumber
    );

    // Create new user if doesn't exist
    if (!user) {
      user = createTestUser({ phoneNumber });
      mockDB.users.set(user.id, user);

      // Initialize user data
      mockDB.cartItems.set(user.id, []);
      mockDB.transactions.set(user.id, []);
      mockDB.addresses.set(user.id, [createTestAddress()]);
      mockDB.notifications.set(user.id, createBatch(createTestNotification, 5));
      mockDB.wishlist.set(user.id, []);
      mockDB.favorites.set(user.id, []);
    }

    // Generate tokens
    const accessToken = generateToken(user.id);
    const refreshToken = generateToken(user.id + '-refresh');

    // Set current session
    currentUser = user;
    currentToken = accessToken;

    return {
      success: true,
      data: {
        user,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    };
  },

  getProfile: (token: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    return {
      success: true,
      data: currentUser,
    };
  },

  updateProfile: (token: string, updates: any) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    currentUser = { ...currentUser, ...updates };
    mockDB.users.set(currentUser.id, currentUser);

    return {
      success: true,
      data: currentUser,
    };
  },

  logout: (token: string) => {
    currentUser = null;
    currentToken = null;

    return {
      success: true,
      message: 'Logged out successfully',
    };
  },

  refreshToken: (refreshToken: string) => {
    if (!refreshToken.includes('refresh')) {
      return {
        success: false,
        error: 'Invalid refresh token',
      };
    }

    const userId = refreshToken.split('-')[2];
    const user = mockDB.users.get(userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const newAccessToken = generateToken(userId);
    const newRefreshToken = generateToken(userId + '-refresh');

    return {
      success: true,
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      },
    };
  },
};

// ============================================
// Cart Mock Handlers
// ============================================

export const cartMockHandlers = {
  getCart: (token: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const items = mockDB.cartItems.get(currentUser.id) || [];

    return {
      success: true,
      data: {
        items,
        summary: {
          subtotal: items.reduce((sum, item) => sum + (item.discountedPrice || item.originalPrice) * item.quantity, 0),
          discount: items.reduce((sum, item) => sum + (item.originalPrice - (item.discountedPrice || item.originalPrice)) * item.quantity, 0),
          deliveryFee: 50,
          total: items.reduce((sum, item) => sum + (item.discountedPrice || item.originalPrice) * item.quantity, 0) + 50,
        },
      },
    };
  },

  addToCart: (token: string, productId: string, quantity: number = 1, variant?: any) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const product = mockDB.products.get(productId);
    if (!product) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    const cartItems = mockDB.cartItems.get(currentUser.id) || [];
    const existingItem = cartItems.find((item) => item.id === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cartItems.push({
        ...product,
        quantity,
        variant,
        selected: true,
        addedAt: new Date().toISOString(),
      });
    }

    mockDB.cartItems.set(currentUser.id, cartItems);

    return {
      success: true,
      data: {
        items: cartItems,
      },
    };
  },

  updateCartItem: (token: string, productId: string, updates: any, variant?: any) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const cartItems = mockDB.cartItems.get(currentUser.id) || [];
    const item = cartItems.find((item) => item.id === productId);

    if (!item) {
      return {
        success: false,
        error: 'Item not found in cart',
      };
    }

    Object.assign(item, updates);

    return {
      success: true,
      data: {
        items: cartItems,
      },
    };
  },

  removeCartItem: (token: string, productId: string, variant?: any) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const cartItems = mockDB.cartItems.get(currentUser.id) || [];
    const updatedItems = cartItems.filter((item) => item.id !== productId);
    mockDB.cartItems.set(currentUser.id, updatedItems);

    return {
      success: true,
      data: {
        items: updatedItems,
      },
    };
  },

  clearCart: (token: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    mockDB.cartItems.set(currentUser.id, []);

    return {
      success: true,
      data: {
        items: [],
      },
    };
  },

  applyCoupon: (token: string, couponCode: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Find deal by coupon code
    const deal = mockDB.deals.find((d) => d.couponCode === couponCode);
    if (!deal) {
      return {
        success: false,
        error: 'Invalid coupon code',
      };
    }

    return {
      success: true,
      data: {
        coupon: deal,
        discount: deal.discount,
      },
    };
  },
};

// ============================================
// Order Mock Handlers
// ============================================

export const orderMockHandlers = {
  createOrder: (token: string, orderData: any) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const order = createTestOrder({
      ...orderData,
      userId: currentUser.id,
    });

    mockDB.orders.set(order.id, order);

    // Clear cart after order
    mockDB.cartItems.set(currentUser.id, []);

    return {
      success: true,
      data: order,
    };
  },

  getOrders: (token: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const userOrders = Array.from(mockDB.orders.values()).filter(
      (order) => order.userId === currentUser.id
    );

    return {
      success: true,
      data: userOrders,
    };
  },

  getOrder: (token: string, orderId: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const order = mockDB.orders.get(orderId);
    if (!order || order.userId !== currentUser.id) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    return {
      success: true,
      data: order,
    };
  },

  cancelOrder: (token: string, orderId: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const order = mockDB.orders.get(orderId);
    if (!order || order.userId !== currentUser.id) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    order.status = 'cancelled';
    mockDB.orders.set(orderId, order);

    return {
      success: true,
      data: order,
    };
  },
};

// ============================================
// Wallet Mock Handlers
// ============================================

export const walletMockHandlers = {
  getWallet: (token: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    return {
      success: true,
      data: {
        balance: currentUser.wallet?.balance || 0,
        currency: 'INR',
      },
    };
  },

  addMoney: (token: string, amount: number, paymentMethod: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const newBalance = (currentUser.wallet?.balance || 0) + amount;
    currentUser.wallet = { balance: newBalance, currency: 'INR' };
    mockDB.users.set(currentUser.id, currentUser);

    // Create transaction
    const transaction = createTestTransaction({
      type: 'credit',
      amount,
      description: `Added money to wallet via ${paymentMethod}`,
      balanceAfter: newBalance,
    });

    const transactions = mockDB.transactions.get(currentUser.id) || [];
    transactions.unshift(transaction);
    mockDB.transactions.set(currentUser.id, transactions);

    return {
      success: true,
      data: {
        balance: newBalance,
        transaction,
      },
    };
  },

  getTransactions: (token: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const transactions = mockDB.transactions.get(currentUser.id) || [];

    return {
      success: true,
      data: transactions,
    };
  },
};

// ============================================
// UGC Mock Handlers
// ============================================

export const ugcMockHandlers = {
  getUGCFeed: (token: string, page: number = 1, limit: number = 10) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const items = mockDB.ugcContent.slice(start, end);

    return {
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total: mockDB.ugcContent.length,
          hasMore: end < mockDB.ugcContent.length,
        },
      },
    };
  },

  uploadUGC: (token: string, ugcData: any) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const ugc = createTestUGC({
      ...ugcData,
      user: {
        id: currentUser.id,
        name: currentUser.profile?.name,
        profilePicture: currentUser.profile?.profilePicture,
      },
    });

    mockDB.ugcContent.unshift(ugc);

    return {
      success: true,
      data: ugc,
    };
  },

  likeUGC: (token: string, ugcId: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const ugc = mockDB.ugcContent.find((item) => item.id === ugcId);
    if (!ugc) {
      return {
        success: false,
        error: 'Content not found',
      };
    }

    ugc.isLiked = !ugc.isLiked;
    ugc.likes += ugc.isLiked ? 1 : -1;

    return {
      success: true,
      data: ugc,
    };
  },
};

// ============================================
// Store Mock Handlers
// ============================================

export const storeMockHandlers = {
  getStores: (token: string, filters?: any) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    let stores = Array.from(mockDB.stores.values());

    // Apply filters
    if (filters?.category) {
      stores = stores.filter((store) =>
        store.categories.includes(filters.category)
      );
    }

    return {
      success: true,
      data: stores,
    };
  },

  getStore: (token: string, storeId: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const store = mockDB.stores.get(storeId);
    if (!store) {
      return {
        success: false,
        error: 'Store not found',
      };
    }

    return {
      success: true,
      data: store,
    };
  },

  toggleFavorite: (token: string, storeId: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const favorites = mockDB.favorites.get(currentUser.id) || [];
    const index = favorites.indexOf(storeId);

    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(storeId);
    }

    mockDB.favorites.set(currentUser.id, favorites);

    return {
      success: true,
      data: {
        isFavorite: index === -1,
      },
    };
  },
};

// ============================================
// Product Mock Handlers
// ============================================

export const productMockHandlers = {
  getProducts: (token: string, filters?: any) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    let products = Array.from(mockDB.products.values());

    // Apply filters
    if (filters?.category) {
      products = products.filter((product) => product.category === filters.category);
    }

    return {
      success: true,
      data: products,
    };
  },

  getProduct: (token: string, productId: string) => {
    if (!isAuthenticated(token)) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const product = mockDB.products.get(productId);
    if (!product) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    return {
      success: true,
      data: product,
    };
  },
};

// ============================================
// Export All Handlers
// ============================================

export const mockAPIHandlers = {
  auth: authMockHandlers,
  cart: cartMockHandlers,
  order: orderMockHandlers,
  wallet: walletMockHandlers,
  ugc: ugcMockHandlers,
  store: storeMockHandlers,
  product: productMockHandlers,
};

// ============================================
// Utilities
// ============================================

export const getCurrentUser = () => currentUser;
export const getCurrentToken = () => currentToken;
export const resetMockData = () => initializeMockData();
