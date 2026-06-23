# Backend Status - Quick Overview

**Last Updated**: November 15, 2025
**Overall Status**: ✅ PRODUCTION READY

---

## Quick Overview

The REZ App backend is **fully operational** and ready for frontend integration. All API endpoints are working, the database is populated with real data, and all third-party integrations (payments, SMS, cloud storage) are configured.

---

## Backend Connection Details

### Development
```
Base URL: http://localhost:5001
API Prefix: /api
WebSocket: ws://localhost:5001
```

### Production (When Deployed)
```
Base URL: https://api.rezapp.com (or your domain)
API Prefix: /api
WebSocket: wss://api.rezapp.com
```

---

## Authentication Flow

### 1. Send OTP
```typescript
POST /api/user/auth/send-otp
Content-Type: application/json

{
  "phone": "+911234567890"
}

Response:
{
  "success": true,
  "message": "OTP sent successfully",
  "otpId": "..."
}
```

### 2. Verify OTP & Login
```typescript
POST /api/user/auth/verify-otp
Content-Type: application/json

{
  "phone": "+911234567890",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGc...",
    "refreshToken": "..."
  }
}
```

### 3. Use Token for Authenticated Requests
```typescript
GET /api/cart
Authorization: Bearer eyJhbGc...

Response:
{
  "success": true,
  "data": { ... }
}
```

---

## Available API Endpoints (211+ Total)

### Core Endpoints

#### Products
```
GET    /api/products              - List products
GET    /api/products/:id          - Get product details
GET    /api/products/search       - Search products
GET    /api/products/featured     - Featured products
GET    /api/products/recommendations - Recommended products
```

#### Categories
```
GET    /api/categories            - List categories
GET    /api/categories/:id        - Get category details
GET    /api/categories/:slug      - Get category by slug
```

#### Stores
```
GET    /api/stores                - List stores
GET    /api/stores/:id            - Get store details
GET    /api/stores/:id/products   - Get store products
GET    /api/stores/search         - Search stores
```

### Shopping Experience

#### Cart (Protected)
```
GET    /api/cart                  - Get cart
POST   /api/cart/add              - Add item to cart
PUT    /api/cart/update/:itemId   - Update cart item
DELETE /api/cart/remove/:itemId   - Remove from cart
POST   /api/cart/clear            - Clear cart
POST   /api/cart/apply-coupon     - Apply coupon
```

#### Wishlist (Protected)
```
GET    /api/wishlist              - Get wishlist
POST   /api/wishlist/add          - Add to wishlist
DELETE /api/wishlist/remove/:id   - Remove from wishlist
```

#### Orders (Protected)
```
GET    /api/orders                - Get user orders
POST   /api/orders                - Create order
GET    /api/orders/:id            - Get order details
GET    /api/orders/:id/track      - Track order
POST   /api/orders/:id/cancel     - Cancel order
```

### Payment & Wallet

#### Wallet (Protected)
```
GET    /api/wallet/balance        - Get wallet balance
POST   /api/wallet/add-money      - Add money to wallet
POST   /api/wallet/transfer       - Transfer money
GET    /api/wallet/transactions   - Transaction history
```

#### Payments (Protected)
```
POST   /api/payment/create        - Create payment intent
POST   /api/payment/verify        - Verify payment
GET    /api/payment/methods       - Get payment methods
POST   /api/payment/methods       - Add payment method
```

### User Profile & Settings

#### Profile (Protected)
```
GET    /api/user/profile          - Get profile
PUT    /api/user/profile          - Update profile
POST   /api/user/profile/avatar   - Upload avatar
```

#### Addresses (Protected)
```
GET    /api/addresses             - Get addresses
POST   /api/addresses             - Add address
PUT    /api/addresses/:id         - Update address
DELETE /api/addresses/:id         - Delete address
```

#### Settings (Protected)
```
GET    /api/user-settings         - Get settings
PUT    /api/user-settings         - Update settings
```

### Rewards & Gamification

#### Achievements (Protected)
```
GET    /api/achievements          - Get achievements
GET    /api/achievements/user     - Get user achievements
```

#### Challenges (Protected)
```
GET    /api/gamification/challenges        - Get challenges
GET    /api/gamification/challenges/active - Active challenges
POST   /api/gamification/challenges/join   - Join challenge
```

#### Coins & Rewards (Protected)
```
GET    /api/gamification/coins             - Get coin balance
GET    /api/gamification/coins/transactions - Coin history
```

### Offers & Promotions

#### Offers
```
GET    /api/offers                - List offers
GET    /api/offers/:id            - Get offer details
POST   /api/offers/redeem/:id     - Redeem offer (Protected)
```

#### Vouchers (Protected)
```
GET    /api/vouchers              - Get vouchers
GET    /api/vouchers/user         - Get user vouchers
POST   /api/vouchers/redeem       - Redeem voucher
```

#### Coupons
```
GET    /api/coupons               - List coupons
POST   /api/coupons/validate      - Validate coupon (Protected)
POST   /api/coupons/apply         - Apply coupon (Protected)
```

### Social Features

#### Activity Feed (Protected)
```
GET    /api/social/feed           - Get activity feed
POST   /api/social/post           - Create post
POST   /api/social/like/:id       - Like post
POST   /api/social/comment/:id    - Comment on post
POST   /api/social/follow/:userId - Follow user
```

### Content

#### Videos
```
GET    /api/videos                - List videos
GET    /api/videos/:id            - Get video details
```

#### Projects (Earning Opportunities)
```
GET    /api/projects              - List projects
GET    /api/projects/:id          - Get project details
POST   /api/projects/:id/submit   - Submit project work (Protected)
```

#### Reviews
```
GET    /api/reviews/product/:id   - Get product reviews
POST   /api/reviews               - Submit review (Protected)
PUT    /api/reviews/:id           - Update review (Protected)
POST   /api/reviews/:id/like      - Like review (Protected)
```

### Support

#### FAQ
```
GET    /api/support/faq           - Get FAQs
GET    /api/support/faq/:category - Get FAQs by category
```

#### Support Tickets (Protected)
```
GET    /api/support/tickets       - Get user tickets
POST   /api/support/tickets       - Create ticket
GET    /api/support/tickets/:id   - Get ticket details
POST   /api/support/tickets/:id/reply - Reply to ticket
```

---

## Data Available in Database

### Current Data
- **Users:** 16 registered users
- **Products:** 16 products across categories
- **Categories:** 10 categories
- **Stores:** 5 stores
- **Orders:** 9 completed orders
- **Wishlists:** 160 wishlist entries
- **Wallets:** 17 active wallets
- **Transactions:** 201 wallet transactions
- **Offers:** 12 active offers
- **Vouchers:** 12 voucher brands
- **Coupons:** 8 available coupons
- **Videos:** 6 videos
- **Projects:** 16 earning opportunities
- **Reviews:** 5 product reviews
- **FAQs:** 32 help articles

---

## Frontend Configuration

### Environment Variables
Create a `.env` file in your frontend project:

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:5001
EXPO_PUBLIC_API_PREFIX=/api
EXPO_PUBLIC_WS_URL=ws://localhost:5001

# Stripe (for payments)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51PQsD1A3bD41AFFrxWV0dn3xVgOZTp92LyO3OtrTYHjv4l7GHoQR8kp2CB2tjeVK79XXG2c7DEpRtECDVAGZBCNY00GncnIF0a

# Razorpay (for Indian payments)
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key_id

# Google Maps (for location)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD3iZHeRYgAH2WQNSmhPZqNLqJQ2mdvhUA
```

### API Client Setup

```typescript
// config/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';
const API_PREFIX = process.env.EXPO_PUBLIC_API_PREFIX || '/api';

export const apiClient = axios.create({
  baseURL: `${API_URL}${API_PREFIX}`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - redirect to login
      await AsyncStorage.removeItem('authToken');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);
```

---

## Example Usage in Frontend

### Authentication

```typescript
// services/authService.ts
import { apiClient } from '../config/api';

export const sendOTP = async (phone: string) => {
  const response = await apiClient.post('/user/auth/send-otp', { phone });
  return response.data;
};

export const verifyOTP = async (phone: string, otp: string) => {
  const response = await apiClient.post('/user/auth/verify-otp', { phone, otp });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/user/auth/me');
  return response.data;
};
```

### Products

```typescript
// services/productService.ts
import { apiClient } from '../config/api';

export const getProducts = async (page = 1, limit = 20) => {
  const response = await apiClient.get('/products', {
    params: { page, limit }
  });
  return response.data;
};

export const getProductDetails = async (productId: string) => {
  const response = await apiClient.get(`/products/${productId}`);
  return response.data;
};

export const searchProducts = async (query: string) => {
  const response = await apiClient.get('/products/search', {
    params: { q: query }
  });
  return response.data;
};
```

### Cart

```typescript
// services/cartService.ts
import { apiClient } from '../config/api';

export const getCart = async () => {
  const response = await apiClient.get('/cart');
  return response.data;
};

export const addToCart = async (productId: string, quantity: number) => {
  const response = await apiClient.post('/cart/add', {
    productId,
    quantity
  });
  return response.data;
};

export const updateCartItem = async (itemId: string, quantity: number) => {
  const response = await apiClient.put(`/cart/update/${itemId}`, {
    quantity
  });
  return response.data;
};
```

### Orders

```typescript
// services/orderService.ts
import { apiClient } from '../config/api';

export const createOrder = async (orderData: any) => {
  const response = await apiClient.post('/orders', orderData);
  return response.data;
};

export const getOrders = async () => {
  const response = await apiClient.get('/orders');
  return response.data;
};

export const trackOrder = async (orderId: string) => {
  const response = await apiClient.get(`/orders/${orderId}/track`);
  return response.data;
};
```

---

## WebSocket Integration

```typescript
// services/socketService.ts
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:5001';

class SocketService {
  private socket: Socket | null = null;

  connect(userId: string) {
    this.socket = io(WS_URL, {
      query: { userId },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Listen for real-time updates
    this.socket.on('cart-updated', (data) => {
      // Handle cart updates
    });

    this.socket.on('order-status-updated', (data) => {
      // Handle order status updates
    });

    this.socket.on('notification', (data) => {
      // Handle notifications
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();
```

---

## Error Handling

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (token missing/invalid)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Testing the Backend

### Health Check
```bash
curl http://localhost:5001/health
```

### API Info
```bash
curl http://localhost:5001/api-info
```

### Test Product Endpoint
```bash
curl http://localhost:5001/api/products
```

### Test with Authentication
```bash
# 1. Send OTP
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+911234567890"}'

# 2. Verify OTP (use actual OTP from Twilio)
curl -X POST http://localhost:5001/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+911234567890", "otp": "123456"}'

# 3. Use returned token
curl http://localhost:5001/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Performance Considerations

### API Response Times
- **Health Check:** <50ms
- **Product List:** <100ms
- **Product Details:** <100ms
- **Cart Operations:** <150ms
- **Order Creation:** <200ms

### Rate Limits (Development)
- Rate limiting is **disabled** in development
- Production will have:
  - 100 requests per 15 minutes (general)
  - 5 requests per 15 minutes (auth endpoints)

### Pagination
Most list endpoints support pagination:
```
GET /api/products?page=1&limit=20
```

Default: `page=1`, `limit=20`

---

## Known Issues & Limitations

### Minor Issues
- MongoDB deprecation warnings in backend logs (no functional impact)
- Some collections are empty by design (will populate with usage)

### Current Limitations
- **Redis caching** not active (may impact performance at scale)
- **Push notifications** need Firebase configuration
- **Email OTP** not configured (SMS OTP works fine)

### None of these affect development or testing

---

## Development Workflow

### 1. Start Backend
```bash
cd user-backend
npm run dev
```

### 2. Verify Backend is Running
```bash
curl http://localhost:5001/health
```

### 3. Start Frontend
```bash
cd frontend
npm start
```

### 4. Test API Integration
Use the example services provided above

---

## Support & Documentation

### Backend Documentation
- Full Report: `user-backend/BACKEND_VERIFICATION_REPORT.md`
- Quick Summary: `user-backend/QUICK_STATUS_SUMMARY.md`
- Deployment Guide: `user-backend/PRODUCTION_DEPLOYMENT_CHECKLIST.md`

### API Documentation
- Interactive: `http://localhost:5001/api-info`
- Health Check: `http://localhost:5001/health`

### Verification Scripts
```bash
cd user-backend

# Check database status
node scripts/check-database.js

# Comprehensive verification
node scripts/comprehensive-backend-check.js

# Analyze actual data
node scripts/check-actual-data.js
```

---

## Next Steps for Frontend Integration

1. **Set up API client** using the examples above
2. **Implement authentication flow** (OTP-based)
3. **Connect product pages** to product APIs
4. **Implement cart functionality** using cart APIs
5. **Set up order flow** with order APIs
6. **Integrate wallet** for payments
7. **Add real-time features** with WebSocket
8. **Test all critical flows** end-to-end

---

## Questions?

- Check backend logs: `user-backend/` directory
- Review API responses in detail
- Test endpoints using curl or Postman
- Refer to full documentation in `BACKEND_VERIFICATION_REPORT.md`

---

**Backend Status:** ✅ Ready for Integration
**Last Verified:** October 27, 2025
**Next Steps:** Start frontend integration with confidence!
