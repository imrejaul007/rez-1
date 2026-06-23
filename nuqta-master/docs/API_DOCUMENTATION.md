# REZ App - Complete API Documentation

**Version:** 1.0.0
**Last Updated:** 2025-11-11
**Base URL:** `http://localhost:5001/api` (Development)

---

## Table of Contents

1. [Overview](#overview)
2. [API Client](#api-client)
3. [Authentication APIs](#authentication-apis)
4. [Product APIs](#product-apis)
5. [Cart APIs](#cart-apis)
6. [Order APIs](#order-apis)
7. [Wallet APIs](#wallet-apis)
8. [Store APIs](#store-apis)
9. [Category APIs](#category-apis)
10. [Offer APIs](#offer-apis)
11. [Video & UGC APIs](#video--ugc-apis)
12. [Project & Earning APIs](#project--earning-apis)
13. [Notification APIs](#notification-apis)
14. [Review APIs](#review-apis)
15. [Wishlist APIs](#wishlist-apis)
16. [Search APIs](#search-apis)
17. [Payment APIs](#payment-apis)
18. [Referral APIs](#referral-apis)
19. [Location & Address APIs](#location--address-apis)
20. [Support & Chat APIs](#support--chat-apis)
21. [Error Handling](#error-handling)
22. [Response Formats](#response-formats)

---

## Overview

The REZ App API is a RESTful service that provides comprehensive e-commerce, gamification, and social features. All API requests require proper authentication and return JSON responses.

### Key Features

- Token-based authentication with automatic refresh
- Comprehensive error handling
- Request/response logging
- Timeout management (30s default)
- Automatic retry on token expiration
- Cache integration
- Offline queue support

### Base Configuration

```typescript
const API_BASE_URL = 'http://localhost:5001/api'; // Development
const API_TIMEOUT = 30000; // 30 seconds
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
```

---

## API Client

### Overview

The API Client (`services/apiClient.ts`) is the foundation for all API communications. It provides:

- HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Token management
- Request/response interceptors
- Error handling
- Retry logic

### Initialization

```typescript
import apiClient from '@/services/apiClient';

// The client is a singleton and automatically initialized
```

### Setting Authentication Token

```typescript
// Set token (called automatically after login)
apiClient.setAuthToken('your-jwt-token');

// Get current token
const token = apiClient.getAuthToken();

// Clear token
apiClient.setAuthToken(null);
```

### Token Refresh Configuration

```typescript
// Set refresh token callback
apiClient.setRefreshTokenCallback(async () => {
  try {
    const refreshToken = await getStoredRefreshToken();
    const response = await authService.refreshToken(refreshToken);
    if (response.success && response.data) {
      await storeNewTokens(response.data.tokens);
      apiClient.setAuthToken(response.data.tokens.accessToken);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
});
```

### Logout Callback

```typescript
// Set logout callback
apiClient.setLogoutCallback(() => {
  // Handle logout (clear storage, redirect, etc.)
  clearStoredTokens();
  navigation.navigate('SignIn');
});
```

### Making Requests

#### GET Request

```typescript
const response = await apiClient.get<DataType>('/endpoint', {
  param1: 'value1',
  param2: 'value2',
});
```

#### POST Request

```typescript
const response = await apiClient.post<DataType>('/endpoint', {
  field1: 'value1',
  field2: 'value2',
});
```

#### PUT Request

```typescript
const response = await apiClient.put<DataType>('/endpoint', {
  field1: 'updatedValue',
});
```

#### PATCH Request

```typescript
const response = await apiClient.patch<DataType>('/endpoint', {
  field1: 'patchedValue',
});
```

#### DELETE Request

```typescript
const response = await apiClient.delete<DataType>('/endpoint', {
  reason: 'Not needed anymore',
});
```

#### File Upload

```typescript
const formData = new FormData();
formData.append('file', {
  uri: fileUri,
  type: 'image/jpeg',
  name: 'photo.jpg',
});

const response = await apiClient.uploadFile<DataType>('/endpoint', formData);
```

### Response Structure

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: { [key: string]: string[] };
}
```

### Error Handling

```typescript
try {
  const response = await apiClient.get('/endpoint');

  if (response.success && response.data) {
    // Handle success
    console.log('Data:', response.data);
  } else {
    // Handle API error
    console.error('API Error:', response.error);
  }
} catch (error) {
  // Handle network/connection error
  console.error('Request failed:', error);
}
```

---

## Authentication APIs

Service: `services/authApi.ts`

### Send OTP

Send OTP to phone number for registration or login.

```typescript
import authService from '@/services/authApi';

const response = await authService.sendOtp({
  phoneNumber: '+919876543210',
  email: 'user@example.com', // Optional
  referralCode: 'REF123', // Optional
});

// Response
{
  success: true,
  data: {
    message: 'OTP sent successfully',
    expiresIn: 300 // seconds
  }
}
```

**Endpoint:** `POST /user/auth/send-otp`

**Parameters:**
- `phoneNumber` (required): User's phone number with country code
- `email` (optional): User's email address
- `referralCode` (optional): Referral code from another user

### Verify OTP

Verify OTP and authenticate/register user.

```typescript
const response = await authService.verifyOtp({
  phoneNumber: '+919876543210',
  otp: '123456',
});

// Response
{
  success: true,
  data: {
    user: {
      id: 'user_123',
      phoneNumber: '+919876543210',
      email: 'user@example.com',
      profile: { firstName: 'John', lastName: 'Doe' },
      wallet: { balance: 0, totalEarned: 0 },
      isVerified: true,
      isOnboarded: false,
      role: 'user'
    },
    tokens: {
      accessToken: 'eyJhbGciOiJIUzI1...',
      refreshToken: 'eyJhbGciOiJIUzI1...',
      expiresIn: 3600 // seconds
    }
  }
}
```

**Endpoint:** `POST /user/auth/verify-otp`

**Parameters:**
- `phoneNumber` (required): User's phone number
- `otp` (required): 6-digit OTP code

### Get Current User Profile

```typescript
const response = await authService.getProfile();

// Response
{
  success: true,
  data: {
    id: 'user_123',
    phoneNumber: '+919876543210',
    email: 'user@example.com',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      avatar: 'https://...',
      bio: 'Software developer',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      location: {
        address: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        coordinates: [19.0760, 72.8777]
      }
    },
    preferences: {
      language: 'en',
      theme: 'light',
      notifications: {
        push: true,
        email: true,
        sms: false
      }
    },
    wallet: {
      balance: 1500.50,
      totalEarned: 5000,
      totalSpent: 3500,
      pendingAmount: 250
    },
    role: 'user',
    isVerified: true,
    isOnboarded: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-11-11T00:00:00.000Z'
  }
}
```

**Endpoint:** `GET /user/auth/me`

**Authentication:** Required

### Update Profile

```typescript
const response = await authService.updateProfile({
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    avatar: 'https://...',
    bio: 'Updated bio',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'male',
    location: {
      address: '123 New St',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001'
    }
  },
  preferences: {
    language: 'en',
    theme: 'dark',
    notifications: {
      push: true,
      email: false,
      sms: false
    }
  }
});
```

**Endpoint:** `PUT /user/profile`

**Authentication:** Required

### Complete Onboarding

```typescript
const response = await authService.completeOnboarding({
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    location: {
      city: 'Mumbai',
      state: 'Maharashtra'
    }
  },
  preferences: {
    categories: ['electronics', 'fashion', 'food'],
    notifications: {
      push: true,
      email: true
    }
  }
});
```

**Endpoint:** `POST /user/auth/complete-onboarding`

**Authentication:** Required

### Refresh Token

```typescript
const response = await authService.refreshToken('refresh_token_here');

// Response
{
  success: true,
  data: {
    tokens: {
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      expiresIn: 3600
    }
  }
}
```

**Endpoint:** `POST /user/auth/refresh-token`

### Logout

```typescript
const response = await authService.logout();

// Response
{
  success: true,
  data: {
    message: 'Logged out successfully'
  }
}
```

**Endpoint:** `POST /user/auth/logout`

**Authentication:** Required

### Delete Account

```typescript
const response = await authService.deleteAccount();
```

**Endpoint:** `DELETE /user/auth/account`

**Authentication:** Required

### Get User Statistics

```typescript
const response = await authService.getUserStatistics();

// Response
{
  success: true,
  data: {
    user: {
      joinedDate: '2024-01-01',
      isVerified: true,
      totalReferrals: 10,
      referralEarnings: 500
    },
    wallet: {
      balance: 1500.50,
      totalEarned: 5000,
      totalSpent: 3500,
      pendingAmount: 250
    },
    orders: {
      total: 45,
      completed: 40,
      cancelled: 5,
      totalSpent: 25000
    },
    videos: {
      totalCreated: 20,
      totalViews: 5000,
      totalLikes: 1200,
      totalShares: 300
    },
    projects: {
      totalParticipated: 15,
      approved: 12,
      rejected: 3,
      totalEarned: 3000
    },
    offers: {
      totalRedeemed: 25
    },
    vouchers: {
      total: 10,
      used: 5,
      active: 5
    },
    summary: {
      totalActivity: 115,
      totalEarnings: 8500,
      totalSpendings: 28500
    }
  }
}
```

**Endpoint:** `GET /user/auth/statistics`

**Authentication:** Required

---

## Product APIs

Service: `services/productsApi.ts`

### Get Products

Fetch products with filtering, sorting, and pagination.

```typescript
import productsService from '@/services/productsApi';

const response = await productsService.getProducts({
  page: 1,
  limit: 20,
  category: 'electronics',
  store: 'store_123',
  search: 'laptop',
  minPrice: 10000,
  maxPrice: 50000,
  tags: ['gaming', 'professional'],
  sort: 'price',
  order: 'asc',
  status: 'active',
  visibility: 'public'
});

// Response
{
  success: true,
  data: {
    products: [
      {
        id: 'prod_123',
        name: 'Gaming Laptop',
        description: 'High-performance gaming laptop',
        sku: 'LAP-001',
        category: {
          id: 'cat_123',
          name: 'Electronics',
          slug: 'electronics'
        },
        store: {
          id: 'store_123',
          name: 'Tech Store',
          slug: 'tech-store'
        },
        images: [
          {
            id: 'img_1',
            url: 'https://...',
            alt: 'Gaming Laptop',
            isMain: true
          }
        ],
        pricing: {
          basePrice: 45000,
          salePrice: 40000,
          taxable: true
        },
        ratings: {
          average: 4.5,
          count: 120,
          breakdown: {
            5: 80,
            4: 30,
            3: 8,
            2: 1,
            1: 1
          }
        },
        status: 'active',
        visibility: 'public'
      }
    ],
    pagination: {
      current: 1,
      pages: 5,
      total: 100,
      limit: 20
    },
    filters: {
      categories: [
        { id: 'cat_1', name: 'Electronics', count: 45 }
      ],
      stores: [
        { id: 'store_1', name: 'Tech Store', count: 25 }
      ],
      priceRange: { min: 5000, max: 100000 },
      tags: [
        { name: 'gaming', count: 30 },
        { name: 'professional', count: 20 }
      ]
    }
  }
}
```

**Endpoint:** `GET /products`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `category` (optional): Category ID or slug
- `store` (optional): Store ID
- `search` (optional): Search query
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `tags` (optional): Array of tags
- `sort` (optional): Sort field (name, price, rating, popularity, newest, oldest)
- `order` (optional): Sort order (asc, desc)
- `status` (optional): Product status
- `visibility` (optional): Product visibility

### Get Product by ID

```typescript
const response = await productsService.getProductById('prod_123');

// Response
{
  success: true,
  data: {
    id: 'prod_123',
    name: 'Gaming Laptop',
    description: 'High-performance gaming laptop with RTX 4060',
    sku: 'LAP-001',
    category: { id: 'cat_123', name: 'Electronics', slug: 'electronics' },
    store: { id: 'store_123', name: 'Tech Store', slug: 'tech-store' },
    variants: [
      {
        id: 'var_1',
        name: '16GB RAM / 512GB SSD',
        sku: 'LAP-001-16-512',
        price: 45000,
        comparePrice: 50000,
        inventory: {
          quantity: 10,
          trackQuantity: true,
          allowBackorder: false
        },
        attributes: {
          ram: '16GB',
          storage: '512GB',
          color: 'Black'
        }
      }
    ],
    images: [...],
    pricing: { basePrice: 45000, salePrice: 40000 },
    ratings: { average: 4.5, count: 120 }
  }
}
```

**Endpoint:** `GET /products/:id`

### Search Products

```typescript
const response = await productsService.searchProducts({
  q: 'laptop',
  page: 1,
  limit: 20,
  category: 'electronics',
  store: 'store_123',
  filters: {
    brand: 'Dell',
    minRating: 4
  }
});

// Response
{
  success: true,
  data: {
    products: [...],
    suggestions: ['laptop bag', 'laptop stand', 'laptop cooling pad'],
    filters: [
      {
        name: 'Brand',
        type: 'brand',
        options: [
          { value: 'Dell', label: 'Dell', count: 25 },
          { value: 'HP', label: 'HP', count: 20 }
        ]
      }
    ],
    pagination: {
      current: 1,
      pages: 3,
      total: 60,
      limit: 20
    },
    query: 'laptop',
    searchTime: 45 // milliseconds
  }
}
```

**Endpoint:** `GET /products/search`

### Get Featured Products

```typescript
const response = await productsService.getFeaturedProducts(10);

// Returns array of products marked as featured
```

**Endpoint:** `GET /products/featured?limit=10`

### Get New Arrivals

```typescript
const response = await productsService.getNewArrivalsForHomepage(10);

// Returns array of recently added products
```

**Endpoint:** `GET /products/new-arrivals?limit=10`

### Get Products by Category

```typescript
const response = await productsService.getProductsByCategory('electronics', {
  page: 1,
  limit: 20,
  sort: 'price',
  order: 'asc'
});
```

**Endpoint:** `GET /products/category/:categorySlug`

### Get Products by Store

```typescript
const response = await productsService.getProductsByStore('store_123', {
  page: 1,
  limit: 20,
  category: 'electronics',
  sortBy: 'newest'
});
```

**Endpoint:** `GET /products/store/:storeId`

### Get Product Recommendations

```typescript
const response = await productsService.getRecommendations('prod_123', 5);

// Returns products similar to the given product
```

**Endpoint:** `GET /products/:id/recommendations?limit=5`

### Get Related Products

```typescript
const response = await productsService.getRelatedProducts('prod_123', 5);

// Returns products in the same category
```

**Endpoint:** `GET /products/:id/related?limit=5`

### Track Product View

```typescript
const response = await productsService.trackProductView('prod_123');

// Analytics tracking - fire and forget
```

**Endpoint:** `POST /products/:id/track-view`

### Check Product Availability

```typescript
const response = await productsService.checkAvailability('prod_123', 'var_1', 2);

// Response
{
  success: true,
  data: {
    available: true,
    maxQuantity: 10
  }
}
```

**Endpoint:** `GET /products/:id/availability`

---

## Cart APIs

Service: `services/cartApi.ts`

### Get Cart

Fetch the current user's shopping cart.

```typescript
import cartService from '@/services/cartApi';

const response = await cartService.getCart();

// Response
{
  success: true,
  data: {
    _id: 'cart_123',
    user: 'user_123',
    items: [
      {
        _id: 'item_1',
        product: {
          _id: 'prod_123',
          name: 'Gaming Laptop',
          images: [
            {
              id: 'img_1',
              url: 'https://...',
              alt: 'Gaming Laptop',
              isMain: true
            }
          ],
          pricing: { currency: 'INR' },
          inventory: { stock: 10, isAvailable: true },
          isActive: true
        },
        store: {
          _id: 'store_123',
          name: 'Tech Store',
          location: {
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra'
          }
        },
        variant: {
          type: 'RAM',
          value: '16GB'
        },
        quantity: 1,
        price: 45000,
        originalPrice: 50000,
        discount: 5000,
        addedAt: '2024-11-11T10:00:00.000Z'
      }
    ],
    lockedItems: [],
    totals: {
      subtotal: 45000,
      tax: 8100,
      delivery: 0,
      discount: 5000,
      cashback: 450,
      total: 48100,
      savings: 5000
    },
    coupon: null,
    itemCount: 1,
    storeCount: 1,
    isActive: true,
    expiresAt: '2024-11-12T10:00:00.000Z',
    createdAt: '2024-11-11T10:00:00.000Z',
    updatedAt: '2024-11-11T10:00:00.000Z'
  }
}
```

**Endpoint:** `GET /cart`

**Authentication:** Required

### Add to Cart

```typescript
const response = await cartService.addToCart({
  productId: 'prod_123',
  quantity: 1,
  variant: {
    type: 'RAM',
    value: '16GB'
  },
  metadata: {
    // Optional metadata for special items (events, bookings, etc.)
    eventId: 'event_123',
    slotId: 'slot_456',
    slotTime: '2024-11-15T18:00:00.000Z'
  }
});

// Returns updated cart
```

**Endpoint:** `POST /cart/add`

**Request Body:**
- `productId` (required): Product ID
- `quantity` (required): Quantity to add
- `variant` (optional): Product variant
- `metadata` (optional): Additional metadata

### Update Cart Item

```typescript
const response = await cartService.updateCartItem(
  'prod_123',
  { quantity: 2 },
  { type: 'RAM', value: '16GB' } // Optional variant
);

// Returns updated cart
```

**Endpoint:** `PUT /cart/item/:productId`

### Remove Cart Item

```typescript
const response = await cartService.removeCartItem(
  'prod_123',
  { type: 'RAM', value: '16GB' } // Optional variant
);

// Returns updated cart
```

**Endpoint:** `DELETE /cart/item/:productId`

### Clear Cart

```typescript
const response = await cartService.clearCart();

// Response
{
  success: true,
  data: {
    message: 'Cart cleared successfully'
  }
}
```

**Endpoint:** `DELETE /cart/clear`

### Apply Coupon

```typescript
const response = await cartService.applyCoupon({
  couponCode: 'SAVE10'
});

// Returns updated cart with coupon applied
```

**Endpoint:** `POST /cart/coupon`

### Remove Coupon

```typescript
const response = await cartService.removeCoupon();

// Returns updated cart without coupon
```

**Endpoint:** `DELETE /cart/coupon`

### Validate Cart

Check cart items for availability and price changes.

```typescript
const response = await cartService.validateCart();

// Response
{
  success: true,
  data: {
    valid: false,
    issues: [
      {
        itemId: 'item_1',
        type: 'price_change',
        message: 'Price has changed',
        currentPrice: 46000
      },
      {
        itemId: 'item_2',
        type: 'out_of_stock',
        message: 'Product is out of stock',
        availableQuantity: 0
      }
    ]
  }
}
```

**Endpoint:** `GET /cart/validate`

### Lock Item

Lock an item at current price for a specified duration.

```typescript
const response = await cartService.lockItem({
  productId: 'prod_123',
  quantity: 1,
  variant: { type: 'RAM', value: '16GB' },
  lockDurationHours: 24 // Optional, default: 24 hours
});

// Response
{
  success: true,
  data: {
    cart: {...}, // Updated cart
    message: 'Item locked at current price for 24 hours'
  }
}
```

**Endpoint:** `POST /cart/lock`

### Get Locked Items

```typescript
const response = await cartService.getLockedItems();

// Response
{
  success: true,
  data: {
    lockedItems: [
      {
        product: {...},
        store: {...},
        quantity: 1,
        lockedPrice: 45000,
        originalPrice: 50000,
        lockedAt: '2024-11-11T10:00:00.000Z',
        expiresAt: '2024-11-12T10:00:00.000Z',
        notes: 'Price locked for 24 hours'
      }
    ]
  }
}
```

**Endpoint:** `GET /cart/locked`

### Move Locked Item to Cart

```typescript
const response = await cartService.moveLockedToCart(
  'prod_123',
  { type: 'RAM', value: '16GB' } // Optional variant
);

// Returns updated cart
```

**Endpoint:** `POST /cart/lock/:productId/move-to-cart`

---

## Order APIs

Service: `services/ordersApi.ts`

### Create Order

Create an order from the current cart.

```typescript
import ordersService from '@/services/ordersApi';

const response = await ordersService.createOrder({
  deliveryAddress: {
    name: 'John Doe',
    phone: '+919876543210',
    email: 'john@example.com',
    addressLine1: '123 Main Street',
    addressLine2: 'Apt 4B',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
    landmark: 'Near City Mall',
    addressType: 'home'
  },
  paymentMethod: 'wallet', // or 'card', 'upi', 'cod', 'netbanking'
  specialInstructions: 'Please call before delivery',
  couponCode: 'SAVE10' // Optional
});

// Response
{
  success: true,
  data: {
    _id: 'order_123',
    id: 'order_123',
    orderNumber: 'ORD-2024-001',
    userId: 'user_123',
    status: 'placed',
    paymentStatus: 'pending',
    items: [...],
    totals: {
      subtotal: 45000,
      tax: 8100,
      delivery: 100,
      discount: 5000,
      cashback: 450,
      total: 48200,
      paidAmount: 0,
      refundAmount: 0
    },
    payment: {
      method: 'wallet',
      status: 'pending'
    },
    delivery: {
      method: 'standard',
      status: 'pending',
      address: {...},
      deliveryFee: 100,
      attempts: []
    },
    timeline: [
      {
        status: 'placed',
        message: 'Order placed successfully',
        timestamp: '2024-11-11T10:00:00.000Z'
      }
    ],
    specialInstructions: 'Please call before delivery',
    createdAt: '2024-11-11T10:00:00.000Z',
    updatedAt: '2024-11-11T10:00:00.000Z'
  }
}
```

**Endpoint:** `POST /orders`

**Authentication:** Required

### Get Orders

Fetch user orders with filtering and pagination.

```typescript
const response = await ordersService.getOrders({
  page: 1,
  limit: 10,
  status: 'delivered',
  paymentStatus: 'paid',
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
  search: 'laptop',
  sort: 'newest'
});

// Response
{
  success: true,
  data: {
    orders: [...],
    pagination: {
      current: 1,
      pages: 5,
      total: 50,
      limit: 10
    },
    summary: {
      totalOrders: 50,
      totalSpent: 125000,
      averageOrderValue: 2500
    }
  }
}
```

**Endpoint:** `GET /orders`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Order status filter
- `paymentStatus` (optional): Payment status filter
- `dateFrom` (optional): Start date filter
- `dateTo` (optional): End date filter
- `search` (optional): Search query
- `sort` (optional): Sort order

### Get Order by ID

```typescript
const response = await ordersService.getOrderById('order_123');

// Returns full order details
```

**Endpoint:** `GET /orders/:orderId`

### Get Order Tracking

```typescript
const response = await ordersService.getOrderTracking('order_123');

// Response
{
  success: true,
  data: {
    orderId: 'order_123',
    orderNumber: 'ORD-2024-001',
    status: 'out_for_delivery',
    estimatedDelivery: '2024-11-15T18:00:00.000Z',
    trackingNumber: 'TRK123456',
    carrier: 'BlueDart',
    timeline: [
      {
        status: 'placed',
        message: 'Order placed',
        timestamp: '2024-11-11T10:00:00.000Z'
      },
      {
        status: 'confirmed',
        message: 'Order confirmed by store',
        timestamp: '2024-11-11T11:00:00.000Z'
      },
      {
        status: 'preparing',
        message: 'Order is being prepared',
        timestamp: '2024-11-11T12:00:00.000Z'
      },
      {
        status: 'dispatched',
        message: 'Order dispatched',
        timestamp: '2024-11-11T15:00:00.000Z'
      },
      {
        status: 'out_for_delivery',
        message: 'Out for delivery',
        timestamp: '2024-11-12T09:00:00.000Z'
      }
    ],
    currentLocation: {
      address: 'Distribution Center, Mumbai',
      coordinates: [19.0760, 72.8777],
      timestamp: '2024-11-12T09:00:00.000Z'
    }
  }
}
```

**Endpoint:** `GET /orders/:orderId/tracking`

### Cancel Order

```typescript
const response = await ordersService.cancelOrder('order_123', 'Changed my mind');

// Returns updated order with cancelled status
```

**Endpoint:** `PATCH /orders/:orderId/cancel`

### Rate Order

```typescript
const response = await ordersService.rateOrder('order_123', 5, 'Great product!');

// Returns updated order with rating
```

**Endpoint:** `POST /orders/:orderId/rate`

### Get Order Statistics

```typescript
const response = await ordersService.getOrderStats();

// Response
{
  success: true,
  data: {
    totalOrders: 50,
    completedOrders: 45,
    cancelledOrders: 5,
    totalSpent: 125000,
    averageOrderValue: 2500,
    lastOrderDate: '2024-11-11T10:00:00.000Z',
    topCategories: [
      { category: 'Electronics', count: 20 },
      { category: 'Fashion', count: 15 }
    ]
  }
}
```

**Endpoint:** `GET /orders/stats`

---

## Wallet APIs

Service: `services/walletApi.ts`

### Get Wallet Balance

```typescript
import walletService from '@/services/walletApi';

const response = await walletService.getBalance();

// Response
{
  success: true,
  data: {
    balance: {
      total: 1500.50,
      available: 1250.50,
      pending: 250
    },
    coins: [
      {
        type: 'wasil',
        amount: 1000,
        isActive: true,
        earnedDate: '2024-11-01',
        lastUsed: '2024-11-10'
      },
      {
        type: 'cashback',
        amount: 250.50,
        isActive: true,
        earnedDate: '2024-11-05'
      },
      {
        type: 'promotion',
        amount: 250,
        isActive: true,
        earnedDate: '2024-11-08',
        expiryDate: '2024-12-08'
      }
    ],
    currency: 'INR',
    statistics: {
      totalEarned: 5000,
      totalSpent: 3500,
      totalCashback: 750,
      totalRefunds: 200,
      totalTopups: 2000,
      totalWithdrawals: 0
    },
    limits: {
      maxBalance: 100000,
      dailySpendLimit: 10000,
      dailySpentToday: 2500,
      remainingToday: 7500
    },
    status: {
      isActive: true,
      isFrozen: false
    },
    lastUpdated: '2024-11-11T10:00:00.000Z'
  }
}
```

**Endpoint:** `GET /wallet/balance`

**Authentication:** Required

### Get Transactions

Fetch wallet transaction history with filtering.

```typescript
const response = await walletService.getTransactions({
  page: 1,
  limit: 20,
  type: 'credit', // or 'debit'
  category: 'earning', // earning, spending, refund, withdrawal, topup, bonus, etc.
  status: 'completed',
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
  minAmount: 100,
  maxAmount: 10000
});

// Response
{
  success: true,
  data: {
    transactions: [
      {
        id: 'txn_123',
        transactionId: 'TXN-2024-001',
        user: 'user_123',
        type: 'credit',
        category: 'earning',
        amount: 500,
        currency: 'INR',
        description: 'Project completion reward',
        source: {
          type: 'project',
          reference: 'proj_123',
          description: 'Video creation project',
          metadata: {...}
        },
        status: {
          current: 'completed',
          history: [
            {
              status: 'pending',
              timestamp: '2024-11-11T10:00:00.000Z'
            },
            {
              status: 'completed',
              timestamp: '2024-11-11T10:05:00.000Z'
            }
          ]
        },
        balanceBefore: 1000,
        balanceAfter: 1500,
        fees: 0,
        tax: 0,
        netAmount: 500,
        processingTime: 300, // seconds
        receiptUrl: 'https://...',
        notes: '',
        isReversible: false,
        createdAt: '2024-11-11T10:00:00.000Z',
        updatedAt: '2024-11-11T10:05:00.000Z'
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasNext: true,
      hasPrev: false
    }
  }
}
```

**Endpoint:** `GET /wallet/transactions`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `type` (optional): Transaction type (credit/debit)
- `category` (optional): Transaction category
- `status` (optional): Transaction status
- `dateFrom` (optional): Start date
- `dateTo` (optional): End date
- `minAmount` (optional): Minimum amount
- `maxAmount` (optional): Maximum amount

### Get Transaction by ID

```typescript
const response = await walletService.getTransactionById('txn_123');

// Returns single transaction details
```

**Endpoint:** `GET /wallet/transaction/:transactionId`

### Topup Wallet

Add money to wallet.

```typescript
const response = await walletService.topup({
  amount: 1000,
  paymentMethod: 'card',
  paymentId: 'pay_123' // From payment gateway
});

// Response
{
  success: true,
  data: {
    transaction: {...},
    wallet: {
      balance: {
        total: 2500,
        available: 2500,
        pending: 0
      },
      currency: 'INR'
    }
  }
}
```

**Endpoint:** `POST /wallet/topup`

### Withdraw Funds

Withdraw money from wallet.

```typescript
const response = await walletService.withdraw({
  amount: 1000,
  method: 'bank', // or 'upi', 'paypal'
  accountDetails: 'Account details or UPI ID'
});

// Response
{
  success: true,
  data: {
    transaction: {...},
    withdrawalId: 'wth_123',
    netAmount: 985, // After fees
    fees: 15,
    wallet: {
      balance: {
        total: 1500,
        available: 1500,
        pending: 0
      },
      currency: 'INR'
    },
    estimatedProcessingTime: '2-3 business days'
  }
}
```

**Endpoint:** `POST /wallet/withdraw`

### Process Payment

Deduct amount from wallet for purchases.

```typescript
const response = await walletService.processPayment({
  amount: 500,
  orderId: 'order_123',
  storeId: 'store_123',
  storeName: 'Tech Store',
  description: 'Payment for order #ORD-2024-001',
  items: [...]
});

// Response
{
  success: true,
  data: {
    transaction: {...},
    wallet: {
      balance: {
        total: 1000,
        available: 1000,
        pending: 0
      },
      currency: 'INR'
    },
    paymentStatus: 'success'
  }
}
```

**Endpoint:** `POST /wallet/payment`

### Get Transaction Summary

Get aggregated transaction statistics.

```typescript
const response = await walletService.getSummary('month'); // day, week, month, year

// Response
{
  success: true,
  data: {
    summary: {
      summary: [
        {
          type: 'credit',
          totalAmount: 5000,
          count: 25,
          avgAmount: 200
        },
        {
          type: 'debit',
          totalAmount: 3500,
          count: 15,
          avgAmount: 233.33
        }
      ],
      totalTransactions: 40
    },
    period: 'month',
    wallet: {
      balance: {...},
      statistics: {...}
    }
  }
}
```

**Endpoint:** `GET /wallet/summary?period=month`

### Credit Loyalty Points

Add loyalty points to wallet (used by backend for rewards).

```typescript
const response = await walletService.creditLoyaltyPoints({
  amount: 100,
  source: {
    type: 'referral',
    reference: 'ref_123',
    description: 'Referral bonus',
    metadata: {...}
  }
});
```

**Endpoint:** `POST /wallet/credit-loyalty-points`

---

## Store APIs

Service: `services/storesApi.ts`

### Get Stores

### Get Store by ID

### Search Stores

### Get Store Categories

### Follow/Unfollow Store

### Get Store Products

### Get Store Reviews

---

## Category APIs

Service: `services/categoriesApi.ts`

### Get Categories

### Get Category by Slug

### Get Category Products

---

## Offer APIs

Service: `services/offersApi.ts`

### Get Offers

### Search Offers

### Get Offer Details

### Redeem Offer

### Get User's Redeemed Offers

---

## Video & UGC APIs

Service: `services/videosApi.ts`, `services/ugcApi.ts`

### Upload Video

### Get Videos

### Like/Unlike Video

### Report Video

---

## Project & Earning APIs

Service: `services/projectsApi.ts`

### Get Projects

### Submit Project

### Get Earnings

---

## Notification APIs

Service: `services/notificationsApi.ts`

### Get Notifications

### Mark as Read

### Delete Notification

---

## Review APIs

Service: `services/reviewsApi.ts`

### Submit Review

### Get Product Reviews

### Get User Reviews

---

## Wishlist APIs

Service: `services/wishlistApi.ts`

### Add to Wishlist

### Remove from Wishlist

### Get Wishlist

---

## Search APIs

Service: `services/searchApi.ts`

### Global Search

### Get Search Suggestions

### Get Search History

---

## Payment APIs

Service: `services/paymentService.ts`, `services/razorpayApi.ts`, `services/stripeApi.ts`

### Create Payment Intent

### Process Payment

### Verify Payment

---

## Referral APIs

Service: `services/referralApi.ts`

### Get Referral Code

### Apply Referral Code

### Get Referral Stats

---

## Location & Address APIs

Service: `services/addressApi.ts`, `services/locationService.ts`

### Get Addresses

### Add Address

### Update Address

### Delete Address

### Get Current Location

---

## Support & Chat APIs

Service: `services/supportApi.ts`, `services/supportChatApi.ts`

### Create Support Ticket

### Get Support Tickets

### Send Chat Message

### Get Chat History

---

## Error Handling

### Error Response Format

All API errors follow this format:

```typescript
{
  success: false,
  error: 'Error message',
  errors: {
    field1: ['Error 1', 'Error 2'],
    field2: ['Error 3']
  }
}
```

### Common Error Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or token expired |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists or conflict |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Server temporarily unavailable |

### Handling Errors

```typescript
try {
  const response = await apiClient.get('/endpoint');

  if (response.success && response.data) {
    // Success
    handleSuccess(response.data);
  } else {
    // API error
    handleApiError(response.error, response.errors);
  }
} catch (error) {
  // Network/Connection error
  handleNetworkError(error);
}
```

---

## Response Formats

### Success Response

```typescript
{
  success: true,
  data: T, // Response data
  message?: string // Optional success message
}
```

### Error Response

```typescript
{
  success: false,
  error: string, // Error message
  errors?: { [key: string]: string[] } // Validation errors
}
```

### Paginated Response

```typescript
{
  success: true,
  data: {
    items: T[],
    pagination: {
      current: number,
      pages: number,
      total: number,
      limit: number,
      hasNext?: boolean,
      hasPrev?: boolean
    }
  }
}
```

---

## Best Practices

1. **Always check response.success** before accessing data
2. **Handle both API errors and network errors** separately
3. **Use TypeScript types** for type safety
4. **Implement retry logic** for transient failures
5. **Cache responses** when appropriate
6. **Log errors** for debugging
7. **Show user-friendly messages** instead of technical errors
8. **Validate input** before making API calls
9. **Handle token expiration** gracefully
10. **Use offline queue** for critical operations

---

## Rate Limiting

- Default rate limit: 100 requests per minute per user
- Exceeded limit returns 429 status code
- Retry after header indicates when to retry
- Use exponential backoff for retries

---

## Authentication Flow

1. User sends OTP request
2. User verifies OTP
3. Backend returns access token and refresh token
4. Store tokens securely
5. Set access token in API client
6. On 401 error, refresh token automatically
7. If refresh fails, logout user

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-11-11 | Initial API documentation |

---

## Support

For API support and questions:
- Email: dev@rezapp.com
- Documentation: https://docs.rezapp.com
- GitHub Issues: https://github.com/rezapp/frontend/issues

---

**End of API Documentation**
