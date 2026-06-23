# REZ App - API Quick Reference

Quick lookup guide for all API endpoints and common operations.

---

## Authentication (`/user/auth/*`)

| Operation | Method | Endpoint | Request Body | Response |
|-----------|--------|----------|--------------|----------|
| Send OTP | POST | `/user/auth/send-otp` | `{ phoneNumber, email?, referralCode? }` | `{ message, expiresIn }` |
| Verify OTP | POST | `/user/auth/verify-otp` | `{ phoneNumber, otp }` | `{ user, tokens }` |
| Get Profile | GET | `/user/auth/me` | - | `User` object |
| Update Profile | PUT | `/user/profile` | `{ profile, preferences }` | Updated `User` |
| Refresh Token | POST | `/user/auth/refresh-token` | `{ refreshToken }` | New `tokens` |
| Logout | POST | `/user/auth/logout` | - | `{ message }` |
| Delete Account | DELETE | `/user/auth/account` | - | `{ message }` |
| Get Statistics | GET | `/user/auth/statistics` | - | User stats object |

**Quick Example:**
```typescript
import authService from '@/services/authApi';

// Login flow
await authService.sendOtp({ phoneNumber: '+919876543210' });
const response = await authService.verifyOtp({ phoneNumber: '+919876543210', otp: '123456' });
apiClient.setAuthToken(response.data.tokens.accessToken);
```

---

## Products (`/products/*`)

| Operation | Method | Endpoint | Query Params | Response |
|-----------|--------|----------|--------------|----------|
| Get Products | GET | `/products` | `page, limit, category, store, search, sort` | Paginated products |
| Get Product | GET | `/products/:id` | - | Single product |
| Search | GET | `/products/search` | `q, page, limit, filters` | Search results |
| Featured | GET | `/products/featured` | `limit` | Featured products |
| New Arrivals | GET | `/products/new-arrivals` | `limit` | New products |
| By Category | GET | `/products/category/:slug` | `page, limit` | Category products |
| By Store | GET | `/products/store/:id` | `page, limit` | Store products |
| Recommendations | GET | `/products/:id/recommendations` | `limit` | Related products |
| Track View | POST | `/products/:id/track-view` | - | Success status |
| Check Availability | GET | `/products/:id/availability` | `variantId, quantity` | `{ available, maxQuantity }` |

**Quick Example:**
```typescript
import productsService from '@/services/productsApi';

// Get products
const response = await productsService.getProducts({ category: 'electronics', page: 1, limit: 20 });

// Search
const searchResults = await productsService.searchProducts({ q: 'laptop', limit: 10 });

// Get single product
const product = await productsService.getProductById('prod_123');
```

---

## Cart (`/cart/*`)

| Operation | Method | Endpoint | Request Body | Response |
|-----------|--------|----------|--------------|----------|
| Get Cart | GET | `/cart` | - | `Cart` object |
| Add Item | POST | `/cart/add` | `{ productId, quantity, variant?, metadata? }` | Updated cart |
| Update Item | PUT | `/cart/item/:productId` | `{ quantity }` | Updated cart |
| Remove Item | DELETE | `/cart/item/:productId` | - | Updated cart |
| Clear Cart | DELETE | `/cart/clear` | - | `{ message }` |
| Apply Coupon | POST | `/cart/coupon` | `{ couponCode }` | Updated cart |
| Remove Coupon | DELETE | `/cart/coupon` | - | Updated cart |
| Validate Cart | GET | `/cart/validate` | - | `{ valid, issues[] }` |
| Lock Item | POST | `/cart/lock` | `{ productId, quantity, lockDurationHours }` | `{ cart, message }` |
| Get Locked | GET | `/cart/locked` | - | `{ lockedItems[] }` |
| Move to Cart | POST | `/cart/lock/:productId/move-to-cart` | - | Updated cart |

**Quick Example:**
```typescript
import cartService from '@/services/cartApi';

// Add to cart
await cartService.addToCart({ productId: 'prod_123', quantity: 1 });

// Update quantity
await cartService.updateCartItem('prod_123', { quantity: 2 });

// Apply coupon
await cartService.applyCoupon({ couponCode: 'SAVE10' });
```

---

## Orders (`/orders/*`)

| Operation | Method | Endpoint | Request Body/Params | Response |
|-----------|--------|----------|---------------------|----------|
| Create Order | POST | `/orders` | `{ deliveryAddress, paymentMethod, couponCode? }` | New order |
| Get Orders | GET | `/orders` | `page, limit, status, dateFrom, dateTo` | Paginated orders |
| Get Order | GET | `/orders/:orderId` | - | Single order |
| Get Tracking | GET | `/orders/:orderId/tracking` | - | Tracking info |
| Cancel Order | PATCH | `/orders/:orderId/cancel` | `{ reason }` | Updated order |
| Rate Order | POST | `/orders/:orderId/rate` | `{ rating, review }` | Updated order |
| Get Stats | GET | `/orders/stats` | - | Order statistics |

**Quick Example:**
```typescript
import ordersService from '@/services/ordersApi';

// Create order
const order = await ordersService.createOrder({
  deliveryAddress: { /* address object */ },
  paymentMethod: 'wallet',
  couponCode: 'SAVE10'
});

// Track order
const tracking = await ordersService.getOrderTracking('order_123');

// Cancel order
await ordersService.cancelOrder('order_123', 'Changed my mind');
```

---

## Wallet (`/wallet/*`)

| Operation | Method | Endpoint | Request Body/Params | Response |
|-----------|--------|----------|---------------------|----------|
| Get Balance | GET | `/wallet/balance` | - | Balance & coins |
| Get Transactions | GET | `/wallet/transactions` | `page, limit, type, category, dateFrom, dateTo` | Paginated transactions |
| Get Transaction | GET | `/wallet/transaction/:id` | - | Single transaction |
| Topup | POST | `/wallet/topup` | `{ amount, paymentMethod, paymentId }` | Transaction & balance |
| Withdraw | POST | `/wallet/withdraw` | `{ amount, method, accountDetails }` | Withdrawal info |
| Process Payment | POST | `/wallet/payment` | `{ amount, orderId, description }` | Payment result |
| Get Summary | GET | `/wallet/summary` | `period` (day/week/month/year) | Transaction summary |
| Update Settings | PUT | `/wallet/settings` | `{ autoTopup, lowBalanceAlert, ... }` | Updated settings |
| Categories Breakdown | GET | `/wallet/categories` | - | Spending by category |
| Credit Points | POST | `/wallet/credit-loyalty-points` | `{ amount, source }` | Updated balance |

**Quick Example:**
```typescript
import walletService from '@/services/walletApi';

// Get balance
const balance = await walletService.getBalance();

// Get transactions
const transactions = await walletService.getTransactions({
  type: 'credit',
  page: 1,
  limit: 20
});

// Topup wallet
await walletService.topup({ amount: 1000, paymentMethod: 'card' });

// Process payment
await walletService.processPayment({
  amount: 500,
  orderId: 'order_123',
  description: 'Order payment'
});
```

---

## Stores (`/stores/*`)

| Operation | Method | Endpoint | Query Params | Response |
|-----------|--------|----------|--------------|----------|
| Get Stores | GET | `/stores` | `page, limit, category, search, location` | Paginated stores |
| Get Store | GET | `/stores/:id` | - | Single store |
| Search Stores | GET | `/stores/search` | `q, location, category` | Search results |
| Get Categories | GET | `/stores/categories` | - | Store categories |
| Follow Store | POST | `/stores/:id/follow` | - | Success status |
| Unfollow Store | DELETE | `/stores/:id/follow` | - | Success status |
| Get Products | GET | `/stores/:id/products` | `page, limit, category` | Store products |
| Get Reviews | GET | `/stores/:id/reviews` | `page, limit, rating` | Store reviews |

**Quick Example:**
```typescript
import storesService from '@/services/storesApi';

// Get stores
const stores = await storesService.getStores({ category: 'electronics', page: 1 });

// Get store details
const store = await storesService.getStoreById('store_123');

// Follow store
await storesService.followStore('store_123');
```

---

## Categories (`/categories/*`)

| Operation | Method | Endpoint | Query Params | Response |
|-----------|--------|----------|--------------|----------|
| Get Categories | GET | `/categories` | `parent, level` | All categories |
| Get Category | GET | `/categories/:slug` | - | Single category |
| Get Products | GET | `/categories/:slug/products` | `page, limit, sort` | Category products |

**Quick Example:**
```typescript
import categoriesService from '@/services/categoriesApi';

// Get all categories
const categories = await categoriesService.getCategories();

// Get category products
const products = await categoriesService.getCategoryProducts('electronics');
```

---

## Offers (`/offers/*`)

| Operation | Method | Endpoint | Query Params/Body | Response |
|-----------|--------|----------|-------------------|----------|
| Get Offers | GET | `/offers` | `page, limit, category, sortBy` | Paginated offers |
| Search Offers | GET | `/offers/search` | `q, page, limit` | Search results |
| Get Offer | GET | `/offers/:id` | - | Single offer |
| Redeem Offer | POST | `/offers/:id/redeem` | - | Redemption info |
| Get Redeemed | GET | `/user/offers/redeemed` | `page, limit` | User's redeemed offers |
| Track View | POST | `/offers/:id/track-view` | - | Success status |

**Quick Example:**
```typescript
import { offersApi } from '@/services/offersApi';

// Get offers
const offers = await offersApi.getOffers({ category: 'food', page: 1 });

// Redeem offer
await offersApi.redeemOffer({ offerId: 'offer_123', userId: 'user_123' });
```

---

## Videos & UGC (`/videos/*, /ugc/*`)

| Operation | Method | Endpoint | Request Body | Response |
|-----------|--------|----------|--------------|----------|
| Upload Video | POST | `/ugc/upload` | FormData with video | Upload info |
| Get Videos | GET | `/videos` | `page, limit, category, userId` | Paginated videos |
| Get Video | GET | `/videos/:id` | - | Single video |
| Like Video | POST | `/videos/:id/like` | - | Updated likes |
| Unlike Video | DELETE | `/videos/:id/like` | - | Updated likes |
| Report Video | POST | `/videos/:id/report` | `{ reason }` | Success status |
| Get User Videos | GET | `/user/videos` | `page, limit` | User's videos |

**Quick Example:**
```typescript
import videosService from '@/services/videosApi';
import ugcApi from '@/services/ugcApi';

// Upload video
const formData = new FormData();
formData.append('video', videoFile);
await ugcApi.uploadVideo(formData);

// Like video
await videosService.likeVideo('video_123');
```

---

## Projects & Earnings (`/projects/*, /earnings/*`)

| Operation | Method | Endpoint | Query Params/Body | Response |
|-----------|--------|----------|-------------------|----------|
| Get Projects | GET | `/projects` | `page, limit, status, category` | Available projects |
| Get Project | GET | `/projects/:id` | - | Single project |
| Submit Project | POST | `/projects/:id/submit` | FormData | Submission info |
| Get My Projects | GET | `/user/projects` | `page, limit, status` | User's projects |
| Get Earnings | GET | `/user/earnings` | `page, limit, dateFrom, dateTo` | Earnings history |

**Quick Example:**
```typescript
import projectsService from '@/services/projectsApi';

// Get available projects
const projects = await projectsService.getProjects({ category: 'video', page: 1 });

// Submit project
await projectsService.submitProject('project_123', formData);
```

---

## Notifications (`/notifications/*`)

| Operation | Method | Endpoint | Query Params | Response |
|-----------|--------|----------|--------------|----------|
| Get Notifications | GET | `/notifications` | `page, limit, read, type` | Paginated notifications |
| Get Unread Count | GET | `/notifications/unread-count` | - | `{ count }` |
| Mark as Read | PATCH | `/notifications/:id/read` | - | Success status |
| Mark All Read | PATCH | `/notifications/mark-all-read` | - | Success status |
| Delete | DELETE | `/notifications/:id` | - | Success status |

**Quick Example:**
```typescript
import notificationsService from '@/services/notificationsApi';

// Get notifications
const notifications = await notificationsService.getNotifications({ page: 1, read: false });

// Mark as read
await notificationsService.markAsRead('notif_123');
```

---

## Reviews (`/reviews/*`)

| Operation | Method | Endpoint | Request Body/Params | Response |
|-----------|--------|----------|---------------------|----------|
| Submit Review | POST | `/reviews` | `{ productId, rating, review, images? }` | New review |
| Get Product Reviews | GET | `/products/:id/reviews` | `page, limit, rating` | Paginated reviews |
| Get User Reviews | GET | `/user/reviews` | `page, limit` | User's reviews |
| Update Review | PUT | `/reviews/:id` | `{ rating, review }` | Updated review |
| Delete Review | DELETE | `/reviews/:id` | - | Success status |

**Quick Example:**
```typescript
import reviewsService from '@/services/reviewsApi';

// Submit review
await reviewsService.submitReview({
  productId: 'prod_123',
  rating: 5,
  review: 'Great product!',
  images: ['url1', 'url2']
});
```

---

## Wishlist (`/wishlist/*`)

| Operation | Method | Endpoint | Request Body | Response |
|-----------|--------|----------|--------------|----------|
| Get Wishlist | GET | `/wishlist` | - | Wishlist items |
| Add Item | POST | `/wishlist/add` | `{ productId }` | Updated wishlist |
| Remove Item | DELETE | `/wishlist/:productId` | - | Updated wishlist |
| Clear Wishlist | DELETE | `/wishlist/clear` | - | Success status |

**Quick Example:**
```typescript
import wishlistService from '@/services/wishlistApi';

// Add to wishlist
await wishlistService.addToWishlist('prod_123');

// Get wishlist
const wishlist = await wishlistService.getWishlist();
```

---

## Search (`/search/*`)

| Operation | Method | Endpoint | Query Params | Response |
|-----------|--------|----------|--------------|----------|
| Global Search | GET | `/search` | `q, type, page, limit` | Search results |
| Suggestions | GET | `/search/suggestions` | `q` | Suggestion list |
| Search History | GET | `/search/history` | `limit` | User's history |
| Clear History | DELETE | `/search/history` | - | Success status |

**Quick Example:**
```typescript
import searchService from '@/services/searchService';

// Global search
const results = await searchService.search({ q: 'laptop', type: 'products' });

// Get suggestions
const suggestions = await searchService.getSuggestions('lap');
```

---

## Payments (`/payment/*`)

| Operation | Method | Endpoint | Request Body | Response |
|-----------|--------|----------|--------------|----------|
| Create Intent | POST | `/payment/create-intent` | `{ amount, currency }` | Payment intent |
| Process Payment | POST | `/payment/process` | `{ paymentId, method }` | Payment result |
| Verify Payment | POST | `/payment/verify` | `{ paymentId, signature }` | Verification result |
| Get Methods | GET | `/payment/methods` | - | Available methods |

**Quick Example:**
```typescript
import paymentService from '@/services/paymentService';

// Create payment intent
const intent = await paymentService.createPaymentIntent({ amount: 1000, currency: 'INR' });

// Process payment
await paymentService.processPayment({ paymentId: 'pay_123', method: 'card' });
```

---

## Referrals (`/referral/*`)

| Operation | Method | Endpoint | Query Params | Response |
|-----------|--------|----------|--------------|----------|
| Get Code | GET | `/referral/code` | - | User's referral code |
| Apply Code | POST | `/referral/apply` | `{ referralCode }` | Success status |
| Get Stats | GET | `/referral/stats` | - | Referral statistics |
| Get History | GET | `/referral/history` | `page, limit` | Referral history |

**Quick Example:**
```typescript
import referralService from '@/services/referralApi';

// Get referral code
const code = await referralService.getReferralCode();

// Get stats
const stats = await referralService.getReferralStats();
```

---

## Address (`/addresses/*`)

| Operation | Method | Endpoint | Request Body | Response |
|-----------|--------|----------|--------------|----------|
| Get Addresses | GET | `/addresses` | - | User's addresses |
| Add Address | POST | `/addresses` | Address object | New address |
| Update Address | PUT | `/addresses/:id` | Address object | Updated address |
| Delete Address | DELETE | `/addresses/:id` | - | Success status |
| Set Default | PATCH | `/addresses/:id/default` | - | Success status |

**Quick Example:**
```typescript
import addressApi from '@/services/addressApi';

// Add address
await addressApi.addAddress({
  name: 'John Doe',
  phone: '+919876543210',
  addressLine1: '123 Main St',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  addressType: 'home'
});
```

---

## Support (`/support/*`)

| Operation | Method | Endpoint | Request Body/Params | Response |
|-----------|--------|----------|---------------------|----------|
| Create Ticket | POST | `/support/ticket` | `{ subject, message, category }` | New ticket |
| Get Tickets | GET | `/support/tickets` | `page, limit, status` | User's tickets |
| Get Ticket | GET | `/support/tickets/:id` | - | Single ticket |
| Send Message | POST | `/support/tickets/:id/message` | `{ message }` | New message |
| Close Ticket | PATCH | `/support/tickets/:id/close` | - | Success status |

**Quick Example:**
```typescript
import supportApi from '@/services/supportApi';

// Create ticket
await supportApi.createTicket({
  subject: 'Payment Issue',
  message: 'I need help with...',
  category: 'payment'
});
```

---

## Common Headers

```typescript
// All authenticated requests should include:
{
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Response Format

**Success:**
```typescript
{
  success: true,
  data: { /* response data */ },
  message?: "Optional success message"
}
```

**Error:**
```typescript
{
  success: false,
  error: "Error message",
  errors?: {
    field1: ["Error 1", "Error 2"],
    field2: ["Error 3"]
  }
}
```

**Paginated:**
```typescript
{
  success: true,
  data: {
    items: [...],
    pagination: {
      current: 1,
      pages: 5,
      total: 100,
      limit: 20,
      hasNext: true,
      hasPrev: false
    }
  }
}
```

---

## Rate Limits

- **Default:** 100 requests/minute per user
- **Search:** 20 requests/minute
- **Upload:** 10 requests/minute
- **Authentication:** 5 attempts/minute

---

## Environment Variables

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api
EXPO_PUBLIC_API_TIMEOUT=30000
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
```

---

## Service Import Map

```typescript
import authService from '@/services/authApi';
import productsService from '@/services/productsApi';
import cartService from '@/services/cartApi';
import ordersService from '@/services/ordersApi';
import walletService from '@/services/walletApi';
import storesService from '@/services/storesApi';
import categoriesService from '@/services/categoriesApi';
import { offersApi } from '@/services/offersApi';
import videosService from '@/services/videosApi';
import ugcApi from '@/services/ugcApi';
import projectsService from '@/services/projectsApi';
import notificationsService from '@/services/notificationsApi';
import reviewsService from '@/services/reviewsApi';
import wishlistService from '@/services/wishlistApi';
import searchService from '@/services/searchService';
import paymentService from '@/services/paymentService';
import referralService from '@/services/referralApi';
import addressApi from '@/services/addressApi';
import supportApi from '@/services/supportApi';
import apiClient from '@/services/apiClient';
```

---

**End of Quick Reference**
