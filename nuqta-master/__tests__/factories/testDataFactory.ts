/**
 * Test Data Factory
 *
 * Centralized factory for generating test data for integration tests.
 * Provides consistent, realistic test data across all test suites.
 */

import { User } from '@/services/authApi';
import { CartItem } from '@/types/cart';

// ============================================
// User Factory
// ============================================

let userIdCounter = 1;

export const createTestUser = (overrides?: Partial<User>): User => {
  const id = userIdCounter++;
  return {
    id: `user-${id}`,
    phoneNumber: `+919${String(id).padStart(9, '0')}`,
    email: `user${id}@test.com`,
    profile: {
      firstName: `Test`,
      lastName: `User ${id}`,
      gender: ['male', 'female', 'other'][id % 3] as 'male' | 'female' | 'other',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      bio: `Test user bio for user ${id}`,
    },
    preferences: {
      categories: ['fashion', 'electronics', 'food'],
      notifications: {
        email: true,
        sms: true,
        push: true,
      },
    },
    wallet: {
      balance: 1000,
      totalEarned: 2000,
      totalSpent: 1000,
      pendingAmount: 0,
    },
    role: 'user' as const,
    isVerified: true,
    isOnboarded: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as User;
};

// ============================================
// Product Factory
// ============================================

let productIdCounter = 1;

export const createTestProduct = (overrides?: any) => {
  const id = productIdCounter++;
  return {
    id: `prod-${id}`,
    name: `Test Product ${id}`,
    description: `Description for test product ${id}`,
    image: `https://picsum.photos/seed/${id}/400/400`,
    images: [
      `https://picsum.photos/seed/${id}/400/400`,
      `https://picsum.photos/seed/${id + 1}/400/400`,
    ],
    originalPrice: 1000 + (id * 100),
    discountedPrice: 800 + (id * 80),
    discount: 20,
    rating: 4.0 + (id % 10) / 10,
    reviewCount: 10 + (id * 5),
    category: ['fashion', 'electronics', 'food'][id % 3],
    subcategory: ['shirts', 'mobiles', 'snacks'][id % 3],
    brand: `Brand ${id % 10}`,
    inStock: true,
    stockQuantity: 50 + (id * 2),
    store: {
      id: `store-${id % 5}`,
      name: `Test Store ${id % 5}`,
      logo: `https://api.dicebear.com/7.x/initials/svg?seed=Store${id % 5}`,
    },
    ...overrides,
  };
};

// ============================================
// Cart Item Factory
// ============================================

export const createTestCartItem = (overrides?: Partial<CartItem>): CartItem => {
  const product = createTestProduct();
  return {
    id: product.id,
    name: product.name,
    price: product.discountedPrice || product.originalPrice,
    image: product.image,
    originalPrice: product.originalPrice,
    discountedPrice: product.discountedPrice,
    discount: product.discount,
    cashback: '10% cashback',
    category: 'products',
    ...overrides,
  };
};

// ============================================
// Order Factory
// ============================================

let orderIdCounter = 1;

export const createTestOrder = (overrides?: any) => {
  const id = orderIdCounter++;
  const items = [createTestCartItem(), createTestCartItem()];
  const subtotal = items.reduce((sum, item) => sum + ((item as any).discountedPrice || item.originalPrice), 0);

  return {
    id: `order-${id}`,
    orderNumber: `ORD${String(id).padStart(8, '0')}`,
    items: items,
    subtotal: subtotal,
    discount: subtotal * 0.1,
    deliveryFee: 50,
    total: subtotal * 0.9 + 50,
    status: 'pending',
    paymentMethod: 'wallet',
    paymentStatus: 'pending',
    address: {
      name: 'Test User',
      phone: '+919876543210',
      addressLine1: '123 Test Street',
      addressLine2: 'Test Area',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      country: 'India',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
};

// ============================================
// Wallet Transaction Factory
// ============================================

let transactionIdCounter = 1;

export const createTestTransaction = (overrides?: any) => {
  const id = transactionIdCounter++;
  const types = ['credit', 'debit'];
  const type = types[id % 2];

  return {
    id: `txn-${id}`,
    type: type,
    amount: 100 + (id * 50),
    currency: 'INR',
    description: `Test ${type} transaction ${id}`,
    status: 'completed',
    category: type === 'credit' ? 'cashback' : 'purchase',
    balanceAfter: 1000 + (type === 'credit' ? 1 : -1) * (100 + id * 50),
    metadata: {
      orderId: type === 'debit' ? `order-${id}` : undefined,
    },
    createdAt: new Date(Date.now() - id * 86400000).toISOString(), // Spread over days
    ...overrides,
  };
};

// ============================================
// UGC Content Factory
// ============================================

let ugcIdCounter = 1;

export const createTestUGC = (overrides?: any) => {
  const id = ugcIdCounter++;
  const user = createTestUser();

  return {
    id: `ugc-${id}`,
    type: ['image', 'video'][id % 2],
    url: id % 2 === 0
      ? `https://picsum.photos/seed/ugc${id}/800/800`
      : `https://test-videos.com/sample${id}.mp4`,
    thumbnail: `https://picsum.photos/seed/ugc${id}/400/400`,
    caption: `Test UGC content ${id}`,
    tags: ['test', 'ugc', `tag${id}`],
    user: {
      id: user.id,
      name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Anonymous',
      profilePicture: user.profile?.avatar,
    },
    product: createTestProduct(),
    likes: 10 + (id * 5),
    comments: 5 + (id * 2),
    shares: 2 + id,
    isLiked: false,
    isSaved: false,
    createdAt: new Date(Date.now() - id * 86400000).toISOString(),
    ...overrides,
  };
};

// ============================================
// Store Factory
// ============================================

let storeIdCounter = 1;

export const createTestStore = (overrides?: any) => {
  const id = storeIdCounter++;

  return {
    id: `store-${id}`,
    name: `Test Store ${id}`,
    description: `Description for test store ${id}`,
    logo: `https://api.dicebear.com/7.x/initials/svg?seed=Store${id}`,
    banner: `https://picsum.photos/seed/store${id}/1200/400`,
    rating: 4.0 + (id % 10) / 10,
    reviewCount: 100 + (id * 50),
    categories: ['fashion', 'electronics', 'food'].slice(0, (id % 3) + 1),
    location: {
      address: `${id * 10} Store Street, Delhi`,
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      latitude: 28.7041 + (id * 0.01),
      longitude: 77.1025 + (id * 0.01),
    },
    distance: (id * 0.5).toFixed(1) + ' km',
    offers: [
      {
        id: `offer-${id}-1`,
        title: `${10 + id}% off on all items`,
        description: 'Limited time offer',
        discount: 10 + id,
      },
    ],
    isOpen: true,
    openingHours: {
      monday: '9:00 AM - 9:00 PM',
      tuesday: '9:00 AM - 9:00 PM',
      wednesday: '9:00 AM - 9:00 PM',
      thursday: '9:00 AM - 9:00 PM',
      friday: '9:00 AM - 9:00 PM',
      saturday: '9:00 AM - 10:00 PM',
      sunday: '10:00 AM - 8:00 PM',
    },
    isFavorite: false,
    ...overrides,
  };
};

// ============================================
// Deal/Offer Factory
// ============================================

let dealIdCounter = 1;

export const createTestDeal = (overrides?: any) => {
  const id = dealIdCounter++;

  return {
    id: `deal-${id}`,
    title: `Test Deal ${id}`,
    description: `Amazing deal on products - ${10 + (id * 5)}% off`,
    discount: 10 + (id * 5),
    image: `https://picsum.photos/seed/deal${id}/800/400`,
    store: createTestStore(),
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days from now
    termsAndConditions: 'Terms and conditions apply',
    couponCode: `DEAL${id}`,
    maxDiscount: 500 + (id * 100),
    minPurchase: 1000 + (id * 200),
    usageCount: 0,
    usageLimit: 100,
    isActive: true,
    ...overrides,
  };
};

// ============================================
// Address Factory
// ============================================

let addressIdCounter = 1;

export const createTestAddress = (overrides?: any) => {
  const id = addressIdCounter++;

  return {
    id: `addr-${id}`,
    type: ['home', 'work', 'other'][id % 3],
    name: `Test User ${id}`,
    phone: `+919${String(id).padStart(9, '0')}`,
    addressLine1: `${id * 10} Test Street`,
    addressLine2: `Test Area ${id}`,
    city: 'Delhi',
    state: 'Delhi',
    pincode: String(110001 + id).padStart(6, '0'),
    country: 'India',
    isDefault: id === 1,
    ...overrides,
  };
};

// ============================================
// Review Factory
// ============================================

let reviewIdCounter = 1;

export const createTestReview = (overrides?: any) => {
  const id = reviewIdCounter++;
  const user = createTestUser();

  return {
    id: `review-${id}`,
    rating: 3 + (id % 3), // 3, 4, or 5 stars
    title: `Test Review ${id}`,
    comment: `This is a test review for the product. Quality is good. ${id}`,
    user: {
      id: user.id,
      name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Anonymous',
      profilePicture: user.profile?.avatar,
    },
    images: id % 2 === 0 ? [
      `https://picsum.photos/seed/review${id}/400/400`,
    ] : [],
    helpful: 5 + id,
    verified: true,
    createdAt: new Date(Date.now() - id * 86400000).toISOString(),
    ...overrides,
  };
};

// ============================================
// Notification Factory
// ============================================

let notificationIdCounter = 1;

export const createTestNotification = (overrides?: any) => {
  const id = notificationIdCounter++;
  const types = ['order', 'deal', 'cashback', 'system'];
  const type = types[id % types.length];

  return {
    id: `notif-${id}`,
    type: type,
    title: `Test Notification ${id}`,
    message: `This is a test notification message for ${type}`,
    data: {
      orderId: type === 'order' ? `order-${id}` : undefined,
      dealId: type === 'deal' ? `deal-${id}` : undefined,
    },
    read: false,
    createdAt: new Date(Date.now() - id * 3600000).toISOString(), // Spread over hours
    ...overrides,
  };
};

// ============================================
// Event Factory (for event booking tests)
// ============================================

let eventIdCounter = 1;

export const createTestEvent = (overrides?: any) => {
  const id = eventIdCounter++;

  return {
    id: `event-${id}`,
    title: `Test Event ${id}`,
    description: `Description for test event ${id}`,
    image: `https://picsum.photos/seed/event${id}/800/600`,
    category: ['concert', 'workshop', 'sports', 'exhibition'][id % 4],
    venue: {
      name: `Venue ${id}`,
      address: `${id * 10} Event Street, Delhi`,
      city: 'Delhi',
      state: 'Delhi',
    },
    date: new Date(Date.now() + (id + 5) * 86400000).toISOString(), // 5+ days from now
    startTime: '18:00',
    endTime: '21:00',
    price: 500 + (id * 100),
    availableSeats: 100 - (id * 5),
    totalSeats: 100,
    organizer: {
      id: `org-${id}`,
      name: `Organizer ${id}`,
      logo: `https://api.dicebear.com/7.x/initials/svg?seed=Org${id}`,
    },
    ...overrides,
  };
};

// ============================================
// Utility Functions
// ============================================

/**
 * Reset all counters (useful between tests)
 */
export const resetFactoryCounters = () => {
  userIdCounter = 1;
  productIdCounter = 1;
  orderIdCounter = 1;
  transactionIdCounter = 1;
  ugcIdCounter = 1;
  storeIdCounter = 1;
  dealIdCounter = 1;
  addressIdCounter = 1;
  reviewIdCounter = 1;
  notificationIdCounter = 1;
  eventIdCounter = 1;
};

/**
 * Create a batch of test items
 */
export const createBatch = <T>(factory: () => T, count: number): T[] => {
  return Array.from({ length: count }, () => factory());
};
