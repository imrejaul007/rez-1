/**
 * Mock API Handlers
 *
 * Centralized mock handlers for API requests in integration tests
 */

import { mockApiResponse, testDataFactory, generateMockProducts, generateMockStores } from './testHelpers';

export const mockApiHandlers = {
  // Authentication
  auth: {
    sendOtp: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          message: 'OTP sent successfully',
          expiresIn: 300,
        })
      )
    ),
    verifyOtp: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          user: testDataFactory.cart(),
          tokens: {
            accessToken: 'mock_access_token',
            refreshToken: 'mock_refresh_token',
          },
        })
      )
    ),
    logout: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          message: 'Logged out successfully',
        })
      )
    ),
    refreshToken: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          tokens: {
            accessToken: 'new_access_token',
            refreshToken: 'new_refresh_token',
          },
        })
      )
    ),
  },

  // Cart
  cart: {
    getCart: jest.fn(() => Promise.resolve(mockApiResponse(testDataFactory.cart()))),
    addItem: jest.fn((productId, quantity) =>
      Promise.resolve(
        mockApiResponse({
          item: {
            id: `cart_item_${Date.now()}`,
            productId,
            quantity,
            product: generateMockProducts(1)[0],
          },
        })
      )
    ),
    updateItem: jest.fn((itemId, quantity) =>
      Promise.resolve(
        mockApiResponse({
          item: {
            id: itemId,
            quantity,
          },
        })
      )
    ),
    removeItem: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          message: 'Item removed',
        })
      )
    ),
    clearCart: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          message: 'Cart cleared',
        })
      )
    ),
    validateCart: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          available: true,
          items: [],
        })
      )
    ),
  },

  // Orders
  orders: {
    createOrder: jest.fn((data) =>
      Promise.resolve(
        mockApiResponse({
          id: `order_${Date.now()}`,
          orderNumber: `ORD-2024-${Math.floor(Math.random() * 9999)}`,
          status: 'pending',
          ...data,
        })
      )
    ),
    getOrder: jest.fn((orderId) =>
      Promise.resolve(
        mockApiResponse({
          id: orderId,
          orderNumber: 'ORD-2024-0001',
          status: 'confirmed',
          items: generateMockProducts(2),
          total: 2500,
        })
      )
    ),
    getOrders: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          orders: [
            {
              id: 'order_1',
              orderNumber: 'ORD-2024-0001',
              status: 'delivered',
              total: 2500,
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
          },
        })
      )
    ),
    trackOrder: jest.fn((orderId) =>
      Promise.resolve(
        mockApiResponse({
          orderId,
          status: 'in_transit',
          tracking: {
            carrier: 'USPS',
            trackingNumber: 'TRK123456',
            estimatedDelivery: new Date(Date.now() + 86400000).toISOString(),
          },
        })
      )
    ),
  },

  // Payment
  payment: {
    createPaymentIntent: jest.fn((data) =>
      Promise.resolve(
        mockApiResponse({
          paymentIntentId: `pi_${Date.now()}`,
          clientSecret: `pi_${Date.now()}_secret`,
          amount: data.amount,
          currency: data.currency || 'usd',
        })
      )
    ),
    confirmPayment: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          status: 'succeeded',
          paymentIntentId: 'pi_123',
        })
      )
    ),
    refundPayment: jest.fn((paymentIntentId) =>
      Promise.resolve(
        mockApiResponse({
          status: 'refunded',
          paymentIntentId,
        })
      )
    ),
  },

  // Products
  products: {
    getProducts: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          products: generateMockProducts(10),
          pagination: {
            page: 1,
            limit: 20,
            total: 10,
          },
        })
      )
    ),
    getProduct: jest.fn((productId) =>
      Promise.resolve(
        mockApiResponse({
          ...generateMockProducts(1)[0],
          id: productId,
        })
      )
    ),
    searchProducts: jest.fn((query) =>
      Promise.resolve(
        mockApiResponse({
          products: generateMockProducts(5),
          query,
        })
      )
    ),
  },

  // Stores
  stores: {
    getStores: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          stores: generateMockStores(10),
          pagination: {
            page: 1,
            limit: 20,
            total: 10,
          },
        })
      )
    ),
    getStore: jest.fn((storeId) =>
      Promise.resolve(
        mockApiResponse({
          ...generateMockStores(1)[0],
          id: storeId,
        })
      )
    ),
  },

  // Projects (Earning)
  projects: {
    getProjects: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          projects: [testDataFactory.project()],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
          },
        })
      )
    ),
    getProject: jest.fn((projectId) =>
      Promise.resolve(
        mockApiResponse({
          ...testDataFactory.project(),
          id: projectId,
        })
      )
    ),
    submitProject: jest.fn((projectId, data) =>
      Promise.resolve(
        mockApiResponse({
          submissionId: `sub_${Date.now()}`,
          projectId,
          status: 'pending_review',
          ...data,
        })
      )
    ),
  },

  // UGC
  ugc: {
    getUGCFeed: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          content: [testDataFactory.ugcContent()],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
          },
        })
      )
    ),
    getUGCContent: jest.fn((contentId) =>
      Promise.resolve(
        mockApiResponse({
          ...testDataFactory.ugcContent(),
          id: contentId,
        })
      )
    ),
    uploadUGC: jest.fn((data) =>
      Promise.resolve(
        mockApiResponse({
          id: `ugc_${Date.now()}`,
          ...data,
        })
      )
    ),
    likeUGC: jest.fn((contentId) =>
      Promise.resolve(
        mockApiResponse({
          contentId,
          liked: true,
          likes: 11,
        })
      )
    ),
    commentUGC: jest.fn((contentId, comment) =>
      Promise.resolve(
        mockApiResponse({
          id: `comment_${Date.now()}`,
          contentId,
          comment,
          createdAt: new Date().toISOString(),
        })
      )
    ),
  },

  // Wallet
  wallet: {
    getWallet: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          balance: 5000,
          coins: 250,
          currency: 'INR',
        })
      )
    ),
    addMoney: jest.fn((amount) =>
      Promise.resolve(
        mockApiResponse({
          transactionId: `txn_${Date.now()}`,
          amount,
          newBalance: 5000 + amount,
        })
      )
    ),
    payBill: jest.fn((data) =>
      Promise.resolve(
        mockApiResponse({
          transactionId: `txn_${Date.now()}`,
          ...data,
          status: 'success',
        })
      )
    ),
    getTransactions: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          transactions: [
            {
              id: 'txn_1',
              type: 'credit',
              amount: 500,
              description: 'Bill payment cashback',
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
          },
        })
      )
    ),
  },

  // Wishlist
  wishlist: {
    getWishlist: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          items: generateMockProducts(3),
        })
      )
    ),
    addToWishlist: jest.fn((productId) =>
      Promise.resolve(
        mockApiResponse({
          productId,
          added: true,
        })
      )
    ),
    removeFromWishlist: jest.fn((productId) =>
      Promise.resolve(
        mockApiResponse({
          productId,
          removed: true,
        })
      )
    ),
  },

  // Notifications
  notifications: {
    getNotifications: jest.fn(() =>
      Promise.resolve(
        mockApiResponse({
          notifications: [testDataFactory.notification()],
          unreadCount: 1,
        })
      )
    ),
    markAsRead: jest.fn((notificationId) =>
      Promise.resolve(
        mockApiResponse({
          notificationId,
          read: true,
        })
      )
    ),
  },

  // Address
  address: {
    getAddresses: jest.fn(() =>
      Promise.resolve(
        mockApiResponse([testDataFactory.address()])
      )
    ),
    createAddress: jest.fn((data) =>
      Promise.resolve(
        mockApiResponse({
          id: `addr_${Date.now()}`,
          ...data,
        })
      )
    ),
    updateAddress: jest.fn((addressId, data) =>
      Promise.resolve(
        mockApiResponse({
          id: addressId,
          ...data,
        })
      )
    ),
    deleteAddress: jest.fn((addressId) =>
      Promise.resolve(
        mockApiResponse({
          addressId,
          deleted: true,
        })
      )
    ),
  },
};

// Reset all mock handlers
export const resetMockHandlers = () => {
  Object.values(mockApiHandlers).forEach(category => {
    Object.values(category).forEach(handler => {
      if (jest.isMockFunction(handler)) {
        handler.mockClear();
      }
    });
  });
};

// Setup default mock implementations
export const setupMockHandlers = (apiClient: any) => {
  apiClient.get.mockImplementation((url: string) => {
    if (url.includes('/cart')) return mockApiHandlers.cart.getCart();
    if (url.includes('/orders')) return mockApiHandlers.orders.getOrders();
    if (url.includes('/products')) return mockApiHandlers.products.getProducts();
    if (url.includes('/stores')) return mockApiHandlers.stores.getStores();
    if (url.includes('/projects')) return mockApiHandlers.projects.getProjects();
    if (url.includes('/ugc')) return mockApiHandlers.ugc.getUGCFeed();
    if (url.includes('/wallet')) return mockApiHandlers.wallet.getWallet();
    if (url.includes('/wishlist')) return mockApiHandlers.wishlist.getWishlist();
    if (url.includes('/notifications')) return mockApiHandlers.notifications.getNotifications();
    if (url.includes('/addresses')) return mockApiHandlers.address.getAddresses();
    return Promise.resolve(mockApiResponse({}));
  });

  apiClient.post.mockImplementation((url: string, data: any) => {
    if (url.includes('/auth/send-otp')) return mockApiHandlers.auth.sendOtp();
    if (url.includes('/auth/verify-otp')) return mockApiHandlers.auth.verifyOtp();
    if (url.includes('/auth/logout')) return mockApiHandlers.auth.logout();
    if (url.includes('/cart/add')) return mockApiHandlers.cart.addItem(data.productId, data.quantity);
    if (url.includes('/orders')) return mockApiHandlers.orders.createOrder(data);
    if (url.includes('/payment/create')) return mockApiHandlers.payment.createPaymentIntent(data);
    if (url.includes('/payment/confirm')) return mockApiHandlers.payment.confirmPayment();
    if (url.includes('/projects/submit')) return mockApiHandlers.projects.submitProject(data.projectId, data);
    if (url.includes('/ugc/upload')) return mockApiHandlers.ugc.uploadUGC(data);
    if (url.includes('/wallet/add')) return mockApiHandlers.wallet.addMoney(data.amount);
    if (url.includes('/addresses')) return mockApiHandlers.address.createAddress(data);
    return Promise.resolve(mockApiResponse({}));
  });
};
